"use client";

import { useMemo, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import { MATRIX_LABELS } from "@/lib/constants";
import { isoDateTimeLocal } from "@/lib/format";
import { registerSample } from "./actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Opt = { value: string; label: string };

export function SampleForm(p: {
  clients: Opt[]; sites: any[]; pos: any[]; tasks: any[]; sampleTypes: any[]; standards: any[]; limits: { standard_id: string; parameter_id: string }[];
  params: any[]; staff: Opt[]; lookups: Record<string, string[]>; quoteParams: Record<string, string[]>; defaults: Record<string, string>; meId: string;
}) {
  const nowLocal = isoDateTimeLocal();
  const [clientId, setClientId] = useState(p.defaults.client_id ?? "");
  const [stId, setStId] = useState(p.defaults.sample_type_id ?? "");
  const [poId, setPoId] = useState(p.defaults.po_id ?? "");
  const [stdId, setStdId] = useState("");
  const st = p.sampleTypes.find((s) => s.id === stId);
  const matrix = st?.matrix as string | undefined;
  const params = useMemo(() => p.params.filter((x) => x.matrix === matrix), [p.params, matrix]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  function preselect(nextSt: string, nextStd: string, nextPo: string) {
    const fromStd = p.limits.filter((l) => l.standard_id === nextStd).map((l) => l.parameter_id);
    const fromPo = p.quoteParams[`${nextPo}:${nextSt}`] ?? [];
    const allowed = new Set(p.params.filter((x) => x.matrix === p.sampleTypes.find((s) => s.id === nextSt)?.matrix).map((x) => x.id));
    setPicked(new Set((fromPo.length ? fromPo : fromStd).filter((id) => allowed.has(id))));
  }
  const stdOptions = p.standards.filter((s) => s.matrix === matrix && (!s.client_id || s.client_id === clientId)).map((s) => ({ value: s.id, label: s.name }));

  return (
    <ActionForm action={registerSample} className="space-y-6">
      {p.defaults.task_id ? <input type="hidden" name="task_id" value={p.defaults.task_id} /> : null}
      <Card title="Client & sample">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Client" required><Select name="client_id" value={clientId} onChange={(e) => setClientId(e.target.value)} options={p.clients} placeholder="Select…" required /></Field>
          <Field label="Site / Plant"><Select name="site_id" defaultValue={p.defaults.site_id ?? ""} options={p.sites.filter((s) => s.client_id === clientId).map((s) => ({ value: s.id, label: s.name }))} placeholder="—" /></Field>
          <Field label="Purchase order"><Select name="po_id" value={poId} onChange={(e) => { setPoId(e.target.value); preselect(stId, stdId, e.target.value); }} options={p.pos.filter((x) => x.client_id === clientId).map((x) => ({ value: x.id, label: x.po_number }))} placeholder="—" /></Field>
          <Field label="Sample type" required><Select name="sample_type_id" value={stId} onChange={(e) => { setStId(e.target.value); setStdId(""); preselect(e.target.value, "", poId); }} options={p.sampleTypes.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))} placeholder="Select…" required /></Field>
          <Field label="Compare against standard" hint="Limits print on the report; pass / fail is automatic"><Select name="standard_id" value={stdId} onChange={(e) => { setStdId(e.target.value); preselect(stId, e.target.value, poId); }} options={stdOptions} placeholder="No standard" /></Field>
          <Field label="Sampling point / location"><Input name="sampling_point" placeholder="e.g. ETP final outlet / Near main gate / Boiler stack" /></Field>
          <Field label="Sample description" className="md:col-span-3"><Input name="sample_description" placeholder="e.g. Grab sample of treated effluent" /></Field>
        </div>
      </Card>

      <Card title="Collection & receipt (chain of custody)">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Collected by"><Select name="collected_by" defaultValue={p.meId} options={p.staff} placeholder="—" /></Field>
          <Field label="Collected at"><Input type="datetime-local" name="collected_at" defaultValue={nowLocal} /></Field>
          <Field label="Received in lab at"><Input type="datetime-local" name="received_at" defaultValue={nowLocal} /></Field>
          <Field label="Sampling duration"><Input name="sampling_duration" placeholder={matrix === "ambient_air" ? "24 hours" : "Grab"} /></Field>
          <Field label="Quantity"><Input name="quantity" placeholder="2 L" /></Field>
          <Field label="Container"><Select name="container" options={p.lookups.container} placeholder="—" /></Field>
          <Field label="Preservation"><Select name="preservation" options={p.lookups.preservation} placeholder="—" /></Field>
          <Field label="Condition on receipt"><Select name="condition_on_receipt" defaultValue={p.lookups.sample_condition[0]} options={p.lookups.sample_condition} /></Field>
          <Field label="Weather"><Select name="weather" options={p.lookups.weather} placeholder="—" /></Field>
        </div>
      </Card>

      {matrix === "stack" ? (
        <Card title="Stack details">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Stack attached to"><Select name="fd_stack_source" options={p.lookups.stack_source} placeholder="—" /></Field>
            <Field label="Fuel"><Select name="fd_fuel" options={p.lookups.fuel} placeholder="—" /></Field>
            <Field label="Capacity"><Input name="fd_capacity" placeholder="e.g. 6 TPH boiler" /></Field>
            <Field label="APC equipment"><Input name="fd_apc" placeholder="Bag filter / ESP / Scrubber" /></Field>
            <Field label="Stack height (m)"><Input name="fd_stack_height_m" type="number" step="any" /></Field>
            <Field label="Stack diameter (m)"><Input name="fd_stack_dia_m" type="number" step="any" /></Field>
            <Field label="Sampling port height (m)"><Input name="fd_port_height_m" type="number" step="any" /></Field>
            <Field label="Material of construction"><Input name="fd_moc" placeholder="MS / RCC / FRP" /></Field>
          </div>
        </Card>
      ) : null}
      {matrix === "ambient_air" ? (
        <Card title="Ambient air details">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Location w.r.t. plant"><Input name="fd_location" placeholder="Upwind / Downwind / Near gate" /></Field>
            <Field label="Predominant wind direction"><Input name="fd_wind_direction" placeholder="e.g. SW → NE" /></Field>
            <Field label="Instrument ID (RDS / FPS)"><Input name="fd_instrument" /></Field>
            <Field label="Avg. flow rate"><Input name="fd_flow_rate" placeholder="m³/min or L/min" /></Field>
          </div>
        </Card>
      ) : null}
      {matrix === "noise" ? (
        <Card title="Noise details">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Zone"><Select name="fd_zone" options={p.lookups.noise_zone} placeholder="—" /></Field>
            <Field label="Instrument"><Input name="fd_instrument" placeholder="Sound level meter ID" /></Field>
            <Field label="Measurement height (m)"><Input name="fd_height_m" type="number" step="any" defaultValue="1.5" /></Field>
          </div>
        </Card>
      ) : null}
      {matrix === "water" ? (
        <Card title="Water sample details">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Sample nature"><Select name="fd_nature" options={["Grab", "Composite (8 h)", "Composite (24 h)"]} placeholder="—" /></Field>
            <Field label="Source"><Input name="fd_source" placeholder="ETP outlet / Borewell / Tap / River" /></Field>
            <Field label="Field pH / temperature"><Input name="fd_field_obs" placeholder="pH 7.2, 31 °C" /></Field>
          </div>
        </Card>
      ) : null}

      <Card title={`Parameters to test ${matrix ? `· ${MATRIX_LABELS[matrix]}` : ""} (${picked.size} selected)`}
        actions={params.length ? <button type="button" className="text-xs text-teal-700" onClick={() => setPicked(picked.size === params.length ? new Set() : new Set(params.map((x) => x.id)))}>{picked.size === params.length ? "Clear" : "Select all"}</button> : null}>
        {!matrix ? <p className="text-sm text-slate-400">Select a sample type first.</p> : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {params.map((x) => (
              <label key={x.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                <input type="checkbox" name="parameter_ids" value={x.id} checked={picked.has(x.id)}
                  onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(x.id); else n.delete(x.id); setPicked(n); }} />
                <span>{x.name}</span><span className="text-xs text-slate-400">{x.unit}</span>
              </label>
            ))}
          </div>
        )}
      </Card>
      <Card title="Remarks"><Textarea name="remarks" /></Card>
      <div className="flex justify-end"><SubmitButton>Register sample</SubmitButton></div>
    </ActionForm>
  );
}
