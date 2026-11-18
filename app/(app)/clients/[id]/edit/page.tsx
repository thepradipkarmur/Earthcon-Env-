import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getLookups } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "../../client-form";

export default async function EditClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!data) notFound();
  const lookups = await getLookups("industry_sector", "pcb_category", "district", "gidc_estate", "discharge_route");
  return (<div><PageHeader title={`Edit ${data.name}`} step={1} /><ClientForm client={data} lookups={lookups} /></div>);
}
