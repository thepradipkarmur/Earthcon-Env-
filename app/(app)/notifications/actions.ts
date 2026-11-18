"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function markRead(id: string) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
}

export async function markAllRead() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) await supabase.from("notifications").update({ is_read: true }).eq("user_id", data.claims.sub).eq("is_read", false);
  revalidatePath("/", "layout");
}

export async function openNotification(fd: FormData) {
  await markRead(String(fd.get("id")));
  redirect(String(fd.get("link") || "/notifications"));
}

const ASSIGNABLE = {
  task: { table: "tasks", column: "assigned_to", path: "/tasks" },
  report: { table: "reports", column: "reviewer_id", path: "/reports/" },
  invoice: { table: "invoices", column: "assigned_to", path: "/invoices/" },
  quotation: { table: "quotations", column: "assigned_to", path: "/quotations/" },
  vendor_po: { table: "vendor_pos", column: "assigned_to", path: "/vendor-pos/" },
} as const;

/** Assigns a record to a staff member; database triggers send the notification. */
export async function assignRecord(fd: FormData) {
  const kind = String(fd.get("kind")) as keyof typeof ASSIGNABLE;
  const cfg = ASSIGNABLE[kind];
  if (!cfg) return;
  const id = String(fd.get("id"));
  const user = String(fd.get("user_id") || "") || null;
  const supabase = await createClient();
  const { error } = await supabase.from(cfg.table).update({ [cfg.column]: user }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(cfg.path.endsWith("/") ? cfg.path + id : cfg.path);
}
