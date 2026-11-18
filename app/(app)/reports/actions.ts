"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { createClient } from "@/lib/supabase/server";

export async function createReport(fd: FormData) {
  const supabase = await createClient();
  const sampleId = String(fd.get("sample_id"));
  const { data: prev } = await supabase.from("reports").select("report_no,revision").eq("sample_id", sampleId).order("revision", { ascending: false }).limit(1);
  const last = prev?.[0];
  const row: Record<string, unknown> = { sample_id: sampleId };
  if (last) { row.revision = last.revision + 1; row.report_no = `${String(last.report_no).replace(/-R\d+$/, "")}-R${last.revision + 1}`; }
  const { data, error } = await supabase.from("reports").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/reports/${data.id}`);
}

export async function updateReport(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  const intent = String(fd.get("intent"));
  const patch: Record<string, unknown> = {};
  if (intent === "save" || intent === "checked" || intent === "approved") {
    patch.remarks = String(fd.get("remarks") ?? "") || null;
    patch.opinion = String(fd.get("opinion") ?? "") || null;
    patch.ulr_no = String(fd.get("ulr_no") ?? "") || null;
  }
  if (intent !== "save") patch.status = intent;
  const { error } = await supabase.from("reports").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/reports/${id}`);
  revalidatePath("/reports");
  return { ok: intent === "save" ? "Saved" : `Report ${intent}` };
}

export async function cancelAndRevise(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  const { data: r, error } = await supabase.from("reports").update({ status: "cancelled" }).eq("id", id).select("sample_id").single();
  if (error || !r) throw new Error(error?.message ?? "Could not cancel");
  await supabase.from("samples").update({ status: "tested" }).eq("id", r.sample_id);
  const f = new FormData(); f.set("sample_id", r.sample_id);
  await createReport(f);
}
