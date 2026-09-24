import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight, Filter, List, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react'
import { PlatformChip, PlatformIcon, PlatformStack, PillarBadge, StatusBadge } from '../components/domain'
import { Button, Card, PageHeader, Segmented, Select, Tint, Toggle } from '../components/ui/primitives'
import { KEYDATE_KINDS, PILLAR, PILLARS, PLATFORM, PLATFORMS, STATUS, STATUSES } from '../lib/constants'
import { occurrencesBetween, occurrencesOnDay } from '../lib/keydates'
import { toast, useStore, useUi } from '../lib/store'
import type { KeyDateOccurrence, Pillar, Platform, Post, PostStatus, Settings } from '../lib/types'
import { cn, formatDe } from '../lib/utils'

type View = 'month' | 'week' | 'list'

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6–22 Uhr
const HOUR_PX = 52

function colorFor(p: Post, by: Settings['calendarColorBy']) {
  if (by === 'pillar') return PILLAR[p.pillar].color
  if (by === 'status') return STATUS[p.status].color
  return PLATFORM[p.platforms[0] ?? 'instagram'].color
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}

export function CalendarPage() {
  const posts = useStore((s) => s.posts)
  const keyDates = useStore((s) => s.keyDates)
  const colorBy = useStore((s) => s.settings.calendarColorBy)
  const updateSettings = useStore((s) => s.updateSettings)
  const movePost = useStore((s) => s.movePost)
  const openPost = useUi((s) => s.openPost)
  const isMobile = useIsMobile()

  const [view, setView] = useState<View>(() => (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'list' : 'month'))
  const [cursor, setCursor] = useState(() => new Date())
  const [platformFilter, setPlatformFilter] = useState<Platform[]>([])
  const [pillarFilter, setPillarFilter] = useState<Pillar | ''>('')
  const [statusFilter, setStatusFilter] = useState<PostStatus | ''>('')
  const [showKeyDates, setShowKeyDates] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const effectiveView: View = isMobile && view === 'month' ? 'list' : view

  const range = useMemo(() => {
    if (effectiveView === 'week') {
      const start = startOfWeek(cursor, { weekStartsOn: 1 })
      return { start, end: endOfWeek(cursor, { weekStartsOn: 1 }) }
    }
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    return { start, end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) }
  }, [cursor, effectiveView])

  const filtered = useMemo(
    () =>
      posts.filter(
        (p) =>
          (!platformFilter.length || p.platforms.some((x) => platformFilter.includes(x))) &&
          (!pillarFilter || p.pillar === pillarFilter) &&
          (!statusFilter || p.status === statusFilter),
      ),
    [posts, platformFilter, pillarFilter, statusFilter],
  )

  const inRange = useMemo(() => {
    const s = range.start.getTime()
    const e = addDays(range.end, 1).getTime()
    return filtered
      .filter((p) => {
        const t = parseISO(p.scheduledAt).getTime()
        return t >= s && t < e
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  }, [filtered, range])

  const occ = useMemo(() => (showKeyDates ? occurrencesBetween(keyDates, range.start, range.end) : []), [keyDates, range, showKeyDates])

  const step = (dir: 1 | -1) => setCursor((c) => (effectiveView === 'week' ? addWeeks(c, dir) : addMonths(c, dir)))

  const onDropTo = (e: DragEvent, day: Date, hour?: number) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/post-id')
    const post = posts.find((p) => p.id === id)
    if (!post) return
    const old = parseISO(post.scheduledAt)
    const target = setMinutes(setHours(startOfDay(day), hour ?? old.getHours()), hour != null ? 0 : old.getMinutes())
    if (target.getTime() === old.getTime()) return
    movePost(id, target.toISOString())
    toast({
      title: 'Post verschoben',
      description: `${post.title} → ${formatDe(target, "EEE d. MMM, HH:mm 'Uhr'")}`,
      action: { label: 'Rückgängig', run: () => useStore.getState().movePost(id, post.scheduledAt) },
    })
  }

  const createAt = (day: Date, hour = 9) => openPost(null, { scheduledAt: setMinutes(setHours(startOfDay(day), hour), 0).toISOString() })

  const title = effectiveView === 'week' ? `KW ${format(range.start, 'I')} · ${formatDe(range.start, 'd. MMM')} – ${formatDe(range.end, 'd. MMM yyyy')}` : formatDe(cursor, 'MMMM yyyy')

  const activeFilters = platformFilter.length + (pillarFilter ? 1 : 0) + (statusFilter ? 1 : 0)
  const counts = STATUSES.map((s) => ({ ...s, n: inRange.filter((p) => p.status === s.id).length })).filter((s) => s.n > 0)

  return (
    <div>
      <PageHeader
        eyebrow="Social Media"
        title="Redaktionskalender"
        description="Alle Kanäle auf einen Blick. Ziehe Posts auf einen anderen Tag, um sie umzuplanen – Anlässe wie Tag des Kaffees oder Zwiebelmarkt sind schon eingetragen."
        actions={
          <>
            <Segmented
              label="Ansicht"
              value={effectiveView}
              onChange={setView}
              options={[
                ...(isMobile ? [] : [{ value: 'month' as View, label: 'Monat', icon: <CalendarDays className="size-3.5" /> }]),
                { value: 'week', label: 'Woche', icon: <CalendarRange className="size-3.5" /> },
                { value: 'list', label: 'Liste', icon: <List className="size-3.5" /> },
              ]}
            />
          </>
        }
      />

      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label="Zurück">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label="Weiter">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <h2 className="font-display text-xl font-semibold text-ink capitalize">{title}</h2>
            <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())} className="ml-1">
              Heute
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1.5 xl:flex">
              {counts.map((s) => (
                <Tint key={s.id} color={s.color}>
                  {s.n} {s.label}
                </Tint>
              ))}
            </div>
            <Segmented
              size="sm"
              label="Einfärben nach"
              value={colorBy}
              onChange={(v) => updateSettings({ calendarColorBy: v })}
              options={[
                { value: 'platform', label: 'Kanal' },
                { value: 'pillar', label: 'Säule' },
                { value: 'status', label: 'Status' },
              ]}
            />
            <Button variant={activeFilters ? 'dark' : 'secondary'} size="sm" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
              <Filter className="size-3.5" /> Filter{activeFilters ? ` (${activeFilters})` : ''}
            </Button>
          </div>
        </div>

        {filtersOpen ? (
          <div className="flex flex-col gap-3 border-b border-line bg-surface-2/50 px-4 py-3 md:px-5">
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <PlatformChip
                  key={p.id}
                  platform={p.id}
                  active={platformFilter.includes(p.id)}
                  onClick={() => setPlatformFilter((f) => (f.includes(p.id) ? f.filter((x) => x !== p.id) : [...f, p.id]))}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select aria-label="Säule filtern" className="h-8 w-auto text-xs" value={pillarFilter} onChange={(e) => setPillarFilter(e.target.value as Pillar | '')}>
                <option value="">Alle Säulen</option>
                {PILLARS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <Select aria-label="Status filtern" className="h-8 w-auto text-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PostStatus | '')}>
                <option value="">Alle Status</option>
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <label className="ml-1 flex items-center gap-2 text-xs text-ink-2">
                <Toggle checked={showKeyDates} onChange={setShowKeyDates} label="Anlässe anzeigen" /> Anlässe anzeigen
              </label>
              {activeFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPlatformFilter([])
                    setPillarFilter('')
                    setStatusFilter('')
                  }}
                >
                  <X className="size-3.5" /> Zurücksetzen
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {effectiveView === 'month' ? (
          <MonthGrid
            cursor={cursor}
            range={range}
            posts={inRange}
            occ={occ}
            colorBy={colorBy}
            onDrop={onDropTo}
            onCreate={createAt}
            onOpen={(id) => openPost(id)}
            onMore={(day) => {
              setCursor(day)
              setView('week')
            }}
          />
        ) : effectiveView === 'week' ? (
          <WeekGrid range={range} posts={inRange} occ={occ} colorBy={colorBy} onDrop={onDropTo} onCreate={createAt} onOpen={(id) => openPost(id)} />
        ) : (
          <AgendaList cursor={cursor} posts={filtered} keyOcc={showKeyDates ? occurrencesBetween(keyDates, startOfMonth(cursor), endOfMonth(cursor)) : []} onOpen={(id) => openPost(id)} onCreate={createAt} />
        )}
      </Card>

      <Legend colorBy={colorBy} />
    </div>
  )
}

