import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ActionForm, SubmitButton, type ActionState } from "@/components/action-form";
import { Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { formToObject } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };
const F = ["lab_name", "doc_prefix", "address", "phone", "email", "gstin", "state_code", "state_name", "default_sac", "bank_details", "quotation_terms", "invoice_terms", "report_footer"];

async function save(_: ActionState, fd: FormData): Promise<ActionState> {
  "use server";
  const supabase = await createClient();
  const row = { ...formToObject(fd, F), default_gst_pct: Number(fd.get("default_gst_pct") || 18) };
  const { error } = await supabase.from("app_settings").update(row).eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: "Settings saved" };
}

export default async function Settings() {
  const me = await getProfile();
  if (me.role !== "admin") redirect("/");
  const supabase = await createClient();
  const { data: s } = await supabase.from("app_settings").select("*").single();
  return (
    <div>
      <PageHeader title="Settings" subtitle="Appears on quotations, reports and invoices (all optional)" />
      <ActionForm action={save} className="space-y-6">
        <Card title="Lab">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Lab name"><Input name="lab_name" defaultValue={s?.lab_name} /></Field>
            <Field label="Document prefix" hint="Used in numbers, e.g. EL/QT/2026-27/0001"><Input name="doc_prefix" defaultValue={s?.doc_prefix} maxLength={4} /></Field>
            <Field label="GSTIN"><Input name="gstin" defaultValue={s?.gstin ?? ""} /></Field>
            <Field label="Address" className="md:col-span-3"><Textarea name="address" defaultValue={s?.address ?? ""} rows={2} /></Field>
            <Field label="Phone"><Input name="phone" defaultValue={s?.phone ?? ""} /></Field>
            <Field label="Email"><Input name="email" defaultValue={s?.email ?? ""} /></Field>
            <Field label="State / code"><div className="flex gap-2"><Input name="state_name" defaultValue={s?.state_name} /><Input name="state_code" defaultValue={s?.state_code} className="w-20" /></div></Field>
            <Field label="Default GST %"><Input name="default_gst_pct" type="number" step="any" defaultValue={s?.default_gst_pct} /></Field>
            <Field label="Default SAC"><Input name="default_sac" defaultValue={s?.default_sac} /></Field>
          </div>
        </Card>
        <Card title="Documents">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Bank details (invoice)"><Textarea name="bank_details" defaultValue={s?.bank_details ?? ""} rows={4} /></Field>
            <Field label="Report footer"><Textarea name="report_footer" defaultValue={s?.report_footer ?? ""} rows={4} /></Field>
            <Field label="Quotation terms"><Textarea name="quotation_terms" defaultValue={s?.quotation_terms ?? ""} rows={6} /></Field>
            <Field label="Invoice terms"><Textarea name="invoice_terms" defaultValue={s?.invoice_terms ?? ""} rows={6} /></Field>
          </div>
        </Card>
        <div className="flex justify-end"><SubmitButton>Save settings</SubmitButton></div>
      </ActionForm>
    </div>
  );
}
