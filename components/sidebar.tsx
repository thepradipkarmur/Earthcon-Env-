"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ADMIN_NAV, NAV } from "@/lib/constants";
import { Icon } from "./icons";
import { Logo } from "./logo";

export function Sidebar({ name, roleLabel, isAdmin, signOut }: { name: string; roleLabel: string; isAdmin: boolean; signOut: () => Promise<void> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const link = (item: { href: string; label: string; icon: string; step?: number }) => (
    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active(item.href) ? "bg-white/15 text-white" : "text-teal-100/80 hover:bg-white/10 hover:text-white"}`}>
      <Icon name={item.icon} />
      <span className="flex-1">{item.label}</span>
      {item.step ? <span className="text-[10px] text-teal-200/60">{item.step}</span> : null}
    </Link>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-teal-900 px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setOpen(!open)} className="text-white" aria-label="Menu"><Icon name="menu" className="h-6 w-6" /></button>
      </div>
      <aside className={`${open ? "block" : "hidden"} fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto bg-gradient-to-b from-teal-900 to-emerald-950 p-4 lg:sticky lg:top-0 lg:block lg:h-screen`}>
        <div className="mb-6 hidden lg:block"><Logo /></div>
        <nav className="space-y-0.5">{NAV.map(link)}</nav>
        {isAdmin ? (
          <>
            <div className="mb-1 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-teal-300/60">Administration</div>
            <nav className="space-y-0.5">{ADMIN_NAV.map(link)}</nav>
          </>
        ) : (
          <nav className="mt-6 space-y-0.5">{link({ href: "/masters", label: "Master Data", icon: "database" })}</nav>
        )}
        <div className="mt-8 rounded-lg bg-white/10 p-3">
          <div className="truncate text-sm font-medium text-white">{name}</div>
          <div className="text-xs text-teal-200/80">{roleLabel}</div>
          <form action={signOut}>
            <button className="mt-2 flex items-center gap-1.5 text-xs text-teal-100 hover:text-white"><Icon name="logout" className="h-3.5 w-3.5" />Sign out</button>
          </form>
        </div>
      </aside>
      {open ? <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} /> : null}
    </>
  );
}
