import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { LineItems } from "@/components/line-items";
import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { getLookups } from "@/lib/data";
import { isoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { saveVendorQuote } from "../actions";

export const metadata = { title: "Record vendor quotation" };

export default async function NewVendorQuote({ searchParams }: { searchParams: Promise<{ vendor?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: vendors }, lk] = await Promise.all([
    supabase.from("vendors").select("id,name,vendor_code").eq("is_active", true).order("name"),
    getLookups("unit"),
  ]);
  return (
    <div>
      <PageHeader title="Record vendor quotation" subtitle="Enter a quotation you received from a vendor and attach their copy" />
      <ActionForm action={saveVendorQuote} className="space-y-6">
        <Card title="Quotation">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Vendor" required className="md:col-span-2" hint={<Link href="/vendors/new" className="text-teal-700 hover:underline">+ New vendor</Link>}>
              <Select name="vendor_id" defaultValue={sp.vendor ?? ""} options={(vendors ?? []).map((v) => ({ value: v.id, label: `${v.name} (${v.vendor_code})` }))} placeholder="Select…" required />
            </Field>
            <Field label="Vendor's quotation no."><Input name="vendor_ref" /></Field>
            <Field label="Quotation date"><Input type="date" name="quote_date" defaultValue={isoDate()} /></Field>
            <Field label="Subject" className="md:col-span-2"><Input name="subject" placeholder="e.g. Chemicals for COD / BOD analysis" /></Field>
            <Field label="Valid until"><Input type="date" name="valid_until" /></Field>
            <Field label="Vendor's copy (PDF / image)"><Input type="file" name="file" accept="application/pdf,image/*" /></Field>
          </div>
        </Card>
        <Card title="Items"><LineItems units={lk.unit} /></Card>
        <Card title="Notes"><Textarea name="notes" /></Card>
        <div className="flex justify-end"><SubmitButton>Save quotation</SubmitButton></div>
      </ActionForm>
    </div>
  );
}
