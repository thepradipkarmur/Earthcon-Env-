import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { vendorFormData } from "../../form-data";
import { VendorForm } from "../../vendor-form";

export default async function EditVendor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("vendors").select("*").eq("id", id).single();
  if (!data) notFound();
  const d = await vendorFormData();
  return (<div><PageHeader title={`Edit ${data.name}`} /><VendorForm vendor={data} {...d} /></div>);
}
