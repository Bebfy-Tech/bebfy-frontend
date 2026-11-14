import type { CSSProperties } from 'react';

type BebfyBrandProps = {
  light?: boolean;
  compact?: boolean;
  className?: string;
};

/** Mark and logotype are laid out independently to align the wordmark to the vertical center. */
export function BebfyBrand({ light = false, compact = false, className = '' }: BebfyBrandProps) {
  return <span className={`inline-flex items-center justify-start gap-2.5 whitespace-nowrap ${className}`} aria-label="Bebfy">
    <img src="/bebfy-symbol.svg" alt="" aria-hidden="true" className={`${compact ? 'h-9 w-[21px]' : 'h-11 w-[26px]'} shrink-0 object-contain ${light ? 'brightness-0 invert' : ''}`}/>
    <span style={{fontFamily:'Manrope, system-ui, sans-serif', letterSpacing:'-.055em'} as CSSProperties} className={`${compact ? 'text-[26px]' : 'text-[31px]'} font-extrabold leading-none ${light ? 'text-white' : 'text-[#0b3e36]'}`}>bebfy<span className={light ? 'text-[#6de1af]' : 'text-[#188e6a]'}>.</span></span>
  </span>;
}
