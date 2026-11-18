import { redirect } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { isConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (isConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) redirect("/");
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-900 via-emerald-900 to-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={56} />
          <h1 className="mt-3 text-xl font-semibold text-slate-900">Earthcon Lab</h1>
          <p className="text-sm text-slate-500">Environmental CRM &amp; Laboratory system</p>
        </div>
        {isConfigured ? <LoginForm /> : (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (or <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>).
          </p>
        )}
      </div>
    </main>
  );
}
