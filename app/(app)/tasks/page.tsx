import Link from "next/link";
import { Button, LinkButton, PageHeader, Select, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, isoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { setTaskStatus } from "./actions";

export const metadata = { title: "Tasks" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function Tasks({ searchParams }: { searchParams: Promise<{ mine?: string; status?: string; type?: string }> }) {
  const sp = await searchParams;
  const profile = await getProfile();
  const supabase = await createClient();
  let q = supabase.from("tasks").select("*,clients(name),client_sites(name),profiles!tasks_assigned_to_fkey(full_name),purchase_orders(po_number)")
    .order("due_date", { nullsFirst: false }).limit(300);
  const status = sp.status ?? "active";
  if (status === "active") q = q.in("status", ["open", "in_progress"]); else if (status !== "all") q = q.eq("status", status);
  if (sp.mine) q = q.eq("assigned_to", profile.id);
  if (sp.type) q = q.eq("task_type", sp.type);
  const { data, error } = await q;
  const today = isoDate();
  const manager = can(profile, "accounts", "tech_manager");

  return (
    <div>
      <PageHeader title="Tasks" step={4} subtitle="Sampling and laboratory work assignments"
        actions={manager ? <LinkButton href="/tasks/new" icon="plus">New task</LinkButton> : null} />
      <form className="mb-4 flex flex-wrap gap-2">
        <Select name="status" defaultValue={status} options={[{ value: "active", label: "Open + in progress" }, "open", "in_progress", "done", "cancelled", { value: "all", label: "All" }]} className="max-w-[200px]" />
        <Select name="type" defaultValue={sp.type ?? ""} options={["sampling", "analysis", "report", "site_visit", "other"]} placeholder="All types" className="max-w-[180px]" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="mine" value="1" defaultChecked={!!sp.mine} /> Only mine</label>
        <Button variant="secondary">Filter</Button>
      </form>
      {error ? <p className="mb-2 text-sm text-red-600">{error.message}</p> : null}
      <Table head={["Task", "Type", "Client / Site", "Assigned", "Due", "Priority", "Status", ""]} empty={!data?.length}>
        {(data as any[] ?? []).map((t) => {
          const mineOrMgr = manager || t.assigned_to === profile.id;
          return (
            <tr key={t.id} className="align-top hover:bg-slate-50">
              <Td className="whitespace-normal"><div className="font-medium text-slate-800">{t.title}</div><div className="font-mono text-xs text-slate-400">{t.task_no}{t.purchase_orders ? ` · PO ${t.purchase_orders.po_number}` : ""}</div>
                {t.description ? <div className="mt-1 max-w-md text-xs text-slate-500">{t.description}</div> : null}</Td>
              <Td>{t.task_type.replace("_", " ")}</Td>
              <Td>{t.clients?.name ?? "—"}<div className="text-xs text-slate-500">{t.client_sites?.name}</div></Td>
              <Td>{t.profiles?.full_name ?? <span className="text-slate-400">Unassigned</span>}</Td>
              <Td className={t.due_date && t.due_date < today && !["done", "cancelled"].includes(t.status) ? "font-medium text-red-600" : ""}>{fmtDate(t.due_date)}</Td>
              <Td><StatusBadge status={t.priority} /></Td>
              <Td><StatusBadge status={t.status} /></Td>
              <Td>
                <div className="flex gap-1">
                  {mineOrMgr && t.status === "open" ? <form action={setTaskStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="in_progress" /><Button variant="secondary" className="px-2 py-1 text-xs">Start</Button></form> : null}
                  {mineOrMgr && ["open", "in_progress"].includes(t.status) ? <form action={setTaskStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="done" /><Button className="px-2 py-1 text-xs">Done</Button></form> : null}
                  {t.task_type === "sampling" && t.client_id ? <Link href={`/samples/new?task=${t.id}`} className="rounded-lg px-2 py-1 text-xs text-teal-700 hover:bg-teal-50">+ Sample</Link> : null}
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
