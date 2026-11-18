import Link from "next/link";
import { notFound } from "next/navigation";
import { ComboSelect } from "@/components/combo-select";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, Card, DL, Field, Input, LinkButton, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { getLookups } from "@/lib/data";
import { amountInWords, fmtDate, inr, isoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { addPayment, deletePayment, setInvoiceStatus } from "../actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function InvoiceView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoices").select("*,clients(id,name,gstin),purchase_orders(id,po_number)").eq("id", id).single() as { data: any };
  if (!inv) notFound();
  const [{ data: items }, { data: pays }, lookups] = await Promise.all([
    supabase.from("invoice_items").select("*,samples(id,sample_no)").eq("invoice_id", id).order("line_no"),
    supabase.from("payments").select("*").eq("invoice_id", id).order("payment_date"),
    getLookups("payment_mode"),
  ]);
  const acc = can(profile, "accounts");
  const statusBtn = (s: string, label: string, v: "primary" | "secondary" | "danger" = "secondary") => (
    <form action={setInvoiceStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} /><Button variant={v}>{label}</Button></form>);

  return (
    <div className="space-y-6">
      <PageHeader title={inv.invoice_no} step={8} subtitle={<>{inv.clients?.name} · <StatusBadge status={inv.status} /></>}
        actions={<>
          <LinkButton href={`/api/pdf/invoice/${id}`} variant="secondary" icon="download" target="_blank">PDF</LinkButton>
          {acc && inv.status === "draft" ? statusBtn("issued", "Issue invoice", "primary") : null}
          {acc && ["draft", "issued"].includes(inv.status) && Number(inv.amount_paid) === 0 ? statusBtn("cancelled", "Cancel", "danger") : null}
        </>} />
      <Card title="Details">
        <DL items={[["Client", <Link key="c" className="text-teal-800 hover:underline" href={`/clients/${inv.clients?.id}`}>{inv.clients?.name}</Link>], ["Client GSTIN", inv.clients?.gstin],
          ["PO", inv.purchase_orders ? <Link key="p" className="text-teal-800 hover:underline" href={`/purchase-orders/${inv.purchase_orders.id}`}>{inv.purchase_orders.po_number}</Link> : null],
          ["Invoice date", fmtDate(inv.invoice_date)], ["Due date", fmtDate(inv.due_date)], ["Place of supply", `${inv.place_of_supply} (${inv.is_interstate ? "IGST" : "CGST + SGST"})`]]} />
      </Card>
      <Table head={["#", "Description", "SAC", "Qty", "Rate", "Amount"]}>
        {(items as any[] ?? []).map((i) => (
          <tr key={i.id}><Td>{i.line_no}</Td><Td className="whitespace-normal">{i.description}</Td><Td>{i.sac}</Td><Td>{Number(i.quantity)}</Td><Td>{inr(i.rate)}</Td><Td className="text-right">{inr(i.amount)}</Td></tr>
        ))}
        <tr><Td colSpan={5} className="text-right">Subtotal</Td><Td className="text-right">{inr(inv.subtotal)}</Td></tr>
        {Number(inv.discount_amount) ? <tr><Td colSpan={5} className="text-right">Discount</Td><Td className="text-right">− {inr(inv.discount_amount)}</Td></tr> : null}
        {inv.is_interstate ? <tr><Td colSpan={5} className="text-right">IGST {Number(inv.gst_pct)}%</Td><Td className="text-right">{inr(inv.igst)}</Td></tr> : (<>
          <tr><Td colSpan={5} className="text-right">CGST {Number(inv.gst_pct) / 2}%</Td><Td className="text-right">{inr(inv.cgst)}</Td></tr>
          <tr><Td colSpan={5} className="text-right">SGST {Number(inv.gst_pct) / 2}%</Td><Td className="text-right">{inr(inv.sgst)}</Td></tr></>)}
        <tr><Td colSpan={5} className="text-right font-semibold">Total</Td><Td className="text-right text-base font-semibold">{inr(inv.total)}</Td></tr>
        <tr><Td colSpan={6} className="text-xs italic text-slate-500">{amountInWords(Number(inv.total))}</Td></tr>
      </Table>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Payments · received ${inr(inv.amount_paid)} · TDS ${inr(inv.tds_amount)} · balance ${inr(inv.balance)}`}>
          <Table head={["Date", "Amount", "TDS", "Mode", "Reference", ""]} empty={!pays?.length}>
            {(pays ?? []).map((p) => (
              <tr key={p.id}><Td>{fmtDate(p.payment_date)}</Td><Td>{inr(p.amount)}</Td><Td>{inr(p.tds_amount)}</Td><Td>{p.mode ?? "—"}</Td><Td>{p.reference ?? "—"}</Td>
                <Td>{acc ? <form action={deletePayment}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="invoice_id" value={id} /><button className="text-xs text-red-600">Remove</button></form> : null}</Td></tr>
            ))}
          </Table>
        </Card>
        {acc && ["issued", "partially_paid"].includes(inv.status) ? (
          <Card title="Record payment">
            <ActionForm action={addPayment} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="invoice_id" value={id} />
              <Field label="Date"><Input type="date" name="payment_date" defaultValue={isoDate()} /></Field>
              <Field label="Amount received (₹)"><Input type="number" step="any" name="amount" defaultValue={Number(inv.balance)} /></Field>
              <Field label="TDS deducted (₹)" hint="Typically 2% u/s 194J (technical services) — confirm with your CA"><Input type="number" step="any" name="tds_amount" defaultValue={0} /></Field>
              <Field label="Mode"><ComboSelect name="mode" options={lookups.payment_mode} category="payment_mode" placeholder="—" /></Field>
              <Field label="UTR / Cheque no." className="sm:col-span-2"><Input name="reference" /></Field>
              <div className="sm:col-span-2 text-right"><SubmitButton>Record payment</SubmitButton></div>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
