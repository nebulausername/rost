import { useEffect, useId, useState, type ReactNode } from 'react'
import type { CafeLocation, Product } from '../lib/types'
import { cn } from '../lib/utils'
import { openState, ROAST_LABELS } from './lib'

// ---------------------------------------------------------------------------
// Kaffeetüte – illustrierte Verpackung (SVG), Farbe & Name kommen aus dem Produkt
// ---------------------------------------------------------------------------

export function CoffeeBag({
  product,
  className,
  size = '250 g',
}: {
  product: Pick<Product, 'name' | 'subtitle' | 'color' | 'roast'>
  className?: string
  size?: string
}) {
  const id = useId().replace(/:/g, '')
  // Etikett ist 132 px breit – Schriftgröße nach Namenslänge wählen
  const len = product.name.length
  const nameSize = len <= 5 ? 30 : len <= 7 ? 25 : len <= 9 ? 21 : len <= 11 ? 18 : 15
  return (
    <svg viewBox="0 0 200 280" className={cn('h-auto w-full drop-shadow-[0_18px_24px_rgba(40,22,10,0.28)]', className)} role="img" aria-label={`Kaffeetüte ${product.name}`}>
      <defs>
        <linearGradient id={`shade-${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={`top-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <filter id={`grain-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.09 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      {/* Körper */}
      <path d="M22 34 Q20 30 24 28 L176 28 Q180 30 178 34 L186 262 Q187 272 176 273 L24 273 Q13 272 14 262 Z" fill={product.color} />
      <path d="M22 34 Q20 30 24 28 L176 28 Q180 30 178 34 L186 262 Q187 272 176 273 L24 273 Q13 272 14 262 Z" fill={`url(#shade-${id})`} />
      <path d="M22 34 Q20 30 24 28 L176 28 Q180 30 178 34 L186 262 Q187 272 176 273 L24 273 Q13 272 14 262 Z" filter={`url(#grain-${id})`} />
      {/* Siegelnaht oben */}
      <rect x="20" y="8" width="160" height="26" rx="3" fill={product.color} />
      <rect x="20" y="8" width="160" height="26" rx="3" fill={`url(#top-${id})`} />
      <path d="M20 12 H180 M20 16 H180 M20 20 H180" stroke="#000" strokeOpacity="0.12" strokeWidth="1" />
      <path d="M20 34 L180 34" stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" />
      {/* Aroma-Ventil */}
      <circle cx="100" cy="56" r="7" fill="#000" fillOpacity="0.18" />
      <circle cx="100" cy="56" r="3" fill="#000" fillOpacity="0.22" />
      {/* Etikett */}
      <rect x="34" y="78" width="132" height="160" rx="10" fill="#f6ecdf" />
      <rect x="34" y="78" width="132" height="160" rx="10" fill="none" stroke="#1c130e" strokeOpacity="0.12" />
      <text x="100" y="100" textAnchor="middle" fontFamily="Inter Variable, sans-serif" fontSize="8.5" fontWeight="700" letterSpacing="3" fill="#1c130e" fillOpacity="0.7">
        RÖSTBRÜDER
      </text>
      <path d="M62 108 H138" stroke="#1c130e" strokeOpacity="0.2" />
      <text
        x="100"
        y="146"
        textAnchor="middle"
        fontFamily="Fraunces Variable, Georgia, serif"
        fontSize={nameSize}
        fontWeight="600"
        fill="#1c130e"
      >
        {product.name}
      </text>
      <text x="100" y="166" textAnchor="middle" fontFamily="Inter Variable, sans-serif" fontSize="8.5" fontWeight="500" fill="#1c130e" fillOpacity="0.72">
        {product.subtitle.length > 30 ? `${product.subtitle.slice(0, 29)}…` : product.subtitle}
      </text>
      {/* Röstgrad */}
      <g transform="translate(70 184)">
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={i * 15} cy="0" r="4.5" fill={i < product.roast ? product.color : 'none'} stroke={product.color} strokeWidth="1.5" />
        ))}
      </g>
      <text x="100" y="202" textAnchor="middle" fontFamily="Inter Variable, sans-serif" fontSize="6.5" letterSpacing="1.5" fill="#1c130e" fillOpacity="0.55">
        RÖSTGRAD
      </text>
      <text x="100" y="226" textAnchor="middle" fontFamily="Inter Variable, sans-serif" fontSize="7.5" fontWeight="600" letterSpacing="2" fill="#1c130e" fillOpacity="0.7">
        WEIMAR · {size.toUpperCase()}
      </text>
      {/* Aufreißkerbe */}
      <path d="M14 46 l6 3 -6 3" fill="none" stroke="#000" strokeOpacity="0.3" />
      <path d="M186 46 l-6 3 6 3" fill="none" stroke="#000" strokeOpacity="0.3" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Layout-Bausteine
// ---------------------------------------------------------------------------

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-xs font-semibold tracking-[0.2em] text-accent-text uppercase', className)}>{children}</p>
}

export function SectionHeading({
  eyebrow,
  title,
  text,
  action,
  align = 'left',
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  text?: ReactNode
  action?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div className={cn('mb-10 flex flex-col gap-4 md:mb-12', align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between', className)}>
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow ? <Eyebrow className="mb-3">{eyebrow}</Eyebrow> : null}
        <h2 className="font-display text-3xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-4xl md:text-5xl">{title}</h2>
        {text ? <p className="mt-4 text-base leading-relaxed text-ink-2 md:text-lg">{text}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** Große, runde Website-Buttons (die Studio-Buttons sind bewusst kompakter) */
export function SiteButton({
  children,
  variant = 'primary',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'light' }) {
  return (
    <button
      type="button"
      className={cn(siteButtonClass(variant), className)}
      {...rest}
    >
      {children}
    </button>
  )
}

export function siteButtonClass(variant: 'primary' | 'secondary' | 'ghost' | 'light' = 'primary') {
  return cn(
    'inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold whitespace-nowrap transition-[background-color,color,transform,box-shadow,border-color] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    variant === 'primary' && 'bg-accent-solid text-on-accent shadow-[0_8px_24px_-8px_rgb(165_90_34/0.6)] hover:bg-accent-solid-hover',
    variant === 'secondary' && 'border border-line-strong bg-surface text-ink hover:border-ink/40',
    variant === 'ghost' && 'text-ink hover:bg-surface-2',
    variant === 'light' && 'border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20',
  )
}

// ---------------------------------------------------------------------------
// Kaffee-Details
// ---------------------------------------------------------------------------

export function RoastMeter({ roast, className }: { roast: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)} aria-label={`Röstgrad ${ROAST_LABELS[roast]}`}>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn('h-1.5 w-5 rounded-full', i <= roast ? 'bg-roast' : 'bg-surface-3')} />
        ))}
      </div>
      <span className="text-xs text-ink-3">{ROAST_LABELS[roast]}</span>
    </div>
  )
}

