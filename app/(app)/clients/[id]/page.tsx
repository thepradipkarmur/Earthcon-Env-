import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, Card, DL, Field, Input, LinkButton, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { can, getProfile } from "@/lib/auth";
import { fmtDate, inr } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { addContact, addSite, deleteContact } from "../actions";
import { registerClientAsVendor } from "../../vendors/actions";

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: c } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!c) notFound();
  const [contacts, sites, quotes, pos, samples, invoices, vendor] = await Promise.all([
    supabase.from("client_contacts").select("*").eq("client_id", id).order("is_primary", { ascending: false }),
    supabase.from("client_sites").select("*").eq("client_id", id).order("name"),
    supabase.from("quotations").select("id,quote_no,quote_date,total,status").eq("client_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("purchase_orders").select("id,po_number,po_date,po_value,status").eq("client_id", id).order("po_date", { ascending: false }).limit(10),
    supabase.from("samples").select("id,sample_no,sampling_point,received_at,status,sample_types(name)").eq("client_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("invoices").select("id,invoice_no,invoice_date,total,balance,status").eq("client_id", id).order("invoice_date", { ascending: false }).limit(10),
    supabase.from("vendors").select("id,vendor_code").eq("client_id", id).maybeSingle(),
  ]);
  const editable = can(profile, "accounts", "tech_manager");

  return (
    <div className="space-y-6">
      <PageHeader title={c.name} subtitle={`${c.client_code} · ${c.industry_sector ?? "Sector not set"}`} step={1}
        actions={<>
          {editable ? <LinkButton href={`/clients/${id}/edit`} variant="secondary">Edit</LinkButton> : null}
          {vendor.data ? <LinkButton href={`/vendors/${vendor.data.id}`} variant="secondary">Also a vendor ({vendor.data.vendor_code})</LinkButton>
            : editable ? <form action={registerClientAsVendor}><input type="hidden" name="client_id" value={id} /><Button variant="secondary">Register as vendor</Button></form> : null}
          {can(profile, "accounts") ? <LinkButton href={`/quotations/new?client=${id}`} icon="plus">New quotation</LinkButton> : null}
        </>} />

      <Card title="Details">
        <DL items={[
          ["GSTIN", c.gstin], ["PAN", c.pan], ["GPCB category", c.pcb_category],
          ["Address", [c.address, c.city, c.district, c.state, c.pincode].filter(Boolean).join(", ")],
          ["Industrial estate", c.gidc_estate], ["Discharge route", c.effluent_discharge_route],
          ["CCA no.", c.cca_number], ["CCA valid up to", fmtDate(c.cca_valid_upto)], ["XGN ID", c.xgn_id],
          ["Notes", c.notes],
        ]} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Contacts">
          <ul className="mb-4 divide-y divide-slate-100 text-sm">
            {(contacts.data ?? []).map((p) => (
              <li key={p.id} className="flex items-start justify-between py-2">
                <div><div className="font-medium">{p.name} {p.is_primary ? <span className="text-xs text-teal-700">(primary)</span> : null}</div>
                  <div className="text-xs text-slate-500">{[p.designation, p.email, p.phone].filter(Boolean).join(" · ")}</div></div>
                {editable ? <form action={deleteContact}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="client_id" value={id} /><button className="text-xs text-red-600 hover:underline">Remove</button></form> : null}
              </li>
            ))}
          </ul>
          {editable ? (
            <ActionForm action={addContact} className="grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="client_id" value={id} />
              <Field label="Name"><Input name="name" required /></Field>
              <Field label="Designation"><Input name="designation" /></Field>
              <Field label="Email"><Input name="email" type="email" /></Field>
              <Field label="Phone"><Input name="phone" /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_primary" /> Primary</label>
              <div className="text-right"><SubmitButton variant="secondary">Add contact</SubmitButton></div>
            </ActionForm>
          ) : null}
        </Card>

        <Card title="Plants / Sites">
          <ul className="mb-4 divide-y divide-slate-100 text-sm">
            {(sites.data ?? []).map((s) => (
              <li key={s.id} className="py-2"><div className="font-medium">{s.name}</div><div className="text-xs text-slate-500">{s.address ?? ""} {s.latitude ? `(${s.latitude}, ${s.longitude})` : ""}</div></li>
            ))}
          </ul>
          {editable ? (
            <ActionForm action={addSite} className="grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="client_id" value={id} />
              <Field label="Site / Unit name"><Input name="name" required /></Field>
              <Field label="Address"><Input name="address" /></Field>
              <Field label="Latitude"><Input name="latitude" type="number" step="any" /></Field>
              <Field label="Longitude"><Input name="longitude" type="number" step="any" /></Field>
              <div className="text-right sm:col-span-2"><SubmitButton variant="secondary">Add site</SubmitButton></div>
            </ActionForm>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Quotations">
          <Table head={["No.", "Date", "Total", "Status"]} empty={!quotes.data?.length}>
            {(quotes.data ?? []).map((q) => (<tr key={q.id}><Td><Link className="text-teal-800 hover:underline" href={`/quotations/${q.id}`}>{q.quote_no}</Link></Td><Td>{fmtDate(q.quote_date)}</Td><Td>{inr(q.total)}</Td><Td><StatusBadge status={q.status} /></Td></tr>))}
          </Table>
        </Card>
        <Card title="Purchase orders">
          <Table head={["PO no.", "Date", "Value", "Status"]} empty={!pos.data?.length}>
            {(pos.data ?? []).map((p) => (<tr key={p.id}><Td><Link className="text-teal-800 hover:underline" href={`/purchase-orders/${p.id}`}>{p.po_number}</Link></Td><Td>{fmtDate(p.po_date)}</Td><Td>{inr(p.po_value)}</Td><Td><StatusBadge status={p.status} /></Td></tr>))}
          </Table>
        </Card>
        <Card title="Recent samples">
          <Table head={["Sample no.", "Type", "Point", "Status"]} empty={!samples.data?.length}>
            {(samples.data ?? []).map((s) => (<tr key={s.id}><Td><Link className="text-teal-800 hover:underline" href={`/samples/${s.id}`}>{s.sample_no}</Link></Td>
              {/* @ts-expect-error joined row */}
              <Td>{s.sample_types?.name}</Td><Td>{s.sampling_point ?? "—"}</Td><Td><StatusBadge status={s.status} /></Td></tr>))}
          </Table>
        </Card>
        <Card title="Invoices">
          <Table head={["Invoice", "Date", "Total", "Balance", "Status"]} empty={!invoices.data?.length}>
            {(invoices.data ?? []).map((i) => (<tr key={i.id}><Td><Link className="text-teal-800 hover:underline" href={`/invoices/${i.id}`}>{i.invoice_no}</Link></Td><Td>{fmtDate(i.invoice_date)}</Td><Td>{inr(i.total)}</Td><Td>{inr(i.balance)}</Td><Td><StatusBadge status={i.status} /></Td></tr>))}
          </Table>
        </Card>
      </div>
    </div>
  );
}
