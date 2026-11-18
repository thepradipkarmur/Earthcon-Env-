import { getStaffOptions } from "@/lib/data";
import { AssignControl } from "@/components/assign-control";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, DL, LinkButton, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, inr } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { reviseQuotation, setQuotationStatus } from "../actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function QuotationView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: q } = await supabase.from("quotations").select("*,clients(id,name,client_code),client_contacts(name,designation)").eq("id", id).single() as { data: any };
  if (!q) notFound();
  const [{ data: items }, { data: pos }, staff] = await Promise.all([
    supabase.from("quotation_items").select("*").eq("quotation_id", id).order("line_no"),
    supabase.from("purchase_orders").select("id,po_number,po_value,status").eq("quotation_id", id),
    getStaffOptions(),
  ]);
  const edit = can(profile, "accounts");
  const statusBtn = (s: string, label: string, variant: "primary" | "secondary" | "danger" = "secondary") => (
    <form action={setQuotationStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} /><Button variant={variant}>{label}</Button></form>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={q.quote_no} step={2} subtitle={<>{q.clients?.name} · <StatusBadge status={q.status} /></>}
        actions={<>
          <LinkButton href={`/api/pdf/quotation/${id}`} variant="secondary" icon="download" target="_blank">PDF</LinkButton>
          {edit && ["draft", "sent"].includes(q.status) ? <LinkButton href={`/quotations/${id}/edit`} variant="secondary">Edit</LinkButton> : null}
          {edit && q.status === "draft" ? statusBtn("sent", "Mark as sent") : null}
          {edit && ["draft", "sent"].includes(q.status) ? statusBtn("accepted", "Mark accepted", "primary") : null}
          {edit && ["draft", "sent"].includes(q.status) ? statusBtn("rejected", "Rejected", "danger") : null}
          {edit && q.status !== "revised" ? <form action={reviseQuotation}><input type="hidden" name="id" value={id} /><Button variant="secondary">Revise</Button></form> : null}
          {edit && q.status === "accepted" ? <LinkButton href={`/purchase-orders/new?quotation=${id}`} icon="plus">Record PO</LinkButton> : null}
        </>} />
      <Card><AssignControl kind="quotation" id={id} current={q.assigned_to} staff={staff} label="Assigned for review / follow-up" disabled={!edit} /></Card>
      <Card title="Details">
        <DL items={[
          ["Client", <Link key="c" className="text-teal-800 hover:underline" href={`/clients/${q.clients?.id}`}>{q.clients?.name}</Link>],
          ["Kind attention", q.client_contacts ? `${q.client_contacts.name}${q.client_contacts.designation ? `, ${q.client_contacts.designation}` : ""}` : null],
          ["Date", fmtDate(q.quote_date)], ["Valid until", fmtDate(q.valid_until)], ["Revision", q.revision ? `R${q.revision}` : "Original"], ["Subject", q.subject],
        ]} />
      </Card>
      <Table head={["#", "Description", "Frequency", "Qty", "Rate", "Amount"]}>
        {(items ?? []).map((i) => (
          <tr key={i.id}><Td>{i.line_no}</Td><Td className="whitespace-normal">{i.description}</Td><Td>{i.frequency ?? "—"}</Td><Td>{Number(i.quantity)}</Td><Td>{inr(i.rate)}</Td><Td className="text-right font-medium">{inr(i.amount)}</Td></tr>
        ))}
        <tr><Td colSpan={5} className="text-right">Subtotal</Td><Td className="text-right">{inr(q.subtotal)}</Td></tr>
        {Number(q.discount_amount) ? <tr><Td colSpan={5} className="text-right">Discount ({Number(q.discount_pct)}%)</Td><Td className="text-right">− {inr(q.discount_amount)}</Td></tr> : null}
        <tr><Td colSpan={5} className="text-right">GST ({Number(q.gst_pct)}%)</Td><Td className="text-right">{inr(q.gst_amount)}</Td></tr>
        <tr><Td colSpan={5} className="text-right font-semibold">Total</Td><Td className="text-right text-base font-semibold">{inr(q.total)}</Td></tr>
      </Table>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Terms & conditions"><pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{q.terms || "—"}</pre></Card>
        <Card title="Purchase orders against this quotation">
          {(pos ?? []).length ? (pos ?? []).map((p) => (
            <div key={p.id} className="flex justify-between text-sm"><Link className="text-teal-800 hover:underline" href={`/purchase-orders/${p.id}`}>{p.po_number}</Link><span>{inr(p.po_value)} <StatusBadge status={p.status} /></span></div>
          )) : <p className="text-sm text-slate-400">No PO recorded yet.</p>}
        </Card>
      </div>
    </div>
  );
}
