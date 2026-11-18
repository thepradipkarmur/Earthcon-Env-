"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { markAllRead, openNotification } from "@/app/(app)/notifications/actions";
import Link from "next/link";

export type Notif = { id: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string; kind: string };

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24); return d < 30 ? `${d} d ago` : new Date(iso).toLocaleDateString("en-IN");
}

const ICON: Record<string, string> = {
  task_assigned: "📋", task_done: "✅", report_review: "🧾", report_checked: "🔎", report_approved: "🏅", report_cancelled: "↩️",
  sample_tested: "🧪", invoice_assigned: "💳", invoice_paid: "💰", quotation_assigned: "📄", quotation_accepted: "🤝",
  vendor_po_assigned: "🛒", vendor_po_received: "📦", user_signup: "👤",
};

export function NotificationBell({ userId, initial, unread: initialUnread }: { userId: string; initial: Notif[]; unread: number }) {
  const [items, setItems] = useState<Notif[]>(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase.from("notifications").select("id,title,body,link,is_read,created_at,kind").order("created_at", { ascending: false }).limit(15),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
      ]);
      if (data) setItems(data as Notif[]);
      if (typeof count === "number") setUnread(count);
    };
    const channel = supabase.channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        setItems((prev) => [payload.new as Notif, ...prev].slice(0, 15));
        setUnread((u) => u + 1);
      })
      .subscribe();
    const poll = setInterval(refresh, 30000); // fallback if realtime is unavailable
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { supabase.removeChannel(channel); clearInterval(poll); window.removeEventListener("focus", onFocus); };
  }, [userId]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-label={`Notifications (${unread} unread)`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
        </svg>
        {unread > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unread > 0 ? <form action={async () => { await markAllRead(); setUnread(0); setItems((p) => p.map((n) => ({ ...n, is_read: true }))); }}>
              <button className="text-xs text-teal-700 hover:underline">Mark all read</button></form> : null}
          </div>
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {items.length === 0 ? <li className="px-4 py-8 text-center text-sm text-slate-400">You&apos;re all caught up.</li> : items.map((n) => (
              <li key={n.id}>
                <form action={openNotification}>
                  <input type="hidden" name="id" value={n.id} /><input type="hidden" name="link" value={n.link ?? "/notifications"} />
                  <button className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.is_read ? "" : "bg-teal-50/60"}`}>
                    <span className="text-lg leading-none">{ICON[n.kind] ?? "🔔"}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${n.is_read ? "text-slate-700" : "font-semibold text-slate-900"}`}>{n.title}</span>
                      {n.body ? <span className="block truncate text-xs text-slate-500">{n.body}</span> : null}
                      <span className="block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                    </span>
                    {n.is_read ? null : <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-600" />}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-medium text-teal-700 hover:bg-slate-50">View all notifications</Link>
        </div>
      ) : null}
    </div>
  );
}
