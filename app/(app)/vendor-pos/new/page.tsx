import { toLines } from "@/lib/lines";
import { PageHeader } from "@/components/ui";
import { getLookups } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { VendorPoForm } from "../po-form";

export const metadata = { title: "New purchase order" };

const TERMS = `1. Please quote our PO number on your invoice and delivery challan.
2. Goods must match the specification and carry batch / CoA where applicable.
3. Delivery to the address mentioned; partial deliveries only with prior approval.
4. Payment as per the payment terms above, against a valid GST invoice.`;

export default async function NewVendorPO({ searchParams }: { searchParams: Promise<{ vendor?: string; vq?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: vendors }, lk, { data: settings }, vq] = await Promise.all([
    supabase.from("vendors").select("id,name,vendor_code,state,payment_terms").eq("is_active", true).order("name"),
    getLookups("unit", "payment_terms"),
    supabase.from("app_settings").select("state_name,lab_name,address").single(),
    sp.vq ? supabase.from("vendor_quotations").select("id,vq_no,vendor_ref,vendor_id,gst_pct,discount_amount,vendor_quotation_items(description,unit,quantity,rate,line_no)").eq("id", sp.vq).single() : Promise.resolve({ data: null }),
  ]);
  const q = vq.data as null | { id: string; vq_no: string; vendor_ref: string | null; vendor_id: string; gst_pct: number; discount_amount: number; vendor_quotation_items: { description: string; unit: string | null; quantity: number; rate: number; line_no: number }[] };
  const lines = q ? toLines([...q.vendor_quotation_items].sort((a, b) => a.line_no - b.line_no)) : [];
  return (
    <div>
      <PageHeader title="New purchase order" subtitle="Order goods or services from a vendor" />
      <VendorPoForm vendors={vendors ?? []} homeState={settings?.state_name ?? "Gujarat"} units={lk.unit} paymentTerms={lk.payment_terms}
        defaults={{ vendor_id: q?.vendor_id ?? sp.vendor, vendor_quotation_id: q?.id }} lines={lines}
        quote={q ? { gst_pct: Number(q.gst_pct), discount_amount: Number(q.discount_amount), label: `${q.vq_no}${q.vendor_ref ? ` (their ref ${q.vendor_ref})` : ""}` } : null}
        terms={TERMS} deliveryAddress={[settings?.lab_name, settings?.address].filter(Boolean).join(", ")} />
    </div>
  );
}
