import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf, QuotationPdf, ReportPdf, VendorPoPdf } from "@/lib/pdf/documents";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return new Response("Unauthorized", { status: 401 });
  const { data: settings } = await supabase.from("app_settings").select("*").single();

  let doc: React.ReactElement;
  let name: string;
  if (kind === "quotation") {
    const { data: q } = await supabase.from("quotations").select("*,clients(*),client_contacts(name,designation)").eq("id", id).single();
    if (!q) return new Response("Not found", { status: 404 });
    const { data: items } = await supabase.from("quotation_items").select("*").eq("quotation_id", id).order("line_no");
    doc = <QuotationPdf q={q} items={items ?? []} settings={settings} />;
    name = q.quote_no;
  } else if (kind === "report") {
    const { data: r } = await supabase.from("reports").select(`*,samples(*,clients(*),client_sites(name),purchase_orders(po_number),sample_types(name),standards(name),
      collector:profiles!samples_collected_by_fkey(full_name)),preparer:profiles!reports_prepared_by_fkey(full_name),
      checker:profiles!reports_checked_by_fkey(full_name),approver:profiles!reports_approved_by_fkey(full_name)`).eq("id", id).single();
    if (!r) return new Response("Not found", { status: 404 });
    const { data: tests } = await supabase.from("sample_tests").select("*,parameters(name,decimals),test_methods(code)").eq("sample_id", r.sample_id).order("sort_order");
    doc = <ReportPdf r={r} tests={tests ?? []} settings={settings} />;
    name = r.report_no;
  } else if (kind === "invoice") {
    const { data: inv } = await supabase.from("invoices").select("*,clients(*),purchase_orders(po_number)").eq("id", id).single();
    if (!inv) return new Response("Not found", { status: 404 });
    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", id).order("line_no");
    doc = <InvoicePdf inv={inv} items={items ?? []} settings={settings} />;
    name = inv.invoice_no;
  } else if (kind === "vendor-po") {
    const { data: po } = await supabase.from("vendor_pos").select("*,vendors(*),vendor_quotations(vq_no,vendor_ref)").eq("id", id).single();
    if (!po) return new Response("Not found", { status: 404 });
    const { data: items } = await supabase.from("vendor_po_items").select("*").eq("vendor_po_id", id).order("line_no");
    doc = <VendorPoPdf po={po} items={items ?? []} settings={settings} />;
    name = po.po_no;
  } else {
    return new Response("Unknown document", { status: 400 });
  }

  const buf = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${String(name).replace(/[^\w.-]+/g, "_")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
