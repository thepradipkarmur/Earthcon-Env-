import { assignRecord } from "@/app/(app)/notifications/actions";
import { Button, Select } from "./ui";

/** "Assign to" picker. Saving notifies the person (via database trigger). */
export function AssignControl({ kind, id, current, staff, label = "Assign to", disabled }: {
  kind: "task" | "report" | "invoice" | "quotation" | "vendor_po"; id: string; current: string | null;
  staff: { value: string; label: string }[]; label?: string; disabled?: boolean;
}) {
  return (
    <form action={assignRecord} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <Select name="user_id" defaultValue={current ?? ""} options={staff} placeholder="— Nobody —" className="w-48" disabled={disabled} />
      {disabled ? null : <Button variant="secondary" className="px-3 py-1.5 text-xs">Assign &amp; notify</Button>}
    </form>
  );
}
