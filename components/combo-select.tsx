"use client";

import { useState, type KeyboardEvent } from "react";
import { addLookupValue, quickAdd } from "@/lib/lookup-actions";

type Opt = string | { value: string; label: string };
const norm = (o: Opt) => (typeof o === "string" ? { value: o, label: o } : o);
const ADD = "__add_custom__";
const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:bg-slate-50";

/**
 * Dropdown with a "+ Add new…" entry. New values are saved to the database
 * (lookups by `category`, or test methods / instruments by `kind`) so they are
 * available everywhere next time.
 */
export function ComboSelect({
  name, options, category, kind, value, defaultValue, onChange, placeholder, required, disabled, className,
}: {
  name?: string; options: Opt[]; category?: string; kind?: "method" | "instrument";
  value?: string; defaultValue?: string; onChange?: (v: string) => void;
  placeholder?: string; required?: boolean; disabled?: boolean; className?: string;
}) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = controlled ? value! : inner;
  const [extra, setExtra] = useState<{ value: string; label: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const opts = [...options.map(norm), ...extra];
  if (current && !opts.some((o) => o.value === current)) opts.push({ value: current, label: current });

  const set = (v: string) => { if (!controlled) setInner(v); onChange?.(v); };

  async function save() {
    const t = text.trim();
    if (!t) return;
    setBusy(true); setErr("");
    const res = kind ? await quickAdd(kind, t) : category ? await addLookupValue(category, t) : { value: t, label: t };
    setBusy(false);
    if (res.error || !res.value) { setErr(res.error ?? "Could not save"); return; }
    if (!opts.some((o) => o.value === res.value)) setExtra((e) => [...e, { value: res.value!, label: res.label ?? res.value! }]);
    set(res.value);
    setAdding(false); setText("");
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); setAdding(false); }
  };

  if (adding) {
    return (
      <div className={className}>
        {name ? <input type="hidden" name={name} value={current} /> : null}
        <div className="flex gap-1">
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
            placeholder={kind === "method" ? "New method code…" : kind === "instrument" ? "New instrument name…" : "New value…"} className={cls} />
          <button type="button" onClick={save} disabled={busy || !text.trim()}
            className="shrink-0 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50">{busy ? "…" : "Save"}</button>
          <button type="button" onClick={() => { setAdding(false); setErr(""); }}
            className="shrink-0 rounded-lg px-2 text-sm text-slate-500 hover:bg-slate-100">✕</button>
        </div>
        {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : <p className="mt-1 text-[11px] text-slate-400">Saved for next time</p>}
      </div>
    );
  }

  return (
    <select name={name} value={current} required={required} disabled={disabled} className={`${cls} ${className ?? ""}`}
      onChange={(e) => { if (e.target.value === ADD) { setAdding(true); setText(""); } else set(e.target.value); }}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      <option value={ADD}>＋ Add new…</option>
    </select>
  );
}
