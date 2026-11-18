import { Circle, Document, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { amountInWords, fmtDate, fmtDateTime, fmtResult } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Built-in Helvetica has no ₹ glyph, so PDFs use "Rs."
const rs = (n: any) => `Rs. ${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const C = { brand: "#0f766e", dark: "#0f172a", mute: "#64748b", line: "#cbd5e1", soft: "#f1f5f9", red: "#b91c1c" };
const s = StyleSheet.create({
  page: { padding: 32, paddingBottom: 56, fontSize: 9, fontFamily: "Helvetica", color: C.dark },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: C.brand, paddingBottom: 8, marginBottom: 12 },
  lab: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.brand },
  small: { fontSize: 8, color: C.mute },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 10, letterSpacing: 1 },
  row: { flexDirection: "row" },
  box: { borderWidth: 1, borderColor: C.line, padding: 6, marginBottom: 8 },
  kv: { flexDirection: "row", marginBottom: 2 },
  k: { width: 110, color: C.mute },
  v: { flex: 1 },
  th: { flexDirection: "row", backgroundColor: C.soft, borderWidth: 1, borderColor: C.line, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.line },
  td: { padding: 4 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 7, color: C.mute, borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: 4, flexDirection: "row", justifyContent: "space-between" },
  watermark: { position: "absolute", top: 330, left: 90, fontSize: 80, color: "#e2e8f0", transform: "rotate(-30deg)", fontFamily: "Helvetica-Bold" },
});

function LogoPdf() {
  return (
    <Svg width={38} height={38} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r="30" fill="#0f766e" />
      <Path d="M8 38c8-4 16-4 24 0s16 4 24 0v4c-8 4-16 4-24 0s-16-4-24 0z" fill="#99f6e4" />
      <Path d="M32 12c-7 9-10 15-10 20a10 10 0 0 0 20 0c0-5-3-11-10-20z" fill="#ecfdf5" />
      <Path d="M32 20v20M32 30l5-5M32 35l-5-5" stroke="#15803d" strokeWidth={2.2} fill="none" />
    </Svg>
  );
}

function Header({ settings, right }: { settings: any; right?: ReactNode }) {
  return (
    <View style={s.header} fixed>
      <LogoPdf />
      <View style={{ marginLeft: 8, flex: 1 }}>
        <Text style={s.lab}>{settings?.lab_name ?? "Earthcon Lab"}</Text>
        <Text style={s.small}>Environmental Monitoring &amp; Testing Laboratory</Text>
        {settings?.address ? <Text style={s.small}>{settings.address}</Text> : null}
        <Text style={s.small}>{[settings?.phone, settings?.email, settings?.gstin ? `GSTIN: ${settings.gstin}` : null].filter(Boolean).join("  |  ")}</Text>
      </View>
      {right}
    </View>
  );
}

function Footer({ text }: { text?: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={{ flex: 1 }}>{text ?? ""}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

const KV = ({ k, v }: { k: string; v: any }) => (<View style={s.kv}><Text style={s.k}>{k}</Text><Text style={s.v}>{v === null || v === undefined || v === "" ? "—" : String(v)}</Text></View>);

function Cols({ cols, head, rows }: { cols: number[]; head: string[]; rows: (string | number)[][] }) {
  return (
    <View>
      <View style={s.th} fixed>{head.map((h, i) => <Text key={i} style={[s.td, { flex: cols[i] }]}>{h}</Text>)}</View>
      {rows.map((r, j) => (
        <View key={j} style={s.tr} wrap={false}>{r.map((c, i) => <Text key={i} style={[s.td, { flex: cols[i] }]}>{String(c)}</Text>)}</View>
      ))}
    </View>
  );
}

export function QuotationPdf({ q, items, settings }: { q: any; items: any[]; settings: any }) {
  return (
    <Document title={q.quote_no}>
      <Page size="A4" style={s.page}>
        <Header settings={settings} />
        <Text style={s.title}>QUOTATION</Text>
        <View style={[s.row, { gap: 8 }]}>
          <View style={[s.box, { flex: 1 }]}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>To,</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{q.clients?.name}</Text>
            <Text>{[q.clients?.address, q.clients?.city, q.clients?.district, q.clients?.state].filter(Boolean).join(", ")}</Text>
            {q.clients?.gstin ? <Text>GSTIN: {q.clients.gstin}</Text> : null}
            {q.client_contacts ? <Text style={{ marginTop: 3 }}>Kind Attn: {q.client_contacts.name}{q.client_contacts.designation ? `, ${q.client_contacts.designation}` : ""}</Text> : null}
          </View>
          <View style={[s.box, { width: 200 }]}>
            <KV k="Quotation no." v={q.quote_no} /><KV k="Date" v={fmtDate(q.quote_date)} /><KV k="Valid until" v={fmtDate(q.valid_until)} />
          </View>
        </View>
        {q.subject ? <Text style={{ marginBottom: 8 }}><Text style={{ fontFamily: "Helvetica-Bold" }}>Subject: </Text>{q.subject}</Text> : null}
        <Cols cols={[0.4, 5, 1.4, 0.7, 1.3, 1.5]} head={["#", "Description", "Frequency", "Qty", "Rate", "Amount"]}
          rows={items.map((i) => [i.line_no, i.description, i.frequency ?? "", Number(i.quantity), rs(i.rate), rs(i.amount)])} />
        <View style={{ alignSelf: "flex-end", width: 230, marginTop: 6 }}>
          <KV k="Subtotal" v={rs(q.subtotal)} />
          {Number(q.discount_amount) ? <KV k={`Discount (${Number(q.discount_pct)}%)`} v={`- ${rs(q.discount_amount)}`} /> : null}
          <KV k={`GST (${Number(q.gst_pct)}%)`} v={rs(q.gst_amount)} />
          <View style={[s.kv, { borderTopWidth: 1, borderColor: C.line, paddingTop: 2 }]}><Text style={[s.k, { fontFamily: "Helvetica-Bold", color: C.dark }]}>Total</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{rs(q.total)}</Text></View>
        </View>
        <Text style={{ fontStyle: "italic", color: C.mute, marginTop: 4 }}>{amountInWords(Number(q.total))}</Text>
        {q.terms ? (<View style={{ marginTop: 12 }}><Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Terms &amp; conditions</Text><Text>{q.terms}</Text></View>) : null}
        <View style={{ marginTop: 30, alignSelf: "flex-end", alignItems: "center" }}><Text>For {settings?.lab_name ?? "Earthcon Lab"}</Text><Text style={{ marginTop: 28 }}>Authorised signatory</Text></View>
        <Footer text="This is a computer-generated quotation." />
      </Page>
    </Document>
  );
}

export function ReportPdf({ r, tests, settings }: { r: any; tests: any[]; settings: any }) {
  const sm = r.samples ?? {};
  const final = ["approved", "issued"].includes(r.status);
  const fd = Object.entries(sm.field_data ?? {}) as [string, string][];
  return (
    <Document title={r.report_no}>
      <Page size="A4" style={s.page}>
        {!final ? <Text style={s.watermark} fixed>DRAFT</Text> : null}
        {r.status === "cancelled" ? <Text style={[s.watermark, { color: "#fecaca" }]} fixed>CANCELLED</Text> : null}
        <Header settings={settings} right={<View style={{ alignItems: "flex-end" }}><Text style={s.small}>Report no.</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{r.report_no}</Text>{r.ulr_no ? <Text style={s.small}>ULR: {r.ulr_no}</Text> : null}</View>} />
        <Text style={s.title}>TEST REPORT</Text>
        <View style={[s.row, { gap: 8 }]}>
          <View style={[s.box, { flex: 1 }]}>
            <KV k="Issued to" v={sm.clients?.name} />
            <KV k="Address" v={[sm.clients?.address, sm.clients?.city, sm.clients?.district].filter(Boolean).join(", ")} />
            <KV k="Site / plant" v={sm.client_sites?.name} />
            <KV k="PO reference" v={sm.purchase_orders?.po_number} />
          </View>
          <View style={[s.box, { width: 230 }]}>
            <KV k="Issue date" v={fmtDate(r.issue_date)} /><KV k="Sample no." v={sm.sample_no} /><KV k="Sample type" v={sm.sample_types?.name} /><KV k="Revision" v={r.revision ? `R${r.revision}` : "0"} />
          </View>
        </View>
        <View style={s.box}>
          <View style={[s.row, { gap: 12 }]}>
            <View style={{ flex: 1 }}>
              <KV k="Sampling point" v={sm.sampling_point} /><KV k="Description" v={sm.sample_description} /><KV k="Collected by" v={sm.collector?.full_name} />
              <KV k="Collected on" v={fmtDateTime(sm.collected_at)} /><KV k="Received on" v={fmtDateTime(sm.received_at)} />
            </View>
            <View style={{ flex: 1 }}>
              <KV k="Duration" v={sm.sampling_duration} /><KV k="Quantity / container" v={[sm.quantity, sm.container].filter(Boolean).join(", ")} />
              <KV k="Preservation" v={sm.preservation} /><KV k="Condition" v={sm.condition_on_receipt} /><KV k="Standard" v={sm.standards?.name} />
            </View>
          </View>
          {fd.length ? <Text style={{ marginTop: 3, color: C.mute }}>{fd.map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join("  |  ")}</Text> : null}
        </View>
        <Cols cols={[0.4, 3.2, 1, 2, 1.2, 1.6]} head={["#", "Parameter", "Unit", "Test method", "Result", "Limit"]}
          rows={tests.map((t, i) => [i + 1, t.parameters?.name ?? "", t.unit ?? "", t.test_methods?.code ?? "", `${fmtResult(t.result_value, t.result_text, t.parameters?.decimals)}${t.compliance === "exceeds" ? " *" : ""}`, t.limit_text ?? "—"])} />
        {tests.some((t) => t.compliance === "exceeds") ? <Text style={{ color: C.red, marginTop: 3 }}>* Exceeds the specified limit.</Text> : null}
        {r.opinion ? <View style={{ marginTop: 8 }}><Text style={{ fontFamily: "Helvetica-Bold" }}>Statement of conformity</Text><Text>{r.opinion}</Text></View> : null}
        {r.remarks ? <View style={{ marginTop: 6 }}><Text style={{ fontFamily: "Helvetica-Bold" }}>Remarks</Text><Text>{r.remarks}</Text></View> : null}
        <View style={[s.row, { marginTop: 36, justifyContent: "space-between" }]} wrap={false}>
          <View style={{ alignItems: "center", width: 180 }}><Text>{r.checker?.full_name ?? r.preparer?.full_name ?? ""}</Text><Text style={{ borderTopWidth: 0.5, borderColor: C.line, paddingTop: 2, marginTop: 2, color: C.mute }}>Analyst / Checked by</Text></View>
          <View style={{ alignItems: "center", width: 180 }}><Text>{final ? r.approver?.full_name : ""}</Text><Text style={{ borderTopWidth: 0.5, borderColor: C.line, paddingTop: 2, marginTop: 2, color: C.mute }}>Technical Manager / Authorised signatory</Text></View>
        </View>
        <Text style={{ marginTop: 10, textAlign: "center", color: C.mute }}>— End of report —</Text>
        <Footer text={settings?.report_footer ?? ""} />
      </Page>
    </Document>
  );
}

export function InvoicePdf({ inv, items, settings }: { inv: any; items: any[]; settings: any }) {
  return (
    <Document title={inv.invoice_no}>
      <Page size="A4" style={s.page}>
        {inv.status === "draft" ? <Text style={s.watermark} fixed>DRAFT</Text> : null}
        {inv.status === "cancelled" ? <Text style={[s.watermark, { color: "#fecaca" }]} fixed>CANCELLED</Text> : null}
        <Header settings={settings} />
        <Text style={s.title}>TAX INVOICE</Text>
        <View style={[s.row, { gap: 8 }]}>
          <View style={[s.box, { flex: 1 }]}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Bill to</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{inv.clients?.name}</Text>
            <Text>{[inv.clients?.address, inv.clients?.city, inv.clients?.district, inv.clients?.state, inv.clients?.pincode].filter(Boolean).join(", ")}</Text>
            <Text>GSTIN: {inv.clients?.gstin ?? "Unregistered"}</Text>
          </View>
          <View style={[s.box, { width: 220 }]}>
            <KV k="Invoice no." v={inv.invoice_no} /><KV k="Invoice date" v={fmtDate(inv.invoice_date)} /><KV k="Due date" v={fmtDate(inv.due_date)} />
            <KV k="PO no." v={inv.purchase_orders?.po_number} /><KV k="Place of supply" v={inv.place_of_supply} />
          </View>
        </View>
        <Cols cols={[0.4, 5, 1.1, 0.7, 1.3, 1.5]} head={["#", "Description of service", "SAC", "Qty", "Rate", "Amount"]}
          rows={items.map((i) => [i.line_no, i.description, i.sac, Number(i.quantity), rs(i.rate), rs(i.amount)])} />
        <View style={{ alignSelf: "flex-end", width: 240, marginTop: 6 }}>
          <KV k="Subtotal" v={rs(inv.subtotal)} />
          {Number(inv.discount_amount) ? <KV k="Discount" v={`- ${rs(inv.discount_amount)}`} /> : null}
          <KV k="Taxable value" v={rs(inv.taxable_amount)} />
          {inv.is_interstate ? <KV k={`IGST @ ${Number(inv.gst_pct)}%`} v={rs(inv.igst)} /> : (<>
            <KV k={`CGST @ ${Number(inv.gst_pct) / 2}%`} v={rs(inv.cgst)} /><KV k={`SGST @ ${Number(inv.gst_pct) / 2}%`} v={rs(inv.sgst)} /></>)}
          <View style={[s.kv, { borderTopWidth: 1, borderColor: C.line, paddingTop: 2 }]}><Text style={[s.k, { fontFamily: "Helvetica-Bold", color: C.dark }]}>Invoice total</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{rs(inv.total)}</Text></View>
        </View>
        <Text style={{ fontStyle: "italic", marginTop: 4 }}>{amountInWords(Number(inv.total))}</Text>
        <View style={[s.row, { marginTop: 14, gap: 12 }]} wrap={false}>
          <View style={{ flex: 1 }}>
            {settings?.bank_details ? (<><Text style={{ fontFamily: "Helvetica-Bold" }}>Bank details</Text><Text>{settings.bank_details}</Text></>) : null}
            {settings?.invoice_terms ? (<><Text style={{ fontFamily: "Helvetica-Bold", marginTop: 6 }}>Terms</Text><Text>{settings.invoice_terms}</Text></>) : null}
          </View>
          <View style={{ width: 180, alignItems: "center" }}><Text>For {settings?.lab_name ?? "Earthcon Lab"}</Text><Text style={{ marginTop: 30 }}>Authorised signatory</Text></View>
        </View>
        <Footer text="This is a computer-generated invoice." />
      </Page>
    </Document>
  );
}

export function VendorPoPdf({ po, items, settings }: { po: any; items: any[]; settings: any }) {
  const v = po.vendors ?? {};
  return (
    <Document title={po.po_no}>
      <Page size="A4" style={s.page}>
        {po.status === "draft" ? <Text style={s.watermark} fixed>DRAFT</Text> : null}
        {po.status === "cancelled" ? <Text style={[s.watermark, { color: "#fecaca" }]} fixed>CANCELLED</Text> : null}
        <Header settings={settings} />
        <Text style={s.title}>PURCHASE ORDER</Text>
        <View style={[s.row, { gap: 8 }]}>
          <View style={[s.box, { flex: 1 }]}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>To (Vendor)</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{v.name}</Text>
            <Text>{[v.address, v.city, v.district, v.state, v.pincode].filter(Boolean).join(", ")}</Text>
            <Text>GSTIN: {v.gstin ?? "—"}</Text>
            {v.contact_name ? <Text style={{ marginTop: 3 }}>Kind Attn: {v.contact_name}{v.phone ? ` · ${v.phone}` : ""}</Text> : null}
          </View>
          <View style={[s.box, { width: 220 }]}>
            <KV k="PO no." v={po.po_no} /><KV k="PO date" v={fmtDate(po.po_date)} /><KV k="Delivery by" v={fmtDate(po.delivery_date)} />
            <KV k="Your quotation" v={po.vendor_quotations ? (po.vendor_quotations.vendor_ref ?? po.vendor_quotations.vq_no) : null} />
            <KV k="Payment terms" v={po.payment_terms} />
          </View>
        </View>
        {po.delivery_address ? <Text style={{ marginBottom: 8 }}><Text style={{ fontFamily: "Helvetica-Bold" }}>Deliver to: </Text>{po.delivery_address}</Text> : null}
        <Cols cols={[0.4, 5, 1, 0.9, 1.3, 1.5]} head={["#", "Item / description", "Unit", "Qty", "Rate", "Amount"]}
          rows={items.map((i) => [i.line_no, i.description, i.unit ?? "", Number(i.quantity), rs(i.rate), rs(i.amount)])} />
        <View style={{ alignSelf: "flex-end", width: 240, marginTop: 6 }}>
          <KV k="Subtotal" v={rs(po.subtotal)} />
          {Number(po.discount_amount) ? <KV k="Discount" v={`- ${rs(po.discount_amount)}`} /> : null}
          {po.is_interstate ? <KV k={`IGST @ ${Number(po.gst_pct)}%`} v={rs(po.igst)} /> : (<>
            <KV k={`CGST @ ${Number(po.gst_pct) / 2}%`} v={rs(po.cgst)} /><KV k={`SGST @ ${Number(po.gst_pct) / 2}%`} v={rs(po.sgst)} /></>)}
          <View style={[s.kv, { borderTopWidth: 1, borderColor: C.line, paddingTop: 2 }]}><Text style={[s.k, { fontFamily: "Helvetica-Bold", color: C.dark }]}>PO total</Text><Text style={{ fontFamily: "Helvetica-Bold" }}>{rs(po.total)}</Text></View>
        </View>
        <Text style={{ fontStyle: "italic", marginTop: 4 }}>{amountInWords(Number(po.total))}</Text>
        {po.terms ? (<View style={{ marginTop: 12 }} wrap={false}><Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Terms &amp; conditions</Text><Text>{po.terms}</Text></View>) : null}
        <View style={{ marginTop: 30, alignSelf: "flex-end", alignItems: "center" }} wrap={false}><Text>For {settings?.lab_name ?? "Earthcon Lab"}</Text><Text style={{ marginTop: 28 }}>Authorised signatory</Text></View>
        <Footer text="This is a computer-generated purchase order." />
      </Page>
    </Document>
  );
}
