import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { STATUS_TONE } from "@/lib/constants";
import { Icon } from "./icons";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function PageHeader({ title, subtitle, step, actions }: { title: string; subtitle?: ReactNode; step?: number; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {step ? <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-teal-700">Step {step} of 8</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {actions}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

const btnBase = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
const btnVariants = {
  primary: "bg-teal-700 text-white hover:bg-teal-800",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-slate-600 hover:bg-slate-100",
};
export type BtnVariant = keyof typeof btnVariants;

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: BtnVariant }) {
  return <button {...props} className={cx(btnBase, btnVariants[variant], className)} />;
}

export function LinkButton({ href, variant = "primary", icon, children, className, target }: { href: string; variant?: BtnVariant; icon?: string; children: ReactNode; className?: string; target?: string }) {
  return (
    <Link href={href} target={target} className={cx(btnBase, btnVariants[variant], className)}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </Link>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:bg-slate-50";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={cx(inputCls, props.className)} />;
}
export function Select({ options, placeholder, ...props }: ComponentProps<"select"> & { options: (string | { value: string; label: string })[]; placeholder?: string }) {
  return (
    <select {...props} className={cx(inputCls, props.className)}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) =>
        typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>,
      )}
    </select>
  );
}

export function Field({ label, hint, children, className, required }: { label: string; hint?: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}{required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

const tones = {
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-sky-100 text-sky-800",
  amber: "bg-amber-100 text-amber-800",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-700",
  violet: "bg-violet-100 text-violet-800",
};
export function Badge({ children, tone }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone ?? "gray"])}>{children}</span>;
}
export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  return <Badge tone={STATUS_TONE[status] ?? "gray"}>{status.replace(/_/g, " ")}</Badge>;
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty ? <div className="px-4 py-10 text-center text-sm text-slate-400">No records yet.</div> : null}
    </div>
  );
}
export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cx("whitespace-nowrap px-4 py-2.5 text-slate-700", className)}>{children}</td>;
}

export function Stat({ label, value, hint, href, tone = "teal" }: { label: string; value: ReactNode; hint?: string; href?: string; tone?: "teal" | "amber" | "red" | "slate" }) {
  const toneCls = { teal: "text-teal-700", amber: "text-amber-600", red: "text-red-600", slate: "text-slate-800" }[tone];
  const inner = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold", toneCls)}>{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function DL({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium text-slate-500">{k}</dt>
          <dd className="mt-0.5 text-sm text-slate-900">{v === null || v === undefined || v === "" ? "—" : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Notice({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "red" | "teal" }) {
  const cls = { amber: "border-amber-200 bg-amber-50 text-amber-900", red: "border-red-200 bg-red-50 text-red-800", teal: "border-teal-200 bg-teal-50 text-teal-900" }[tone];
  return <div className={cx("flex gap-2 rounded-lg border px-3 py-2 text-sm", cls)}><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /><div>{children}</div></div>;
}

export function SearchBar({ placeholder = "Search…", defaultValue, children }: { placeholder?: string; defaultValue?: string; children?: ReactNode }) {
  return (
    <form className="mb-4 flex flex-wrap gap-2">
      <Input name="q" defaultValue={defaultValue} placeholder={placeholder} className="max-w-xs" />
      {children}
      <Button variant="secondary" type="submit">Filter</Button>
    </form>
  );
}
