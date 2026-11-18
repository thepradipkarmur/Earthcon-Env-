import "server-only";
import { getClientOptions, getLookups } from "@/lib/data";

export async function vendorFormData() {
  const [lookups, clients] = await Promise.all([
    getLookups("vendor_category", "district", "state", "payment_terms"),
    getClientOptions(),
  ]);
  return { lookups, clients };
}
