import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, DL, LinkButton, Notice, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, inr } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { setPOStatus } from "../actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function PODetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: po } = await supabase.from("purchase_orders").select("*,clients(id,name),quotations(id,quote_no,taxable_amount,total)").eq("id", id).single() as { data: any };
  if (!po) notFound();
  const [tasks, samples, invoices] = await Promise.all([
    supabase.from("tasks").select("id,task_no,title,status,due_date").eq("po_id", id).order("created_at"),
    supabase.from("samples").select("id,sample_no,status,sampling_point").eq("po_id", id).order("created_at"),
    supabase.from("invoices").select("id,invoice_no,taxable_amount,total,status").eq("po_id", id),
  ]);
  let fileUrl: string | null = null;
  if (po.file_path) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(po.file_path, 600);
    fileUrl = data?.signedUrl ?? null;
  }
  const invoiced = (invoices.data ?? []).filter((i) => i.status !== "cancelled").reduce((a, i) => a + Number(i.taxable_amount), 0);
  const quoteTaxable = po.quotations ? Number(po.quotations.taxable_amount) : null;
  const edit = can(profile, "accounts");
  const statusBtn = (s: string, label: string) => (<form action={setPOStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} /><Button variant="secondary">{label}</Button></form>);

  return (
    <div className="space-y-6">
      <PageHeader title={`PO ${po.po_number}`} step={3} subtitle={<>{po.clients?.name} · {po.internal_ref} · <StatusBadge status={po.status} /></>}
        actions={<>
          {fileUrl ? <LinkButton href={fileUrl} variant="secondary" icon="download" target="_blank">PO copy</LinkButton> : null}
          {can(profile, "accounts", "tech_manager") ? <LinkButton href={`/tasks/new?po=${id}`} variant="secondary" icon="plus">Task</LinkButton> : null}
          {edit ? <LinkButton href={`/invoices/new?po=${id}`} icon="plus">Invoice</LinkButton> : null}
          {edit && po.status === "active" ? statusBtn("completed", "Mark completed") : null}
          {edit && po.status === "active" ? statusBtn("cancelled", "Cancel") : null}
        </>} />
      {quoteTaxable !== null && Math.abs(quoteTaxable - Number(po.po_value)) > 1 ? (
        <Notice>PO value {inr(po.po_value)} differs from the quotation&apos;s taxable value {inr(quoteTaxable)}.</Notice>
      ) : null}
      <Card title="Details">
        <DL items={[
          ["Client", <Link key="c" href={`/clients/${po.clients?.id}`} className="text-teal-800 hover:underline">{po.clients?.name}</Link>],
          ["Quotation", po.quotations ? <Link key="q" href={`/quotations/${po.quotations.id}`} className="text-teal-800 hover:underline">{po.quotations.quote_no}</Link> : null],
          ["PO date", fmtDate(po.po_date)], ["Validity", `${fmtDate(po.valid_from)} → ${fmtDate(po.valid_to)}`],
          ["PO value", inr(po.po_value)], ["Invoiced (taxable)", `${inr(invoiced)} · balance ${inr(Number(po.po_value) - invoiced)}`], ["Notes", po.notes],
        ]} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Tasks"><Table head={["Task", "Status"]} empty={!tasks.data?.length}>{(tasks.data ?? []).map((t) => (<tr key={t.id}><Td>{t.task_no}<div className="text-xs text-slate-500">{t.title}</div></Td><Td><StatusBadge status={t.status} /></Td></tr>))}</Table></Card>
        <Card title="Samples"><Table head={["Sample", "Status"]} empty={!samples.data?.length}>{(samples.data ?? []).map((s) => (<tr key={s.id}><Td><Link className="text-teal-800 hover:underline" href={`/samples/${s.id}`}>{s.sample_no}</Link><div className="text-xs text-slate-500">{s.sampling_point}</div></Td><Td><StatusBadge status={s.status} /></Td></tr>))}</Table></Card>
        <Card title="Invoices"><Table head={["Invoice", "Total", "Status"]} empty={!invoices.data?.length}>{(invoices.data ?? []).map((i) => (<tr key={i.id}><Td><Link className="text-teal-800 hover:underline" href={`/invoices/${i.id}`}>{i.invoice_no}</Link></Td><Td>{inr(i.total)}</Td><Td><StatusBadge status={i.status} /></Td></tr>))}</Table></Card>
      </div>
    </div>
  );
}
