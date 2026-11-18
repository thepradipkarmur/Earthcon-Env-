import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Label({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getProfile();
  const supabase = await createClient();
  const { data: s } = await supabase.from("samples").select("sample_no,sampling_point,collected_at,preservation,clients(client_code),sample_types(name)").eq("id", id).single() as { data: any };
  if (!s) notFound();
  const svg = await QRCode.toString(s.sample_no, { type: "svg", margin: 0, width: 96 });
  return (
    <div className="p-6">
      <div className="flex w-[90mm] gap-3 rounded border border-black p-3 text-[11px] leading-tight text-black">
        <div className="h-24 w-24 shrink-0" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="space-y-0.5">
          <div className="text-[10px] font-semibold uppercase">Earthcon Lab</div>
          <div className="font-mono text-sm font-bold">{s.sample_no}</div>
          <div>{s.sample_types?.name}</div>
          <div>Client: {s.clients?.client_code}</div>
          <div>Point: {s.sampling_point ?? "—"}</div>
          <div>Collected: {fmtDateTime(s.collected_at)}</div>
          <div>Pres.: {s.preservation ?? "—"}</div>
        </div>
      </div>
      <p className="no-print mt-4 text-sm text-slate-500">Use your browser&apos;s print (Ctrl/Cmd + P) to print this label.</p>
    </div>
  );
}
