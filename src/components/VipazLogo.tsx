import React from 'react';

interface VipazLogoProps { inverse?: boolean; compact?: boolean; className?: string; }

export const VipazLogo: React.FC<VipazLogoProps> = ({ inverse = false, compact = false, className = '' }) => {
  const ink = inverse ? '#FFFFFF' : '#11161A';
  return <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="VIPAZ Jurídico">
    <img src="/assets/vipaz-orbit-logo.png" alt="" aria-hidden="true" className={`h-11 w-16 shrink-0 object-contain ${inverse?'invert':''}`}/>
    {!compact && <span className="flex flex-col text-left leading-none">
      <span className="text-[18px] font-extrabold tracking-[-.055em]" style={{ color: ink }}>VIPAZ</span>
      <span className="mt-1 text-[8px] font-bold uppercase tracking-[.26em] text-[#20D7E8]">Jurídico</span>
    </span>}
  </span>;
};