function Legend({ colorBy }: { colorBy: Settings['calendarColorBy'] }) {
  const items =
    colorBy === 'pillar'
      ? PILLARS.map((p) => ({ key: p.id, label: p.label, color: p.color }))
      : colorBy === 'status'
        ? STATUSES.map((s) => ({ key: s.id, label: s.label, color: s.color }))
        : PLATFORMS.map((p) => ({ key: p.id, label: p.label.replace(' Unternehmensprofil', ''), color: p.color }))
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] text-ink-3">
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-1.5">
          <span className="h-2.5 w-1 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-sm border border-dashed border-line-strong" /> Anlass
      </li>
    </ul>
  )
}

function PostChip({ post, colorBy, onOpen, compact }: { post: Post; colorBy: Settings['calendarColorBy']; onOpen: () => void; compact?: boolean }) {
  const color = colorFor(post, colorBy)
  const published = post.status === 'published'
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/post-id', post.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      title={`${post.title} · ${STATUS[post.status].label} · ${PILLAR[post.pillar].label}`}
      className={cn(
        'tint group/chip flex w-full min-w-0 cursor-grab items-center rounded-md border-l-[3px] py-1 pr-1.5 pl-1.5 text-left text-[11px] leading-tight transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-soft active:cursor-grabbing',
        published && 'opacity-70',
        post.status === 'idea' && 'border-dashed',
      )}
      style={{ '--c': color, borderLeftColor: color } as CSSProperties}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1 opacity-80">
          <span className="font-semibold tabular">{format(parseISO(post.scheduledAt), 'HH:mm')}</span>
          {!compact
            ? post.platforms.slice(0, 4).map((p) => <PlatformIcon key={p} platform={p} className="size-3 shrink-0" />)
            : null}
          {published ? <Check className="ml-auto size-3 shrink-0" aria-label="veröffentlicht" /> : null}
          {post.status === 'review' ? <span className="ml-auto size-1.5 shrink-0 rounded-full bg-warning" aria-label="wartet auf Freigabe" /> : null}
        </span>
        <span className="truncate font-medium">{post.title}</span>
      </span>
    </button>
  )
}

