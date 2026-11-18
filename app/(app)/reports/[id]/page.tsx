import { getStaffOptions } from "@/lib/data";
import { AssignControl } from "@/components/assign-control";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, Card, DL, Field, Input, LinkButton, Notice, PageHeader, StatusBadge, Table, Td, Textarea } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtResult } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cancelAndRevise, updateReport } from "../actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function ReportView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: r } = await supabase.from("reports").select(`*,samples(id,sample_no,sampling_point,collected_at,received_at,clients(name),sample_types(name),standards(name)),
    preparer:profiles!reports_prepared_by_fkey(full_name),checker:profiles!reports_checked_by_fkey(full_name),approver:profiles!reports_approved_by_fkey(full_name)`).eq("id", id).single() as { data: any };
  if (!r) notFound();
  const staff = await getStaffOptions(["tech_manager", "analyst"]);
  const { data: tests } = await supabase.from("sample_tests").select("*,parameters(name,decimals),test_methods(code)").eq("sample_id", r.sample_id).order("sort_order");
  const pending = (tests ?? []).filter((t) => t.status === "pending").length;
  const exceed = (tests ?? []).filter((t) => t.compliance === "exceeds");
  const editable = !r.is_locked && can(profile, "analyst", "tech_manager");
  const defaultOpinion = exceed.length
    ? `The sample does not conform to ${r.samples?.standards?.name ?? "the specified standard"} for: ${exceed.map((t: any) => t.parameters?.name).join(", ")}.`
    : r.samples?.standards?.name ? `All tested parameters are within the limits of ${r.samples.standards.name}.` : "";

  return (
    <div className="space-y-6">
      <PageHeader title={r.report_no} step={7} subtitle={<>{r.samples?.clients?.name} · Sample {r.samples?.sample_no} · <StatusBadge status={r.status} /></>}
        actions={<>
          <LinkButton href={`/api/pdf/report/${id}`} variant="secondary" icon="download" target="_blank">{r.is_locked ? "PDF" : "Preview PDF (draft)"}</LinkButton>
          <LinkButton href={`/testing/${r.sample_id}`} variant="secondary">Results</LinkButton>
          {can(profile, "tech_manager") && r.is_locked && r.status !== "cancelled" ? (
            <form action={cancelAndRevise}><input type="hidden" name="id" value={id} /><Button variant="danger">Cancel &amp; revise</Button></form>
          ) : null}
        </>} />
      <Card><AssignControl kind="report" id={id} current={r.reviewer_id} staff={staff} label="Reviewer / approver"
        disabled={r.is_locked || !can(profile, "analyst", "tech_manager")} /></Card>
      {pending ? <Notice>{pending} parameter(s) still have no result. All results are required before approval.</Notice> : null}
      {r.status === "cancelled" ? <Notice tone="red">This report was cancelled. A revised report supersedes it.</Notice> : null}
      <Card title="Sample">
        <DL items={[["Sample no.", <Link key="s" className="text-teal-800 hover:underline" href={`/samples/${r.sample_id}`}>{r.samples?.sample_no}</Link>],
          ["Type", r.samples?.sample_types?.name], ["Sampling point", r.samples?.sampling_point], ["Collected", fmtDateTime(r.samples?.collected_at)],
          ["Received", fmtDateTime(r.samples?.received_at)], ["Standard", r.samples?.standards?.name],
          ["Prepared by", r.preparer?.full_name], ["Checked by", r.checker ? `${r.checker.full_name} · ${fmtDateTime(r.checked_at)}` : null],
          ["Approved by", r.approver ? `${r.approver.full_name} · ${fmtDateTime(r.approved_at)}` : null], ["Issue date", fmtDate(r.issue_date)]]} />
      </Card>
      <Table head={["#", "Parameter", "Unit", "Method", "Result", "Limit", ""]}>
        {(tests as any[] ?? []).map((t, i) => (
          <tr key={t.id} className={t.compliance === "exceeds" ? "bg-red-50" : ""}><Td>{i + 1}</Td><Td>{t.parameters?.name}</Td><Td>{t.unit}</Td><Td className="text-xs">{t.test_methods?.code}</Td>
            <Td className="font-medium">{fmtResult(t.result_value, t.result_text, t.parameters?.decimals)}</Td><Td>{t.limit_text ?? "—"}</Td><Td><StatusBadge status={t.compliance === "na" ? null : t.compliance} /></Td></tr>
        ))}
      </Table>
      <Card title="Report text & workflow">
        <ActionForm action={updateReport} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="ULR no. (if NABL)"><Input name="ulr_no" defaultValue={r.ulr_no ?? ""} disabled={!editable} /></Field>
            <Field label="Statement of conformity / opinion" className="md:col-span-2"><Textarea name="opinion" defaultValue={r.opinion ?? defaultOpinion} disabled={!editable} rows={2} /></Field>
            <Field label="Remarks" className="md:col-span-3"><Textarea name="remarks" defaultValue={r.remarks ?? ""} disabled={!editable} rows={2} /></Field>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {editable ? <WorkflowButton intent="save" label="Save" variant="secondary" /> : null}
            {editable && r.status === "draft" ? <WorkflowButton intent="checked" label="Mark checked" variant="secondary" /> : null}
            {editable && can(profile, "tech_manager") && ["draft", "checked"].includes(r.status) ? <WorkflowButton intent="approved" label="Approve & lock" confirm="Approve this report? Results will be locked." /> : null}
            {can(profile, "tech_manager", "accounts") && r.status === "approved" ? <WorkflowButton intent="issued" label="Mark issued to client" /> : null}
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}

function WorkflowButton({ intent, label, variant, confirm }: { intent: string; label: string; variant?: "primary" | "secondary"; confirm?: string }) {
  return <SubmitButton variant={variant} confirm={confirm} name="intent" value={intent}>{label}</SubmitButton>;
}
