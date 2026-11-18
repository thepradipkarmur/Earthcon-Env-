import Link from "next/link";
import { LinkButton, PageHeader, SearchBar, Select, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, inr, isoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Purchase orders" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function POs({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const profile = await getProfile();
  const supabase = await createClient();
  let query = supabase.from("purchase_orders").select("*,clients(name),quotations(quote_no)").order("po_date", { ascending: false }).limit(300);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`po_number.ilike.%${q}%,internal_ref.ilike.%${q}%`);
  const { data } = await query;
  const today = isoDate();
  return (
    <div>
      <PageHeader title="Purchase orders" step={3} subtitle="Client-approved POs"
        actions={can(profile, "accounts") ? <LinkButton href="/purchase-orders/new" icon="plus">Record PO</LinkButton> : null} />
      <SearchBar defaultValue={q} placeholder="PO no. / ref">
        <Select name="status" defaultValue={status ?? ""} options={["active", "completed", "cancelled", "expired"]} placeholder="All statuses" className="max-w-[180px]" />
      </SearchBar>
      <Table head={["Client PO", "Our ref", "Client", "Quotation", "PO date", "Valid to", "Value", "Status"]} empty={!data?.length}>
        {(data as any[] ?? []).map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <Td><Link className="font-medium text-teal-800 hover:underline" href={`/purchase-orders/${r.id}`}>{r.po_number}</Link></Td>
            <Td className="font-mono text-xs">{r.internal_ref}</Td><Td>{r.clients?.name}</Td><Td>{r.quotations?.quote_no ?? "—"}</Td>
            <Td>{fmtDate(r.po_date)}</Td><Td className={r.valid_to && r.valid_to < today && r.status === "active" ? "text-red-600" : ""}>{fmtDate(r.valid_to)}</Td>
            <Td>{inr(r.po_value)}</Td><Td><StatusBadge status={r.status} /></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
