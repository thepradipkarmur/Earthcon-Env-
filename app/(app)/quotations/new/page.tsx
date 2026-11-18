import { PageHeader } from "@/components/ui";
import { builderData } from "../builder-data";
import { QuoteBuilder } from "../quote-builder";

export const metadata = { title: "New quotation" };

export default async function NewQuotation({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const d = await builderData();
  return (<div><PageHeader title="Prepare quotation" step={2} subtitle="Select services, parameters and rates" /><QuoteBuilder {...d} defaultClient={client} /></div>);
}
