import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, Button, Card, Field, Input, Notice, PageHeader, Select, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { MATRIX_LABELS } from "@/lib/constants";
import { getClientOptions } from "@/lib/data";
import { fmtDate, isoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { copyStandard, deleteLimit, saveInstrument, saveLimit, saveLookup, saveMethod, saveParameter, saveSampleType, saveStandard, toggleLookup } from "./actions";

export const metadata = { title: "Master data" };
/* eslint-disable @typescript-eslint/no-explicit-any */

const TABS = [["parameters", "Parameters & rates"], ["standards", "Standards & limits"], ["methods", "Test methods"], ["sample-types", "Sample types"], ["instruments", "Instruments"], ["lookups", "Dropdown lists"]];
const matrixOpts = Object.entries(MATRIX_LABELS).map(([value, label]) => ({ value, label }));

export default async function Masters({ searchParams }: { searchParams: Promise<{ tab?: string; matrix?: string; std?: string; cat?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "parameters";
  const profile = await getProfile();
  const tm = can(profile, "tech_manager");
  const supabase = await createClient();

  return (
    <div>
      <PageHeader title="Master data" subtitle="Dropdowns, parameters, rates, methods, standards and instruments used across the CRM" />
      <Notice>Seeded limits and method references come from secondary sources and are marked “verify”. The Technical Manager / QA should confirm each against the current Gazette, BIS standard or the client&apos;s CCA before use.</Notice>
      <div className="my-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/masters?tab=${k}`} className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === k ? "border-teal-700 font-medium text-teal-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{l}</Link>
        ))}
      </div>
      {tab === "parameters" ? await Parameters(supabase, sp.matrix ?? "water", can(profile, "tech_manager", "accounts")) : null}
      {tab === "standards" ? await Standards(supabase, sp.std, tm) : null}
      {tab === "methods" ? await Methods(supabase, tm) : null}
      {tab === "sample-types" ? await SampleTypes(supabase, tm) : null}
      {tab === "instruments" ? await Instruments(supabase, can(profile, "tech_manager", "analyst")) : null}
      {tab === "lookups" ? await Lookups(supabase, sp.cat, tm) : null}
    </div>
  );
}

