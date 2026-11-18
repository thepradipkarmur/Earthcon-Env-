import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { getClientOptions, getStaffOptions } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "../actions";

export const metadata = { title: "New task" };
/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function NewTask({ searchParams }: { searchParams: Promise<{ po?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [clients, staff, pos, sites, types] = await Promise.all([
    getClientOptions(), getStaffOptions(),
    supabase.from("purchase_orders").select("id,po_number,client_id,clients(name)").eq("status", "active").order("po_date", { ascending: false }),
    supabase.from("client_sites").select("id,name,client_id,clients(name)").order("name"),
    supabase.from("sample_types").select("id,name").eq("is_active", true).order("sort_order"),
  ]);
  const po = (pos.data as any[] ?? []).find((p) => p.id === sp.po);
  return (
    <div>
      <PageHeader title="Create task" step={4} subtitle="Assign sampling and laboratory work" />
      <ActionForm action={createTask}>
        <Card>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Task type"><Select name="task_type" defaultValue="sampling" options={[{ value: "sampling", label: "Sampling / monitoring" }, { value: "analysis", label: "Laboratory analysis" }, { value: "report", label: "Report preparation" }, { value: "site_visit", label: "Site visit / audit" }, { value: "other", label: "Other" }]} /></Field>
            <Field label="Title" required className="md:col-span-2"><Input name="title" required placeholder="e.g. Monthly ETP outlet sampling" /></Field>
            <Field label="Client" hint={<Link href="/clients/new" className="text-teal-700 hover:underline">+ New client</Link>}><Select name="client_id" defaultValue={po?.client_id ?? ""} options={clients} placeholder="—" /></Field>
            <Field label="Site / Plant"><Select name="site_id" options={(sites.data as any[] ?? []).filter((s) => !po || s.client_id === po.client_id).map((s) => ({ value: s.id, label: `${s.clients?.name} – ${s.name}` }))} placeholder="—" /></Field>
            <Field label="Purchase order"><Select name="po_id" defaultValue={po?.id ?? ""} options={(pos.data as any[] ?? []).map((p) => ({ value: p.id, label: `${p.po_number} · ${p.clients?.name}` }))} placeholder="—" /></Field>
            <Field label="Sample type"><Select name="sample_type_id" options={(types.data ?? []).map((t) => ({ value: t.id, label: t.name }))} placeholder="—" /></Field>
            <Field label="Assign to"><Select name="assigned_to" options={staff} placeholder="Unassigned" /></Field>
            <Field label="Due date"><Input type="date" name="due_date" /></Field>
            <Field label="Priority"><Select name="priority" defaultValue="normal" options={["low", "normal", "high", "urgent"]} /></Field>
            <Field label="Instructions" className="md:col-span-3"><Textarea name="description" placeholder="Locations, parameters, equipment (RDS / FPS / stack kit / noise meter), safety notes…" /></Field>
          </div>
          <div className="mt-4 flex justify-end"><SubmitButton>Create task</SubmitButton></div>
        </Card>
      </ActionForm>
    </div>
  );
}
