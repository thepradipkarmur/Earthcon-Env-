"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { formToObject } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const FIELDS = ["name", "category", "gstin", "pan", "msme_no", "address", "city", "district", "state", "pincode",
  "contact_name", "contact_designation", "email", "phone", "payment_terms", "bank_details", "notes", "client_id"];

export async function saveVendor(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = fd.get("id") as string | null;
  const row = formToObject(fd, FIELDS);
  if (!row.name) return { error: "Vendor name is required" };
  if (row.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(row.gstin.toUpperCase()))
    return { error: "GSTIN format looks invalid (15 characters, e.g. 24ABCDE1234F1Z5)" };
  if (row.gstin) row.gstin = row.gstin.toUpperCase();
  if (row.pan) row.pan = row.pan.toUpperCase();
  row.state = row.state ?? "Gujarat";
  row.rating = fd.get("rating") ? Number(fd.get("rating")) : null;
  if (id) row.is_active = fd.get("is_active") === "on";
  const q = id ? supabase.from("vendors").update(row).eq("id", id).select("id").single() : supabase.from("vendors").insert(row).select("id").single();
  const { data, error } = await q;
  if (error) return { error: error.message.includes("vendors_client_id_key") ? "That client is already linked to another vendor" : error.message };
  revalidatePath("/vendors");
  redirect(`/vendors/${data.id}`);
}

/** Same company is both a client and a vendor: create the vendor record from the client. */
export async function registerClientAsVendor(fd: FormData) {
  const supabase = await createClient();
  const clientId = String(fd.get("client_id"));
  const { data: existing } = await supabase.from("vendors").select("id").eq("client_id", clientId).maybeSingle();
  if (existing) redirect(`/vendors/${existing.id}`);
  const { data: c } = await supabase.from("clients").select("*").eq("id", clientId).single();
  if (!c) return;
  const { data: contact } = await supabase.from("client_contacts").select("*").eq("client_id", clientId).order("is_primary", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from("vendors").insert({
    name: c.name, client_id: c.id, gstin: c.gstin, pan: c.pan, address: c.address, city: c.city, district: c.district,
    state: c.state, pincode: c.pincode, contact_name: contact?.name ?? null, contact_designation: contact?.designation ?? null,
    email: contact?.email ?? null, phone: contact?.phone ?? null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/vendors/${data.id}/edit`);
}
