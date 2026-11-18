import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { getClientOptions } from "@/lib/data";
import { inr, isoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { savePO } from "../actions";

export const metadata = { title: "Record PO" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function NewPO({ searchParams }: { searchParams: Promise<{ quotation?: string; client?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const clients = await getClientOptions();
  const { data: quotes } = await supabase.from("quotations").select("id,quote_no,total,client_id,clients(name)").in("status", ["sent", "accepted", "draft"]).order("created_at", { ascending: false }) as { data: any[] | null };
  const q = (quotes ?? []).find((x) => x.id === sp.quotation);
  return (
    <div>
      <PageHeader title="Record purchase order" step={3} subtitle="Record the client's approved PO" />
      <ActionForm action={savePO}>
        <Card>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Client" required className="md:col-span-2" hint={<Link href="/clients/new" className="text-teal-700 hover:underline">+ New client</Link>}><Select name="client_id" defaultValue={q?.client_id ?? sp.client ?? ""} options={clients} placeholder="Select…" required /></Field>
            <Field label="Against quotation"><Select name="quotation_id" defaultValue={q?.id ?? ""} options={(quotes ?? []).map((x) => ({ value: x.id, label: `${x.quote_no} · ${x.clients?.name} · ${inr(x.total)}` }))} placeholder="—" /></Field>
            <Field label="Client PO number" required><Input name="po_number" required /></Field>
            <Field label="PO date"><Input type="date" name="po_date" defaultValue={isoDate()} /></Field>
            <Field label="PO value (₹, excl. GST)"><Input type="number" step="any" name="po_value" defaultValue={q ? Number(q.total) : ""} /></Field>
            <Field label="Valid from"><Input type="date" name="valid_from" /></Field>
            <Field label="Valid to"><Input type="date" name="valid_to" /></Field>
            <Field label="PO copy (PDF / image)"><Input type="file" name="file" accept="application/pdf,image/*" /></Field>
            <Field label="Notes" className="md:col-span-3"><Textarea name="notes" /></Field>
          </div>
          <div className="mt-4 flex justify-end"><SubmitButton>Save PO</SubmitButton></div>
        </Card>
      </ActionForm>
    </div>
  );
}
