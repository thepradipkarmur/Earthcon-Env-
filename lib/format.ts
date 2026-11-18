export function inr(n: number | string | null | undefined, withSymbol = true) {
  const v = Number(n ?? 0);
  const s = v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return withSymbol ? `₹ ${s}` : s;
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

export function fmtResult(value: number | string | null | undefined, text: string | null | undefined, decimals = 2) {
  if (text && text.trim()) return text;
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return isNaN(n) ? String(value) : n.toFixed(decimals);
}

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number) {
  return n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? " " + ones[n % 10] : ""}`;
}
function threeDigits(n: number) {
  const h = Math.floor(n / 100), r = n % 100;
  return [h ? `${ones[h]} Hundred` : "", r ? twoDigits(r) : ""].filter(Boolean).join(" ");
}

/** Indian numbering: crore / lakh / thousand */
export function amountInWords(amount: number) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const parts: string[] = [];
  let n = rupees;
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  const words = parts.length ? parts.join(" ") : "Zero";
  return `Rupees ${words}${paise ? ` and ${twoDigits(paise)} Paise` : ""} Only`;
}

/** ISO date (YYYY-MM-DD) offset from today, in IST */
export function isoDate(offsetDays = 0) {
  return new Date(Date.now() + 330 * 60000 + offsetDays * 864e5).toISOString().slice(0, 10);
}
/** Local IST value for <input type="datetime-local"> */
export function isoDateTimeLocal() {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 16);
}
export function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 864e5);
}
