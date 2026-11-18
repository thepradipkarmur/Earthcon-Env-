import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Button, Input, Notice, PageHeader, Select, Table } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { getLookups } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Users & roles" };

async function updateUser(fd: FormData) {
  "use server";
  const supabase = await createClient();
  await supabase.from("profiles").update({
    full_name: String(fd.get("full_name") || ""), role: String(fd.get("role")), designation: String(fd.get("designation") || "") || null,
    phone: String(fd.get("phone") || "") || null, is_active: fd.get("is_active") === "on",
  }).eq("id", String(fd.get("id")));
  revalidatePath("/users");
}

export default async function Users() {
  const me = await getProfile();
  if (me.role !== "admin") redirect("/");
  const supabase = await createClient();
  const [{ data }, lookups] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), getLookups("designation")]);
  return (
    <div>
      <PageHeader title="Users & roles" subtitle="Staff sign up from the login page; assign their role here." />
      <div className="mb-4"><Notice tone="teal">
        <b>Roles:</b> Admin – everything · Accounts/Marketing – clients, quotations, POs, invoices · Field Sampler – register samples, own tasks ·
        Analyst – enter results, prepare reports · Technical Manager – review results, approve reports, master data · Viewer – read only.
      </Notice></div>
      <Table head={["Name", "Email", "Role", "Designation", "Phone", "Active", "Joined", ""]}>
        {(data ?? []).map((u) => (
          <tr key={u.id}>
            <td colSpan={8} className="p-0">
              <form action={updateUser} className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_0.9fr_50px_90px_70px] items-center gap-2 px-3 py-2 text-sm">
                <input type="hidden" name="id" value={u.id} />
                <Input name="full_name" defaultValue={u.full_name} />
                <span className="truncate text-slate-600">{u.email}</span>
                <Select name="role" defaultValue={u.role} options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))} />
                <Select name="designation" defaultValue={u.designation ?? ""} options={lookups.designation} placeholder="—" />
                <Input name="phone" defaultValue={u.phone ?? ""} />
                <input type="checkbox" name="is_active" defaultChecked={u.is_active} disabled={u.id === me.id} />
                {u.id === me.id ? <input type="hidden" name="is_active" value="on" /> : null}
                <span className="text-xs text-slate-500">{fmtDate(u.created_at)}</span>
                <Button variant="secondary" className="px-2 py-1 text-xs">Save</Button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
