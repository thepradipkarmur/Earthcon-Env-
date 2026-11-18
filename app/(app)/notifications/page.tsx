import { Button, PageHeader } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { markAllRead, openNotification } from "./actions";

export const metadata = { title: "Notifications" };

export default async function Notifications({ searchParams }: { searchParams: Promise<{ unread?: string }> }) {
  const sp = await searchParams;
  const me = await getProfile();
  const supabase = await createClient();
  let q = supabase.from("notifications").select("*").eq("user_id", me.id).order("created_at", { ascending: false }).limit(200);
  if (sp.unread) q = q.eq("is_read", false);
  const { data } = await q;
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Assignments, reviews and updates for you"
        actions={<form action={markAllRead}><Button variant="secondary">Mark all read</Button></form>} />
      <div className="mb-3 flex gap-2 text-sm">
        <a href="/notifications" className={!sp.unread ? "font-semibold text-teal-800" : "text-slate-500"}>All</a>
        <span className="text-slate-300">|</span>
        <a href="/notifications?unread=1" className={sp.unread ? "font-semibold text-teal-800" : "text-slate-500"}>Unread</a>
      </div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {(data ?? []).length === 0 ? <li className="px-4 py-10 text-center text-sm text-slate-400">Nothing here yet.</li> : (data ?? []).map((n) => (
          <li key={n.id}>
            <form action={openNotification}>
              <input type="hidden" name="id" value={n.id} /><input type="hidden" name="link" value={n.link ?? "/notifications"} />
              <button className={`flex w-full items-start justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50 ${n.is_read ? "" : "bg-teal-50/60"}`}>
                <span><span className={`block text-sm ${n.is_read ? "text-slate-700" : "font-semibold text-slate-900"}`}>{n.title}</span>
                  {n.body ? <span className="block text-xs text-slate-500">{n.body}</span> : null}</span>
                <span className="shrink-0 text-xs text-slate-400">{fmtDateTime(n.created_at)}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
