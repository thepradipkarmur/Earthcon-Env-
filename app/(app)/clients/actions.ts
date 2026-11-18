"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { formToObject } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const FIELDS = ["name", "industry_sector", "pcb_category", "gstin", "pan", "address", "city", "district", "gidc_estate",
  "state", "pincode", "cca_number", "cca_valid_upto", "xgn_id", "effluent_discharge_route", "notes"];

export async function saveClient(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = fd.get("id") as string | null;
  const row = formToObject(fd, FIELDS);
  if (!row.name) return { error: "Client name is required" };
  if (row.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(row.gstin.toUpperCase()))
    return { error: "GSTIN format looks invalid (15 characters, e.g. 24ABCDE1234F1Z5)" };
  if (row.gstin) row.gstin = row.gstin.toUpperCase();
  if (row.pan) row.pan = row.pan.toUpperCase();
  row.state = row.state ?? "Gujarat";

  let clientId = id;
  if (id) {
    const { error } = await supabase.from("clients").update({ ...row, is_active: fd.get("is_active") === "on" }).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from("clients").insert(row).select("id").single();
    if (error) return { error: error.message };
    clientId = data.id;
    const contact = formToObject(fd, ["contact_name", "contact_designation", "contact_email", "contact_phone"]);
    if (contact.contact_name) {
      await supabase.from("client_contacts").insert({ client_id: clientId, name: contact.contact_name,
        designation: contact.contact_designation, email: contact.contact_email, phone: contact.contact_phone, is_primary: true });
    }
    await supabase.from("client_sites").insert({ client_id: clientId, name: "Main plant", address: row.address });
  }
  revalidatePath("/clients");
  redirect(`/clients/${clientId}`);
}

export async function addContact(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const row = formToObject(fd, ["client_id", "name", "designation", "email", "phone"]);
  if (!row.name) return { error: "Name is required" };
  const { error } = await supabase.from("client_contacts").insert({ ...row, is_primary: fd.get("is_primary") === "on" });
  if (error) return { error: error.message };
  revalidatePath(`/clients/${row.client_id}`);
  return { ok: "Contact added" };
}

export async function addSite(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const row = formToObject(fd, ["client_id", "name", "address", "latitude", "longitude"]);
  if (!row.name) return { error: "Site name is required" };
  const { error } = await supabase.from("client_sites").insert(row);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${row.client_id}`);
  return { ok: "Site added" };
}

export async function deleteContact(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("client_contacts").delete().eq("id", String(fd.get("id")));
  revalidatePath(`/clients/${fd.get("client_id")}`);
}
