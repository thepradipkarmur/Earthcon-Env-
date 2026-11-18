import Link from "next/link";
import { Badge, LinkButton, PageHeader, SearchBar, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, isoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const profile = await getProfile();
  const supabase = await createClient();
  let query = supabase.from("clients").select("*").order("name").limit(300);
  if (q) query = query.or(`name.ilike.%${q}%,client_code.ilike.%${q}%,gstin.ilike.%${q}%,city.ilike.%${q}%`);
  const { data } = await query;
  const today = isoDate();

  return (
    <div>
      <PageHeader title="Clients" step={1} subtitle="Client and industry details"
        actions={can(profile, "accounts", "tech_manager") ? <LinkButton href="/clients/new" icon="plus">New client</LinkButton> : null} />
      <SearchBar defaultValue={q} placeholder="Name, code, GSTIN, city" />
      <Table head={["Code", "Client", "Sector", "Category", "District / Estate", "CCA valid", "Status"]} empty={!data?.length}>
        {(data ?? []).map((c) => (
          <tr key={c.id} className="hover:bg-slate-50">
            <Td className="font-mono text-xs">{c.client_code}</Td>
            <Td><Link href={`/clients/${c.id}`} className="font-medium text-teal-800 hover:underline">{c.name}</Link></Td>
            <Td>{c.industry_sector ?? "—"}</Td>
            <Td>{c.pcb_category ? <Badge tone={c.pcb_category === "Red" ? "red" : c.pcb_category === "Orange" ? "amber" : c.pcb_category === "Green" ? "green" : "gray"}>{c.pcb_category}</Badge> : "—"}</Td>
            <Td>{[c.district, c.gidc_estate].filter(Boolean).join(" · ") || "—"}</Td>
            <Td className={c.cca_valid_upto && c.cca_valid_upto < today ? "text-red-600" : ""}>{fmtDate(c.cca_valid_upto)}</Td>
            <Td>{c.is_active ? <Badge tone="green">active</Badge> : <Badge>inactive</Badge>}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
