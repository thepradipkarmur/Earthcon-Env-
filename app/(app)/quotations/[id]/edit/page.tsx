import { notFound } from "next/navigation";
import { Notice, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { builderData } from "../../builder-data";
import { QuoteBuilder } from "../../quote-builder";

export default async function EditQuotation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: q } = await supabase.from("quotations").select("*").eq("id", id).single();
  if (!q) notFound();
  if (!["draft", "sent"].includes(q.status)) return <Notice>This quotation is {q.status}. Use “Revise” to create a new revision.</Notice>;
  const { data: items } = await supabase.from("quotation_items").select("*").eq("quotation_id", id).order("line_no");
  const d = await builderData();
  return (<div><PageHeader title={`Edit ${q.quote_no}`} step={2} /><QuoteBuilder {...d} quotation={q} items={items ?? []} /></div>);
}
