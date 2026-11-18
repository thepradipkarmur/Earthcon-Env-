"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { formToObject } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function savePO(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const row = formToObject(fd, ["client_id", "quotation_id", "po_number", "po_date", "valid_from", "valid_to", "notes"]);
  if (!row.client_id || !row.po_number) return { error: "Client and PO number are required" };
  let file_path: string | null = null;
  const file = fd.get("file") as File | null;
  if (file && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) return { error: "File must be under 10 MB" };
    file_path = `po/${row.client_id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await supabase.storage.from("documents").upload(file_path, file, { contentType: file.type || "application/pdf" });
    if (error) return { error: `Upload failed: ${error.message}` };
  }
  const { data, error } = await supabase.from("purchase_orders")
    .insert({ ...row, po_value: Number(fd.get("po_value") || 0), file_path }).select("id").single();
  if (error) return { error: error.message.includes("duplicate") ? "This PO number already exists for the client" : error.message };
  if (row.quotation_id) await supabase.from("quotations").update({ status: "accepted" }).eq("id", row.quotation_id).in("status", ["draft", "sent"]);
  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${data.id}`);
}

export async function setPOStatus(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  await supabase.from("purchase_orders").update({ status: String(fd.get("status")) }).eq("id", id);
  revalidatePath(`/purchase-orders/${id}`);
}
