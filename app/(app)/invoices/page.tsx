import Link from "next/link";
import { LinkButton, PageHeader, SearchBar, Select, Stat, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, inr, isoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Invoices" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function Invoices({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const profile = await getProfile();
  const supabase = await createClient();
  let q = supabase.from("invoices").select("id,invoice_no,invoice_date,due_date,total,balance,status,clients(name)").order("invoice_date", { ascending: false }).limit(300);
  if (sp.status === "outstanding") q = q.in("status", ["issued", "partially_paid"]); else if (sp.status) q = q.eq("status", sp.status);
  if (sp.q) q = q.ilike("invoice_no", `%${sp.q}%`);
  const [{ data }, { data: open }] = await Promise.all([q, supabase.from("invoices").select("balance,due_date").in("status", ["issued", "partially_paid"])]);
  const today = isoDate();
  const outstanding = (open ?? []).reduce((a, r) => a + Number(r.balance), 0);
  const overdue = (open ?? []).filter((r) => r.due_date && r.due_date < today).reduce((a, r) => a + Number(r.balance), 0);
  return (
    <div>
      <PageHeader title="Invoices & payments" step={8} subtitle="Generate invoices and monitor outstanding payments"
        actions={can(profile, "accounts") ? <LinkButton href="/invoices/new" icon="plus">New invoice</LinkButton> : null} />
      <div className="mb-4 grid max-w-xl grid-cols-2 gap-3">
        <Stat label="Outstanding" value={inr(outstanding)} tone="amber" href="/invoices?status=outstanding" />
        <Stat label="Overdue" value={inr(overdue)} tone={overdue ? "red" : "teal"} href="/invoices?status=outstanding" />
      </div>
      <SearchBar defaultValue={sp.q} placeholder="Invoice no.">
        <Select name="status" defaultValue={sp.status ?? ""} options={[{ value: "outstanding", label: "Outstanding" }, "draft", "issued", "partially_paid", "paid", "cancelled"]} placeholder="All statuses" className="max-w-[180px]" />
      </SearchBar>
      <Table head={["Invoice no.", "Client", "Date", "Due", "Total", "Balance", "Status"]} empty={!data?.length}>
        {(data as any[] ?? []).map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <Td><Link href={`/invoices/${r.id}`} className="font-mono text-xs font-medium text-teal-800 hover:underline">{r.invoice_no}</Link></Td>
            <Td>{r.clients?.name}</Td><Td>{fmtDate(r.invoice_date)}</Td>
            <Td className={r.due_date < today && ["issued", "partially_paid"].includes(r.status) ? "font-medium text-red-600" : ""}>{fmtDate(r.due_date)}</Td>
            <Td>{inr(r.total)}</Td><Td className="font-medium">{inr(r.balance)}</Td><Td><StatusBadge status={r.status} /></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