async function Parameters(supabase: any, matrix: string, edit: boolean) {
  const [{ data: params }, { data: methods }] = await Promise.all([
    supabase.from("parameters").select("*").eq("matrix", matrix).order("sort_order"),
    supabase.from("test_methods").select("id,code").order("code"),
  ]);
  const mOpts = (methods ?? []).map((m: any) => ({ value: m.id, label: m.code }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">{matrixOpts.map((m) => (
        <Link key={m.value} href={`/masters?tab=parameters&matrix=${m.value}`} className={`rounded-full px-3 py-1 text-xs ${matrix === m.value ? "bg-teal-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{m.label}</Link>))}</div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-2">Code</th><th className="p-2">Parameter</th><th className="p-2">Unit</th><th className="p-2">Method</th><th className="p-2">Rate ₹</th><th className="p-2">Dec.</th><th className="p-2">NABL</th><th className="p-2">Active</th><th /></tr></thead>
          <tbody>
            {(params ?? []).map((p: any) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td colSpan={9} className="p-0">
                  <ActionForm action={saveParameter} className="grid grid-cols-[90px_1fr_90px_180px_100px_60px_50px_50px_70px] items-center gap-2 p-2">
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="code" value={p.code} /><input type="hidden" name="matrix" value={p.matrix} />
                    <span className="font-mono text-xs">{p.code}</span>
                    <Input name="name" defaultValue={p.name} disabled={!edit} />
                    <Input name="unit" defaultValue={p.unit ?? ""} disabled={!edit} />
                    <Select name="method_id" defaultValue={p.method_id ?? ""} options={mOpts} placeholder="—" disabled={!edit} />
                    <Input name="default_rate" type="number" step="any" defaultValue={p.default_rate} disabled={!edit} />
                    <Input name="decimals" type="number" defaultValue={p.decimals} disabled={!edit} />
                    <input type="checkbox" name="is_nabl" defaultChecked={p.is_nabl} disabled={!edit} />
                    <input type="checkbox" name="is_active" defaultChecked={p.is_active} disabled={!edit} />
                    {edit ? <SubmitButton variant="secondary" className="px-2 py-1 text-xs">Save</SubmitButton> : <span />}
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit ? (
        <Card title="Add parameter">
          <ActionForm action={saveParameter} className="grid gap-3 md:grid-cols-6">
            <input type="hidden" name="matrix" value={matrix} />
            <Field label="Code"><Input name="code" required placeholder="W-XYZ" /></Field>
            <Field label="Name" className="md:col-span-2"><Input name="name" required /></Field>
            <Field label="Unit"><Input name="unit" /></Field>
            <Field label="Method"><Select name="method_id" options={mOpts} placeholder="—" /></Field>
            <Field label="Rate ₹"><Input name="default_rate" type="number" step="any" /></Field>
            <div className="md:col-span-6 text-right"><SubmitButton>Add</SubmitButton></div>
          </ActionForm>
        </Card>
      ) : null}
    </div>
  );
}

async function Standards(supabase: any, stdId: string | undefined, edit: boolean) {
  const [{ data: stds }, clients] = await Promise.all([
    supabase.from("standards").select("*,clients(name)").order("matrix").order("name"), getClientOptions(),
  ]);
  const sel = (stds ?? []).find((s: any) => s.id === stdId) ?? (stds ?? [])[0];
  const [{ data: limits }, { data: params }] = sel ? await Promise.all([
    supabase.from("standard_limits").select("*,parameters(name,unit,sort_order)").eq("standard_id", sel.id),
    supabase.from("parameters").select("id,name").eq("matrix", sel.matrix).order("sort_order"),
  ]) : [{ data: [] }, { data: [] }];
  const sorted = (limits ?? []).sort((a: any, b: any) => a.parameters.sort_order - b.parameters.sort_order);
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        {(stds ?? []).map((s: any) => (
          <Link key={s.id} href={`/masters?tab=standards&std=${s.id}`} className={`block rounded-lg border px-3 py-2 text-sm ${sel?.id === s.id ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-300"}`}>
            <div className="font-medium">{s.name}</div>
            <div className="text-xs text-slate-500">{MATRIX_LABELS[s.matrix]}{s.clients ? ` · ${s.clients.name}` : ""} {s.needs_verification ? <Badge tone="amber">verify</Badge> : null}</div>
          </Link>
        ))}
        {edit ? (
          <Card title="New standard">
            <ActionForm action={saveStandard} className="space-y-2">
              <Field label="Code"><Input name="code" required /></Field>
              <Field label="Name"><Input name="name" required /></Field>
              <Field label="Matrix"><Select name="matrix" options={matrixOpts} /></Field>
              <Field label="Client (for CCA limits)"><Select name="client_id" options={clients} placeholder="General standard" /></Field>
              <Field label="Reference"><Input name="reference" /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="needs_verification" defaultChecked /> Needs verification</label>
              <SubmitButton>Create</SubmitButton>
            </ActionForm>
          </Card>
        ) : null}
      </div>
      {sel ? (
        <div className="space-y-4">
          <Card title={sel.name} actions={sel.needs_verification ? <Badge tone="amber">verify against source</Badge> : <Badge tone="green">verified</Badge>}>
            <p className="text-sm text-slate-600">{sel.reference}</p>
            {sel.notes ? <p className="mt-1 text-xs text-slate-500">{sel.notes}</p> : null}
            {edit ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionForm action={saveStandard} className="flex items-center gap-2">
                  {["id", "code", "name", "matrix", "reference", "client_id", "notes"].map((k) => <input key={k} type="hidden" name={k} value={sel[k] ?? ""} />)}
                  {sel.needs_verification ? null : <input type="hidden" name="needs_verification" value="on" />}
                  <SubmitButton variant="secondary">{sel.needs_verification ? "Mark as verified" : "Mark as needs verification"}</SubmitButton>
                </ActionForm>
                <form action={copyStandard} className="flex items-center gap-2"><input type="hidden" name="from_id" value={sel.id} />
                  <Select name="client_id" options={clients} placeholder="Copy as client CCA for…" className="max-w-xs" /><Button variant="secondary">Copy</Button></form>
              </div>
            ) : null}
          </Card>
          <Table head={["Parameter", "Unit", "Min", "Max", "Printed limit", ""]} empty={!sorted.length}>
            {sorted.map((l: any) => (
              <tr key={l.id}><Td>{l.parameters?.name}</Td><Td>{l.parameters?.unit}</Td><Td>{l.min_value ?? "—"}</Td><Td>{l.max_value ?? "—"}</Td><Td>{l.limit_text}</Td>
                <Td>{edit ? <form action={deleteLimit}><input type="hidden" name="id" value={l.id} /><button className="text-xs text-red-600">Remove</button></form> : null}</Td></tr>
            ))}
          </Table>
          {edit ? (
            <Card title="Add / update limit">
              <ActionForm action={saveLimit} className="grid gap-3 md:grid-cols-5">
                <input type="hidden" name="standard_id" value={sel.id} />
                <Field label="Parameter" className="md:col-span-2"><Select name="parameter_id" options={(params ?? []).map((p: any) => ({ value: p.id, label: p.name }))} placeholder="Select…" /></Field>
                <Field label="Min"><Input name="min_value" type="number" step="any" /></Field>
                <Field label="Max"><Input name="max_value" type="number" step="any" /></Field>
                <Field label="Printed text"><Input name="limit_text" placeholder="auto" /></Field>
                <div className="md:col-span-5 text-right"><SubmitButton>Save limit</SubmitButton></div>
              </ActionForm>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

async function Methods(supabase: any, edit: boolean) {
  const { data } = await supabase.from("test_methods").select("*").order("code");
  return (
    <div className="space-y-4">
      <Table head={["Code", "Title", "Reference", "Status"]}>
        {(data ?? []).map((m: any) => (<tr key={m.id}><Td className="font-medium">{m.code}</Td><Td>{m.title}</Td><Td>{m.reference}</Td><Td>{m.needs_verification ? <Badge tone="amber">verify</Badge> : <Badge tone="green">verified</Badge>}</Td></tr>))}
      </Table>
      {edit ? (
        <Card title="Add method">
          <ActionForm action={saveMethod} className="grid gap-3 md:grid-cols-4">
            <Field label="Code"><Input name="code" required placeholder="IS 3025 (P-xx)" /></Field>
            <Field label="Title"><Input name="title" /></Field>
            <Field label="Reference"><Input name="reference" /></Field>
            <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="needs_verification" /> Needs verification</label>
            <div className="md:col-span-4 text-right"><SubmitButton>Add</SubmitButton></div>
          </ActionForm>
        </Card>
      ) : null}
    </div>
  );
}

async function SampleTypes(supabase: any, edit: boolean) {
  const { data } = await supabase.from("sample_types").select("*").order("sort_order");
  return (
    <div className="space-y-4">
      <Table head={["Code", "Name", "Matrix", "Active"]}>
        {(data ?? []).map((s: any) => (<tr key={s.id}><Td className="font-mono">{s.code}</Td><Td>{s.name}</Td><Td>{MATRIX_LABELS[s.matrix]}</Td><Td>{s.is_active ? "Yes" : "No"}</Td></tr>))}
      </Table>
      {edit ? (
        <Card title="Add sample type">
          <ActionForm action={saveSampleType} className="grid gap-3 md:grid-cols-4">
            <Field label="Code (used in sample no.)"><Input name="code" required maxLength={4} /></Field>
            <Field label="Name"><Input name="name" required /></Field>
            <Field label="Matrix"><Select name="matrix" options={matrixOpts} /></Field>
            <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={100} /></Field>
            <div className="md:col-span-4 text-right"><SubmitButton>Add</SubmitButton></div>
          </ActionForm>
        </Card>
      ) : null}
    </div>
  );
}

async function Instruments(supabase: any, edit: boolean) {
  const { data } = await supabase.from("instruments").select("*").order("name");
  const today = isoDate();
  return (
    <div className="space-y-4">
      <Table head={["Instrument", "Make / model", "Serial", "Lab ID", "Calibrated", "Due", "Active"]} empty={!data?.length}>
        {(data ?? []).map((i: any) => (<tr key={i.id}><Td className="font-medium">{i.name}</Td><Td>{[i.make, i.model].filter(Boolean).join(" ") || "—"}</Td><Td>{i.serial_no ?? "—"}</Td><Td>{i.instrument_id_no ?? "—"}</Td>
          <Td>{fmtDate(i.calibration_date)}</Td><Td className={i.calibration_due && i.calibration_due < today ? "font-medium text-red-600" : ""}>{fmtDate(i.calibration_due)}</Td><Td>{i.is_active ? "Yes" : "No"}</Td></tr>))}
      </Table>
      {edit ? (
        <Card title="Add instrument">
          <ActionForm action={saveInstrument} className="grid gap-3 md:grid-cols-4">
            <Field label="Name"><Input name="name" required placeholder="UV-Vis spectrophotometer" /></Field>
            <Field label="Make"><Input name="make" /></Field>
            <Field label="Model"><Input name="model" /></Field>
            <Field label="Serial no."><Input name="serial_no" /></Field>
            <Field label="Lab ID"><Input name="instrument_id_no" placeholder="EL/INS/01" /></Field>
            <Field label="Calibrated on"><Input name="calibration_date" type="date" /></Field>
            <Field label="Calibration due"><Input name="calibration_due" type="date" /></Field>
            <div className="flex items-end justify-end"><SubmitButton>Add</SubmitButton></div>
          </ActionForm>
        </Card>
      ) : null}
    </div>
  );
}

async function Lookups(supabase: any, cat: string | undefined, edit: boolean) {
  const { data } = await supabase.from("lookups").select("*").order("category").order("sort_order");
  const cats = [...new Set((data ?? []).map((l: any) => l.category))] as string[];
  const current = cat ?? cats[0];
  const rows = (data ?? []).filter((l: any) => l.category === current);
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <div className="space-y-1">{cats.map((c) => (
        <Link key={c} href={`/masters?tab=lookups&cat=${c}`} className={`block rounded-lg px-3 py-1.5 text-sm ${c === current ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-white"}`}>{c.replace(/_/g, " ")}</Link>))}</div>
      <div className="space-y-4">
        <Table head={["Value", "Order", "Active", ""]}>
          {rows.map((l: any) => (
            <tr key={l.id}><Td>{l.value}</Td><Td>{l.sort_order}</Td><Td>{l.is_active ? "Yes" : "No"}</Td>
              <Td>{edit ? <form action={toggleLookup}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="is_active" value={String(!l.is_active)} /><button className="text-xs text-teal-700">{l.is_active ? "Disable" : "Enable"}</button></form> : null}</Td></tr>
          ))}
        </Table>
        {edit ? (
          <Card title="Add value">
            <ActionForm action={saveLookup} className="grid gap-3 md:grid-cols-4">
              <Field label="Category"><Input name="category" defaultValue={current} required /></Field>
              <Field label="Value" className="md:col-span-2"><Input name="value" required /></Field>
              <Field label="Order"><Input name="sort_order" type="number" defaultValue={100} /></Field>
              <div className="md:col-span-4 text-right"><SubmitButton>Add</SubmitButton></div>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
