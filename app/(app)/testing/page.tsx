import Link from "next/link";
import { PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Lab testing" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function Testing() {
  const supabase = await createClient();
  const { data } = await supabase.from("samples").select("id,sample_no,received_at,status,clients(name),sample_types(name),sample_tests(status,parameters(name))")
    .in("status", ["registered", "in_testing", "tested"]).order("received_at").limit(300);
  return (
    <div>
      <PageHeader title="Laboratory testing" step={6} subtitle="Worklist — enter results and analyst information" />
      <Table head={["Sample no.", "Client", "Type", "Received", "Pending parameters", "Status"]} empty={!data?.length}>
        {(data as any[] ?? []).map((s) => {
          const pending = s.sample_tests.filter((t: any) => t.status === "pending");
          const entered = s.sample_tests.filter((t: any) => t.status === "entered").length;
          return (
            <tr key={s.id} className="align-top hover:bg-slate-50">
              <Td><Link href={`/testing/${s.id}`} className="font-mono text-xs font-medium text-teal-800 hover:underline">{s.sample_no}</Link></Td>
              <Td>{s.clients?.name}</Td><Td>{s.sample_types?.name}</Td><Td>{fmtDateTime(s.received_at)}</Td>
              <Td className="whitespace-normal text-xs">{pending.length ? pending.map((t: any) => t.parameters?.name).join(", ") : <span className="text-emerald-700">All entered{entered ? ` · ${entered} awaiting review` : ""}</span>}</Td>
              <Td><StatusBadge status={s.status} /></Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
