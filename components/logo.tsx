export function LogoMark({ size = 36 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" width={size} height={size} alt="Earthcon Lab" />;
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight text-white">Earthcon Lab</div>
        <div className="text-[11px] text-teal-200/80">Environmental CRM · LIMS</div>
      </div>
    </div>
  );
}
