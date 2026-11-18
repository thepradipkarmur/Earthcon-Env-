import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "accounts" | "sampler" | "analyst" | "tech_manager" | "viewer";

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  designation: string | null;
  is_active: boolean;
};

export const getProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/login");
  const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
  if (!data) redirect("/login");
  return data as Profile;
});

export function can(profile: Pick<Profile, "role">, ...roles: Role[]) {
  return profile.role === "admin" || roles.includes(profile.role);
}
