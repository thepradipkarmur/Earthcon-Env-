import type { Role } from "./auth";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  accounts: "Accounts / Marketing",
  sampler: "Field Sampler",
  analyst: "Analyst",
  tech_manager: "Technical Manager",
  viewer: "Viewer",
};

export const MATRIX_LABELS: Record<string, string> = {
  water: "Water / Wastewater",
  ambient_air: "Ambient air",
  stack: "Stack emission",
  workzone: "Work zone air",
  noise: "Noise",
  soil: "Soil",
  waste: "Sludge / Hazardous waste",
};

export const STATUS_TONE: Record<string, "gray" | "blue" | "amber" | "green" | "red" | "violet"> = {
  draft: "gray", sent: "blue", accepted: "green", rejected: "red", expired: "gray", revised: "violet",
  active: "green", completed: "blue", cancelled: "red",
  open: "amber", in_progress: "blue", done: "green",
  registered: "gray", in_testing: "amber", tested: "blue", reported: "green",
  pending: "amber", entered: "blue", reviewed: "green",
  checked: "blue", approved: "green", issued: "violet",
  partially_paid: "amber", paid: "green",
  complies: "green", exceeds: "red", na: "gray",
  low: "gray", normal: "blue", high: "amber", urgent: "red",
  received: "blue", under_review: "amber", acknowledged: "blue", partially_received: "amber", closed: "gray",
};

export const NAV = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/clients", label: "Clients", icon: "building", step: 1 },
  { href: "/quotations", label: "Quotations", icon: "file", step: 2 },
  { href: "/purchase-orders", label: "Client POs", icon: "clipboard", step: 3 },
  { href: "/tasks", label: "Tasks", icon: "check", step: 4 },
  { href: "/samples", label: "Samples", icon: "flask", step: 5 },
  { href: "/testing", label: "Lab Testing", icon: "beaker", step: 6 },
  { href: "/reports", label: "Reports", icon: "award", step: 7 },
  { href: "/invoices", label: "Invoices & Payments", icon: "rupee", step: 8 },
] as const;

export const PURCHASE_NAV = [
  { href: "/vendors", label: "Vendors", icon: "truck" },
  { href: "/vendor-quotations", label: "Vendor Quotations", icon: "inbox" },
  { href: "/vendor-pos", label: "Purchase Orders", icon: "cart" },
] as const;

export const ADMIN_NAV = [
  { href: "/masters", label: "Master Data", icon: "database" },
  { href: "/users", label: "Users & Roles", icon: "users" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/audit", label: "Audit Log", icon: "history" },
] as const;
