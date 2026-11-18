"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { formToObject } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function registerSample(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const row = formToObject(fd, ["client_id", "site_id", "po_id", "task_id", "sample_type_id", "standard_id", "sampling_point",
    "sample_description", "collected_by", "collected_at", "received_at", "sampling_duration", "quantity", "container",
    "preservation", "condition_on_receipt", "weather", "remarks"]);
  if (!row.client_id || !row.sample_type_id) return { error: "Client and sample type are required" };
  const paramIds = fd.getAll("parameter_ids").map(String);
  if (!paramIds.length) return { error: "Select at least one parameter to test" };
  const field_data: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("fd_") && String(v).trim()) field_data[k.slice(3)] = String(v).trim();
  // datetime-local values are IST wall-clock; store with offset
  for (const k of ["collected_at", "received_at"] as const) if (row[k]) row[k] = `${row[k]}:00+05:30`;

  const { data, error } = await supabase.from("samples").insert({ ...row, field_data }).select("id").single();
  if (error) return { error: error.message };
  const { error: tErr } = await supabase.from("sample_tests").insert(paramIds.map((p) => ({ sample_id: data.id, parameter_id: p })));
  if (tErr) return { error: tErr.message };
  if (row.task_id) await supabase.from("tasks").update({ status: "in_progress" }).eq("id", row.task_id).eq("status", "open");
  revalidatePath("/samples");
  redirect(`/samples/${data.id}`);
}

export async function rejectSample(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  await supabase.from("samples").update({ status: "rejected", remarks: String(fd.get("reason") || "Rejected") }).eq("id", id);
  revalidatePath(`/samples/${id}`);
}
