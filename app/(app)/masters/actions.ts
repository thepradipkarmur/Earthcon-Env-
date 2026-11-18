"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { formToObject } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const done = (msg: string): ActionState => { revalidatePath("/masters"); return { ok: msg }; };

export async function saveParameter(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = fd.get("id") as string | null;
  const row: Record<string, unknown> = formToObject(fd, ["code", "name", "matrix", "unit", "method_id"]);
  row.default_rate = Number(fd.get("default_rate") || 0);
  row.decimals = Number(fd.get("decimals") || 2);
  row.is_nabl = fd.get("is_nabl") === "on";
  row.is_active = id ? fd.get("is_active") === "on" : true;
  const { error } = id ? await supabase.from("parameters").update(row).eq("id", id) : await supabase.from("parameters").insert(row);
  return error ? { error: error.message } : done("Parameter saved");
}

export async function saveMethod(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const row = { ...formToObject(fd, ["code", "title", "reference"]), needs_verification: fd.get("needs_verification") === "on" };
  const id = fd.get("id") as string | null;
  const { error } = id ? await supabase.from("test_methods").update(row).eq("id", id) : await supabase.from("test_methods").insert(row);
  return error ? { error: error.message } : done("Method saved");
}

export async function saveStandard(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const row = { ...formToObject(fd, ["code", "name", "matrix", "reference", "client_id", "notes"]), needs_verification: fd.get("needs_verification") === "on" };
  const id = fd.get("id") as string | null;
  const { error } = id ? await supabase.from("standards").update(row).eq("id", id) : await supabase.from("standards").insert(row);
  return error ? { error: error.message } : done("Standard saved");
}

export async function copyStandard(fd: FormData) {
  const supabase = await createClient();
  const from = String(fd.get("from_id")), clientId = String(fd.get("client_id") || "");
  const { data: s } = await supabase.from("standards").select("*").eq("id", from).single();
  const { data: cl } = clientId ? await supabase.from("clients").select("client_code,name").eq("id", clientId).single() : { data: null };
  if (!s) return;
  const { data: ns } = await supabase.from("standards").insert({
    code: `${s.code}-${cl?.client_code ?? "COPY"}-${Date.now().toString(36).slice(-4)}`, name: `${cl ? `${cl.name} – CCA` : "Copy of"} ${s.name}`,
    matrix: s.matrix, reference: cl ? "Client CCA (GPCB consent)" : s.reference, client_id: clientId || null, notes: s.notes }).select("id").single();
  const { data: lims } = await supabase.from("standard_limits").select("parameter_id,min_value,max_value,limit_text").eq("standard_id", from);
  if (ns && lims?.length) await supabase.from("standard_limits").insert(lims.map((l) => ({ ...l, standard_id: ns.id })));
  revalidatePath("/masters");
}

export async function saveLimit(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const num = (k: string) => (fd.get(k) === "" || fd.get(k) === null ? null : Number(fd.get(k)));
  const row = { standard_id: String(fd.get("standard_id")), parameter_id: String(fd.get("parameter_id")),
    min_value: num("min_value"), max_value: num("max_value"), limit_text: String(fd.get("limit_text") || "") || null };
  if (!row.parameter_id) return { error: "Select a parameter" };
  if (!row.limit_text) row.limit_text = row.min_value !== null && row.max_value !== null ? `${row.min_value} – ${row.max_value}` : row.max_value !== null ? String(row.max_value) : row.min_value !== null ? `Min ${row.min_value}` : null;
  const { error } = await supabase.from("standard_limits").upsert(row, { onConflict: "standard_id,parameter_id" });
  return error ? { error: error.message } : done("Limit saved");
}

export async function deleteLimit(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("standard_limits").delete().eq("id", String(fd.get("id")));
  revalidatePath("/masters");
}

export async function saveLookup(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const row = formToObject(fd, ["category", "value"]);
  if (!row.category || !row.value) return { error: "Category and value required" };
  const { error } = await supabase.from("lookups").insert({ ...row, sort_order: Number(fd.get("sort_order") || 100) });
  return error ? { error: error.message } : done("Added");
}

export async function toggleLookup(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("lookups").update({ is_active: fd.get("is_active") === "true" }).eq("id", String(fd.get("id")));
  revalidatePath("/masters");
}

export async function saveSampleType(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const row: Record<string, unknown> = { ...formToObject(fd, ["code", "name", "matrix", "description"]), sort_order: Number(fd.get("sort_order") || 100) };
  if (!row.code || !row.name) return { error: "Code and name are required" };
  row.code = String(row.code).toUpperCase();
  const { error } = await supabase.from("sample_types").insert(row);
  return error ? { error: error.message } : done("Sample type added");
}

export async function saveInstrument(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = fd.get("id") as string | null;
  const row: Record<string, unknown> = { ...formToObject(fd, ["name", "make", "model", "serial_no", "instrument_id_no", "calibration_date", "calibration_due", "notes"]), is_active: id ? fd.get("is_active") === "on" : true };
  if (!row.name) return { error: "Name is required" };
  const { error } = id ? await supabase.from("instruments").update(row).eq("id", id) : await supabase.from("instruments").insert(row);
  return error ? { error: error.message } : done("Instrument saved");
}
