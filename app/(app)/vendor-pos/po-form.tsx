"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ComboSelect } from "@/components/combo-select";
import { LineItems, type Line } from "@/components/line-items";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import { isoDate } from "@/lib/format";
import { saveVendorPO } from "./actions";

type V = { id: string; name: string; vendor_code: string; state: string; payment_terms: string | null };

export function VendorPoForm({ vendors, homeState, units, paymentTerms, defaults, lines, quote, terms, deliveryAddress }: {
  vendors: V[]; homeState: string; units: string[]; paymentTerms: string[]; defaults: { vendor_id?: string; vendor_quotation_id?: string };
  lines: Line[]; quote?: { gst_pct: number; discount_amount: number; label: string } | null; terms: string; deliveryAddress: string;
}) {
  const [vendorId, setVendorId] = useState(defaults.vendor_id ?? "");
  const v = vendors.find((x) => x.id === vendorId);
  const interstate = v ? v.state.toLowerCase() !== homeState.toLowerCase() : null;
  const [pt, setPt] = useState(v?.payment_terms ?? "");

  return (
    <ActionForm action={saveVendorPO} className="space-y-6">
      {defaults.vendor_quotation_id ? <input type="hidden" name="vendor_quotation_id" value={defaults.vendor_quotation_id} /> : null}
      <Card title="Purchase order">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Vendor" required className="md:col-span-2" hint={<Link href="/vendors/new" className="text-teal-700 hover:underline">+ New vendor</Link>}>
            <Select name="vendor_id" value={vendorId} required placeholder="Select…"
              onChange={(e) => { setVendorId(e.target.value); setPt(vendors.find((x) => x.id === e.target.value)?.payment_terms ?? ""); }}
              options={vendors.map((x) => ({ value: x.id, label: `${x.name} (${x.vendor_code})` }))} />
          </Field>
          <Field label="PO date"><Input type="date" name="po_date" defaultValue={isoDate()} /></Field>
          <Field label="Required delivery by"><Input type="date" name="delivery_date" /></Field>
          <Field label="Payment terms" className="md:col-span-2"><ComboSelect name="payment_terms" value={pt} onChange={setPt} options={paymentTerms} category="payment_terms" placeholder="—" /></Field>
          <Field label="Deliver to" className="md:col-span-2"><Input name="delivery_address" defaultValue={deliveryAddress} /></Field>
          {quote ? <p className="text-xs text-slate-500 md:col-span-4">Based on vendor quotation {quote.label}</p> : null}
          {interstate !== null ? <p className="text-xs text-slate-500 md:col-span-4">Vendor in {v?.state} → {interstate ? "IGST" : "CGST + SGST"}</p> : null}
        </div>
      </Card>
      <Card title="Items"><LineItems initial={lines} units={units} gstPct={quote?.gst_pct ?? 18} discount={quote?.discount_amount ?? 0} interstate={interstate} /></Card>
      <Card title="Terms & notes">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Terms & conditions (printed on PO)"><Textarea name="terms" rows={5} defaultValue={terms} /></Field>
          <Field label="Internal notes"><Textarea name="notes" rows={5} /></Field>
        </div>
      </Card>
      <div className="flex justify-end gap-2">
        <SubmitButton variant="secondary">Save as draft</SubmitButton>
        <SubmitButton name="send" value="1">Save &amp; mark as sent</SubmitButton>
      </div>
    </ActionForm>
  );
}
