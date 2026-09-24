import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

// Line-Art-Illustrationen für Zubereitungsarten & kleine Deko-Elemente.
// Strich = currentColor, Kaffee/Flüssigkeit = Kupfer-Akzent → funktioniert in Hell & Dunkel.

export type BrewIconName = 'v60' | 'aeropress' | 'french' | 'espresso' | 'moka' | 'chemex' | 'vollautomat'

const LIQUID = { fill: 'var(--accent)', fillOpacity: 0.32, stroke: 'none' } as const

const brewArt: Record<BrewIconName, ReactNode> = {
  v60: (
    <>
      <path d="M11 11h42L40 33H24Z" />
      <path d="M21 15l6 14M32 15v14M43 15l-6 14" strokeOpacity={0.45} />
      <path d="M53 14c6 1 6 9 0 11" />
      <path d="M19 33h26M21 36.5h22" />
      <path d="M17 41h30v5.5A11.5 11.5 0 0 1 35.5 58h-7A11.5 11.5 0 0 1 17 46.5Z" {...LIQUID} />
      <path d="M17 41h30v5.5A11.5 11.5 0 0 1 35.5 58h-7A11.5 11.5 0 0 1 17 46.5Z" />
      <path d="M47 44h2.5a4 4 0 0 1 0 8H46" />
    </>
  ),
  aeropress: (
    <>
      <rect x="21" y="5" width="22" height="4" rx="1.5" />
      <path d="M24 9v10M40 9v10" />
      <path d="M16 19h32" />
      <path d="M20 19h24v26H20Z" />
      <path d="M21 33h22v12H21Z" {...LIQUID} />
      <path d="M20 45h24l-2.5 4h-19Z" />
      <path d="M17 53h30v2a5 5 0 0 1-5 5H22a5 5 0 0 1-5-5Z" />
      <path d="M28 25h8" strokeOpacity={0.45} />
    </>
  ),
  french: (
    <>
      <circle cx="30" cy="5.5" r="2.5" />
      <path d="M30 8v18" />
      <rect x="16" y="11" width="28" height="5" rx="2" />
      <path d="M17 16h26v36a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3Z" />
      <path d="M18 34h24v18a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2Z" {...LIQUID} />
      <path d="M18 26h24" strokeOpacity={0.55} strokeDasharray="2 2.5" />
      <path d="M43 21h6a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2h-6" />
      <path d="M14 59h32" />
    </>
  ),
  espresso: (
    <>
      <rect x="12" y="5" width="38" height="8" rx="2" />
      <path d="M17 13h28v4a6 6 0 0 1-6 6H23a6 6 0 0 1-6-6Z" />
      <rect x="45" y="14" width="15" height="4.5" rx="2.25" />
      <path d="M27 23v3M35 23v3" />
      <path d="M27 29v7M35 29v7" stroke="var(--accent)" strokeDasharray="3 2.5" />
      <path d="M19 40h24v5a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9Z" {...LIQUID} />
      <path d="M19 40h24v5a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9Z" />
      <path d="M43 42.5h2.5a3.5 3.5 0 0 1 0 7H42" />
      <path d="M13 58.5h36" />
    </>
  ),
  moka: (
    <>
      <path d="M29 5h6v4" />
      <path d="M17 9h30" />
      <path d="M20 9h24l-4 21H24Z" />
      <path d="M20 12l-6-2.5" />
      <path d="M44 13h6l-2.5 13h-5" />
      <path d="M22 30h20" strokeWidth={3} />
      <path d="M24 32h16l6 24H18Z" {...LIQUID} />
      <path d="M24 32h16l6 24H18Z" />
      <circle cx="36" cy="44" r="2" />
    </>
  ),
  chemex: (
    <>
      <path d="M18 5h28L35 29v3l11.5 21.5A3 3 0 0 1 43.8 58H20.2a3 3 0 0 1-2.7-4.5L29 32v-3Z" />
      <path d="M22.5 48h19l3.7 6.5a1.6 1.6 0 0 1-1.4 2.4H20.2a1.6 1.6 0 0 1-1.4-2.4Z" {...LIQUID} />
      <path d="M26.5 25.5h11l-1.2 9.5h-8.6Z" fill="var(--roast)" fillOpacity={0.25} />
      <path d="M26.5 25.5h11l-1.2 9.5h-8.6Z" />
      <path d="M37.5 30c3 0 4.5 1.5 4.5 4" />
      <circle cx="42" cy="36" r="1.6" />
    </>
  ),
  vollautomat: (
    <>
      <rect x="11" y="5" width="42" height="52" rx="6" />
      <rect x="17" y="11" width="17" height="9" rx="2" />
      <circle cx="42" cy="15.5" r="3" />
      <path d="M17 26h30v24H17Z" strokeOpacity={0.5} />
      <path d="M28 26v4h8v-4" />
      <path d="M26 38h12v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4Z" {...LIQUID} />
      <path d="M26 38h12v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4Z" />
      <path d="M20 50h24" />
    </>
  ),
}

export function BrewIcon({ name, className, title }: { name: BrewIconName; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-12', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {brewArt[name]}
    </svg>
  )
}

/** Kaffeebohne als Deko-Glyphe */
export function BeanGlyph({ className, rotate = -28 }: { className?: string; rotate?: number }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-6', className)} aria-hidden>
      <g transform={`rotate(${rotate} 20 20)`}>
        <ellipse cx="20" cy="20" rx="11" ry="16" fill="currentColor" />
        <path d="M20 5c-5 7 5 13 0 15s5 8 0 15" fill="none" stroke="var(--canvas)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** Aufsteigender Dampf – drei Linien, dezent animiert */
export function Steam({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={cn('h-12 w-12', className)} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
      <path d="M18 54c-6-8 6-12 0-22s6-14 0-26" className="motion-safe:animate-[pulse_3.2s_ease-in-out_infinite]" />
      <path d="M30 54c-6-8 6-12 0-22s6-14 0-26" className="motion-safe:animate-[pulse_3.2s_ease-in-out_0.6s_infinite]" />
      <path d="M42 54c-6-8 6-12 0-22s6-14 0-26" className="motion-safe:animate-[pulse_3.2s_ease-in-out_1.2s_infinite]" />
    </svg>
  )
}

/** Handgezeichnete Unterstreichung für Headlines */
export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" className={cn('h-3 w-full', className)} aria-hidden>
      <path d="M2 9c22-6 40 4 62-1s40-6 62 0 44 3 72-3" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  )
}
