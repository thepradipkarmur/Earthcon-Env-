"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { value?: string; label?: string; error?: string };

/** Saves a custom dropdown value so it is offered everywhere next time. */
export async function addLookupValue(category: string, value: string): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_lookup", { p_category: category, p_value: value });
  if (error) return { error: error.message };
  revalidatePath("/masters");
  return { value: String(data), label: String(data) };
}

export async function quickAdd(kind: "method" | "instrument", text: string): Promise<Result> {
  const supabase = await createClient();
  const fn = kind === "method" ? "quick_add_method" : "quick_add_instrument";
  const arg = kind === "method" ? { p_code: text } : { p_name: text };
  const { data, error } = await supabase.rpc(fn, arg);
  if (error) return { error: error.message };
  revalidatePath("/masters");
  return { value: String(data), label: text.trim() };
}
