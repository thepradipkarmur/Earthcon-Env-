import { redirect } from "next/navigation";
import { Button, PageHeader, Select, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Audit log" };
/* eslint-disable @typescript-eslint/no-explicit-any */

const TABLES = ["clients", "quotations", "purchase_orders", "tasks", "samples", "sample_tests", "reports", "invoices", "payments", "parameters", "standards", "standard_limits", "instruments", "profiles"];

function diff(o: any, n: any) {
  if (!o || !n) return null;
  return Object.keys(n).filter((k) => !["updated_at"].includes(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]))
    .map((k) => `${k}: ${JSON.stringify(o[k])} → ${JSON.stringify(n[k])}`).join("; ");
}

export default async function Audit({ searchParams }: { searchParams: Promise<{ table?: string }> }) {
  const me = await getProfile();
  if (!can(me, "tech_manager")) redirect("/");
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("audit_log").select("*").order("changed_at", { ascending: false }).limit(200);
  if (sp.table) q = q.eq("table_name", sp.table);
  const [{ data }, { data: people }] = await Promise.all([q, supabase.from("profiles").select("id,full_name")]);
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  return (
    <div>
      <PageHeader title="Audit log" subtitle="Every create / update / delete on key records — for NABL / CPCB surveillance" />
      <form className="mb-4 flex gap-2"><Select name="table" defaultValue={sp.table ?? ""} options={TABLES} placeholder="All tables" className="max-w-xs" /><Button variant="secondary">Filter</Button></form>
      <Table head={["When", "User", "Table", "Action", "Change"]} empty={!data?.length}>
        {(data ?? []).map((a: any) => (
          <tr key={a.id} className="align-top"><Td>{fmtDateTime(a.changed_at)}</Td><Td>{names.get(a.changed_by) ?? "system"}</Td><Td>{a.table_name}</Td><Td>{a.action}</Td>
            <Td className="max-w-xl whitespace-normal break-all font-mono text-[11px] text-slate-500">{a.action === "UPDATE" ? diff(a.old_data, a.new_data) : (a.new_data?.name ?? a.new_data?.sample_no ?? a.new_data?.report_no ?? a.new_data?.invoice_no ?? a.old_data?.id ?? "")}</Td></tr>
        ))}
      </Table>
    </div>
  );
}
