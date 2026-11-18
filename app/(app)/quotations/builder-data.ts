import "server-only";
import { getClientOptions, getLookups } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function builderData() {
  const supabase = await createClient();
  const [clients, contacts, sampleTypes, params, lookups, settings] = await Promise.all([
    getClientOptions(),
    supabase.from("client_contacts").select("id,name,client_id").order("name"),
    supabase.from("sample_types").select("id,name,code,matrix").eq("is_active", true).order("sort_order"),
    supabase.from("parameters").select("id,name,code,matrix,unit,default_rate").eq("is_active", true).order("sort_order"),
    getLookups("frequency", "service_item"),
    supabase.from("app_settings").select("quotation_terms,default_gst_pct").single(),
  ]);
  return {
    clients,
    contacts: (contacts.data ?? []).map((c) => ({ value: c.id, label: c.name, client_id: c.client_id })),
    sampleTypes: sampleTypes.data ?? [],
    params: params.data ?? [],
    frequencies: lookups.frequency,
    serviceItems: lookups.service_item,
    defaultTerms: settings.data?.quotation_terms ?? "",
    defaultGst: Number(settings.data?.default_gst_pct ?? 18),
  };
}
