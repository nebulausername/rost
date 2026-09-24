import { Mail } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { MEDIA_TONES, PILLAR, PLATFORM, STATUS } from '../lib/constants'
import type { MediaTone, Pillar, Platform, PostStatus } from '../lib/types'
import { cn } from '../lib/utils'
import { Tint } from './ui/primitives'

// Eigene, markenneutrale Glyphen – Lucide führt keine Marken-Logos.
const glyphs: Record<Platform, ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </>
  ),
  facebook: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8.5A.5.5 0 0 1 14.5 8Z" />,
  tiktok: <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.6 2.2 4.4 5 4.7" />,
  google: (
    <>
      <path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  pinterest: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M11 8.5c3-1 5 .5 4.6 3-.4 2.3-2.3 3.2-3.8 2.2M11.3 10 9 20" />
    </>
  ),
  newsletter: null,
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10.5 9.5 4 2.5-4 2.5Z" fill="currentColor" />
    </>
  ),
}

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  if (platform === 'newsletter') return <Mail className={cn('size-4', className)} aria-hidden />
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4', className)}
      aria-hidden
    >
      {glyphs[platform]}
    </svg>
  )
}

/** Kreis mit Kanalfarbe + Icon – Farbe ist nie der einzige Träger (Icon + Title) */
export function PlatformDot({ platform, size = 20 }: { platform: Platform; size?: number }) {
  const meta = PLATFORM[platform]
  return (
    <span
      title={meta.label}
      className="inline-flex shrink-0 items-center justify-center rounded-full text-white ring-2 ring-surface"
      style={{ width: size, height: size, background: meta.color }}
    >
      <PlatformIcon platform={platform} className="size-[60%]" />
      <span className="sr-only">{meta.label}</span>
    </span>
  )
}

export function PlatformStack({ platforms, size = 18 }: { platforms: Platform[]; size?: number }) {
  return (
    <span className="inline-flex items-center -space-x-1">
      {platforms.map((p) => (
        <PlatformDot key={p} platform={p} size={size} />
      ))}
    </span>
  )
}

export function PlatformChip({ platform, active, onClick }: { platform: Platform; active?: boolean; onClick?: () => void }) {
  const meta = PLATFORM[platform]
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': active } : {})}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
        active ? 'tint tint-border' : 'border-line bg-surface text-ink-3 hover:border-line-strong hover:text-ink',
      )}
      style={{ '--c': meta.color } as CSSProperties}
    >
      <PlatformIcon platform={platform} className="size-3.5" />
      {meta.label.replace(' Unternehmensprofil', '')}
    </Tag>
  )
}

export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  const s = STATUS[status]
  return (
    <Tint color={s.color} className={className} title={s.hint}>
      <span className="size-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </Tint>
  )
}

export function PillarBadge({ pillar, className }: { pillar: Pillar; className?: string }) {
  const p = PILLAR[pillar]
  return (
    <Tint color={p.color} className={className} title={p.description}>
      {p.label}
    </Tint>
  )
}

/** Bildfläche: echtes Bild oder warmer Verlauf mit Bohnen-Motiv */
export function MediaThumb({
  url,
  tone,
  className,
  label,
  children,
}: {
  url?: string
  tone: MediaTone
  className?: string
  label?: string
  children?: ReactNode
}) {
  const t = MEDIA_TONES[tone]
  if (url) {
    return (
      <div className={cn('relative overflow-hidden bg-surface-3', className)}>
        <img src={url} alt={label ?? ''} className="size-full object-cover" />
        {children}
      </div>
    )
  }
  return (
    <div
      className={cn('grain relative overflow-hidden', className)}
      style={{ backgroundImage: `linear-gradient(145deg, ${t.from}, ${t.to})`, color: t.ink }}
      aria-label={label}
    >
      <svg viewBox="0 0 100 100" className="absolute -right-[12%] -bottom-[18%] w-[70%] opacity-[0.16]" aria-hidden>
        <g transform="rotate(-28 50 50)">
          <ellipse cx="50" cy="50" rx="30" ry="42" fill="currentColor" />
          <path d="M50 10c-10 14 10 26 0 40s10 26 0 40" fill="none" stroke={t.from} strokeWidth="6" strokeLinecap="round" />
        </g>
      </svg>
      {children}
    </div>
  )
}
