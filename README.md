# Earthcon Lab — Environmental CRM & LIMS

Internal CRM and laboratory information system for an independent, GPCB-affiliated environmental
consultancy and testing laboratory (water / wastewater, ambient air, stack emission, work-zone air,
noise, soil, sludge and hazardous waste).

**Stack:** Next.js 16 (App Router, Server Actions) · Supabase (Postgres, Auth, Storage, RLS) ·
`@react-pdf/renderer` for PDFs · Vercel.

## Workflow (8 steps)

| # | Module | What it does |
|---|--------|--------------|
| 1 | **Clients** | Company, GSTIN/PAN, GPCB category (Red/Orange/Green/White), sector, district, GIDC estate, CCA no. & validity, XGN ID, discharge route, contacts, plants/sites |
| 2 | **Quotations** | Pick sample type → parameters (rates from master), packages, service lines (sampling, transport, stack/AAQ/noise), frequency, qty, discount, GST, terms, revisions (`-R1`), PDF |
| 3 | **Purchase orders** | Client PO no./date/value/validity, PO copy upload (private storage), linked quotation, value check, invoiced vs. balance |
| 4 | **Tasks** | Sampling / analysis / report / site-visit tasks, assignee, due date, priority, status; assignee can update own tasks |
| 5 | **Samples** | Auto ID `EL/WW/2026-27/00001`, chain of custody (collected/received, container, preservation, condition), matrix-specific fields (stack, AAQ, noise, water), standard selection, parameter list pre-filled from PO quotation / standard, QR label |
| 6 | **Lab testing** | Worklist; results per parameter (numeric or text e.g. “BDL”), method, instrument, analyst, dates; automatic complies/exceeds vs. limits; Technical Manager review |
| 7 | **Reports** | Draft → Checked (analyst) → Approved (Technical Manager, locks results) → Issued; cancel & revise creates `-R1`; branded PDF with DRAFT watermark until approved |
| 8 | **Invoices & payments** | GST tax invoice (SAC 998346), CGST+SGST vs. IGST by place of supply, lines from quotation or uninvoiced samples, part payments + TDS, ageing dashboard |

Also: dashboard, master data (parameters & rates, methods, standards & limits, client-specific CCA limits,
sample types, instruments with calibration due dates, all dropdown lists), users & roles, settings, and an
audit log of every change (for NABL / CPCB surveillance).

## Roles

| Role | Can |
|------|-----|
| Admin | Everything, incl. users, settings, deletes |
| Accounts / Marketing | Clients, quotations, POs, invoices, payments, parameter rates |
| Field Sampler | Register samples, update own tasks |
| Analyst | Register samples, enter results, prepare/check reports, instruments |
| Technical Manager | Review results, approve/cancel reports, master data, audit log |
| Viewer | Read-only |

Enforced in the database with Row-Level Security plus triggers (e.g. only a Technical Manager can approve
a report; approved reports lock their results). The **first account to sign up becomes Admin**; later
sign-ups are Viewers until an Admin assigns a role under **Users & Roles**.

## Document numbering (Indian FY, April–March)

| Document | Format |
|----------|--------|
| Client | `CL-0001` |
| Quotation | `EL/QT/2026-27/0001` (revisions `-R1`, `-R2`) |
| Purchase order (internal ref) | `EL/PO/2026-27/0001` |
| Task | `EL/TK/2026-27/0001` |
| Sample | `EL/<type code>/2026-27/00001` e.g. `EL/WW/…`, `EL/AA/…`, `EL/SE/…` |
| Test report | `EL/TR/2026-27/00001` |
| Invoice | `EL/26-27/0001` (GST invoice serial ≤ 16 characters) |

The `EL` prefix is editable in **Settings**.

## Setup

1. **Database** — apply the SQL files in `supabase/migrations/` in order (Supabase SQL editor,
   `supabase db push`, or the Supabase MCP).
2. **Environment variables** (Vercel → Project → Settings → Environment Variables, for Production *and*
   Preview) — see `.env.example`. The Supabase ↔ Vercel integration sets these automatically.
3. **Supabase Auth URLs** — Supabase → Authentication → URL Configuration: set **Site URL** to the
   production domain and add `https://<your-domain>/auth/callback` (and preview domains) to **Redirect URLs**.
4. Open the app, create the first account (becomes Admin), then invite staff to sign up and assign roles.
5. In **Master data**: set parameter rates, add instruments, and have the Technical Manager verify each
   standard / method (see below).

Local development: `cp .env.example .env.local`, fill in values, `npm install`, `npm run dev`.

## ⚠️ Reference data must be verified

Seeded limits (EP Rules 1986 Schedule VI, IS 10500:2012, NAAQS 2009, Noise Rules 2000) and IS/APHA method
references were compiled from secondary sources and are flagged **“verify”**. The lab's Technical Manager /
QA must confirm each against the current Gazette notification, BIS standard or the client's GPCB consent
(CCA) before reports are issued, then mark the standard as verified in **Master data → Standards**.
GST rate (18 %), SAC 998346 and TDS hints should be confirmed with the lab's CA.
