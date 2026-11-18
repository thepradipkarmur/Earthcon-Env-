import { PageHeader } from "@/components/ui";
import { getLookups } from "@/lib/data";
import { ClientForm } from "../client-form";

export const metadata = { title: "New client" };

export default async function NewClient() {
  const lookups = await getLookups("industry_sector", "pcb_category", "district", "gidc_estate", "discharge_route");
  return (<div><PageHeader title="Register client" step={1} /><ClientForm lookups={lookups} /></div>);
}
