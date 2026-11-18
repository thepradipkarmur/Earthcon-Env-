import Link from "next/link";
import { PageHeader, SearchBar, Select, StatusBadge, Table, Td } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Reports" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function Reports({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("reports").select("id,report_no,revision,status,issue_date,created_at,samples(sample_no,clients(name),sample_types(name)),approver:profiles!reports_approved_by_fkey(full_name)")
    .order("created_at", { ascending: false }).limit(300);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.q) q = q.ilike("report_no", `%${sp.q}%`);
  const { data } = await q;
  return (
    <div>
      <PageHeader title="Test reports" step={7} subtitle="Prepare, check, approve and issue branded PDF reports. Create a report from a tested sample." />
      <SearchBar defaultValue={sp.q} placeholder="Report no.">
        <Select name="status" defaultValue={sp.status ?? ""} options={["draft", "checked", "approved", "issued", "cancelled"]} placeholder="All statuses" className="max-w-[170px]" />
      </SearchBar>
      <Table head={["Report no.", "Sample", "Client", "Type", "Issue date", "Approved by", "Status"]} empty={!data?.length}>
        {(data as any[] ?? []).map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <Td><Link href={`/reports/${r.id}`} className="font-mono text-xs font-medium text-teal-800 hover:underline">{r.report_no}</Link></Td>
            <Td className="font-mono text-xs">{r.samples?.sample_no}</Td><Td>{r.samples?.clients?.name}</Td><Td>{r.samples?.sample_types?.name}</Td>
            <Td>{fmtDate(r.issue_date)}</Td><Td>{r.approver?.full_name ?? "—"}</Td><Td><StatusBadge status={r.status} /></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
