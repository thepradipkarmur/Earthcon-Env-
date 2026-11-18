import Link from "next/link";
import { LinkButton, PageHeader, SearchBar, Select, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, inr } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Quotations" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function Quotations({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const profile = await getProfile();
  const supabase = await createClient();
  let query = supabase.from("quotations").select("id,quote_no,quote_date,valid_until,total,status,subject,clients(name)").order("created_at", { ascending: false }).limit(300);
  if (status) query = query.eq("status", status);
  if (q) query = query.ilike("quote_no", `%${q}%`);
  const { data } = await query;
  return (
    <div>
      <PageHeader title="Quotations" step={2} subtitle="Services, parameters and rates"
        actions={can(profile, "accounts") ? <LinkButton href="/quotations/new" icon="plus">New quotation</LinkButton> : null} />
      <SearchBar defaultValue={q} placeholder="Quotation no.">
        <Select name="status" defaultValue={status ?? ""} options={["draft", "sent", "accepted", "rejected", "expired", "revised"]} placeholder="All statuses" className="max-w-[180px]" />
      </SearchBar>
      <Table head={["Quote no.", "Client", "Date", "Valid until", "Total", "Status"]} empty={!data?.length}>
        {(data as any[] ?? []).map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <Td><Link href={`/quotations/${r.id}`} className="font-medium text-teal-800 hover:underline">{r.quote_no}</Link></Td>
            <Td>{r.clients?.name}</Td><Td>{fmtDate(r.quote_date)}</Td><Td>{fmtDate(r.valid_until)}</Td>
            <Td className="font-medium">{inr(r.total)}</Td><Td><StatusBadge status={r.status} /></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
