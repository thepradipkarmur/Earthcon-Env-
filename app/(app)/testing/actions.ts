"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { createClient } from "@/lib/supabase/server";

type Row = { id: string; result_value: string; result_text: string; method_id: string; instrument_id: string; analysis_start: string; analysis_end: string; remarks: string; reviewed: boolean; was_reviewed: boolean };

const n = (v: string) => (v === "" || v === null || v === undefined ? null : v);

export async function saveResults(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const sampleId = String(fd.get("sample_id"));
  let rows: Row[] = [];
  try { rows = JSON.parse(String(fd.get("rows") || "[]")); } catch { return { error: "Invalid data" }; }
  const errors: string[] = [];
  for (const r of rows) {
    const patch: Record<string, unknown> = {
      result_value: n(r.result_value) === null ? null : Number(r.result_value),
      result_text: n(r.result_text), method_id: n(r.method_id), instrument_id: n(r.instrument_id),
      analysis_start: n(r.analysis_start), analysis_end: n(r.analysis_end), remarks: n(r.remarks),
    };
    if (patch.result_value !== null && isNaN(patch.result_value as number)) { errors.push(`Invalid number for a parameter`); continue; }
    const hasResult = patch.result_value !== null || patch.result_text !== null;
    if (r.reviewed && !r.was_reviewed && hasResult) patch.status = "reviewed";
    else if (!hasResult) patch.status = "pending";
    else if (!r.reviewed && r.was_reviewed) patch.status = "entered";
    const { error } = await supabase.from("sample_tests").update(patch).eq("id", r.id);
    if (error) { errors.push(error.message); break; }
  }
  revalidatePath(`/testing/${sampleId}`);
  revalidatePath(`/samples/${sampleId}`);
  return errors.length ? { error: errors[0] } : { ok: "Results saved" };
}

export async function addTest(fd: FormData) {
  const supabase = await createClient();
  const sampleId = String(fd.get("sample_id"));
  const parameterId = String(fd.get("parameter_id") || "");
  if (parameterId) await supabase.from("sample_tests").insert({ sample_id: sampleId, parameter_id: parameterId });
  revalidatePath(`/testing/${sampleId}`);
}
