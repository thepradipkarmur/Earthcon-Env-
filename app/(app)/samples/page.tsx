import Link from "next/link";
import { LinkButton, PageHeader, SearchBar, Select, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Samples" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function Samples({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; type?: string }> }) {
  const sp = await searchParams;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: types } = await supabase.from("sample_types").select("id,name").order("sort_order");
  let q = supabase.from("samples").select("id,sample_no,sampling_point,received_at,status,clients(name),sample_types(name,code),sample_tests(status)")
    .order("created_at", { ascending: false }).limit(300);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.type) q = q.eq("sample_type_id", sp.type);
  if (sp.q) q = q.or(`sample_no.ilike.%${sp.q}%,sampling_point.ilike.%${sp.q}%`);
  const { data } = await q;
  return (
    <div>
      <PageHeader title="Samples" step={5} subtitle="Sample registration and unique IDs"
        actions={can(profile, "sampler", "analyst", "tech_manager") ? <LinkButton href="/samples/new" icon="plus">Register sample</LinkButton> : null} />
      <SearchBar defaultValue={sp.q} placeholder="Sample no. / point">
        <Select name="status" defaultValue={sp.status ?? ""} options={["registered", "in_testing", "tested", "reported", "rejected"]} placeholder="All statuses" className="max-w-[170px]" />
        <Select name="type" defaultValue={sp.type ?? ""} options={(types ?? []).map((t) => ({ value: t.id, label: t.name }))} placeholder="All types" className="max-w-[220px]" />
      </SearchBar>
      <Table head={["Sample no.", "Client", "Type", "Sampling point", "Received", "Progress", "Status"]} empty={!data?.length}>
        {(data as any[] ?? []).map((s) => {
          const total = s.sample_tests.length, done = s.sample_tests.filter((t: any) => t.status !== "pending").length;
          return (
            <tr key={s.id} className="hover:bg-slate-50">
              <Td><Link href={`/samples/${s.id}`} className="font-mono text-xs font-medium text-teal-800 hover:underline">{s.sample_no}</Link></Td>
              <Td>{s.clients?.name}</Td><Td>{s.sample_types?.name}</Td><Td>{s.sampling_point ?? "—"}</Td>
              <Td>{fmtDateTime(s.received_at)}</Td>
              <Td><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded bg-slate-200"><div className="h-1.5 rounded bg-teal-600" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div><span className="text-xs text-slate-500">{done}/{total}</span></div></Td>
              <Td><StatusBadge status={s.status} /></Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
