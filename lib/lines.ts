type RawLine = { description?: string; unit?: string; quantity?: number; rate?: number };

export type ParsedLine = { description: string; unit: string | null; quantity: number; rate: number };
export function parseLines(raw: FormDataEntryValue | null): ParsedLine[] {
  try {
    return (JSON.parse(String(raw || "[]")) as RawLine[])
      .filter((l) => l.description?.trim())
      .map((l) => ({ description: String(l.description).trim(), unit: l.unit || null, quantity: Number(l.quantity) || 0, rate: Number(l.rate) || 0 }));
  } catch { return []; }
}

export type EditLine = { key: number; description: string; unit: string; quantity: number; rate: number };
/** Server-safe: converts stored rows into editable lines (keys offset to avoid clashing with new lines). */
export function toLines(rows: { description: string; unit?: string | null; quantity: number | string; rate: number | string }[]): EditLine[] {
  return rows.map((r, i) => ({ key: 100000 + i, description: r.description, unit: r.unit ?? "", quantity: Number(r.quantity), rate: Number(r.rate) }));
}
