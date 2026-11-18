import { AssignControl } from "@/components/assign-control";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ComboSelect } from "@/components/combo-select";
import { Button, Card, DL, Field, Input, LinkButton, Notice, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { getLookups, getStaffOptions } from "@/lib/data";
import { amountInWords, fmtDate, fmtDateTime, inr, isoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { addVendorPayment, deleteVendorPayment, saveReceipt, setVendorPOStatus } from "../actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function VendorPOView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: po } = await supabase.from("vendor_pos").select("*,vendors(id,name,email,contact_name,state),vendor_quotations(id,vq_no)").eq("id", id).single() as { data: any };
  if (!po) notFound();
  const [{ data: items }, { data: pays }, lk, { data: settings }, staff] = await Promise.all([
    supabase.from("vendor_po_items").select("*").eq("vendor_po_id", id).order("line_no"),
    supabase.from("vendor_payments").select("*").eq("vendor_po_id", id).order("payment_date"),
    getLookups("payment_mode"),
    supabase.from("app_settings").select("lab_name").single(),
    getStaffOptions(),
  ]);
  const edit = can(profile, "accounts", "tech_manager");
  const live = !["draft", "cancelled", "closed"].includes(po.status);
  const btn = (s: string, label: string, v: "primary" | "secondary" | "danger" = "secondary") => (
    <form action={setVendorPOStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} /><Button variant={v}>{label}</Button></form>);
  const lab = settings?.lab_name ?? "Earthcon Lab";
  const mail = po.vendors?.email
    ? `mailto:${po.vendors.email}?subject=${encodeURIComponent(`Purchase Order ${po.po_no} – ${lab}`)}&body=${encodeURIComponent(
      `Dear ${po.vendors.contact_name ?? "Sir/Madam"},\n\nPlease find attached our Purchase Order ${po.po_no} dated ${fmtDate(po.po_date)} for ${inr(po.total)} (incl. GST).\n${po.delivery_date ? `Required delivery by ${fmtDate(po.delivery_date)}.\n` : ""}\nKindly acknowledge receipt and confirm the delivery schedule.\n\nRegards,\n${profile.full_name}\n${lab}`)}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title={po.po_no} subtitle={<>{po.vendors?.name} · <StatusBadge status={po.status} />{po.sent_at ? <span className="text-xs text-slate-500"> · sent {fmtDateTime(po.sent_at)}</span> : null}</>}
        actions={<>
          <LinkButton href={`/api/pdf/vendor-po/${id}`} variant="secondary" icon="download" target="_blank">PO PDF</LinkButton>
          {mail && edit ? <LinkButton href={mail} variant="secondary">Email vendor</LinkButton> : null}
          {edit && po.status === "draft" ? btn("sent", "Mark as sent", "primary") : null}
          {edit && po.status === "sent" ? btn("acknowledged", "Vendor acknowledged") : null}
          {edit && po.status === "received" ? btn("closed", "Close PO") : null}
          {edit && ["draft", "sent", "acknowledged"].includes(po.status) && Number(po.amount_paid) === 0 ? btn("cancelled", "Cancel", "danger") : null}
        </>} />
      {mail ? null : <Notice>Add an email address on the vendor to use “Email vendor”. Download the PO PDF and attach it to your email.</Notice>}
      <Card><AssignControl kind="vendor_po" id={id} current={po.assigned_to} staff={staff} label="Assigned for approval / follow-up" disabled={!edit} /></Card>
      <Card title="Details">
        <DL items={[["Vendor", <Link key="v" href={`/vendors/${po.vendors?.id}`} className="text-teal-800 hover:underline">{po.vendors?.name}</Link>],
          ["Vendor quotation", po.vendor_quotations ? <Link key="q" href={`/vendor-quotations/${po.vendor_quotations.id}`} className="text-teal-800 hover:underline">{po.vendor_quotations.vq_no}</Link> : null],
          ["PO date", fmtDate(po.po_date)], ["Delivery by", fmtDate(po.delivery_date)], ["Deliver to", po.delivery_address],
          ["Payment terms", po.payment_terms], ["Tax", po.is_interstate ? "IGST (inter-state)" : "CGST + SGST"], ["Notes", po.notes]]} />
      </Card>
      <Card title="Items & delivery">
        <ActionForm action={saveReceipt}>
          <input type="hidden" name="vendor_po_id" value={id} />
          <Table head={["#", "Item", "Unit", "Ordered", "Received", "Rate", "Amount"]}>
            {(items ?? []).map((i) => (
              <tr key={i.id} className={Number(i.received_qty) >= Number(i.quantity) ? "bg-emerald-50/50" : ""}>
                <Td>{i.line_no}</Td><Td className="whitespace-normal">{i.description}</Td><Td>{i.unit ?? "—"}</Td><Td>{Number(i.quantity)}</Td>
                <Td>{edit && live ? <Input name={`rcv_${i.id}`} type="number" step="any" min={0} defaultValue={Number(i.received_qty)} className="w-24" /> : Number(i.received_qty)}</Td>
                <Td>{inr(i.rate)}</Td><Td className="text-right">{inr(i.amount)}</Td>
              </tr>
            ))}
            <tr><Td colSpan={6} className="text-right">Subtotal</Td><Td className="text-right">{inr(po.subtotal)}</Td></tr>
            {Number(po.discount_amount) ? <tr><Td colSpan={6} className="text-right">Discount</Td><Td className="text-right">− {inr(po.discount_amount)}</Td></tr> : null}
            {po.is_interstate ? <tr><Td colSpan={6} className="text-right">IGST {Number(po.gst_pct)}%</Td><Td className="text-right">{inr(po.igst)}</Td></tr> : (<>
              <tr><Td colSpan={6} className="text-right">CGST {Number(po.gst_pct) / 2}%</Td><Td className="text-right">{inr(po.cgst)}</Td></tr>
              <tr><Td colSpan={6} className="text-right">SGST {Number(po.gst_pct) / 2}%</Td><Td className="text-right">{inr(po.sgst)}</Td></tr></>)}
            <tr><Td colSpan={6} className="text-right font-semibold">Total</Td><Td className="text-right text-base font-semibold">{inr(po.total)}</Td></tr>
            <tr><Td colSpan={7} className="text-xs italic text-slate-500">{amountInWords(Number(po.total))}</Td></tr>
          </Table>
          {edit && live ? <div className="mt-3 flex items-center justify-end gap-3"><span className="text-xs text-slate-500">Status updates automatically when quantities are received</span><SubmitButton variant="secondary">Update received quantities</SubmitButton></div> : null}
        </ActionForm>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Payments · paid ${inr(po.amount_paid)} · TDS ${inr(po.tds_amount)} · balance ${inr(po.balance)}`}>
          <Table head={["Date", "Amount", "TDS", "Mode", "Reference", ""]} empty={!pays?.length}>
            {(pays ?? []).map((p) => (
              <tr key={p.id}><Td>{fmtDate(p.payment_date)}</Td><Td>{inr(p.amount)}</Td><Td>{inr(p.tds_amount)}</Td><Td>{p.mode ?? "—"}</Td><Td>{p.reference ?? "—"}</Td>
                <Td>{edit ? <form action={deleteVendorPayment}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="vendor_po_id" value={id} /><button className="text-xs text-red-600">Remove</button></form> : null}</Td></tr>
            ))}
          </Table>
        </Card>
        {edit && !["draft", "cancelled"].includes(po.status) && Number(po.balance) > 0 ? (
          <Card title="Record payment to vendor">
            <ActionForm action={addVendorPayment} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="vendor_po_id" value={id} />
              <Field label="Date"><Input type="date" name="payment_date" defaultValue={isoDate()} /></Field>
              <Field label="Amount paid (₹)"><Input type="number" step="any" name="amount" defaultValue={Number(po.balance)} /></Field>
              <Field label="TDS deducted (₹)" hint="If you deduct TDS on this payment — confirm rate with your CA"><Input type="number" step="any" name="tds_amount" defaultValue={0} /></Field>
              <Field label="Mode"><ComboSelect name="mode" options={lk.payment_mode} category="payment_mode" placeholder="—" /></Field>
              <Field label="UTR / Cheque no." className="sm:col-span-2"><Input name="reference" /></Field>
              <div className="text-right sm:col-span-2"><SubmitButton>Record payment</SubmitButton></div>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
