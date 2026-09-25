import { Link } from 'react-router'
import { cn } from '../../lib/utils'

/** Bohnen-Signet (kupferne Plakette mit Espresso-Bohne) */
export function BeanMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)]', className)} aria-hidden>
      <svg viewBox="0 0 64 64" className="size-[62%]">
        <g transform="rotate(-30 32 32)">
          <ellipse cx="32" cy="32" rx="15" ry="21" fill="#1C130E" />
          <path d="M32 12c-5 7 5 13 0 20s5 13 0 20" fill="none" stroke="#C4702F" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      </svg>
    </span>
  )
}

export function Logo({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <Link to="/" className={cn('group inline-flex min-h-11 items-center gap-2.5 rounded-full', className)} aria-label="Röstbrüder – zur Startseite">
      <BeanMark className="transition-transform duration-500 group-hover:rotate-[20deg]" />
      <span className={cn('font-display text-[22px] leading-none font-semibold tracking-tight transition-colors', onDark ? 'text-sidebar-ink' : 'text-ink')}>
        Röstbrüder
      </span>
    </Link>
  )
}
