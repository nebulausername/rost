import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInMinutes,
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
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Filter,
  List,
  PanelRightOpen,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { PlatformChip, PlatformIcon, PlatformStack, PillarBadge, StatusBadge } from '../components/domain'
import { Button, Card, PageHeader, Segmented, Select, Tint, Toggle } from '../components/ui/primitives'
import { KEYDATE_KINDS, PILLAR, PILLARS, PLATFORM, PLATFORMS, STATUS, STATUSES } from '../lib/constants'
import { occurrencesBetween, occurrencesOnDay } from '../lib/keydates'
import { useStore, useUi } from '../lib/store'
import type { KeyDateOccurrence, Pillar, Platform, Post, PostStatus, Settings } from '../lib/types'
import { cn, dayKey, formatDe } from '../lib/utils'
import { removePosts, setStatus, shiftPosts } from '../features/planning/actions'
import { MiniMonth, RangeOverview } from '../features/planning/CalendarPanel'
import { EmptyMonth } from '../features/planning/EmptyMonth'
import { Floating, type Anchor } from '../features/planning/Floating'
import { PostMenu } from '../features/planning/PostMenu'
import { PreviewProvider } from '../features/planning/Preview'
import { usePreview } from '../features/planning/previewContext'
import { BarDivider, SelectionBar, ShortcutHelp } from '../features/planning/Selection'
import { affectedIds, isMultiClick, useSelection } from '../features/planning/useSelection'
import { focusPost, shortcutsBlocked, useLatest, useLocalState, useMediaQuery, withViewTransition } from '../features/planning/utils'

type View = 'month' | 'week' | 'list'
type ColorBy = Settings['calendarColorBy']

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_PX = 52
const SNAP = 15
const SCROLL_TO_HOUR = 7

function colorFor(p: Post, by: ColorBy) {
  if (by === 'pillar') return PILLAR[p.pillar].color
  if (by === 'status') return STATUS[p.status].color
  return PLATFORM[p.platforms[0] ?? 'instagram'].color
}

const SHORTCUTS = [
  { keys: ['T'], label: 'Heute' },
  { keys: ['←', '→'], label: 'Zurück / weiter' },
  { keys: ['M', 'W', 'L'], label: 'Monat / Woche / Liste' },
  { keys: ['Alt', '←', '→'], label: 'Post ±1 Tag' },
  { keys: ['Alt', '↑', '↓'], label: 'Post ±1 Std. (Monat: ±1 Woche)' },
  { keys: ['X'], label: 'Post auswählen' },
  { keys: ['⇧', 'Klick'], label: 'Mehrfachauswahl' },
  { keys: ['⇧', 'F10'], label: 'Aktionen-Menü' },
  { keys: ['Entf'], label: 'Post löschen' },
  { keys: ['Esc'], label: 'Auswahl aufheben' },
]

/** Minuten-Differenz in Tage/Stunden/Minuten zerlegen (für lesbare Toasts) */
function splitMinutes(total: number) {
  const sign = Math.sign(total)
  let rest = Math.abs(total)
  const days = Math.floor(rest / 1440)
  rest -= days * 1440
  const hours = Math.floor(rest / 60)
  const minutes = rest - hours * 60
  return { days: sign * days, hours: sign * hours, minutes: sign * minutes }
}

// ---------------------------------------------------------------------------
// Chip-Kontext: alles, was ein Post-Chip zum Interagieren braucht
// ---------------------------------------------------------------------------

interface ChipApi {
  colorBy: ColorBy
  view: View
  selected: Set<string>
  onOpen: (id: string) => void
  onMenu: (post: Post, anchor: Anchor, returnFocus: HTMLElement | null) => void
  onToggleSelect: (id: string) => void
  onKeyMove: (post: Post, key: string) => void
  onDelete: (id: string) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
}

const ChipCtx = createContext<ChipApi | null>(null)
/** Wo die Karte gegriffen wurde – damit die Drop-Vorschau die Oberkante der Karte zeigt, nicht den Mauszeiger */
const grab = { y: 0 }
const HINT_ID = 'cal-chip-hint'

