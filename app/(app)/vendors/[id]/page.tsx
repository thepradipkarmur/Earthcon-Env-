import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, DL, LinkButton, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, inr } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function VendorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: v } = await supabase.from("vendors").select("*,clients(id,name)").eq("id", id).single() as { data: any };
  if (!v) notFound();
  const [quotes, pos] = await Promise.all([
    supabase.from("vendor_quotations").select("id,vq_no,vendor_ref,quote_date,total,status").eq("vendor_id", id).order("created_at", { ascending: false }),
    supabase.from("vendor_pos").select("id,po_no,po_date,total,balance,status").eq("vendor_id", id).order("created_at", { ascending: false }),
  ]);
  const live = (pos.data ?? []).filter((p) => !["draft", "cancelled"].includes(p.status));
  const ordered = live.reduce((a, p) => a + Number(p.total), 0);
  const payable = live.reduce((a, p) => a + Number(p.balance), 0);
  const edit = can(profile, "accounts", "tech_manager");

  return (
    <div className="space-y-6">
      <PageHeader title={v.name} subtitle={`${v.vendor_code} · ${v.category ?? "Category not set"}${v.rating ? ` · ${"★".repeat(v.rating)}` : ""}`}
        actions={<>
          {edit ? <LinkButton href={`/vendors/${id}/edit`} variant="secondary">Edit</LinkButton> : null}
          {edit ? <LinkButton href={`/vendor-quotations/new?vendor=${id}`} variant="secondary" icon="plus">Record quotation</LinkButton> : null}
          {edit ? <LinkButton href={`/vendor-pos/new?vendor=${id}`} icon="plus">New purchase order</LinkButton> : null}
        </>} />
      <Card title="Details">
        <DL items={[
          ["GSTIN", v.gstin], ["PAN", v.pan], ["MSME / Udyam", v.msme_no],
          ["Address", [v.address, v.city, v.district, v.state, v.pincode].filter(Boolean).join(", ")],
          ["Contact", [v.contact_name, v.contact_designation].filter(Boolean).join(", ")], ["Email / phone", [v.email, v.phone].filter(Boolean).join(" · ")],
          ["Payment terms", v.payment_terms], ["Bank details", v.bank_details],
          ["Also a client", v.clients ? <Link key="c" href={`/clients/${v.clients.id}`} className="text-teal-800 hover:underline">{v.clients.name}</Link> : "No"],
          ["Total ordered", inr(ordered)], ["Payable now", inr(payable)], ["Notes", v.notes],
        ]} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Quotations received">
          <Table head={["Our ref", "Their ref", "Date", "Total", "Status"]} empty={!quotes.data?.length}>
            {(quotes.data ?? []).map((q) => (<tr key={q.id}><Td><Link className="text-teal-800 hover:underline" href={`/vendor-quotations/${q.id}`}>{q.vq_no}</Link></Td><Td>{q.vendor_ref ?? "—"}</Td><Td>{fmtDate(q.quote_date)}</Td><Td>{inr(q.total)}</Td><Td><StatusBadge status={q.status} /></Td></tr>))}
          </Table>
        </Card>
        <Card title="Purchase orders">
          <Table head={["PO no.", "Date", "Total", "Balance", "Status"]} empty={!pos.data?.length}>
            {(pos.data ?? []).map((p) => (<tr key={p.id}><Td><Link className="text-teal-800 hover:underline" href={`/vendor-pos/${p.id}`}>{p.po_no}</Link></Td><Td>{fmtDate(p.po_date)}</Td><Td>{inr(p.total)}</Td><Td>{inr(p.balance)}</Td><Td><StatusBadge status={p.status} /></Td></tr>))}
          </Table>
        </Card>
      </div>
    </div>
  );
}
