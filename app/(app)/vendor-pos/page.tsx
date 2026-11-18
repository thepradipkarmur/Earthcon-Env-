import Link from "next/link";
import { LinkButton, PageHeader, SearchBar, Select, Stat, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, inr, isoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Purchase orders" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function VendorPOs({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const profile = await getProfile();
  const supabase = await createClient();
  let q = supabase.from("vendor_pos").select("id,po_no,po_date,delivery_date,total,balance,status,vendors(name)").order("created_at", { ascending: false }).limit(300);
  if (sp.status === "open") q = q.in("status", ["sent", "acknowledged", "partially_received"]); else if (sp.status) q = q.eq("status", sp.status);
  if (sp.q) q = q.ilike("po_no", `%${sp.q}%`);
  const [{ data }, { data: all }] = await Promise.all([q, supabase.from("vendor_pos").select("balance,status").not("status", "in", "(draft,cancelled)")]);
  const payable = (all ?? []).reduce((a, r) => a + Number(r.balance), 0);
  const pending = (all ?? []).filter((r) => ["sent", "acknowledged", "partially_received"].includes(r.status)).length;
  const today = isoDate();
  return (
    <div>
      <PageHeader title="Purchase orders to vendors" subtitle="Send POs, track deliveries and pay vendors"
        actions={can(profile, "accounts", "tech_manager") ? <LinkButton href="/vendor-pos/new" icon="plus">New purchase order</LinkButton> : null} />
      <div className="mb-4 grid max-w-xl grid-cols-2 gap-3">
        <Stat label="Awaiting delivery" value={pending} tone="amber" href="/vendor-pos?status=open" />
        <Stat label="Payable to vendors" value={inr(payable)} tone={payable ? "red" : "teal"} />
      </div>
      <SearchBar defaultValue={sp.q} placeholder="PO no.">
        <Select name="status" defaultValue={sp.status ?? ""} options={[{ value: "open", label: "Awaiting delivery" }, "draft", "sent", "acknowledged", "partially_received", "received", "closed", "cancelled"]} placeholder="All statuses" className="max-w-[200px]" />
      </SearchBar>
      <Table head={["PO no.", "Vendor", "PO date", "Delivery by", "Total", "Balance", "Status"]} empty={!data?.length}>
        {(data as any[] ?? []).map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <Td><Link href={`/vendor-pos/${r.id}`} className="font-mono text-xs font-medium text-teal-800 hover:underline">{r.po_no}</Link></Td>
            <Td>{r.vendors?.name}</Td><Td>{fmtDate(r.po_date)}</Td>
            <Td className={r.delivery_date && r.delivery_date < today && ["sent", "acknowledged", "partially_received"].includes(r.status) ? "font-medium text-red-600" : ""}>{fmtDate(r.delivery_date)}</Td>
            <Td>{inr(r.total)}</Td><Td className="font-medium">{inr(r.balance)}</Td><Td><StatusBadge status={r.status} /></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
