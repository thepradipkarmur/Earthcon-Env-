"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { signIn, signUp } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  return (
    <div>
      <ActionForm key={mode} action={mode === "in" ? signIn : signUp} className="space-y-3">
        {mode === "up" ? <Field label="Full name" required><Input name="full_name" required /></Field> : null}
        <Field label="Email" required><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password" required><Input name="password" type="password" minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} required /></Field>
        <SubmitButton className="w-full">{mode === "in" ? "Sign in" : "Create account"}</SubmitButton>
      </ActionForm>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-xs text-teal-700 hover:underline">
        {mode === "in" ? "New staff member? Create an account" : "Already have an account? Sign in"}
      </button>
      {mode === "up" ? <p className="mt-2 text-center text-[11px] text-slate-400">The first account becomes Admin. Others start as Viewer until an Admin assigns a role.</p> : null}
    </div>
  );
}
