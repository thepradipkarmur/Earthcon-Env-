import { PageHeader } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getClientOptions, getLookups, getStaffOptions } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { SampleForm } from "../sample-form";

export const metadata = { title: "Register sample" };

export default async function NewSample({ searchParams }: { searchParams: Promise<{ task?: string; po?: string; client?: string }> }) {
  const sp = await searchParams;
  const me = await getProfile();
  const supabase = await createClient();
  const [clients, staff, lookups, sites, pos, sampleTypes, standards, limits, params, task, qItems] = await Promise.all([
    getClientOptions(), getStaffOptions(),
    getLookups("container", "preservation", "sample_condition", "weather", "stack_source", "fuel", "noise_zone"),
    supabase.from("client_sites").select("id,name,client_id"),
    supabase.from("purchase_orders").select("id,po_number,client_id,quotation_id").eq("status", "active"),
    supabase.from("sample_types").select("id,name,code,matrix").eq("is_active", true).order("sort_order"),
    supabase.from("standards").select("id,name,matrix,client_id").eq("is_active", true).order("name"),
    supabase.from("standard_limits").select("standard_id,parameter_id"),
    supabase.from("parameters").select("id,name,unit,matrix").eq("is_active", true).order("sort_order"),
    sp.task ? supabase.from("tasks").select("*").eq("id", sp.task).single() : Promise.resolve({ data: null }),
    supabase.from("quotation_items").select("quotation_id,sample_type_id,parameter_id").not("parameter_id", "is", null),
  ]);
  // Map "poId:sampleTypeId" → parameter ids quoted for that PO
  const quoteParams: Record<string, string[]> = {};
  for (const po of pos.data ?? []) {
    for (const qi of (qItems.data ?? []).filter((i) => i.quotation_id === po.quotation_id)) {
      const key = `${po.id}:${qi.sample_type_id}`;
      (quoteParams[key] ??= []).push(qi.parameter_id);
    }
  }
  const t = task.data;
  const defaults: Record<string, string> = {};
  if (t) Object.assign(defaults, { task_id: t.id, client_id: t.client_id ?? "", site_id: t.site_id ?? "", po_id: t.po_id ?? "", sample_type_id: t.sample_type_id ?? "" });
  if (sp.client) defaults.client_id = sp.client;
  if (sp.po) defaults.po_id = sp.po;

  return (
    <div>
      <PageHeader title="Register sample" step={5} subtitle={t ? `For task ${t.task_no} – ${t.title}` : "A unique sample ID is generated on save"} />
      <SampleForm clients={clients} staff={staff} lookups={lookups} sites={sites.data ?? []} pos={pos.data ?? []} tasks={[]}
        sampleTypes={sampleTypes.data ?? []} standards={standards.data ?? []} limits={limits.data ?? []} params={params.data ?? []}
        quoteParams={quoteParams} defaults={defaults} meId={me.id} />
    </div>
  );
}
