import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, DL, Input, LinkButton, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDateTime, fmtResult } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { createReport } from "../../reports/actions";
import { rejectSample } from "../actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function SampleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: s } = await supabase.from("samples").select(`*,clients(id,name),client_sites(name),purchase_orders(id,po_number),tasks(id,task_no),
    sample_types(name,code,matrix),standards(name),collector:profiles!samples_collected_by_fkey(full_name)`).eq("id", id).single() as { data: any };
  if (!s) notFound();
  const [{ data: tests }, { data: reports }] = await Promise.all([
    supabase.from("sample_tests").select("*,parameters(name,decimals),test_methods(code)").eq("sample_id", id).order("sort_order"),
    supabase.from("reports").select("id,report_no,status,revision").eq("sample_id", id).order("created_at"),
  ]);
  const activeReport = (reports ?? []).find((r) => r.status !== "cancelled");
  const fieldData = Object.entries(s.field_data ?? {}) as [string, string][];

  return (
    <div className="space-y-6">
      <PageHeader title={s.sample_no} step={5} subtitle={<>{s.clients?.name} · {s.sample_types?.name} · <StatusBadge status={s.status} /></>}
        actions={<>
          <LinkButton href={`/label/${id}`} variant="secondary" target="_blank">Print label</LinkButton>
          {can(profile, "analyst", "tech_manager", "sampler") && s.status !== "rejected" ? <LinkButton href={`/testing/${id}`}>Enter results</LinkButton> : null}
          {can(profile, "analyst", "tech_manager") && !activeReport && ["tested", "in_testing"].includes(s.status) ? (
            <form action={createReport}><input type="hidden" name="sample_id" value={id} /><Button>Create report</Button></form>
          ) : null}
          {activeReport ? <LinkButton href={`/reports/${activeReport.id}`} variant="secondary">Report {activeReport.report_no}</LinkButton> : null}
        </>} />
      <Card title="Sample details">
        <DL items={[
          ["Client", <Link key="c" href={`/clients/${s.clients?.id}`} className="text-teal-800 hover:underline">{s.clients?.name}</Link>],
          ["Site", s.client_sites?.name], ["PO", s.purchase_orders ? <Link key="p" href={`/purchase-orders/${s.purchase_orders.id}`} className="text-teal-800 hover:underline">{s.purchase_orders.po_number}</Link> : null],
          ["Task", s.tasks?.task_no], ["Sampling point", s.sampling_point], ["Description", s.sample_description],
          ["Standard", s.standards?.name], ["Collected by", s.collector?.full_name], ["Collected at", fmtDateTime(s.collected_at)],
          ["Received at", fmtDateTime(s.received_at)], ["Duration", s.sampling_duration], ["Quantity", s.quantity],
          ["Container", s.container], ["Preservation", s.preservation], ["Condition", s.condition_on_receipt], ["Weather", s.weather],
          ...fieldData.map(([k, v]) => [k.replace(/_/g, " "), v] as [string, string]), ["Remarks", s.remarks],
        ]} />
      </Card>
      <Table head={["Parameter", "Unit", "Method", "Result", "Limit", "Compliance", "Status"]} empty={!tests?.length}>
        {(tests as any[] ?? []).map((t) => (
          <tr key={t.id}><Td>{t.parameters?.name}</Td><Td>{t.unit}</Td><Td className="text-xs">{t.test_methods?.code ?? "—"}</Td>
            <Td className="font-medium">{fmtResult(t.result_value, t.result_text, t.parameters?.decimals)}</Td><Td>{t.limit_text ?? "—"}</Td>
            <Td><StatusBadge status={t.compliance} /></Td><Td><StatusBadge status={t.status} /></Td></tr>
        ))}
      </Table>
      {can(profile, "tech_manager") && ["registered", "in_testing"].includes(s.status) ? (
        <Card title="Reject sample">
          <form action={rejectSample} className="flex gap-2"><input type="hidden" name="id" value={id} />
            <Input name="reason" placeholder="Reason (e.g. leaking container, insufficient quantity)" /><Button variant="danger">Reject</Button></form>
        </Card>
      ) : null}
    </div>
  );
}
