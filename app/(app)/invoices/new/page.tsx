import { PageHeader } from "@/components/ui";
import { getClientOptions } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { InvoiceForm } from "../invoice-form";

export const metadata = { title: "New invoice" };
/* eslint-disable @typescript-eslint/no-explicit-any */

const STATES = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

export default async function NewInvoice({ searchParams }: { searchParams: Promise<{ po?: string; client?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [clients, pos, samples, invoiced, qItems, params, settings] = await Promise.all([
    getClientOptions(),
    supabase.from("purchase_orders").select("id,po_number,po_value,client_id,quotation_id").neq("status", "cancelled"),
    supabase.from("samples").select("id,sample_no,client_id,po_id,sampling_point,sample_type_id,sample_types(name),sample_tests(parameter_id)").in("status", ["tested", "reported"]),
    supabase.from("invoice_items").select("sample_id,invoices!inner(status)").not("sample_id", "is", null).neq("invoices.status", "cancelled"),
    supabase.from("quotation_items").select("quotation_id,sample_type_id,parameter_id,description,quantity,rate,quotations(discount_pct)").order("line_no"),
    supabase.from("parameters").select("id,default_rate"),
    supabase.from("app_settings").select("default_gst_pct,state_name").single(),
  ]);
  const billed = new Set((invoiced.data ?? []).map((r: any) => r.sample_id));
  const rateMap = new Map((params.data ?? []).map((p) => [p.id, Number(p.default_rate)]));
  const poMap = new Map((pos.data ?? []).map((p) => [p.id, p]));
  const quoteLines: Record<string, any[]> = {};
  for (const q of qItems.data ?? []) (quoteLines[q.quotation_id] ??= []).push(q);

  const sampleRows = (samples.data as any[] ?? []).filter((s) => !billed.has(s.id)).map((s) => {
    const qid = s.po_id ? poMap.get(s.po_id)?.quotation_id : null;
    const ql = qid ? quoteLines[qid] ?? [] : [];
    const rate = s.sample_tests.reduce((a: number, t: any) => {
      const q = ql.find((l) => l.parameter_id === t.parameter_id && (!l.sample_type_id || l.sample_type_id === s.sample_type_id));
      return a + (q ? Number(q.rate) : rateMap.get(t.parameter_id) ?? 0);
    }, 0);
    return { id: s.id, sample_no: s.sample_no, client_id: s.client_id, po_id: s.po_id, sampling_point: s.sampling_point, type_name: s.sample_types?.name, suggested_rate: rate };
  });
  const po = sp.po ? poMap.get(sp.po) : null;

  return (
    <div>
      <PageHeader title="New invoice" step={8} subtitle="GST tax invoice · SAC 998346 (technical testing & analysis)" />
      <InvoiceForm clients={clients} pos={pos.data ?? []} samples={sampleRows} quoteLines={quoteLines} states={STATES}
        defaultGst={Number(settings.data?.default_gst_pct ?? 18)} homeState={settings.data?.state_name ?? "Gujarat"}
        defaults={{ client_id: po?.client_id ?? sp.client ?? "", po_id: po?.id ?? "" }} />
    </div>
  );
}
