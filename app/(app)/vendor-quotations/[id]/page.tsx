import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, DL, LinkButton, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, inr } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { setVendorQuoteStatus } from "../actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function VendorQuoteView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: q } = await supabase.from("vendor_quotations").select("*,vendors(id,name)").eq("id", id).single() as { data: any };
  if (!q) notFound();
  const [{ data: items }, { data: pos }] = await Promise.all([
    supabase.from("vendor_quotation_items").select("*").eq("vendor_quotation_id", id).order("line_no"),
    supabase.from("vendor_pos").select("id,po_no,total,status").eq("vendor_quotation_id", id),
  ]);
  let fileUrl: string | null = null;
  if (q.file_path) fileUrl = (await supabase.storage.from("documents").createSignedUrl(q.file_path, 600)).data?.signedUrl ?? null;
  const edit = can(profile, "accounts", "tech_manager");
  const btn = (s: string, label: string, v: "primary" | "secondary" | "danger" = "secondary") => (
    <form action={setVendorQuoteStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} /><Button variant={v}>{label}</Button></form>);
  const open = ["received", "under_review"].includes(q.status);

  return (
    <div className="space-y-6">
      <PageHeader title={q.vq_no} subtitle={<>{q.vendors?.name} · <StatusBadge status={q.status} /></>}
        actions={<>
          {fileUrl ? <LinkButton href={fileUrl} variant="secondary" icon="download" target="_blank">Vendor&apos;s copy</LinkButton> : null}
          {edit && q.status === "received" ? btn("under_review", "Under review") : null}
          {edit && open ? btn("accepted", "Accept", "primary") : null}
          {edit && open ? btn("rejected", "Reject", "danger") : null}
          {edit && q.status === "accepted" ? <LinkButton href={`/vendor-pos/new?vq=${id}`} icon="plus">Create purchase order</LinkButton> : null}
        </>} />
      <Card title="Details">
        <DL items={[["Vendor", <Link key="v" href={`/vendors/${q.vendors?.id}`} className="text-teal-800 hover:underline">{q.vendors?.name}</Link>],
          ["Vendor's quotation no.", q.vendor_ref], ["Date", fmtDate(q.quote_date)], ["Valid until", fmtDate(q.valid_until)], ["Subject", q.subject], ["Notes", q.notes]]} />
      </Card>
      <Table head={["#", "Item", "Unit", "Qty", "Rate", "Amount"]}>
        {(items ?? []).map((i) => (<tr key={i.id}><Td>{i.line_no}</Td><Td className="whitespace-normal">{i.description}</Td><Td>{i.unit ?? "—"}</Td><Td>{Number(i.quantity)}</Td><Td>{inr(i.rate)}</Td><Td className="text-right">{inr(i.amount)}</Td></tr>))}
        <tr><Td colSpan={5} className="text-right">Subtotal</Td><Td className="text-right">{inr(q.subtotal)}</Td></tr>
        {Number(q.discount_amount) ? <tr><Td colSpan={5} className="text-right">Discount</Td><Td className="text-right">− {inr(q.discount_amount)}</Td></tr> : null}
        <tr><Td colSpan={5} className="text-right">GST ({Number(q.gst_pct)}%)</Td><Td className="text-right">{inr(q.gst_amount)}</Td></tr>
        <tr><Td colSpan={5} className="text-right font-semibold">Total</Td><Td className="text-right text-base font-semibold">{inr(q.total)}</Td></tr>
      </Table>
      <Card title="Purchase orders from this quotation">
        {(pos ?? []).length ? (pos ?? []).map((p) => (<div key={p.id} className="flex justify-between text-sm"><Link className="text-teal-800 hover:underline" href={`/vendor-pos/${p.id}`}>{p.po_no}</Link><span>{inr(p.total)} <StatusBadge status={p.status} /></span></div>))
          : <p className="text-sm text-slate-400">No purchase order yet. Accept the quotation, then “Create purchase order”.</p>}
      </Card>
    </div>
  );
}