function useChip(post: Post) {
  const api = useContext(ChipCtx) as ChipApi
  const preview = usePreview()
  const selected = api.selected.has(post.id)
  const time = format(parseISO(post.scheduledAt), 'HH:mm')
  const label = `${time} Uhr, ${post.title}, ${STATUS[post.status].label}, ${post.platforms.map((p) => PLATFORM[p].label).join(', ')}${selected ? ', ausgewählt' : ''}`
  const props = {
    'data-focus-id': post.id,
    'aria-label': label,
    'aria-describedby': HINT_ID,
    type: 'button' as const,
    draggable: true,
    ...(preview?.bind(post.id) ?? {}),
    onDragStart: (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.setData('text/post-id', post.id)
      e.dataTransfer.effectAllowed = 'move'
      grab.y = Math.max(0, Math.min(HOUR_PX / 2, e.clientY - e.currentTarget.getBoundingClientRect().top))
      preview?.hide()
      api.onDragStart(post.id)
    },
    onDragEnd: api.onDragEnd,
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation()
      if (isMultiClick(e)) {
        e.preventDefault()
        api.onToggleSelect(post.id)
        return
      }
      api.onOpen(post.id)
    },
    onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault()
      preview?.hide()
      api.onMenu(post, { x: e.clientX, y: e.clientY }, e.currentTarget)
    },
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
      if (e.altKey && e.key.startsWith('Arrow')) {
        e.preventDefault()
        e.stopPropagation()
        preview?.hide()
        api.onKeyMove(post, e.key)
        return
      }
      if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
        e.preventDefault()
        preview?.hide()
        api.onMenu(post, e.currentTarget, e.currentTarget)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'x' || e.key === 'X') {
        e.preventDefault()
        api.onToggleSelect(post.id)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        api.onDelete(post.id)
      }
    },
  }
  const menuButton = (className?: string) => (
    <button
      type="button"
      tabIndex={-1}
      aria-haspopup="menu"
      aria-label={`Aktionen für ${post.title}`}
      onClick={(e) => {
        e.stopPropagation()
        preview?.hide()
        const chip = e.currentTarget.parentElement?.querySelector<HTMLElement>('[data-focus-id]') ?? null
        api.onMenu(post, e.currentTarget, chip)
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute z-[1] flex size-5 items-center justify-center rounded-md bg-surface/95 text-ink-2 opacity-0 shadow-soft ring-1 ring-line transition-opacity group-focus-within/chip:opacity-100 group-hover/chip:opacity-100 hover:text-ink focus-visible:opacity-100 pointer-coarse:opacity-100',
        className,
      )}
    >
      <Ellipsis className="size-3.5" />
    </button>
  )
  return { api, selected, time, props, menuButton }
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

