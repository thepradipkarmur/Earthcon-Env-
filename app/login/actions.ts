"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(fd.get("email") ?? ""),
    password: String(fd.get("password") ?? ""),
  });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signUp(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(fd.get("email") ?? ""),
    password: String(fd.get("password") ?? ""),
    options: {
      data: { full_name: String(fd.get("full_name") ?? "") },
      emailRedirectTo: `${(await headers()).get("origin") ?? ""}/auth/callback`,
    },
  });
  if (error) return { error: error.message };
  if (!data.session) return { ok: "Account created. Check your email to confirm, then sign in. An admin will assign your role." };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
