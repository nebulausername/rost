import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isWeekend,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, PanelRightClose, Plus } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { PlatformIcon } from '../../components/domain'
import { Card } from '../../components/ui/primitives'
import { PILLARS, PLATFORMS } from '../../lib/constants'
import type { Post } from '../../lib/types'
import { cn, dayKey, formatDe } from '../../lib/utils'

/** Mini-Monatsnavigator: Punkte für Tage mit Posts, sichtbarer Zeitraum hinterlegt */
export function MiniMonth({
  cursor,
  range,
  postsByDay,
  onPick,
}: {
  cursor: Date
  range: { start: Date; end: Date }
  postsByDay: Map<string, Post[]>
  onPick: (d: Date) => void
}) {
  const [month, setMonth] = useState(() => startOfMonth(cursor))
  const [synced, setSynced] = useState(cursor)
  // Hauptansicht springt → Mini-Monat folgt (ohne Effekt, während des Renderns abgeglichen)
  if (synced !== cursor) {
    setSynced(cursor)
    if (!isSameMonth(month, cursor)) setMonth(startOfMonth(cursor))
  }
  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }),
    [month],
  )
  const rs = range.start.getTime()
  const re = range.end.getTime()
  return (
    <Card className="p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-[15px] font-semibold text-ink capitalize">{formatDe(month, 'MMMM yyyy')}</p>
        <div className="flex">
          <button type="button" onClick={() => setMonth((m) => addMonths(m, -1))} className="flex size-7 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Vorheriger Monat">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} className="flex size-7 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Nächster Monat">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-ink-3" aria-hidden>
        {['M', 'D', 'M', 'D', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const n = postsByDay.get(dayKey(d))?.length ?? 0
          const t = d.getTime()
          const inRange = t >= rs && t <= re
          const outside = !isSameMonth(d, month)
          const today = isToday(d)
          return (
            <button
              key={t}
              type="button"
              onClick={() => onPick(d)}
              aria-label={`${formatDe(d, 'EEEE, d. MMMM')}${n ? ` – ${n} Posts` : ''}`}
              aria-current={today ? 'date' : undefined}
              className={cn(
                'relative flex h-8 flex-col items-center justify-center text-[11px] font-medium tabular transition-colors',
                inRange ? 'bg-accent-soft/70 text-ink' : 'text-ink-2 hover:bg-surface-2',
                inRange && (d.getDay() === 1 || t === rs) && 'rounded-l-lg',
                inRange && (d.getDay() === 0 || t === startOfDay(range.end).getTime()) && 'rounded-r-lg',
                !inRange && 'rounded-lg',
                outside && 'text-ink-3',
              )}
            >
              <span className={cn('flex size-6 items-center justify-center rounded-full', today && 'bg-accent-solid font-bold text-on-accent')}>{format(d, 'd')}</span>
              <span className="absolute bottom-0.5 flex gap-0.5" aria-hidden>
                {Array.from({ length: Math.min(3, n) }, (_, i) => (
                  <span key={i} className={cn('size-1 rounded-full', outside ? 'bg-ink-3/40' : 'bg-accent')} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function Bar({ value, max, color, target }: { value: number; max: number; color: string; target?: number }) {
  return (
    <div className="relative h-1.5 flex-1 overflow-visible rounded-full bg-surface-2">
      <div className="h-full rounded-full" style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, background: color }} />
      {target != null ? (
        <span className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-ink-3" style={{ left: `calc(${Math.min(100, target)}% - 1px)` }} title={`Soll ${Math.round(target)} %`} />
      ) : null}
    </div>
  )
}

/** „Im Überblick“: Kanäle, Säulen (Ist vs. Soll) und Lücken im sichtbaren Zeitraum */
export function RangeOverview({
  title,
  subtitle,
  posts,
  days,
  postsByDay,
  onCreate,
  onCollapse,
}: {
  title: string
  subtitle: string
  posts: Post[]
  days: Date[]
  postsByDay: Map<string, Post[]>
  onCreate: (d: Date) => void
  onCollapse: () => void
}) {
  const stats = useMemo(() => {
    const platforms = PLATFORMS.map((p) => ({ ...p, n: posts.filter((x) => x.platforms.includes(p.id)).length })).filter((p) => p.n > 0)
    const pillars = PILLARS.map((p) => ({ ...p, n: posts.filter((x) => x.pillar === p.id).length }))
    const today = startOfDay(new Date())
    const gaps = days.filter((d) => !isWeekend(d) && d >= today && !(postsByDay.get(dayKey(d))?.length ?? 0))
    const open = posts.filter((p) => p.status === 'idea' || p.status === 'draft' || p.status === 'review').length
    const ready = posts.filter((p) => p.status === 'approved' || p.status === 'scheduled').length
    const live = posts.filter((p) => p.status === 'published').length
    return { platforms, pillars, gaps, open, ready, live }
  }, [posts, days, postsByDay])
  const maxP = Math.max(1, ...stats.platforms.map((p) => p.n))
  const [showAllGaps, setShowAllGaps] = useState(false)
  const gaps = showAllGaps ? stats.gaps : stats.gaps.slice(0, 5)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 pt-3.5 pb-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-[11px] text-ink-3 capitalize">{subtitle}</p>
        </div>
        <button type="button" onClick={onCollapse} className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Überblick einklappen">
          <PanelRightClose className="size-4" />
        </button>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
        {[
          { label: 'in Arbeit', value: stats.open },
          { label: 'startklar', value: stats.ready },
          { label: 'live', value: stats.live },
        ].map((s) => (
          <div key={s.label} className="px-1 py-2.5">
            <dd className="text-lg leading-none font-semibold text-ink tabular">{s.value}</dd>
            <dt className="mt-1 text-[10px] font-medium text-ink-3">{s.label}</dt>
          </div>
        ))}
      </dl>

      <section className="space-y-2 px-4 pt-3.5 pb-3" aria-label="Posts pro Kanal">
        <h3 className="text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">Kanäle</h3>
        {stats.platforms.length ? (
          <ul className="space-y-1.5">
            {stats.platforms.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-xs text-ink-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md tint" style={{ '--c': p.color } as CSSProperties}>
                  <PlatformIcon platform={p.id} className="size-3" />
                </span>
                <span className="w-[72px] shrink-0 truncate">{p.label.replace(' Unternehmensprofil', '').replace(' Shorts', '')}</span>
                <Bar value={p.n} max={maxP} color={p.color} />
                <span className="w-5 text-right font-semibold text-ink tabular">{p.n}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-3">Noch nichts geplant.</p>
        )}
      </section>

      <section className="space-y-2 border-t border-line px-4 pt-3.5 pb-3" aria-label="Posts pro Content-Säule">
        <h3 className="flex items-center justify-between text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
          Säulen <span className="font-medium tracking-normal normal-case">Ist · Soll ▏</span>
        </h3>
        <ul className="space-y-1.5">
          {stats.pillars.map((p) => {
            const share = posts.length ? (p.n / posts.length) * 100 : 0
            return (
              <li key={p.id} className="flex items-center gap-2 text-xs text-ink-2" title={`${p.label}: ${p.n} Posts (${Math.round(share)} %), Soll ${p.share} %`}>
                <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="w-[84px] shrink-0 truncate">{p.label}</span>
                <Bar value={share} max={100} color={p.color} target={p.share} />
                <span className="w-5 text-right font-semibold text-ink tabular">{p.n}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="border-t border-line px-4 pt-3.5 pb-4" aria-label="Lücken an Werktagen">
        <h3 className="mb-2 flex items-center justify-between text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
          Lücken
          {stats.gaps.length ? <span className="rounded-full bg-warning-soft px-1.5 py-px text-[10px] font-bold tracking-normal text-warning tabular">{stats.gaps.length}</span> : null}
        </h3>
        {stats.gaps.length ? (
          <ul className="space-y-1">
            {gaps.map((d) => (
              <li key={d.getTime()}>
                <button
                  type="button"
                  onClick={() => onCreate(d)}
                  className="group flex w-full items-center gap-2 rounded-lg border border-dashed border-warning/40 bg-warning-soft/40 px-2 py-1.5 text-left text-xs transition-colors hover:border-warning hover:bg-warning-soft"
                >
                  <span className="rounded bg-warning-soft px-1 text-[10px] font-bold text-warning uppercase">Lücke</span>
                  <span className="flex-1 truncate font-medium text-ink-2">{formatDe(d, 'EEE d. MMM')}</span>
                  <Plus className="size-3.5 text-ink-3 group-hover:text-ink" aria-hidden />
                  <span className="sr-only">– Post planen</span>
                </button>
              </li>
            ))}
            {stats.gaps.length > 5 ? (
              <li>
                <button type="button" onClick={() => setShowAllGaps((v) => !v)} className="px-1 text-[11px] font-medium text-accent-text hover:underline">
                  {showAllGaps ? 'Weniger zeigen' : `+ ${stats.gaps.length - 5} weitere Lücken`}
                </button>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-xs text-ink-3">Jeder kommende Werktag hat mindestens einen Post. Stark.</p>
        )}
      </section>
    </Card>
  )
}

export const toDay = (iso: string) => dayKey(parseISO(iso))
