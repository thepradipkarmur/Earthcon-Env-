import { ActionForm, SubmitButton } from "@/components/action-form";
import { ComboSelect } from "@/components/combo-select";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import { saveVendor } from "./actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function VendorForm({ vendor, lookups, clients }: { vendor?: any; lookups: Record<string, string[]>; clients: { value: string; label: string }[] }) {
  const v = vendor ?? {};
  return (
    <ActionForm action={saveVendor} className="space-y-6">
      {v.id ? <input type="hidden" name="id" value={v.id} /> : null}
      <Card title="Company">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Vendor / supplier name" required className="md:col-span-2"><Input name="name" defaultValue={v.name} required /></Field>
          <Field label="Category"><ComboSelect name="category" defaultValue={v.category ?? ""} options={lookups.vendor_category} category="vendor_category" placeholder="Select…" /></Field>
          <Field label="GSTIN"><Input name="gstin" defaultValue={v.gstin} maxLength={15} /></Field>
          <Field label="PAN"><Input name="pan" defaultValue={v.pan} maxLength={10} /></Field>
          <Field label="MSME / Udyam no."><Input name="msme_no" defaultValue={v.msme_no} /></Field>
          <Field label="Also a client?" hint="Link if this company also buys testing services from you" className="md:col-span-2">
            <Select name="client_id" defaultValue={v.client_id ?? ""} options={clients} placeholder="Not a client" />
          </Field>
          <Field label="Rating"><Select name="rating" defaultValue={v.rating ? String(v.rating) : ""} options={["5", "4", "3", "2", "1"].map((r) => ({ value: r, label: "★".repeat(Number(r)) }))} placeholder="Not rated" /></Field>
        </div>
      </Card>
      <Card title="Address">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Address" className="md:col-span-3"><Textarea name="address" defaultValue={v.address} rows={2} /></Field>
          <Field label="City"><Input name="city" defaultValue={v.city} /></Field>
          <Field label="District"><ComboSelect name="district" defaultValue={v.district ?? ""} options={lookups.district} category="district" placeholder="—" /></Field>
          <Field label="State" hint="Outside Gujarat → IGST on POs"><ComboSelect name="state" defaultValue={v.state ?? "Gujarat"} options={lookups.state} category="state" /></Field>
          <Field label="PIN code"><Input name="pincode" defaultValue={v.pincode} maxLength={6} /></Field>
        </div>
      </Card>
      <Card title="Contact & terms">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Contact person"><Input name="contact_name" defaultValue={v.contact_name} /></Field>
          <Field label="Designation"><Input name="contact_designation" defaultValue={v.contact_designation} /></Field>
          <Field label="Email" hint="Used for “Email PO to vendor”"><Input name="email" type="email" defaultValue={v.email} /></Field>
          <Field label="Phone"><Input name="phone" defaultValue={v.phone} /></Field>
          <Field label="Default payment terms" className="md:col-span-2"><ComboSelect name="payment_terms" defaultValue={v.payment_terms ?? ""} options={lookups.payment_terms} category="payment_terms" placeholder="—" /></Field>
          <Field label="Bank details" className="md:col-span-2"><Textarea name="bank_details" defaultValue={v.bank_details} rows={2} placeholder="Bank, A/c no., IFSC" /></Field>
          <Field label="Notes" className="md:col-span-4"><Textarea name="notes" defaultValue={v.notes} rows={2} /></Field>
        </div>
        {v.id ? <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={v.is_active} /> Active vendor</label> : null}
      </Card>
      <div className="flex justify-end"><SubmitButton>{v.id ? "Save changes" : "Add vendor"}</SubmitButton></div>
    </ActionForm>
  );
}
