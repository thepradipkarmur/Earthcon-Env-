import Link from "next/link";
import { Badge, LinkButton, PageHeader, SearchBar, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { inr } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Vendors" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function Vendors({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const profile = await getProfile();
  const supabase = await createClient();
  let query = supabase.from("vendors").select("*,clients(name),vendor_pos(balance,status)").order("name").limit(300);
  if (q) query = query.or(`name.ilike.%${q}%,vendor_code.ilike.%${q}%,gstin.ilike.%${q}%,category.ilike.%${q}%`);
  const { data } = await query;
  return (
    <div>
      <PageHeader title="Vendors" subtitle="Suppliers, service providers and sub-contract labs"
        actions={can(profile, "accounts", "tech_manager") ? <LinkButton href="/vendors/new" icon="plus">New vendor</LinkButton> : null} />
      <SearchBar defaultValue={q} placeholder="Name, code, GSTIN, category" />
      <Table head={["Code", "Vendor", "Category", "Location", "Contact", "Payable", "Status"]} empty={!data?.length}>
        {(data as any[] ?? []).map((v) => {
          const payable = (v.vendor_pos ?? []).filter((p: any) => !["draft", "cancelled"].includes(p.status)).reduce((a: number, p: any) => a + Number(p.balance), 0);
          return (
            <tr key={v.id} className="hover:bg-slate-50">
              <Td className="font-mono text-xs">{v.vendor_code}</Td>
              <Td><Link href={`/vendors/${v.id}`} className="font-medium text-teal-800 hover:underline">{v.name}</Link>{v.clients ? <span className="ml-2"><Badge tone="violet">also client</Badge></span> : null}</Td>
              <Td>{v.category ?? "—"}</Td><Td>{[v.city, v.state].filter(Boolean).join(", ") || "—"}</Td>
              <Td>{v.contact_name ?? "—"}<div className="text-xs text-slate-500">{v.phone}</div></Td>
              <Td className={payable > 0 ? "font-medium text-amber-700" : ""}>{inr(payable)}</Td>
              <Td>{v.is_active ? <Badge tone="green">active</Badge> : <Badge>inactive</Badge>}</Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
