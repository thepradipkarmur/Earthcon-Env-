import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import { saveClient } from "./actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ClientForm({ client, lookups }: { client?: any; lookups: Record<string, string[]> }) {
  const c = client ?? {};
  return (
    <ActionForm action={saveClient} className="space-y-6">
      {c.id ? <input type="hidden" name="id" value={c.id} /> : null}
      <Card title="Company">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Company / Industry name" required className="md:col-span-2"><Input name="name" defaultValue={c.name} required /></Field>
          <Field label="Industry sector"><Select name="industry_sector" defaultValue={c.industry_sector ?? ""} options={lookups.industry_sector} placeholder="Select…" /></Field>
          <Field label="GPCB category"><Select name="pcb_category" defaultValue={c.pcb_category ?? ""} options={lookups.pcb_category} placeholder="Select…" /></Field>
          <Field label="GSTIN"><Input name="gstin" defaultValue={c.gstin} maxLength={15} placeholder="24ABCDE1234F1Z5" /></Field>
          <Field label="PAN"><Input name="pan" defaultValue={c.pan} maxLength={10} /></Field>
        </div>
      </Card>
      <Card title="Location">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Address" className="md:col-span-3"><Textarea name="address" defaultValue={c.address} rows={2} /></Field>
          <Field label="City / Village"><Input name="city" defaultValue={c.city} /></Field>
          <Field label="District"><Select name="district" defaultValue={c.district ?? ""} options={lookups.district} placeholder="Select…" /></Field>
          <Field label="GIDC / Industrial estate"><Select name="gidc_estate" defaultValue={c.gidc_estate ?? ""} options={lookups.gidc_estate} placeholder="Select…" /></Field>
          <Field label="State"><Input name="state" defaultValue={c.state ?? "Gujarat"} /></Field>
          <Field label="PIN code"><Input name="pincode" defaultValue={c.pincode} maxLength={6} /></Field>
        </div>
      </Card>
      <Card title="Regulatory (GPCB)">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="CCA / Consent no."><Input name="cca_number" defaultValue={c.cca_number} /></Field>
          <Field label="CCA valid up to"><Input type="date" name="cca_valid_upto" defaultValue={c.cca_valid_upto ?? ""} /></Field>
          <Field label="XGN industry ID"><Input name="xgn_id" defaultValue={c.xgn_id} /></Field>
          <Field label="Effluent discharge route"><Select name="effluent_discharge_route" defaultValue={c.effluent_discharge_route ?? ""} options={lookups.discharge_route} placeholder="Select…" /></Field>
        </div>
      </Card>
      {!c.id ? (
        <Card title="Primary contact">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Name"><Input name="contact_name" /></Field>
            <Field label="Designation"><Input name="contact_designation" placeholder="EHS Manager" /></Field>
            <Field label="Email"><Input name="contact_email" type="email" /></Field>
            <Field label="Phone"><Input name="contact_phone" /></Field>
          </div>
        </Card>
      ) : null}
      <Card title="Notes">
        <Textarea name="notes" defaultValue={c.notes} />
        {c.id ? <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={c.is_active} /> Active client</label> : null}
      </Card>
      <div className="flex justify-end"><SubmitButton>{c.id ? "Save changes" : "Register client"}</SubmitButton></div>
    </ActionForm>
  );
}
