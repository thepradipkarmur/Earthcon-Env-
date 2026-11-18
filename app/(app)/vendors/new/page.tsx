import { PageHeader } from "@/components/ui";
import { vendorFormData } from "../form-data";
import { VendorForm } from "../vendor-form";

export const metadata = { title: "New vendor" };

export default async function NewVendor() {
  const d = await vendorFormData();
  return (<div><PageHeader title="Add vendor" subtitle="Supplier, service provider or sub-contract lab" /><VendorForm {...d} /></div>);
}
