"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { formToObject } from "@/lib/data";
import { parseLines } from "@/lib/lines";
import { createClient } from "@/lib/supabase/server";

export async function saveVendorPO(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const head = formToObject(fd, ["vendor_id", "vendor_quotation_id", "po_date", "delivery_date", "delivery_address", "payment_terms", "terms", "notes"]);
  if (!head.vendor_id) return { error: "Select a vendor" };
  const lines = parseLines(fd.get("lines"));
  if (!lines.length) return { error: "Add at least one item line" };
  const [{ data: vendor }, { data: settings }] = await Promise.all([
    supabase.from("vendors").select("state").eq("id", head.vendor_id).single(),
    supabase.from("app_settings").select("state_name").single(),
  ]);
  const is_interstate = (vendor?.state ?? "Gujarat").toLowerCase() !== (settings?.state_name ?? "Gujarat").toLowerCase();
  const { data, error } = await supabase.from("vendor_pos").insert({
    ...head, is_interstate, status: fd.get("send") === "1" ? "sent" : "draft",
    gst_pct: Number(fd.get("gst_pct") || 18), discount_amount: Number(fd.get("discount_amount") || 0),
  }).select("id").single();
  if (error) return { error: error.message };
  const { error: lErr } = await supabase.from("vendor_po_items").insert(lines.map((l, i) => ({ ...l, vendor_po_id: data.id, line_no: i + 1 })));
  if (lErr) return { error: lErr.message };
  // re-run totals now that lines exist
  await supabase.from("vendor_pos").update({ updated_at: new Date().toISOString() }).eq("id", data.id);
  if (head.vendor_quotation_id) await supabase.from("vendor_quotations").update({ status: "accepted" }).eq("id", head.vendor_quotation_id).in("status", ["received", "under_review"]);
  revalidatePath("/vendor-pos");
  redirect(`/vendor-pos/${data.id}`);
}

export async function setVendorPOStatus(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  await supabase.from("vendor_pos").update({ status: String(fd.get("status")) }).eq("id", id);
  revalidatePath(`/vendor-pos/${id}`);
}

export async function saveReceipt(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const poId = String(fd.get("vendor_po_id"));
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("rcv_")) continue;
    const qty = Number(v);
    if (isNaN(qty) || qty < 0) return { error: "Received quantity must be zero or more" };
    const { error } = await supabase.from("vendor_po_items").update({ received_qty: qty }).eq("id", k.slice(4));
    if (error) return { error: error.message };
  }
  revalidatePath(`/vendor-pos/${poId}`);
  return { ok: "Receipt updated" };
}

export async function addVendorPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const row = formToObject(fd, ["vendor_po_id", "payment_date", "mode", "reference", "notes"]);
  const amount = Number(fd.get("amount") || 0), tds = Number(fd.get("tds_amount") || 0);
  if (amount <= 0 && tds <= 0) return { error: "Enter an amount" };
  const { error } = await supabase.from("vendor_payments").insert({ ...row, amount, tds_amount: tds });
  if (error) return { error: error.message };
  revalidatePath(`/vendor-pos/${row.vendor_po_id}`);
  return { ok: "Payment recorded" };
}

export async function deleteVendorPayment(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("vendor_payments").delete().eq("id", String(fd.get("id")));
  revalidatePath(`/vendor-pos/${fd.get("vendor_po_id")}`);
}
