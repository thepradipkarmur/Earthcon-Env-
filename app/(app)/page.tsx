import Link from "next/link";
import { Card, PageHeader, Stat, StatusBadge, Table, Td } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { daysSince, fmtDate, inr, isoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const profile = await getProfile();
  const supabase = await createClient();
  const today = isoDate();
  const in30 = isoDate(30);
  const in60 = isoDate(60);

  const [clients, quotes, pos, tasks, myTasks, samples, reports, invoices, instruments, cca] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("quotations").select("total,status").in("status", ["draft", "sent"]),
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("tasks").select("id,due_date").in("status", ["open", "in_progress"]),
    supabase.from("tasks").select("id,task_no,title,due_date,status,priority,clients(name)").eq("assigned_to", profile.id)
      .in("status", ["open", "in_progress"]).order("due_date", { nullsFirst: false }).limit(8),
    supabase.from("samples").select("status"),
    supabase.from("reports").select("id,report_no,status,samples(sample_no,clients(name))").in("status", ["draft", "checked"]).order("created_at").limit(8),
    supabase.from("invoices").select("balance,due_date").in("status", ["issued", "partially_paid"]),
    supabase.from("instruments").select("id,name,calibration_due").eq("is_active", true).lte("calibration_due", in30).order("calibration_due"),
    supabase.from("clients").select("id,name,cca_valid_upto").eq("is_active", true).lte("cca_valid_upto", in60).order("cca_valid_upto"),
  ]);

  const sampleCount = (s: string) => (samples.data ?? []).filter((r) => r.status === s).length;
  const overdueTasks = (tasks.data ?? []).filter((t) => t.due_date && t.due_date < today).length;
  const outstanding = (invoices.data ?? []).reduce((a, r) => a + Number(r.balance), 0);
  const buckets = { "Not due": 0, "0–30 days": 0, "31–60 days": 0, "61–90 days": 0, "90+ days": 0 };
  (invoices.data ?? []).forEach((r) => {
    const days = r.due_date ? daysSince(r.due_date) : 0;
    const k = days <= 0 ? "Not due" : days <= 30 ? "0–30 days" : days <= 60 ? "31–60 days" : days <= 90 ? "61–90 days" : "90+ days";
    buckets[k] += Number(r.balance);
  });
  const openQuoteValue = (quotes.data ?? []).reduce((a, r) => a + Number(r.total), 0);

  return (
    <div>
      <PageHeader title={`Welcome, ${profile.full_name.split(" ")[0] || "there"}`} subtitle={fmtDate(isoDate())} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Active clients" value={clients.count ?? 0} href="/clients" />
        <Stat label="Open quotes" value={quotes.data?.length ?? 0} hint={inr(openQuoteValue)} href="/quotations" />
        <Stat label="Active POs" value={pos.count ?? 0} href="/purchase-orders" />
        <Stat label="Open tasks" value={tasks.data?.length ?? 0} hint={overdueTasks ? `${overdueTasks} overdue` : "none overdue"} tone={overdueTasks ? "amber" : "teal"} href="/tasks" />
        <Stat label="Samples registered" value={sampleCount("registered")} href="/samples?status=registered" tone="slate" />
        <Stat label="In testing" value={sampleCount("in_testing")} href="/testing" tone="amber" />
        <Stat label="Awaiting report" value={sampleCount("tested")} href="/samples?status=tested" />
        <Stat label="Outstanding" value={inr(outstanding)} href="/invoices" tone={outstanding ? "red" : "teal"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="My open tasks" actions={<Link className="text-xs text-teal-700" href="/tasks?mine=1">View all</Link>}>
          {(myTasks.data ?? []).length === 0 ? <p className="text-sm text-slate-400">Nothing assigned to you.</p> : (
            <ul className="divide-y divide-slate-100">
              {(myTasks.data ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-800">{t.title}</div>
                    {/* @ts-expect-error joined row */}
                    <div className="text-xs text-slate-500">{t.task_no} · {t.clients?.name ?? "—"} · due {fmtDate(t.due_date)}</div>
                  </div>
                  <StatusBadge status={t.priority} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Reports awaiting check / approval" actions={<Link className="text-xs text-teal-700" href="/reports">View all</Link>}>
          {(reports.data ?? []).length === 0 ? <p className="text-sm text-slate-400">No pending reports.</p> : (
            <ul className="divide-y divide-slate-100">
              {(reports.data ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/reports/${r.id}`} className="text-teal-800 hover:underline">
                    {r.report_no}
                    {/* @ts-expect-error joined row */}
                    <span className="block text-xs text-slate-500">{r.samples?.clients?.name}</span>
                  </Link>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Receivables ageing">
          <Table head={["Bucket", "Amount"]}>
            {Object.entries(buckets).map(([k, v]) => (
              <tr key={k}><Td>{k}</Td><Td className="text-right font-medium">{inr(v)}</Td></tr>
            ))}
          </Table>
        </Card>

        <Card title="Instrument calibration due (30 days)">
          {(instruments.data ?? []).length === 0 ? <p className="text-sm text-slate-400">No calibrations due.</p> : (
            <ul className="space-y-1 text-sm">
              {(instruments.data ?? []).map((i) => (
                <li key={i.id} className="flex justify-between"><span>{i.name}</span>
                  <span className={i.calibration_due < today ? "text-red-600" : "text-amber-600"}>{fmtDate(i.calibration_due)}</span></li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Client GPCB consent (CCA) expiring in 60 days">
          {(cca.data ?? []).length === 0 ? <p className="text-sm text-slate-400">No consents expiring.</p> : (
            <ul className="space-y-1 text-sm">
              {(cca.data ?? []).map((c) => (
                <li key={c.id} className="flex justify-between"><Link href={`/clients/${c.id}`} className="text-teal-800 hover:underline">{c.name}</Link>
                  <span className={c.cca_valid_upto < today ? "text-red-600" : "text-amber-600"}>{fmtDate(c.cca_valid_upto)}</span></li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Workflow">
          <ol className="space-y-1.5 text-sm text-slate-600">
            {["Register client", "Prepare quotation", "Record client PO", "Create & assign tasks", "Register samples", "Enter lab results", "Approve & issue report", "Invoice & collect payment"].map((s, i) => (
              <li key={s} className="flex gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[11px] font-semibold text-teal-800">{i + 1}</span>{s}</li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
