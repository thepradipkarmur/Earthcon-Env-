"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { formToObject } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

type Item = { item_type: string; sample_type_id: string | null; parameter_id: string | null; description: string; frequency: string | null; quantity: number; rate: number };

export async function saveQuotation(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = (fd.get("id") as string) || null;
  const head = formToObject(fd, ["client_id", "contact_id", "quote_date", "valid_until", "subject", "terms", "notes"]);
  if (!head.client_id) return { error: "Select a client" };
  let items: Item[] = [];
  try { items = JSON.parse(String(fd.get("items") || "[]")); } catch { return { error: "Invalid items" }; }
  items = items.filter((i) => i.description?.trim());
  if (!items.length) return { error: "Add at least one line item" };
  const row = { ...head, discount_pct: Number(fd.get("discount_pct") || 0), gst_pct: Number(fd.get("gst_pct") || 18) };

  let qid = id;
  if (id) {
    const { error } = await supabase.from("quotations").update(row).eq("id", id);
    if (error) return { error: error.message };
    await supabase.from("quotation_items").delete().eq("quotation_id", id);
  } else {
    const { data, error } = await supabase.from("quotations").insert(row).select("id").single();
    if (error) return { error: error.message };
    qid = data.id;
  }
  const { error: itemErr } = await supabase.from("quotation_items").insert(
    items.map((i, n) => ({ quotation_id: qid, line_no: n + 1, item_type: i.item_type, sample_type_id: i.sample_type_id || null,
      parameter_id: i.parameter_id || null, description: i.description, frequency: i.frequency || null,
      quantity: Number(i.quantity) || 1, rate: Number(i.rate) || 0 })),
  );
  if (itemErr) return { error: itemErr.message };
  revalidatePath("/quotations");
  redirect(`/quotations/${qid}`);
}

export async function setQuotationStatus(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  await supabase.from("quotations").update({ status: String(fd.get("status")) }).eq("id", id);
  revalidatePath(`/quotations/${id}`);
}

export async function reviseQuotation(fd: FormData) {
  const supabase = await createClient();
  const id = String(fd.get("id"));
  const { data: q } = await supabase.from("quotations").select("*").eq("id", id).single();
  if (!q) return;
  const { data: items } = await supabase.from("quotation_items").select("*").eq("quotation_id", id).order("line_no");
  const base = String(q.quote_no).replace(/-R\d+$/, "");
  const rev = q.revision + 1;
  const { data: nq, error } = await supabase.from("quotations").insert({
    quote_no: `${base}-R${rev}`, revision: rev, parent_id: q.id, client_id: q.client_id, contact_id: q.contact_id,
    subject: q.subject, discount_pct: q.discount_pct, gst_pct: q.gst_pct, terms: q.terms, notes: q.notes,
  }).select("id").single();
  if (error || !nq) return;
  await supabase.from("quotation_items").insert((items ?? []).map((i) => ({
    quotation_id: nq.id, line_no: i.line_no, item_type: i.item_type, sample_type_id: i.sample_type_id, parameter_id: i.parameter_id,
    description: i.description, frequency: i.frequency, quantity: i.quantity, rate: i.rate })));
  await supabase.from("quotations").update({ status: "revised" }).eq("id", id);
  redirect(`/quotations/${nq.id}/edit`);
}
