import Link from "next/link";
import { LinkButton, PageHeader, SearchBar, Select, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, inr } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Vendor quotations" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function VendorQuotes({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const profile = await getProfile();
  const supabase = await createClient();
  let q = supabase.from("vendor_quotations").select("id,vq_no,vendor_ref,quote_date,valid_until,subject,total,status,vendors(name)").order("created_at", { ascending: false }).limit(300);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.q) q = q.or(`vq_no.ilike.%${sp.q}%,vendor_ref.ilike.%${sp.q}%,subject.ilike.%${sp.q}%`);
  const { data } = await q;
  return (
    <div>
      <PageHeader title="Vendor quotations" subtitle="Quotations received from suppliers — compare, accept, and convert to a purchase order"
        actions={can(profile, "accounts", "tech_manager") ? <LinkButton href="/vendor-quotations/new" icon="plus">Record quotation</LinkButton> : null} />
      <SearchBar defaultValue={sp.q} placeholder="Ref, vendor ref, subject">
        <Select name="status" defaultValue={sp.status ?? ""} options={["received", "under_review", "accepted", "rejected", "expired"]} placeholder="All statuses" className="max-w-[180px]" />
      </SearchBar>
      <Table head={["Our ref", "Vendor", "Their ref", "Subject", "Date", "Valid until", "Total", "Status"]} empty={!data?.length}>
        {(data as any[] ?? []).map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <Td><Link href={`/vendor-quotations/${r.id}`} className="font-mono text-xs font-medium text-teal-800 hover:underline">{r.vq_no}</Link></Td>
            <Td>{r.vendors?.name}</Td><Td>{r.vendor_ref ?? "—"}</Td><Td className="max-w-xs truncate">{r.subject ?? "—"}</Td>
            <Td>{fmtDate(r.quote_date)}</Td><Td>{fmtDate(r.valid_until)}</Td><Td className="font-medium">{inr(r.total)}</Td><Td><StatusBadge status={r.status} /></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
