export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-2 h-3 w-24 rounded bg-slate-200" />
      <div className="mb-6 h-7 w-64 rounded bg-slate-200" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-slate-200/70" />)}
      </div>
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-5 rounded bg-slate-100" />)}
      </div>
    </div>
  );
}
