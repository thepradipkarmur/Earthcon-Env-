"use client";

import { useState } from "react";
import { ComboSelect } from "./combo-select";
import { Button, Input } from "./ui";
import { inr } from "@/lib/format";

export type Line = { key: number; description: string; unit: string; quantity: number; rate: number };
let k = 1;

/** Editable item lines + GST totals. Posts `lines` (JSON), `gst_pct`, `discount_amount`. */
export function LineItems({ initial, units, gstPct = 18, discount = 0, interstate }: {
  initial?: Line[]; units: string[]; gstPct?: number; discount?: number; interstate?: boolean | null;
}) {
  const [lines, setLines] = useState<Line[]>(initial?.length ? initial : [{ key: k++, description: "", unit: "Nos", quantity: 1, rate: 0 }]);
  const [gst, setGst] = useState(gstPct);
  const [disc, setDisc] = useState(discount);
  const upd = (key: number, patch: Partial<Line>) => setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const sub = lines.reduce((a, l) => a + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0);
  const taxable = sub - (Number(disc) || 0);
  const tax = Math.round(taxable * gst) / 100;
  const half = Math.round((tax / 2) * 100) / 100;

  return (
    <div>
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="p-2">#</th><th className="p-2">Item / description</th><th className="w-40 p-2">Unit</th><th className="w-28 p-2">Qty</th><th className="w-36 p-2">Rate (₹)</th><th className="p-2 text-right">Amount</th><th /></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.key} className="border-t border-slate-100">
                <td className="p-2 text-slate-400">{i + 1}</td>
                <td className="p-2"><Input value={l.description} onChange={(e) => upd(l.key, { description: e.target.value })} placeholder="e.g. Potassium dichromate AR, 500 g" /></td>
                <td className="p-2"><ComboSelect value={l.unit} onChange={(v) => upd(l.key, { unit: v })} options={units} category="unit" placeholder="—" /></td>
                <td className="p-2"><Input type="number" min={0} step="any" value={l.quantity} onChange={(e) => upd(l.key, { quantity: Number(e.target.value) })} /></td>
                <td className="p-2"><Input type="number" min={0} step="any" value={l.rate} onChange={(e) => upd(l.key, { rate: Number(e.target.value) })} /></td>
                <td className="p-2 text-right font-medium">{inr((Number(l.quantity) || 0) * (Number(l.rate) || 0), false)}</td>
                <td className="p-2"><button type="button" className="text-xs text-red-600" onClick={() => setLines(lines.filter((x) => x.key !== l.key))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="ghost" className="mt-2 border border-dashed border-slate-300 text-xs"
        onClick={() => setLines([...lines, { key: k++, description: "", unit: "Nos", quantity: 1, rate: 0 }])}>+ Add line</Button>
      <div className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{inr(sub)}</span></div>
        <div className="flex items-center justify-between gap-2"><span>Discount (₹)</span><Input name="discount_amount" type="number" step="any" min={0} value={disc} onChange={(e) => setDisc(Number(e.target.value))} className="w-28 text-right" /></div>
        <div className="flex justify-between text-slate-500"><span>Taxable</span><span>{inr(taxable)}</span></div>
        <div className="flex items-center justify-between gap-2"><span>GST %</span><Input name="gst_pct" type="number" step="any" min={0} value={gst} onChange={(e) => setGst(Number(e.target.value))} className="w-28 text-right" /></div>
        {interstate === true ? <div className="flex justify-between text-slate-500"><span>IGST</span><span>{inr(tax)}</span></div>
          : interstate === false ? (<>
            <div className="flex justify-between text-slate-500"><span>CGST</span><span>{inr(half)}</span></div>
            <div className="flex justify-between text-slate-500"><span>SGST</span><span>{inr(tax - half)}</span></div></>)
          : <div className="flex justify-between text-slate-500"><span>GST</span><span>{inr(tax)}</span></div>}
        <div className="flex justify-between border-t pt-1.5 text-base font-semibold"><span>Total</span><span>{inr(taxable + tax)}</span></div>
      </div>
    </div>
  );
}
