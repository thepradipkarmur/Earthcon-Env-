import { notFound } from "next/navigation";
import { Button, Card, LinkButton, Notice, PageHeader, Select, StatusBadge } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addTest } from "../actions";
import { ResultsForm } from "../results-form";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function EnterResults({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: s } = await supabase.from("samples").select("id,sample_no,status,clients(name),sample_types(name,matrix),standards(name)").eq("id", id).single() as { data: any };
  if (!s) notFound();
  const [{ data: tests }, { data: methods }, { data: instruments }, { data: reports }, { data: paramList }] = await Promise.all([
    supabase.from("sample_tests").select("*,parameters(name),analyst:profiles!sample_tests_analyst_id_fkey(full_name)").eq("sample_id", id).order("sort_order"),
    supabase.from("test_methods").select("id,code").eq("is_active", true).order("code"),
    supabase.from("instruments").select("id,name,instrument_id_no").eq("is_active", true).order("name"),
    supabase.from("reports").select("id,status,is_locked").eq("sample_id", id),
    supabase.from("parameters").select("id,name").eq("matrix", s.sample_types?.matrix).eq("is_active", true).order("sort_order"),
  ]);
  const locked = (reports ?? []).some((r) => r.is_locked && ["approved", "issued"].includes(r.status));
  const existing = new Set((tests ?? []).map((t) => t.parameter_id));
  const canEdit = can(profile, "analyst", "tech_manager");

  return (
    <div className="space-y-4">
      <PageHeader title={`Results · ${s.sample_no}`} step={6} subtitle={<>{s.clients?.name} · {s.sample_types?.name} · Standard: {s.standards?.name ?? "none"} · <StatusBadge status={s.status} /></>}
        actions={<LinkButton href={`/samples/${id}`} variant="secondary">Sample details</LinkButton>} />
      {locked ? <Notice>An approved report exists for this sample, so results are locked. A Technical Manager can cancel the report and create a revision.</Notice> : null}
      {!canEdit ? <Notice>Your role can view results but not enter them.</Notice> : null}
      <ResultsForm sampleId={id} tests={tests ?? []} canReview={can(profile, "tech_manager")} locked={locked || !canEdit}
        methods={(methods ?? []).map((m) => ({ value: m.id, label: m.code }))}
        instruments={(instruments ?? []).map((i) => ({ value: i.id, label: `${i.name}${i.instrument_id_no ? ` (${i.instrument_id_no})` : ""}` }))} />
      {!locked && canEdit ? (
        <Card title="Add parameter to this sample">
          <form action={addTest} className="flex gap-2"><input type="hidden" name="sample_id" value={id} />
            <Select name="parameter_id" options={(paramList ?? []).filter((p) => !existing.has(p.id)).map((p) => ({ value: p.id, label: p.name }))} placeholder="Select parameter…" className="max-w-sm" />
            <Button variant="secondary">Add</Button></form>
        </Card>
      ) : null}
    </div>
  );
}
