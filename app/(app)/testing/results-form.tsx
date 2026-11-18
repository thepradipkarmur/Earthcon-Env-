"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, Input, Select } from "@/components/ui";
import { saveResults } from "./actions";
import { isoDate } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Opt = { value: string; label: string };

function compliance(v: string, min: number | null, max: number | null) {
  if (v === "" || isNaN(Number(v))) return "na";
  if (min === null && max === null) return "na";
  const x = Number(v);
  return (min !== null && x < min) || (max !== null && x > max) ? "exceeds" : "complies";
}

export function ResultsForm({ sampleId, tests, methods, instruments, canReview, locked }: { sampleId: string; tests: any[]; methods: Opt[]; instruments: Opt[]; canReview: boolean; locked: boolean }) {
  const [rows, setRows] = useState(tests.map((t) => ({
    id: t.id, name: t.parameters?.name, unit: t.unit, limit_text: t.limit_text,
    limit_min: t.limit_min === null ? null : Number(t.limit_min), limit_max: t.limit_max === null ? null : Number(t.limit_max),
    result_value: t.result_value ?? "", result_text: t.result_text ?? "", method_id: t.method_id ?? "", instrument_id: t.instrument_id ?? "",
    analysis_start: t.analysis_start ?? "", analysis_end: t.analysis_end ?? "", remarks: t.remarks ?? "",
    reviewed: t.status === "reviewed", was_reviewed: t.status === "reviewed", analyst: t.analyst?.full_name,
  })));
  const set = (i: number, patch: any) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const today = isoDate();

  return (
    <ActionForm action={saveResults}>
      <input type="hidden" name="sample_id" value={sampleId} />
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Enter a numeric result, or text such as “BDL (DL 0.01)”, “Absent” or “Not detected”. Pass / fail is calculated against the sample&apos;s standard.</p>
        {!locked ? <button type="button" className="text-xs text-teal-700 hover:underline" onClick={() => setRows(rows.map((r) => ({ ...r, analysis_start: r.analysis_start || today, analysis_end: r.analysis_end || today })))}>Fill today&apos;s date</button> : null}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-2">Parameter</th><th className="p-2 w-28">Result</th><th className="p-2 w-36">Text result</th><th className="p-2">Limit</th><th className="p-2" /><th className="p-2 w-48">Method</th><th className="p-2 w-44">Instrument</th><th className="p-2">Start</th><th className="p-2">End</th><th className="p-2">Remarks</th>{canReview ? <th className="p-2">Reviewed</th> : null}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const c = compliance(String(r.result_value), r.limit_min, r.limit_max);
              return (
                <tr key={r.id} className={`border-t border-slate-100 ${c === "exceeds" ? "bg-red-50" : ""}`}>
                  <td className="p-2"><div className="font-medium">{r.name}</div><div className="text-xs text-slate-400">{r.unit}{r.analyst ? ` · ${r.analyst}` : ""}</div></td>
                  <td className="p-2"><Input type="number" step="any" value={r.result_value} disabled={locked} onChange={(e) => set(i, { result_value: e.target.value })} /></td>
                  <td className="p-2"><Input value={r.result_text} disabled={locked} onChange={(e) => set(i, { result_text: e.target.value })} placeholder="optional" /></td>
                  <td className="p-2 text-xs text-slate-600">{r.limit_text ?? "—"}</td>
                  <td className="p-2">{c !== "na" ? <Badge tone={c === "exceeds" ? "red" : "green"}>{c}</Badge> : null}</td>
                  <td className="p-2"><Select value={r.method_id} disabled={locked} onChange={(e) => set(i, { method_id: e.target.value })} options={methods} placeholder="—" /></td>
                  <td className="p-2"><Select value={r.instrument_id} disabled={locked} onChange={(e) => set(i, { instrument_id: e.target.value })} options={instruments} placeholder="—" /></td>
                  <td className="p-2"><Input type="date" value={r.analysis_start} disabled={locked} onChange={(e) => set(i, { analysis_start: e.target.value })} /></td>
                  <td className="p-2"><Input type="date" value={r.analysis_end} disabled={locked} onChange={(e) => set(i, { analysis_end: e.target.value })} /></td>
                  <td className="p-2"><Input value={r.remarks} disabled={locked} onChange={(e) => set(i, { remarks: e.target.value })} /></td>
                  {canReview ? <td className="p-2 text-center"><input type="checkbox" checked={r.reviewed} disabled={locked} onChange={(e) => set(i, { reviewed: e.target.checked })} /></td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!locked ? <div className="mt-4 flex justify-end"><SubmitButton>Save results</SubmitButton></div> : null}
    </ActionForm>
  );
}