function KeyDateRibbon({ o, compact, continued }: { o: KeyDateOccurrence; compact?: boolean; continued?: boolean }) {
  const multi = o.end.getTime() !== o.start.getTime()
  return (
    <div
      className="tint truncate rounded border border-dashed px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ '--c': KEYDATE_KINDS[o.keyDate.kind].color, borderColor: 'color-mix(in oklab, var(--c) 45%, transparent)' } as CSSProperties}
      title={`${o.keyDate.title} – ${o.keyDate.angle}${o.keyDate.verify ? ' (Termin prüfen)' : ''}`}
    >
      {continued ? '↳ ' : ''}
      {compact ? o.keyDate.title.split(' ')[0] : o.keyDate.title}
      {multi && !continued && !compact ? <span className="font-normal opacity-70"> · bis {formatDe(o.end, 'd. MMM')}</span> : null}
    </div>
  )
}

function MonthGrid({
  cursor,
  range,
  posts,
  occ,
  colorBy,
  onDrop,
  onCreate,
  onOpen,
  onMore,
}: {
  cursor: Date
  range: { start: Date; end: Date }
  posts: Post[]
  occ: KeyDateOccurrence[]
  colorBy: Settings['calendarColorBy']
  onDrop: (e: DragEvent, day: Date) => void
  onCreate: (day: Date) => void
  onOpen: (id: string) => void
  onMore: (day: Date) => void
}) {
  const days = eachDayOfInterval(range)
  const [over, setOver] = useState<string | null>(null)
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line bg-surface-2/40">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
          <div key={d} className="px-2 py-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayPosts = posts.filter((p) => isSameDay(parseISO(p.scheduledAt), day))
          const dayOcc = occurrencesOnDay(occ, day)
          const outside = !isSameMonth(day, cursor)
          const today = isToday(day)
          const past = day < startOfDay(new Date())
          const max = dayOcc.some((o) => isSameDay(o.start, day) || day.getDay() === 1) ? 2 : 3
          return (
            <div
              key={key}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(key)
              }}
              onDragLeave={() => setOver((o) => (o === key ? null : o))}
              onDrop={(e) => {
                setOver(null)
                onDrop(e, day)
              }}
              onDoubleClick={() => onCreate(day)}
              className={cn(
                'group relative min-h-[128px] border-r border-b border-line p-1.5 transition-colors [&:nth-child(7n)]:border-r-0',
                outside && 'bg-surface-2/40',
                past && !outside && 'bg-surface-2/20',
                over === key && 'bg-accent-soft/70 ring-2 ring-accent/50 ring-inset',
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular',
                    today ? 'bg-accent-solid text-on-accent' : outside ? 'text-ink-3/60' : 'text-ink-2',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <button
                  type="button"
                  onClick={() => onCreate(day)}
                  className="rounded-md p-0.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-3 hover:text-ink focus:opacity-100"
                  aria-label={`Post am ${formatDe(day, 'd. MMMM')} planen`}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <div className="space-y-1">
                {dayOcc
                  .filter((o) => isSameDay(o.start, day) || day.getDay() === 1)
                  .slice(0, 1)
                  .map((o) => (
                    <KeyDateRibbon key={o.keyDate.id} o={o} continued={!isSameDay(o.start, day)} />
                  ))}
                {dayPosts.slice(0, max).map((p) => (
                  <PostChip key={p.id} post={p} colorBy={colorBy} onOpen={() => onOpen(p.id)} />
                ))}
                {dayPosts.length > max ? (
                  <button type="button" onClick={() => onMore(day)} className="w-full rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-ink-3 hover:bg-surface-3 hover:text-ink">
                    + {dayPosts.length - max} weitere
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekGrid({
  range,
  posts,
  occ,
  colorBy,
  onDrop,
  onCreate,
  onOpen,
}: {
  range: { start: Date; end: Date }
  posts: Post[]
  occ: KeyDateOccurrence[]
  colorBy: Settings['calendarColorBy']
  onDrop: (e: DragEvent, day: Date, hour?: number) => void
  onCreate: (day: Date, hour?: number) => void
  onOpen: (id: string) => void
}) {
  const days = eachDayOfInterval(range)
  const [now, setNow] = useState(() => new Date())
  const [over, setOver] = useState<string | null>(null)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  const nowTop = ((now.getHours() + now.getMinutes() / 60 - HOURS[0]) * HOUR_PX) | 0

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line bg-surface-2/40">
          <div />
          {days.map((d) => {
            const dayOcc = occurrencesOnDay(occ, d)
            return (
              <div key={d.toISOString()} className="border-l border-line px-2 py-2">
                <p className={cn('text-[11px] font-semibold tracking-wide uppercase', isToday(d) ? 'text-accent-text' : 'text-ink-3')}>{formatDe(d, 'EEE')}</p>
                <p className={cn('text-lg leading-tight font-semibold tabular', isToday(d) ? 'text-accent-text' : 'text-ink')}>{format(d, 'd')}</p>
                <div className="mt-1 min-h-[18px] space-y-0.5">
                  {dayOcc
                    .filter((o) => isSameDay(o.start, d) || d.getDay() === 1)
                    .map((o) => (
                      <KeyDateRibbon key={o.keyDate.id} o={o} compact continued={!isSameDay(o.start, d)} />
                    ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
          <div>
            {HOURS.map((h) => (
              <div key={h} className="relative pr-2 text-right text-[10px] font-medium text-ink-3 tabular" style={{ height: HOUR_PX }}>
                <span className="relative -top-1.5">{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          {days.map((d) => {
            const dayPosts = posts.filter((p) => isSameDay(parseISO(p.scheduledAt), d))
            return (
              <div key={d.toISOString()} className={cn('relative border-l border-line', isToday(d) && 'bg-accent-soft/25')}>
                {HOURS.map((h) => {
                  const k = `${d.toDateString()}-${h}`
                  return (
                    <div
                      key={h}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setOver(k)
                      }}
                      onDragLeave={() => setOver((o) => (o === k ? null : o))}
                      onDrop={(e) => {
                        setOver(null)
                        onDrop(e, d, h)
                      }}
                      onDoubleClick={() => onCreate(d, h)}
                      className={cn('border-b border-line/60', over === k && 'bg-accent-soft')}
                      style={{ height: HOUR_PX }}
                      title={`${formatDe(d, 'EEE d. MMM')}, ${h}:00 – Doppelklick zum Planen`}
                    />
                  )
                })}
                {dayPosts.map((p, i) => {
                  const t = parseISO(p.scheduledAt)
                  const top = Math.max(0, (t.getHours() + t.getMinutes() / 60 - HOURS[0]) * HOUR_PX)
                  const sameSlot = dayPosts.filter((x) => parseISO(x.scheduledAt).getHours() === t.getHours())
                  const idx = sameSlot.indexOf(p)
                  const width = 100 / sameSlot.length
                  return (
                    <div
                      key={p.id}
                      className="absolute px-0.5"
                      style={{ top: top + 2, left: `${idx * width}%`, width: `${width}%`, zIndex: 5 + i }}
                    >
                      <WeekCard post={p} colorBy={colorBy} onOpen={() => onOpen(p.id)} />
                    </div>
                  )
                })}
                {isToday(d) && nowTop > 0 && nowTop < HOURS.length * HOUR_PX ? (
                  <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowTop }}>
                    <div className="relative h-0.5 bg-accent">
                      <span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-accent" />
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WeekCard({ post, colorBy, onOpen }: { post: Post; colorBy: Settings['calendarColorBy']; onOpen: () => void }) {
  const color = colorFor(post, colorBy)
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/post-id', post.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onOpen}
      className={cn('tint flex w-full cursor-grab flex-col gap-0.5 overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left shadow-soft transition-transform hover:-translate-y-px', post.status === 'published' && 'opacity-70')}
      style={{ '--c': color, borderLeftColor: color, minHeight: HOUR_PX - 6 } as CSSProperties}
      title={post.title}
    >
      <span className="flex items-center gap-1 text-[10px] font-semibold tabular opacity-80">
        {format(parseISO(post.scheduledAt), 'HH:mm')}
        {post.platforms.slice(0, 3).map((p) => (
          <PlatformIcon key={p} platform={p} className="size-2.5" />
        ))}
      </span>
      <span className="line-clamp-2 text-[11px] leading-tight font-semibold">{post.title}</span>
    </button>
  )
}

function AgendaList({
  cursor,
  posts,
  keyOcc,
  onOpen,
  onCreate,
}: {
  cursor: Date
  posts: Post[]
  keyOcc: KeyDateOccurrence[]
  onOpen: (id: string) => void
  onCreate: (day: Date) => void
}) {
  const start = startOfMonth(cursor)
  const end = endOfMonth(cursor)
  const days = eachDayOfInterval({ start, end }).filter((d) => {
    const hasPosts = posts.some((p) => isSameDay(parseISO(p.scheduledAt), d))
    return hasPosts || occurrencesOnDay(keyOcc, d).some((o) => isSameDay(o.start, d)) || isToday(d)
  })
  if (!days.length) {
    return <p className="px-5 py-12 text-center text-sm text-ink-3">In diesem Monat ist noch nichts geplant.</p>
  }
  return (
    <ol className="divide-y divide-line">
      {days.map((d) => {
        const dayPosts = posts.filter((p) => isSameDay(parseISO(p.scheduledAt), d)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
        const dayOcc = occurrencesOnDay(keyOcc, d).filter((o) => isSameDay(o.start, d))
        return (
          <li key={d.toISOString()} className={cn('flex gap-4 px-4 py-3 md:px-5', isToday(d) && 'bg-accent-soft/30')}>
            <div className="w-12 shrink-0 text-center">
              <p className={cn('text-[11px] font-semibold uppercase', isToday(d) ? 'text-accent-text' : 'text-ink-3')}>{formatDe(d, 'EEE')}</p>
              <p className={cn('font-display text-2xl leading-none font-semibold tabular', isToday(d) ? 'text-accent-text' : 'text-ink')}>{format(d, 'd')}</p>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {dayOcc.map((o) => (
                <KeyDateRibbon key={o.keyDate.id} o={o} />
              ))}
              {dayPosts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpen(p.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2/50"
                >
                  <span className="w-11 shrink-0 text-xs font-semibold text-ink-2 tabular">{format(parseISO(p.scheduledAt), 'HH:mm')}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{p.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={p.status} />
                      <PillarBadge pillar={p.pillar} className="hidden sm:inline-flex" />
                    </span>
                  </span>
                  <PlatformStack platforms={p.platforms} />
                </button>
              ))}
              {!dayPosts.length ? (
                <button type="button" onClick={() => onCreate(d)} className="text-xs font-medium text-accent-text hover:underline">
                  + Post planen
                </button>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
