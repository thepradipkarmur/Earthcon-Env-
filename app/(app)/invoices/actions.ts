"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { formToObject } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

type Line = { description: string; sac: string; sample_id: string | null; quantity: number; rate: number };

export async function saveInvoice(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const head = formToObject(fd, ["client_id", "po_id", "invoice_date", "due_date", "place_of_supply", "notes"]);
  if (!head.client_id) return { error: "Select a client" };
  let lines: Line[] = [];
  try { lines = JSON.parse(String(fd.get("lines") || "[]")); } catch { return { error: "Invalid lines" }; }
  lines = lines.filter((l) => l.description?.trim());
  if (!lines.length) return { error: "Add at least one line" };
  const { data: settings } = await supabase.from("app_settings").select("state_name").single();
  const homeState = (settings?.state_name ?? "Gujarat").toLowerCase();
  const row = {
    ...head, gst_pct: Number(fd.get("gst_pct") || 18), discount_amount: Number(fd.get("discount_amount") || 0),
    is_interstate: (head.place_of_supply ?? "Gujarat").toLowerCase() !== homeState,
    status: fd.get("issue") === "1" ? "issued" : "draft",
  };
  const { data, error } = await supabase.from("invoices").insert(row).select("id").single();
  if (error) return { error: error.message };
  const { error: lErr } = await supabase.from("invoice_items").insert(lines.map((l, i) => ({
    invoice_id: data.id, line_no: i + 1, description: l.description, sac: l.sac || "998346", sample_id: l.sample_id || null,
    quantity: Number(l.quantity) || 1, rate: Number(l.rate) || 0 })));
  if (lErr) return { error: lErr.message };
  revalidatePath("/invoices");
  redirect(`/invoices/${data.id}`);
}

export async function setInvoiceStatus(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  await supabase.from("invoices").update({ status: String(fd.get("status")) }).eq("id", id);
  revalidatePath(`/invoices/${id}`);
}

export async function addPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const row = formToObject(fd, ["invoice_id", "payment_date", "mode", "reference", "notes"]);
  const amount = Number(fd.get("amount") || 0), tds = Number(fd.get("tds_amount") || 0);
  if (amount <= 0 && tds <= 0) return { error: "Enter an amount" };
  const { error } = await supabase.from("payments").insert({ ...row, amount, tds_amount: tds });
  if (error) return { error: error.message };
  revalidatePath(`/invoices/${row.invoice_id}`);
  return { ok: "Payment recorded" };
}

export async function deletePayment(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("payments").delete().eq("id", String(fd.get("id")));
  revalidatePath(`/invoices/${fd.get("invoice_id")}`);
}