export function TasteBars({ taste, className }: { taste: Product['taste']; className?: string }) {
  const rows: { key: keyof Product['taste']; label: string }[] = [
    { key: 'acidity', label: 'Säure' },
    { key: 'body', label: 'Körper' },
    { key: 'sweetness', label: 'Süße' },
    { key: 'chocolate', label: 'Schokoladig' },
    { key: 'fruit', label: 'Fruchtig' },
  ]
  return (
    <dl className={cn('space-y-2.5', className)}>
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[88px_1fr] items-center gap-3">
          <dt className="text-xs text-ink-2">{r.label}</dt>
          <dd className="flex gap-1" aria-label={`${r.label}: ${taste[r.key]} von 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={cn('h-2 flex-1 rounded-full', i <= taste[r.key] ? 'bg-accent' : 'bg-surface-3')} />
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function NoteChips({ notes, className }: { notes: string[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {notes.map((n) => (
        <li key={n} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2">
          {n}
        </li>
      ))}
    </ul>
  )
}

/** Hält die Uhrzeit aktuell (für Live-Öffnungsstatus) */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function OpenBadge({ cafe, className, tone = 'default' }: { cafe: CafeLocation; className?: string; tone?: 'default' | 'onDark' }) {
  const now = useNow()
  const s = openState(cafe.hours, now)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'onDark' ? 'bg-white/10 text-white backdrop-blur' : s.open ? 'bg-success-soft text-success' : 'bg-surface-2 text-ink-2',
        className,
      )}
    >
      <span className="relative flex size-2">
        {s.open ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-50" /> : null}
        <span className={cn('relative inline-flex size-2 rounded-full', s.open ? 'bg-current' : 'bg-ink-3')} />
      </span>
      {s.open ? (s.closesSoon ? `Schließt bald · ${s.label.replace('Geöffnet ', '')}` : s.label) : s.label}
    </span>
  )
}
