import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getLookups(...categories: string[]) {
  const supabase = await createClient();
  const { data } = await supabase.from("lookups").select("category,value").in("category", categories)
    .eq("is_active", true).order("sort_order");
  const out: Record<string, string[]> = Object.fromEntries(categories.map((c) => [c, []]));
  (data ?? []).forEach((r) => out[r.category].push(r.value));
  return out;
}

export async function getClientOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id,name,client_code").eq("is_active", true).order("name");
  return (data ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.client_code})` }));
}

export async function getStaffOptions(roles?: string[]) {
  const supabase = await createClient();
  let q = supabase.from("profiles").select("id,full_name,role").eq("is_active", true).order("full_name");
  if (roles) q = q.in("role", [...roles, "admin"]);
  const { data } = await q;
  return (data ?? []).map((p) => ({ value: p.id, label: p.full_name || "Unnamed" }));
}

/** Turns empty strings into null so Postgres gets NULL, not '' */
export function formToObject(fd: FormData, fields: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o: Record<string, any> = {};
  for (const f of fields) {
    const v = fd.get(f);
    o[f] = v === null || String(v).trim() === "" ? null : String(v).trim();
  }
  return o;
}
