import { Sidebar } from "@/components/sidebar";
import { signOut } from "@/app/login/actions";
import { getProfile } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return (
    <div className="lg:flex">
      <Sidebar name={profile.full_name || profile.email || "User"} roleLabel={ROLE_LABELS[profile.role]}
        isAdmin={profile.role === "admin"} signOut={signOut} />
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
        {!profile.is_active ? <p className="text-red-600">Your account is deactivated.</p> : children}
      </main>
    </div>
  );
}
