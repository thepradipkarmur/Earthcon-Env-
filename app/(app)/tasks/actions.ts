"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { formToObject } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function createTask(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const row = formToObject(fd, ["task_type", "title", "description", "client_id", "site_id", "po_id", "sample_type_id", "assigned_to", "due_date", "priority"]);
  if (!row.title) return { error: "Title is required" };
  const { error } = await supabase.from("tasks").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function setTaskStatus(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ status: String(fd.get("status")) }).eq("id", String(fd.get("id")));
  revalidatePath("/tasks");
}
