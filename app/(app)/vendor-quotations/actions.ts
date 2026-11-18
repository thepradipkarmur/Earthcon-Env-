"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { formToObject } from "@/lib/data";
import { parseLines } from "@/lib/lines";
import { createClient } from "@/lib/supabase/server";

export async function saveVendorQuote(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const head = formToObject(fd, ["vendor_id", "vendor_ref", "quote_date", "valid_until", "subject", "notes"]);
  if (!head.vendor_id) return { error: "Select a vendor" };
  const lines = parseLines(fd.get("lines"));
  if (!lines.length) return { error: "Add at least one item line" };
  let file_path: string | null = null;
  const file = fd.get("file") as File | null;
  if (file && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) return { error: "File must be under 10 MB" };
    file_path = `vendor-quotes/${head.vendor_id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await supabase.storage.from("documents").upload(file_path, file, { contentType: file.type || "application/pdf" });
    if (error) return { error: `Upload failed: ${error.message}` };
  }
  const { data, error } = await supabase.from("vendor_quotations").insert({
    ...head, file_path, gst_pct: Number(fd.get("gst_pct") || 18), discount_amount: Number(fd.get("discount_amount") || 0),
  }).select("id").single();
  if (error) return { error: error.message };
  const { error: lErr } = await supabase.from("vendor_quotation_items").insert(lines.map((l, i) => ({ ...l, vendor_quotation_id: data.id, line_no: i + 1 })));
  if (lErr) return { error: lErr.message };
  revalidatePath("/vendor-quotations");
  redirect(`/vendor-quotations/${data.id}`);
}

export async function setVendorQuoteStatus(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  await supabase.from("vendor_quotations").update({ status: String(fd.get("status")) }).eq("id", id);
  revalidatePath(`/vendor-quotations/${id}`);
}
