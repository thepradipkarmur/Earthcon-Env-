"use client";

import Link from "next/link";
import { useState } from "react";
import { ComboSelect } from "@/components/combo-select";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { inr, isoDate } from "@/lib/format";
import { saveInvoice } from "./actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Opt = { value: string; label: string };
type Line = { key: number; description: string; sac: string; sample_id: string | null; quantity: number; rate: number };
let k = 1;

export function InvoiceForm({ clients, pos, samples, quoteLines, states, defaultGst, defaults, homeState }: {
  clients: Opt[]; pos: any[]; samples: any[]; quoteLines: Record<string, any[]>; states: string[]; defaultGst: number; defaults: Record<string, string>; homeState: string;
}) {
  const [clientId, setClientId] = useState(defaults.client_id ?? "");
  const [poId, setPoId] = useState(defaults.po_id ?? "");
  const [lines, setLines] = useState<Line[]>([]);
  const [gst, setGst] = useState(defaultGst);
  const [disc, setDisc] = useState(0);
  const [pos_, setPos] = useState(homeState);
  const po = pos.find((p) => p.id === poId);
  const clientSamples = samples.filter((s) => s.client_id === clientId && (!poId || s.po_id === poId));
  const sub = lines.reduce((a, l) => a + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0);
  const taxable = sub - disc, tax = Math.round(taxable * gst) / 100;
  const interstate = pos_.toLowerCase() !== homeState.toLowerCase();
  const upd = (key: number, patch: Partial<Line>) => setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const today = isoDate();

  return (
    <ActionForm action={saveInvoice} className="space-y-6">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <Card title="Invoice">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Client" required className="md:col-span-2" hint={<Link href="/clients/new" className="text-teal-700 hover:underline">+ New client</Link>}><Select name="client_id" value={clientId} onChange={(e) => { setClientId(e.target.value); setPoId(""); }} options={clients} placeholder="Select…" required /></Field>
          <Field label="Purchase order"><Select name="po_id" value={poId} onChange={(e) => setPoId(e.target.value)} options={pos.filter((p) => p.client_id === clientId).map((p) => ({ value: p.id, label: `${p.po_number} (${inr(p.po_value)})` }))} placeholder="—" /></Field>
          <Field label="Place of supply" hint={interstate ? "Inter-state → IGST" : "Intra-state → CGST + SGST"}><ComboSelect name="place_of_supply" value={pos_} onChange={setPos} options={states} category="state" /></Field>
          <Field label="Invoice date"><Input type="date" name="invoice_date" defaultValue={today} /></Field>
          <Field label="Due date"><Input type="date" name="due_date" defaultValue={isoDate(30)} /></Field>
          <Field label="GST %"><Input type="number" step="any" name="gst_pct" value={gst} onChange={(e) => setGst(Number(e.target.value))} /></Field>
          <Field label="Discount (₹)"><Input type="number" step="any" name="discount_amount" value={disc} onChange={(e) => setDisc(Number(e.target.value))} /></Field>
        </div>
      </Card>

      {clientId ? (
        <Card title="Add lines from">
          <div className="flex flex-wrap gap-2">
            {po?.quotation_id && quoteLines[po.quotation_id] ? (
              <Button type="button" variant="secondary" onClick={() => {
                const ql = quoteLines[po.quotation_id];
                const pct = Number(ql[0]?.quotations?.discount_pct ?? 0);
                const added = ql.reduce((a: number, q: any) => a + Number(q.quantity) * Number(q.rate), 0);
                if (pct) setDisc(Math.round((disc + (added * pct) / 100) * 100) / 100);
                setLines([...lines, ...ql.map((q: any) => ({ key: k++, description: q.description, sac: "998346", sample_id: null, quantity: Number(q.quantity), rate: Number(q.rate) }))]);
              }}>
                Quotation lines ({quoteLines[po.quotation_id].length})
              </Button>
            ) : null}
            <Button type="button" variant="ghost" className="border border-dashed border-slate-300" onClick={() => setLines([...lines, { key: k++, description: "", sac: "998346", sample_id: null, quantity: 1, rate: 0 }])}>+ Custom line</Button>
          </div>
          {clientSamples.length ? (
            <div className="mt-4">
              <div className="mb-1 text-xs text-slate-500">Uninvoiced samples (tested / reported)</div>
              <div className="grid gap-1 sm:grid-cols-2">
                {clientSamples.map((s) => {
                  const added = lines.some((l) => l.sample_id === s.id);
                  return (
                    <button key={s.id} type="button" disabled={added}
                      onClick={() => setLines([...lines, { key: k++, description: `Analysis of ${s.type_name} – Sample ${s.sample_no}${s.sampling_point ? ` (${s.sampling_point})` : ""}`, sac: "998346", sample_id: s.id, quantity: 1, rate: s.suggested_rate }])}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-teal-400 disabled:opacity-40">
                      <span className="font-mono text-xs">{s.sample_no}</span> · {s.type_name} <span className="float-right text-xs text-slate-500">{inr(s.suggested_rate)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card title={`Lines (${lines.length})`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="p-2">Description</th><th className="p-2 w-28">SAC</th><th className="p-2 w-24">Qty</th><th className="p-2 w-32">Rate</th><th className="p-2 text-right">Amount</th><th /></tr></thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.key} className="border-t border-slate-100">
                  <td className="p-2"><Input value={l.description} onChange={(e) => upd(l.key, { description: e.target.value })} /></td>
                  <td className="p-2"><Input value={l.sac} onChange={(e) => upd(l.key, { sac: e.target.value })} /></td>
                  <td className="p-2"><Input type="number" step="any" value={l.quantity} onChange={(e) => upd(l.key, { quantity: Number(e.target.value) })} /></td>
                  <td className="p-2"><Input type="number" step="any" value={l.rate} onChange={(e) => upd(l.key, { rate: Number(e.target.value) })} /></td>
                  <td className="p-2 text-right">{inr((Number(l.quantity) || 0) * (Number(l.rate) || 0), false)}</td>
                  <td className="p-2"><button type="button" className="text-xs text-red-600" onClick={() => setLines(lines.filter((x) => x.key !== l.key))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{inr(sub)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>− {inr(disc)}</span></div>
          <div className="flex justify-between"><span>Taxable</span><span>{inr(taxable)}</span></div>
          {interstate ? <div className="flex justify-between"><span>IGST {gst}%</span><span>{inr(tax)}</span></div> : (<>
            <div className="flex justify-between"><span>CGST {gst / 2}%</span><span>{inr(Math.round((tax / 2) * 100) / 100)}</span></div>
            <div className="flex justify-between"><span>SGST {gst / 2}%</span><span>{inr(tax - Math.round((tax / 2) * 100) / 100)}</span></div></>)}
          <div className="flex justify-between border-t pt-1 text-base font-semibold"><span>Total</span><span>{inr(taxable + tax)}</span></div>
        </div>
      </Card>
      <Card title="Notes"><Textarea name="notes" /></Card>
      <div className="flex justify-end gap-2">
        <SubmitButton variant="secondary">Save as draft</SubmitButton>
        <SubmitButton name="issue" value="1">Save &amp; issue</SubmitButton>
      </div>
    </ActionForm>
  );
}
