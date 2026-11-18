"use client";

import { useMemo, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { MATRIX_LABELS } from "@/lib/constants";
import { inr, isoDate } from "@/lib/format";
import { saveQuotation } from "./actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Opt = { value: string; label: string };
type Param = { id: string; name: string; code: string; matrix: string; unit: string | null; default_rate: number };
type SampleType = { id: string; name: string; code: string; matrix: string };
type Item = { key: number; item_type: string; sample_type_id: string | null; parameter_id: string | null; description: string; frequency: string | null; quantity: number; rate: number };

let k = 1;

export function QuoteBuilder({ quotation, items: initial, clients, contacts, sampleTypes, params, frequencies, defaultTerms, defaultGst, defaultClient }: {
  quotation?: any; items?: any[]; clients: Opt[]; contacts: (Opt & { client_id: string })[]; sampleTypes: SampleType[]; params: Param[];
  frequencies: string[]; defaultTerms: string; defaultGst: number; defaultClient?: string;
}) {
  const q = quotation ?? {};
  const [clientId, setClientId] = useState<string>(q.client_id ?? defaultClient ?? "");
  const [items, setItems] = useState<Item[]>((initial ?? []).map((i) => ({ ...i, key: k++ })));
  const [discount, setDiscount] = useState<number>(Number(q.discount_pct ?? 0));
  const [gst, setGst] = useState<number>(Number(q.gst_pct ?? defaultGst));
  const [stId, setStId] = useState<string>(sampleTypes[0]?.id ?? "");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState(1);
  const [freq, setFreq] = useState(frequencies[0] ?? "One-time");

  const st = sampleTypes.find((s) => s.id === stId);
  const available = useMemo(() => params.filter((p) => p.matrix === st?.matrix), [params, st]);
  const subtotal = items.reduce((a, i) => a + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const discAmt = Math.round(subtotal * discount) / 100;
  const taxable = subtotal - discAmt;
  const gstAmt = Math.round(taxable * gst) / 100;

  function addPicked() {
    const rows = available.filter((p) => picked.has(p.id)).map((p) => ({
      key: k++, item_type: "parameter", sample_type_id: stId, parameter_id: p.id,
      description: `${p.name}${p.unit && p.unit !== "—" ? ` (${p.unit})` : ""} – ${st?.name}`, frequency: freq, quantity: qty, rate: Number(p.default_rate) || 0,
    }));
    setItems([...items, ...rows]);
    setPicked(new Set());
  }
  function addPackage() {
    const sel = available.filter((p) => picked.has(p.id));
    if (!sel.length) return;
    setItems([...items, { key: k++, item_type: "package", sample_type_id: stId, parameter_id: null,
      description: `${st?.name} analysis – ${sel.map((p) => p.name.replace(/\s*\(.*\)$/, "")).join(", ")}`,
      frequency: freq, quantity: qty, rate: sel.reduce((a, p) => a + Number(p.default_rate || 0), 0) }]);
    setPicked(new Set());
  }
  const update = (key: number, patch: Partial<Item>) => setItems(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  return (
    <ActionForm action={saveQuotation} className="space-y-6">
      {q.id ? <input type="hidden" name="id" value={q.id} /> : null}
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <Card title="Quotation details">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Client" required className="md:col-span-2">
            <Select name="client_id" value={clientId} onChange={(e) => setClientId(e.target.value)} options={clients} placeholder="Select client…" required />
          </Field>
          <Field label="Kind attention"><Select name="contact_id" defaultValue={q.contact_id ?? ""} options={contacts.filter((c) => c.client_id === clientId)} placeholder="—" /></Field>
          <Field label="Quote date"><Input type="date" name="quote_date" defaultValue={q.quote_date ?? isoDate()} /></Field>
          <Field label="Subject" className="md:col-span-3"><Input name="subject" defaultValue={q.subject ?? "Quotation for environmental monitoring & analysis services"} /></Field>
          <Field label="Valid until"><Input type="date" name="valid_until" defaultValue={q.valid_until ?? isoDate(30)} /></Field>
        </div>
      </Card>

      <Card title="Add services & parameters">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Sample type"><Select value={stId} onChange={(e) => { setStId(e.target.value); setPicked(new Set()); }} options={sampleTypes.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))} /></Field>
          <Field label="Frequency"><Select value={freq} onChange={(e) => setFreq(e.target.value)} options={frequencies} /></Field>
          <Field label="No. of samples / visits"><Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
          <div className="flex items-end gap-2">
            <Button type="button" onClick={addPicked} disabled={!picked.size}>Add as lines</Button>
            <Button type="button" variant="secondary" onClick={addPackage} disabled={!picked.size}>Add as package</Button>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>{MATRIX_LABELS[st?.matrix ?? ""]} parameters · {picked.size} selected</span>
            <button type="button" className="text-teal-700 hover:underline" onClick={() => setPicked(picked.size === available.length ? new Set() : new Set(available.map((p) => p.id)))}>
              {picked.size === available.length ? "Clear" : "Select all"}
            </button>
          </div>
          <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={picked.has(p.id)} onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(p.id); else n.delete(p.id); setPicked(n); }} />
                <span className="flex-1">{p.name}</span><span className="text-xs text-slate-400">{inr(p.default_rate, false)}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Sampling charges", "Transportation charges", "Stack monitoring – per stack", "Ambient air monitoring – per location (24 h)", "Noise monitoring – per location", "Report preparation"].map((s) => (
              <Button key={s} type="button" variant="ghost" className="border border-dashed border-slate-300 text-xs"
                onClick={() => setItems([...items, { key: k++, item_type: "service", sample_type_id: null, parameter_id: null, description: s, frequency: freq, quantity: qty, rate: 0 }])}>+ {s}</Button>
            ))}
            <Button type="button" variant="ghost" className="border border-dashed border-slate-300 text-xs"
              onClick={() => setItems([...items, { key: k++, item_type: "service", sample_type_id: null, parameter_id: null, description: "", frequency: freq, quantity: 1, rate: 0 }])}>+ Custom line</Button>
          </div>
        </div>
      </Card>

      <Card title={`Line items (${items.length})`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="p-2">#</th><th className="p-2">Description</th><th className="p-2">Frequency</th><th className="p-2 w-24">Qty</th><th className="p-2 w-32">Rate (₹)</th><th className="p-2 text-right">Amount</th><th /></tr></thead>
            <tbody>
              {items.map((i, n) => (
                <tr key={i.key} className="border-t border-slate-100">
                  <td className="p-2 text-slate-400">{n + 1}</td>
                  <td className="p-2"><Input value={i.description} onChange={(e) => update(i.key, { description: e.target.value })} /></td>
                  <td className="p-2"><Select value={i.frequency ?? ""} onChange={(e) => update(i.key, { frequency: e.target.value })} options={frequencies} placeholder="—" /></td>
                  <td className="p-2"><Input type="number" min={0} step="any" value={i.quantity} onChange={(e) => update(i.key, { quantity: Number(e.target.value) })} /></td>
                  <td className="p-2"><Input type="number" min={0} step="any" value={i.rate} onChange={(e) => update(i.key, { rate: Number(e.target.value) })} /></td>
                  <td className="p-2 text-right font-medium">{inr((Number(i.quantity) || 0) * (Number(i.rate) || 0), false)}</td>
                  <td className="p-2"><button type="button" className="text-xs text-red-600" onClick={() => setItems(items.filter((x) => x.key !== i.key))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length ? <p className="py-6 text-center text-sm text-slate-400">Pick parameters above to add lines.</p> : null}
        </div>
        <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-2"><span>Discount %</span><Input name="discount_pct" type="number" step="any" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 text-right" /></div>
          <div className="flex justify-between text-slate-500"><span>Discount</span><span>− {inr(discAmt)}</span></div>
          <div className="flex items-center justify-between gap-2"><span>GST %</span><Input name="gst_pct" type="number" step="any" min={0} value={gst} onChange={(e) => setGst(Number(e.target.value))} className="w-24 text-right" /></div>
          <div className="flex justify-between text-slate-500"><span>GST</span><span>{inr(gstAmt)}</span></div>
          <div className="flex justify-between border-t pt-1.5 text-base font-semibold"><span>Total</span><span>{inr(taxable + gstAmt)}</span></div>
        </div>
      </Card>

      <Card title="Terms & notes">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Terms & conditions"><Textarea name="terms" rows={6} defaultValue={q.terms ?? defaultTerms} /></Field>
          <Field label="Internal notes"><Textarea name="notes" rows={6} defaultValue={q.notes} /></Field>
        </div>
      </Card>
      <div className="flex justify-end"><SubmitButton>Save quotation</SubmitButton></div>
    </ActionForm>
  );
}
