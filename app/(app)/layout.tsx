import { NotificationBell, type Notif } from "@/components/notification-bell";
import { Sidebar } from "@/components/sidebar";
import { signOut } from "@/app/login/actions";
import { getProfile } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  const supabase = await createClient();
  const [{ data: notes }, { count }] = await Promise.all([
    supabase.from("notifications").select("id,title,body,link,is_read,created_at,kind").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(15),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_read", false),
  ]);
  return (
    <div className="lg:flex">
      <Sidebar name={profile.full_name || profile.email || "User"} roleLabel={ROLE_LABELS[profile.role]}
        isAdmin={profile.role === "admin"} signOut={signOut} />
      <main className="min-w-0 flex-1 px-4 py-4 lg:px-8 lg:py-5">
        <div className="mb-3 flex items-center justify-end gap-3">
          <span className="hidden text-right text-xs leading-tight text-slate-500 sm:block">{profile.full_name}<br /><span className="text-slate-400">{ROLE_LABELS[profile.role]}</span></span>
          <NotificationBell userId={profile.id} initial={(notes ?? []) as Notif[]} unread={count ?? 0} />
        </div>
        {!profile.is_active ? <p className="text-red-600">Your account is deactivated.</p> : children}
      </main>
    </div>
  );
}
