"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type BtnVariant } from "./ui";

export type ActionState = { error?: string; ok?: string } | undefined;
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({ action, children, className }: { action: Action; children: ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {state?.error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div> : null}
      {state?.ok ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.ok}</div> : null}
      {children}
    </form>
  );
}

export function SubmitButton({ children, variant = "primary", className, confirm, name, value }: { children: ReactNode; variant?: BtnVariant; className?: string; confirm?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className} name={name} value={value}
      onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {pending ? "Saving…" : children}
    </Button>
  );
}
