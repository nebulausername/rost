import { addDays, endOfMonth, isBefore, isSameMonth, setHours, startOfDay, startOfMonth } from 'date-fns'
import { CalendarPlus, Sparkles, X } from 'lucide-react'
import { useMemo, type CSSProperties } from 'react'
import { Button } from '../../components/ui/primitives'
import { KEYDATE_KINDS } from '../../lib/constants'
import { occurrencesBetween } from '../../lib/keydates'
import { useStore, useUi } from '../../lib/store'
import type { KeyDateOccurrence } from '../../lib/types'
import { cn, formatDe } from '../../lib/utils'

function Illustration() {
  return (
    <svg viewBox="0 0 160 120" className="h-24 w-32" aria-hidden>
      <ellipse cx="80" cy="110" rx="58" ry="6" fill="var(--surface-3)" />
      <g transform="rotate(-6 70 58)">
        <rect x="26" y="18" width="84" height="80" rx="12" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="2" />
        <path d="M26 30a12 12 0 0 1 12-12h60a12 12 0 0 1 12 12v8H26z" fill="var(--accent)" />
        <rect x="44" y="11" width="5" height="14" rx="2.5" fill="var(--roast)" />
        <rect x="87" y="11" width="5" height="14" rx="2.5" fill="var(--roast)" />
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            x={36 + (i % 4) * 17}
            y={48 + Math.floor(i / 4) * 15}
            width="11"
            height="9"
            rx="2.5"
            fill={i === 6 ? 'var(--accent)' : 'var(--surface-2)'}
            opacity={i === 6 ? 0.9 : 1}
          />
        ))}
      </g>
      <g>
        <path d="M110 70h26l-3 26a8 8 0 0 1-8 7h-4a8 8 0 0 1-8-7z" fill="var(--roast)" />
        <path d="M136 76h4a6 6 0 0 1 0 12h-5" fill="none" stroke="var(--roast)" strokeWidth="3.5" />
        <ellipse cx="123" cy="70" rx="13" ry="3" fill="var(--crema)" />
        <path d="M118 62c-3-4 3-6 0-10M126 62c-3-4 3-6 0-10" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      </g>
    </svg>
  )
}

/**
 * Leerer Monat: Illustration + direkter Einstieg über die Anlässe des Monats.
 * `filtered` = Es gäbe Posts, aber die Filter blenden alles aus.
 */
export function EmptyMonth({ cursor, filtered, onResetFilters, className }: { cursor: Date; filtered?: boolean; onResetFilters?: () => void; className?: string }) {
  const keyDates = useStore((s) => s.keyDates)
  const openPost = useUi((s) => s.openPost)
  const todayT = startOfDay(new Date()).getTime()
  const monthT = startOfMonth(cursor).getTime()
  const month = new Date(monthT)
  const from = isSameMonth(month, todayT) ? new Date(todayT) : month

  const { inMonth, next } = useMemo(() => {
    const month = new Date(monthT)
    const from = isSameMonth(month, todayT) ? new Date(todayT) : month
    const inMonth = isBefore(endOfMonth(month), from) ? [] : occurrencesBetween(keyDates, from, endOfMonth(month)).filter((o) => o.start >= from || o.end >= from)
    const next = inMonth[0] ?? occurrencesBetween(keyDates, from, addDays(from, 365)).find((o) => o.start >= from)
    return { inMonth, next }
  }, [keyDates, monthT, todayT])

  const plan = (o: KeyDateOccurrence) => {
    const day = o.start < from ? from : o.start
    openPost(null, { scheduledAt: setHours(day, 9).toISOString(), title: o.keyDate.title, notes: o.keyDate.angle })
  }

  if (filtered) {
    return (
      <div className={cn('flex flex-col items-center px-6 py-8 text-center', className)}>
        <Illustration />
        <p className="mt-2 font-display text-lg font-semibold text-ink">Keine Treffer für deine Filter</p>
        <p className="mt-1 max-w-xs text-xs text-ink-3">In diesem Monat gibt es Posts – nur keine, die zu Kanal, Säule oder Status passen.</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={onResetFilters}>
          <X className="size-3.5" /> Filter zurücksetzen
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center px-6 py-8 text-center', className)}>
      <Illustration />
      <p className="mt-2 font-display text-xl font-semibold text-ink">
        {formatDe(month, 'MMMM')} ist noch ein leeres Blatt
      </p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-3">
        {inMonth.length
          ? `${inMonth.length === 1 ? 'Ein Anlass wartet' : `${inMonth.length} Anlässe warten`} schon auf dich – starte mit dem nächsten, der Editor ist vorbefüllt.`
          : next
            ? `In diesem Monat steht kein Anlass an. Der nächste: ${next.keyDate.title} am ${formatDe(next.start, 'd. MMMM')}.`
            : 'Plane deinen ersten Post – Doppelklick auf einen Tag geht auch.'}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {next ? (
          <Button variant="primary" onClick={() => plan(next)}>
            <Sparkles className="size-4" /> {inMonth.length ? 'Anlässe dieses Monats einplanen' : `${next.keyDate.title} einplanen`}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => openPost(null, { scheduledAt: setHours(from, 9).toISOString() })}>
          <CalendarPlus className="size-4" /> Freien Post planen
        </Button>
      </div>
      {inMonth.length > 1 ? (
        <ul className="mt-4 flex max-w-md flex-wrap justify-center gap-1.5" aria-label="Anlässe in diesem Monat">
          {inMonth.slice(0, 6).map((o) => (
            <li key={o.keyDate.id}>
              <button
                type="button"
                onClick={() => plan(o)}
                className="tint rounded-md border border-dashed px-2 py-1 text-[11px] font-semibold transition-transform hover:-translate-y-px"
                style={{ '--c': KEYDATE_KINDS[o.keyDate.kind].color, borderColor: 'color-mix(in oklab, var(--c) 45%, transparent)' } as CSSProperties}
              >
                {o.keyDate.title} · {formatDe(o.start, 'd. MMM')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