export function CalendarPage() {
  const posts = useStore((s) => s.posts)
  const keyDates = useStore((s) => s.keyDates)
  const colorBy = useStore((s) => s.settings.calendarColorBy)
  const updateSettings = useStore((s) => s.updateSettings)
  const openPost = useUi((s) => s.openPost)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isXl = useMediaQuery('(min-width: 1280px)')

  const [view, setView] = useState<View>(() => (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'list' : 'month'))
  const [cursor, setCursor] = useState(() => new Date())
  const [platformFilter, setPlatformFilter] = useState<Platform[]>([])
  const [pillarFilter, setPillarFilter] = useState<Pillar | ''>('')
  const [statusFilter, setStatusFilter] = useState<PostStatus | ''>('')
  const [showKeyDates, setShowKeyDates] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useLocalState('rb-studio:calendar-panel', true)
  const [menu, setMenu] = useState<{ post: Post; anchor: Anchor; returnFocus: HTMLElement | null } | null>(null)
  const [dayPop, setDayPop] = useState<{ day: Date; anchor: HTMLElement } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [shiftBy, setShiftBy] = useState(1)

  const effectiveView: View = isMobile && view === 'month' ? 'list' : view
  const showPanel = isXl && panelOpen

  const range = useMemo(() => {
    if (effectiveView === 'week') return { start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) }
    return { start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) }
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

  // Ein Index Tag → Posts für alle Ansichten (statt pro Zelle zu filtern)
  const byDay = useMemo(() => {
    const m = new Map<string, Post[]>()
    for (const p of [...filtered].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))) {
      const k = dayKey(parseISO(p.scheduledAt))
      const arr = m.get(k)
      if (arr) arr.push(p)
      else m.set(k, [p])
    }
    return m
  }, [filtered])

  const validIds = useMemo(() => new Set(filtered.map((p) => p.id)), [filtered])
  const sel = useSelection(validIds)

  const inRange = useMemo(() => {
    const s = range.start.getTime()
    const e = addDays(range.end, 1).getTime()
    return filtered.filter((p) => {
      const t = parseISO(p.scheduledAt).getTime()
      return t >= s && t < e
    })
  }, [filtered, range])

  const occ = useMemo(() => (showKeyDates ? occurrencesBetween(keyDates, range.start, range.end) : []), [keyDates, range, showKeyDates])

  // Überblick: Woche in der Wochenansicht, sonst der Kalendermonat
  const panelRange = useMemo(
    () => (effectiveView === 'week' ? range : { start: startOfMonth(cursor), end: startOfDay(endOfMonth(cursor)) }),
    [effectiveView, range, cursor],
  )
  const panelDays = useMemo(() => eachDayOfInterval(panelRange), [panelRange])
  const panelPosts = useMemo(() => {
    const s = panelRange.start.getTime()
    const e = addDays(panelRange.end, 1).getTime()
    return filtered.filter((p) => {
      const t = parseISO(p.scheduledAt).getTime()
      return t >= s && t < e
    })
  }, [filtered, panelRange])

  const monthCount = useMemo(() => {
    const inMonth = (p: Post) => isSameMonth(parseISO(p.scheduledAt), cursor)
    return { filtered: filtered.filter(inMonth).length, all: posts.filter(inMonth).length }
  }, [filtered, posts, cursor])

  const step = useCallback((dir: 1 | -1) => setCursor((c) => (effectiveView === 'week' ? addWeeks(c, dir) : addMonths(c, dir))), [effectiveView])

  const resetFilters = () => {
    setPlatformFilter([])
    setPillarFilter('')
    setStatusFilter('')
  }

  const createAt = useCallback(
    (day: Date, hour = 9) => {
      setDayPop(null)
      openPost(null, { scheduledAt: setMinutes(setHours(startOfDay(day), hour), 0).toISOString() })
    },
    [openPost],
  )

  // Seiten-Kürzel. Capture-Phase, damit „W“ hier Woche heißt (statt global „Neue Kampagne“).
  useEffect(() => {
    let gAt = 0
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (shortcutsBlocked(e)) return
      const ui = useUi.getState()
      if (ui.postEditor.open || ui.campaignEditor.open || ui.paletteOpen) return
      const k = e.key.toLowerCase()
      if (k === 'g') {
        gAt = Date.now()
        return
      }
      if (Date.now() - gAt < 900) return // „g + Taste“ gehört der App-Navigation
      let handled = true
      if (k === 't') setCursor(new Date())
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
      else if (k === 'm') setView('month')
      else if (k === 'w') setView('week')
      else if (k === 'l') setView('list')
      else handled = false
      if (handled) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [step])

  const rangeRef = useLatest(range)
  const selRef = useLatest(sel)
  const idsFor = useCallback((id: string) => affectedIds(selRef.current, id), [selRef])

  const chipApi = useMemo<ChipApi>(
    () => ({
      colorBy,
      view: effectiveView,
      selected: sel.selected,
      onOpen: (id) => openPost(id),
      onMenu: (post, anchor, returnFocus) => setMenu({ post, anchor, returnFocus }),
      onToggleSelect: sel.toggle,
      onDelete: (id) => removePosts(idsFor(id)),
      onDragStart: (id) => setDragId(id),
      onDragEnd: () => setDragId(null),
      onKeyMove: (post, key) => {
        const horizontal = key === 'ArrowLeft' || key === 'ArrowRight'
        const dir = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1
        const delta = horizontal ? { days: dir } : effectiveView === 'month' ? { days: dir * 7 } : { hours: dir }
        const ids = idsFor(post.id)
        withViewTransition(
          ids,
          () => {
            shiftPosts(ids, delta, { coalesce: true })
            // Ansicht folgt dem Post, wenn er aus dem sichtbaren Zeitraum wandert (frische Daten, auch bei Tastenwiederholung)
            const fresh = useStore.getState().posts.find((p) => p.id === post.id)
            const r = rangeRef.current
            if (fresh) {
              const t = parseISO(fresh.scheduledAt)
              if (t < r.start || t > r.end) setCursor(t)
            }
          },
          () => focusPost(post.id),
        )
      },
    }),
    [colorBy, effectiveView, sel.selected, sel.toggle, openPost, idsFor, rangeRef],
  )

  const onDropAt = (e: DragEvent, target: Date, keepTime: boolean) => {
    e.preventDefault()
    setDragId(null)
    const id = e.dataTransfer.getData('text/post-id')
    const post = posts.find((p) => p.id === id)
    if (!post) return
    const old = parseISO(post.scheduledAt)
    const ids = idsFor(id)
    if (keepTime) {
      const days = differenceInCalendarDays(target, old)
      if (days) withViewTransition(ids, () => shiftPosts(ids, { days }))
      return
    }
    const mins = differenceInMinutes(target, old)
    if (mins) withViewTransition(ids, () => shiftPosts(ids, splitMinutes(mins)))
  }

  const title =
    effectiveView === 'week'
      ? `KW ${format(range.start, 'I')} · ${isSameMonth(range.start, range.end) ? `${format(range.start, 'd.')}–${formatDe(range.end, 'd. MMM')}` : `${formatDe(range.start, 'd. MMM')} – ${formatDe(range.end, 'd. MMM')}`}`
      : formatDe(cursor, 'MMMM yyyy')

  const activeFilters = platformFilter.length + (pillarFilter ? 1 : 0) + (statusFilter ? 1 : 0)
  const counts = STATUSES.map((s) => ({ ...s, n: inRange.filter((p) => p.status === s.id).length })).filter((s) => s.n > 0)
  const monthEmpty = effectiveView !== 'week' && monthCount.filtered === 0
  const dragPost = dragId ? (posts.find((p) => p.id === dragId) ?? null) : null

  return (
    <div>
      <PageHeader
        eyebrow="Social Media"
        title="Redaktionskalender"
        description="Alle Kanäle auf einen Blick. Ziehe Posts auf einen anderen Tag – oder nimm die Tastatur: Alt + Pfeiltasten verschiebt, Rechtsklick öffnet alle Aktionen."
        actions={
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
        }
      />

      <p id={HINT_ID} className="sr-only">
        Enter öffnet. Alt und Pfeiltasten verschieben den Post. X wählt aus. Umschalt F10 öffnet das Aktionen-Menü.
      </p>

      <ChipCtx.Provider value={chipApi}>
        <PreviewProvider disabled={!!menu || !!dragId}>
          <div className={cn('grid items-start gap-4', showPanel && 'xl:grid-cols-[minmax(0,1fr)_264px]')}>
            <div className="min-w-0">
              <Card className="overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label="Zurück (←)" title="Zurück (←)">
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label="Weiter (→)" title="Weiter (→)">
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                    <h2 className="truncate font-display text-xl font-semibold text-ink capitalize" aria-live="polite">
                      {title}
                    </h2>
                    <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())} className="ml-1" title="Heute (T)">
                      Heute
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!showPanel ? (
                      <div className="hidden items-center gap-1.5 2xl:flex">
                        {counts.map((s) => (
                          <Tint key={s.id} color={s.color}>
                            {s.n} {s.label}
                          </Tint>
                        ))}
                      </div>
                    ) : null}
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
                    <ShortcutHelp items={SHORTCUTS} className="hidden md:flex" />
                    {isXl && !panelOpen ? (
                      <Button variant="secondary" size="icon-sm" className="size-8" onClick={() => setPanelOpen(true)} aria-label="Überblick einblenden" title="Überblick einblenden">
                        <PanelRightOpen className="size-4" />
                      </Button>
                    ) : null}
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
                        <Button variant="ghost" size="sm" onClick={resetFilters}>
                          <X className="size-3.5" /> Zurücksetzen
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {effectiveView === 'month' ? (
                  <div className="relative">
                    <MonthGrid cursor={cursor} range={range} byDay={byDay} occ={occ} onDropAt={onDropAt} onCreate={createAt} onMore={(day, anchor) => setDayPop({ day, anchor })} />
                    {monthEmpty ? (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-b from-surface/40 via-surface/85 to-surface/40 p-4">
                        <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-line bg-surface shadow-lift">
                          <EmptyMonth cursor={cursor} filtered={monthCount.all > 0} onResetFilters={resetFilters} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : effectiveView === 'week' ? (
                  <WeekGrid range={range} byDay={byDay} occ={occ} dragPost={dragPost} onDropAt={onDropAt} onCreate={createAt} />
                ) : monthEmpty ? (
                  <EmptyMonth cursor={cursor} filtered={monthCount.all > 0} onResetFilters={resetFilters} className="py-12" />
                ) : (
                  <AgendaList
                    cursor={cursor}
                    byDay={byDay}
                    keyOcc={showKeyDates ? occurrencesBetween(keyDates, startOfMonth(cursor), endOfMonth(cursor)) : []}
                    onCreate={createAt}
                  />
                )}
              </Card>
              <Legend colorBy={colorBy} />
            </div>

            {showPanel ? (
              <aside className="hidden space-y-4 xl:block" aria-label="Kalender-Überblick">
                <MiniMonth
                  cursor={cursor}
                  range={effectiveView === 'week' ? range : { start: startOfMonth(cursor), end: startOfDay(endOfMonth(cursor)) }}
                  postsByDay={byDay}
                  highlight={effectiveView === 'week'}
                  onPick={(d) => setCursor(d)}
                />
                <RangeOverview
                  title={effectiveView === 'week' ? 'Diese Woche im Überblick' : `${formatDe(cursor, 'MMMM')} im Überblick`}
                  subtitle={effectiveView === 'week' ? `KW ${format(range.start, 'I')} · ${formatDe(range.start, 'd. MMM')} – ${formatDe(range.end, 'd. MMM')}` : `${panelPosts.length} Posts · ${formatDe(cursor, 'MMMM yyyy')}`}
                  posts={panelPosts}
                  days={panelDays}
                  postsByDay={byDay}
                  onCreate={(d) => createAt(d)}
                  onCollapse={() => setPanelOpen(false)}
                />
              </aside>
            ) : null}
          </div>

          {dayPop ? (
            <DayPopover
              day={dayPop.day}
              anchor={dayPop.anchor}
              posts={byDay.get(dayKey(dayPop.day)) ?? []}
              occ={occurrencesOnDay(occ, dayPop.day)}
              hidden={!!dragId}
              onClose={() => setDayPop(null)}
              onCreate={createAt}
            />
          ) : null}
        </PreviewProvider>

        {menu ? (
          <PostMenu
            post={posts.find((p) => p.id === menu.post.id) ?? menu.post}
            anchor={menu.anchor}
            returnFocus={menu.returnFocus}
            onClose={() => setMenu(null)}
            selected={sel.selected.has(menu.post.id)}
            onToggleSelect={() => sel.toggle(menu.post.id)}
            onMoved={(target) => {
              const r = rangeRef.current
              if (target < r.start || target > r.end) setCursor(target)
              focusPost(menu.post.id)
            }}
          />
        ) : null}
      </ChipCtx.Provider>

      <SelectionBar count={sel.selected.size} onClear={sel.clear}>
        <div className="flex items-center gap-1" role="group" aria-label="Verschieben um Tage">
          <span className="pl-1.5 text-xs font-medium text-ink-3">Verschieben</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8"
            aria-label={`${shiftBy} ${shiftBy === 1 ? 'Tag' : 'Tage'} früher`}
            onClick={() => withViewTransition(sel.ids, () => shiftPosts(sel.ids, { days: -shiftBy }, { coalesce: true }))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <input
            type="number"
            min={1}
            max={60}
            value={shiftBy}
            onChange={(e) => setShiftBy(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
            className="field h-8 w-12 px-1 text-center text-xs tabular"
            aria-label="Anzahl Tage"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8"
            aria-label={`${shiftBy} ${shiftBy === 1 ? 'Tag' : 'Tage'} später`}
            onClick={() => withViewTransition(sel.ids, () => shiftPosts(sel.ids, { days: shiftBy }, { coalesce: true }))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <span className="pr-1 text-xs text-ink-3">{shiftBy === 1 ? 'Tag' : 'Tage'}</span>
        </div>
        <BarDivider />
        <Select
          aria-label="Status setzen"
          className="h-8 w-auto text-xs"
          value=""
          onChange={(e) => {
            if (e.target.value) setStatus(sel.ids, e.target.value as PostStatus)
          }}
        >
          <option value="" disabled>
            Status setzen …
          </option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
        <BarDivider />
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            removePosts(sel.ids)
            sel.clear()
          }}
        >
          <Trash2 className="size-3.5" /> Löschen
        </Button>
      </SelectionBar>
    </div>
  )
}

function Legend({ colorBy }: { colorBy: ColorBy }) {
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

// ---------------------------------------------------------------------------
// Chips
// ---------------------------------------------------------------------------

function PostChip({ post }: { post: Post }) {
  const { api, selected, time, props, menuButton } = useChip(post)
  const color = colorFor(post, api.colorBy)
  const published = post.status === 'published'
  return (
    <div data-vt-id={post.id} className="group/chip relative" onDoubleClick={(e) => e.stopPropagation()}>
      <button
        {...props}
        className={cn(
          'tint flex w-full min-w-0 cursor-grab items-center rounded-md border-l-[3px] py-1 pr-1.5 pl-1.5 text-left text-[11px] leading-tight transition-[transform,box-shadow] select-none hover:-translate-y-px hover:shadow-soft active:cursor-grabbing',
          published && 'bg-surface-2 text-ink-2',
          post.status === 'idea' && 'border-dashed',
          selected && 'shadow-soft ring-2 ring-accent ring-offset-1 ring-offset-surface',
        )}
        style={{ '--c': color, borderLeftColor: color } as CSSProperties}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1">
            <span className="font-semibold tabular">{time}</span>
            {post.platforms.slice(0, 3).map((p) => (
              <PlatformIcon key={p} platform={p} className="size-3 shrink-0" />
            ))}
            {selected ? (
              <span className="ml-auto flex size-3.5 shrink-0 items-center justify-center rounded-full bg-accent-solid text-on-accent" aria-hidden>
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            ) : published ? (
              <Check className="ml-auto size-3 shrink-0" aria-hidden />
            ) : post.status === 'review' ? (
              <span className="ml-auto size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
            ) : null}
          </span>
          <span className="truncate font-medium">{post.title}</span>
        </span>
      </button>
      {menuButton('top-0.5 right-0.5')}
    </div>
  )
}

function WeekCard({ post }: { post: Post }) {
  const { api, selected, time, props, menuButton } = useChip(post)
  const color = colorFor(post, api.colorBy)
  return (
    <div data-vt-id={post.id} className="group/chip relative" onDoubleClick={(e) => e.stopPropagation()}>
      <button
        {...props}
        className={cn(
          'tint flex w-full cursor-grab flex-col gap-0.5 overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left shadow-soft transition-transform select-none hover:-translate-y-px active:cursor-grabbing',
          post.status === 'published' && 'bg-surface-2 text-ink-2',
          post.status === 'idea' && 'border-dashed',
          selected && 'ring-2 ring-accent ring-offset-1 ring-offset-surface',
        )}
        style={{ '--c': color, borderLeftColor: color, minHeight: HOUR_PX - 6 } as CSSProperties}
      >
        <span className="flex items-center gap-1 text-[10px] font-semibold tabular">
          {time}
          {post.platforms.slice(0, 3).map((p) => (
            <PlatformIcon key={p} platform={p} className="size-2.5" />
          ))}
          {selected ? <Check className="ml-auto size-3 shrink-0" strokeWidth={3} aria-hidden /> : post.status === 'published' ? <Check className="ml-auto size-3 shrink-0" aria-hidden /> : null}
        </span>
        <span className="line-clamp-2 text-[11px] leading-tight font-semibold">{post.title}</span>
      </button>
      {menuButton('top-1 right-1')}
    </div>
  )
}

function ListRow({ post }: { post: Post }) {
  const { selected, time, props, menuButton } = useChip(post)
  return (
    <div data-vt-id={post.id} className="group/chip relative">
      <button
        {...props}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-2.5 pr-11 text-left transition-colors select-none hover:border-line-strong hover:bg-surface-2/50',
          selected && 'border-accent bg-accent-soft/40 ring-1 ring-accent',
        )}
      >
        <span className="w-10 shrink-0 text-xs font-semibold text-ink-2 tabular">{time}</span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-snug font-medium text-ink sm:line-clamp-1">{post.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={post.status} />
            <PillarBadge pillar={post.pillar} className="hidden sm:inline-flex" />
            <span className="sm:hidden">
              <PlatformStack platforms={post.platforms} size={16} />
            </span>
          </span>
        </span>
        <span className="hidden sm:inline-flex">
          <PlatformStack platforms={post.platforms} />
        </span>
      </button>
      {menuButton('top-1/2 right-2 size-7 -translate-y-1/2 opacity-100 text-ink-3 shadow-none ring-0 bg-transparent hover:bg-surface-2')}
    </div>
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
      {multi && !continued && !compact ? <span className="font-normal"> · bis {formatDe(o.end, 'd. MMM')}</span> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Monat
// ---------------------------------------------------------------------------

function MonthGrid({
  cursor,
  range,
  byDay,
  occ,
  onDropAt,
  onCreate,
  onMore,
}: {
  cursor: Date
  range: { start: Date; end: Date }
  byDay: Map<string, Post[]>
  occ: KeyDateOccurrence[]
  onDropAt: (e: DragEvent, day: Date, keepTime: boolean) => void
  onCreate: (day: Date) => void
  onMore: (day: Date, anchor: HTMLElement) => void
}) {
  const days = useMemo(() => eachDayOfInterval(range), [range])
  const [over, setOver] = useState<string | null>(null)
  const todayStart = startOfDay(new Date())
  return (
    <div role="group" aria-label={`Monatsansicht ${formatDe(cursor, 'MMMM yyyy')}`}>
      <div className="grid grid-cols-7 border-b border-line bg-surface-2/40" aria-hidden>
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
          <div key={d} className="px-2 py-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day)
          const dayPosts = byDay.get(key) ?? []
          const dayOcc = occurrencesOnDay(occ, day)
          const outside = !isSameMonth(day, cursor)
          const today = isToday(day)
          const past = day < todayStart
          const ribbons = dayOcc.filter((o) => isSameDay(o.start, day) || day.getDay() === 1).slice(0, 1)
          const max = ribbons.length ? 2 : 3
          const shown = dayPosts.length > max + 1 ? dayPosts.slice(0, max) : dayPosts.slice(0, max + 1)
          const hidden = dayPosts.length - shown.length
          return (
            <div
              key={key}
              role="group"
              aria-label={`${formatDe(day, 'EEEE, d. MMMM')}${dayPosts.length ? `, ${dayPosts.length} Posts` : ''}`}
              onDragEnter={(e) => {
                e.preventDefault()
                setOver(key)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (over !== key) setOver(key)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === key ? null : o))
              }}
              onDrop={(e) => {
                setOver(null)
                onDropAt(e, day, true)
              }}
              onDoubleClick={() => onCreate(day)}
              className={cn(
                'group relative min-h-[132px] min-w-0 border-r border-b border-line p-1.5 transition-colors [&:nth-child(7n)]:border-r-0',
                outside && 'bg-surface-2/40',
                past && !outside && 'bg-surface-2/20',
                over === key && 'bg-accent-soft/70 ring-2 ring-accent/50 ring-inset',
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular',
                    today ? 'bg-accent-solid text-on-accent' : outside ? 'font-medium text-ink-3' : 'text-ink-2',
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
                {ribbons.map((o) => (
                  <KeyDateRibbon key={o.keyDate.id} o={o} continued={!isSameDay(o.start, day)} />
                ))}
                {shown.map((p) => (
                  <PostChip key={p.id} post={p} />
                ))}
                {hidden > 0 ? (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`${hidden} weitere Posts am ${formatDe(day, 'd. MMMM')} anzeigen`}
                    onClick={(e) => onMore(day, e.currentTarget)}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="w-full rounded px-1.5 py-0.5 text-left text-[11px] font-semibold text-ink-3 hover:bg-surface-3 hover:text-ink"
                  >
                    + {hidden} weitere
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

function DayPopover({
  day,
  anchor,
  posts,
  occ,
  hidden,
  onClose,
  onCreate,
}: {
  day: Date
  anchor: HTMLElement
  posts: Post[]
  occ: KeyDateOccurrence[]
  hidden: boolean
  onClose: () => void
  onCreate: (day: Date) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-focus-id]')?.focus({ preventScroll: true })
  }, [])
  return (
    <Floating anchor={anchor} onClose={onClose} role="dialog" label={`Posts am ${formatDe(day, 'd. MMMM')}`} className={cn('w-72', hidden && 'invisible')}>
      <div ref={ref}>
        <div className="flex items-start justify-between gap-2 border-b border-line px-3.5 pt-3 pb-2.5">
          <div>
            <p className={cn('text-[11px] font-semibold tracking-wide uppercase', isToday(day) ? 'text-accent-text' : 'text-ink-3')}>{formatDe(day, 'EEEE')}</p>
            <p className="font-display text-lg leading-tight font-semibold text-ink">{formatDe(day, 'd. MMMM')}</p>
          </div>
          <span className="mt-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-3 tabular">{posts.length} Posts</span>
        </div>
        <div className="max-h-[min(50vh,360px)] space-y-1 overflow-y-auto p-2 scrollbar-thin">
          {occ.map((o) => (
            <KeyDateRibbon key={o.keyDate.id} o={o} continued={!isSameDay(o.start, day)} />
          ))}
          {posts.map((p) => (
            <PostChip key={p.id} post={p} />
          ))}
          {!posts.length ? <p className="px-1 py-3 text-center text-xs text-ink-3">Alles verschoben – der Tag ist frei.</p> : null}
        </div>
        <div className="border-t border-line p-1.5">
          <button
            type="button"
            onClick={() => onCreate(day)}
            className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-xs font-semibold text-accent-text hover:bg-accent-soft"
          >
            <Plus className="size-3.5" /> Neuer Post an diesem Tag
          </button>
        </div>
      </div>
    </Floating>
  )
}

// ---------------------------------------------------------------------------
// Woche
// ---------------------------------------------------------------------------

function snapMinutes(e: DragEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect()
  const y = e.clientY - rect.top - grab.y
  const m = Math.round(((y / HOUR_PX) * 60) / SNAP) * SNAP
  return Math.max(0, Math.min(24 * 60 - SNAP, m))
}

function WeekGrid({
  range,
  byDay,
  occ,
  dragPost,
  onDropAt,
  onCreate,
}: {
  range: { start: Date; end: Date }
  byDay: Map<string, Post[]>
  occ: KeyDateOccurrence[]
  dragPost: Post | null
  onDropAt: (e: DragEvent, target: Date, keepTime: boolean) => void
  onCreate: (day: Date, hour?: number) => void
}) {
  const days = useMemo(() => eachDayOfInterval(range), [range])
  const scroller = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => new Date())
  const [ghost, setGhost] = useState<{ key: string; min: number } | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Beim Öffnen auf ~07:00 springen – die Nacht ist selten Posting-Zeit
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = SCROLL_TO_HOUR * HOUR_PX - 8
  }, [])

  const nowTop = Math.round((now.getHours() + now.getMinutes() / 60) * HOUR_PX)

  return (
    <div ref={scroller} className="max-h-[min(72vh,780px)] overflow-auto overscroll-contain scrollbar-thin">
      <div className="min-w-[760px]">
        <div className="sticky top-0 z-30 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line bg-surface">
          <div className="bg-surface-2/40" />
          {days.map((d) => {
            const dayOcc = occurrencesOnDay(occ, d).filter((o) => isSameDay(o.start, d) || d.getDay() === 1)
            return (
              <div key={d.getTime()} className={cn('group border-l border-line px-2 py-2', isToday(d) ? 'bg-accent-soft/40' : 'bg-surface-2/40')}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={cn('text-[11px] font-semibold tracking-wide uppercase', isToday(d) ? 'text-accent-text' : 'text-ink-3')}>{formatDe(d, 'EEE')}</p>
                    <p className={cn('text-lg leading-tight font-semibold tabular', isToday(d) ? 'text-accent-text' : 'text-ink')}>{format(d, 'd')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCreate(d)}
                    className="rounded-md p-0.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-3 hover:text-ink focus:opacity-100 pointer-coarse:opacity-100"
                    aria-label={`Post am ${formatDe(d, 'd. MMMM')} planen`}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="mt-1 min-h-[18px] space-y-0.5">
                  {dayOcc.map((o) => (
                    <KeyDateRibbon key={o.keyDate.id} o={o} compact continued={!isSameDay(o.start, d)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
          <div aria-hidden>
            {HOURS.map((h) => (
              <div key={h} className="relative pr-2 text-right text-[10px] font-medium text-ink-3 tabular" style={{ height: HOUR_PX }}>
                {h > 0 ? <span className="relative -top-1.5">{String(h).padStart(2, '0')}:00</span> : null}
              </div>
            ))}
          </div>
          {days.map((d) => {
            const k = dayKey(d)
            const dayPosts = byDay.get(k) ?? []
            const byHour = new Map<number, Post[]>()
            for (const p of dayPosts) {
              const h = parseISO(p.scheduledAt).getHours()
              byHour.set(h, [...(byHour.get(h) ?? []), p])
            }
            const g = ghost && dragPost && ghost.key === k ? ghost.min : null
            return (
              <div
                key={k}
                className={cn('relative border-l border-line', isToday(d) && 'bg-accent-soft/25')}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  const min = snapMinutes(e)
                  setGhost((cur) => (cur && cur.key === k && cur.min === min ? cur : { key: k, min }))
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setGhost((cur) => (cur?.key === k ? null : cur))
                }}
                onDrop={(e) => {
                  const min = snapMinutes(e)
                  setGhost(null)
                  onDropAt(e, addMinutes(startOfDay(d), min), false)
                }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    onDoubleClick={() => onCreate(d, h)}
                    className={cn('border-b border-line/60', (h < SCROLL_TO_HOUR || h >= 22) && 'bg-surface-2/35')}
                    style={{ height: HOUR_PX }}
                    title={`${formatDe(d, 'EEE d. MMM')}, ${h}:00 – Doppelklick zum Planen`}
                  />
                ))}
                {dayPosts.map((p, i) => {
                  const t = parseISO(p.scheduledAt)
                  const top = (t.getHours() + t.getMinutes() / 60) * HOUR_PX
                  const slot = byHour.get(t.getHours()) ?? [p]
                  const idx = slot.indexOf(p)
                  const width = 100 / slot.length
                  return (
                    <div
                      key={p.id}
                      className={cn('absolute px-0.5', dragPost?.id === p.id && 'opacity-40')}
                      style={{ top: top + 2, left: `${idx * width}%`, width: `${width}%`, zIndex: 5 + i }}
                    >
                      <WeekCard post={p} />
                    </div>
                  )
                })}
                {g != null && dragPost ? (
                  <div className="pointer-events-none absolute inset-x-0 z-40" style={{ top: (g / 60) * HOUR_PX }} aria-hidden>
                    <div className="relative h-0.5 bg-accent">
                      <span className="absolute -top-2.5 left-1 rounded-md bg-accent-solid px-1.5 py-0.5 text-[10px] font-bold text-on-accent tabular shadow-soft">
                        {String(Math.floor(g / 60)).padStart(2, '0')}:{String(g % 60).padStart(2, '0')}
                      </span>
                    </div>
                    <div
                      className="mx-0.5 mt-0.5 rounded-lg border border-dashed border-accent bg-accent-soft/70 px-1.5 py-1 text-[11px] leading-tight font-semibold text-accent-text"
                      style={{ minHeight: HOUR_PX - 8 }}
                    >
                      <span className="line-clamp-2 pt-2">{dragPost.title}</span>
                    </div>
                  </div>
                ) : null}
                {isToday(d) ? (
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

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

function AgendaList({
  cursor,
  byDay,
  keyOcc,
  onCreate,
}: {
  cursor: Date
  byDay: Map<string, Post[]>
  keyOcc: KeyDateOccurrence[]
  onCreate: (day: Date) => void
}) {
  const days = useMemo(
    () =>
      eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) }).filter(
        (d) => (byDay.get(dayKey(d))?.length ?? 0) > 0 || occurrencesOnDay(keyOcc, d).some((o) => isSameDay(o.start, d)) || isToday(d),
      ),
    [cursor, byDay, keyOcc],
  )
  return (
    <ol className="divide-y divide-line">
      {days.map((d) => {
        const dayPosts = byDay.get(dayKey(d)) ?? []
        const dayOcc = occurrencesOnDay(keyOcc, d).filter((o) => isSameDay(o.start, d))
        return (
          <li key={d.getTime()} className={cn('flex gap-4 px-4 py-3 md:px-5', isToday(d) && 'bg-accent-soft/30')}>
            <div className="w-12 shrink-0 text-center">
              <p className={cn('text-[11px] font-semibold uppercase', isToday(d) ? 'text-accent-text' : 'text-ink-3')}>{formatDe(d, 'EEE')}</p>
              <p className={cn('font-display text-2xl leading-none font-semibold tabular', isToday(d) ? 'text-accent-text' : 'text-ink')}>{format(d, 'd')}</p>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {dayOcc.map((o) => (
                <KeyDateRibbon key={o.keyDate.id} o={o} />
              ))}
              {dayPosts.map((p) => (
                <ListRow key={p.id} post={p} />
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
