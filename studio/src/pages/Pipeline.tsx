import { addDays, differenceInCalendarDays, parseISO, setHours, setMinutes, startOfDay, subDays } from 'date-fns'
import {
  ArrowDownWideNarrow,
  CalendarClock,
  Check,
  Ellipsis,
  FoldHorizontal,
  GripVertical,
  Kanban,
  ListChecks,
  Megaphone,
  Plus,
  Rows2,
  Rows3,
  Search,
  Trash2,
  TriangleAlert,
  UsersRound,
  X,
} from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react'
import { MediaThumb, PillarBadge, PlatformIcon, PlatformStack } from '../components/domain'
import { Avatar, Button, Input, PageHeader, Segmented, Select, Toggle } from '../components/ui/primitives'
import { DEFAULT_CHECKLIST, PILLAR, PILLARS, PLATFORM, PLATFORMS, STATUS, STATUSES } from '../lib/constants'
import { toast, useStore, useUi } from '../lib/store'
import type { Pillar, Platform, Post, PostStatus, TeamMember } from '../lib/types'
import { cn, formatDe, uid } from '../lib/utils'
import { removePosts, setAssignee, setStatus } from '../features/planning/actions'
import type { Anchor } from '../features/planning/Floating'
import { PostMenu } from '../features/planning/PostMenu'
import { BarDivider, SelectionBar, ShortcutHelp } from '../features/planning/Selection'
import { affectedIds, isMultiClick, useSelection } from '../features/planning/useSelection'
import { focusPost, useLatest, useLocalState, withViewTransition } from '../features/planning/utils'

type Sort = 'date' | 'pillar' | 'platform'
type Density = 'comfortable' | 'compact'
type Lanes = 'none' | 'assignee'

/** Ab hier staut es sich – bewusst niedrig, damit Freigaben nicht liegen bleiben */
const WIP: Partial<Record<PostStatus, number>> = { draft: 8, review: 5 }
const COL_MIN = 176
const COL_COLLAPSED = 48
const GAP = 10
const UNASSIGNED = '__none__'
const STATUS_ORDER = STATUSES.map((s) => s.id)

const SHORTCUTS = [
  { keys: ['Alt', '←', '→'], label: 'Status zurück / weiter' },
  { keys: ['Alt', '↑', '↓'], label: 'Verantwortung (Swimlanes)' },
  { keys: ['↵'], label: 'Post öffnen' },
  { keys: ['X'], label: 'Karte auswählen' },
  { keys: ['⇧', 'Klick'], label: 'Mehrfachauswahl' },
  { keys: ['⇧', 'F10'], label: 'Aktionen-Menü' },
  { keys: ['Entf'], label: 'Löschen (mit Rückgängig)' },
  { keys: ['Esc'], label: 'Auswahl aufheben' },
]

function relative(iso: string) {
  const d = differenceInCalendarDays(parseISO(iso), new Date())
  if (d === 0) return 'heute'
  if (d === 1) return 'morgen'
  if (d === -1) return 'gestern'
  if (d > 1 && d < 7) return `in ${d} Tagen`
  if (d < 0 && d > -7) return `vor ${-d} Tagen`
  return formatDe(iso, 'd. MMM')
}

const pillarIdx = Object.fromEntries(PILLARS.map((p, i) => [p.id, i])) as Record<Pillar, number>
const platformIdx = Object.fromEntries(PLATFORMS.map((p, i) => [p.id, i])) as Record<Platform, number>

function comparator(sort: Sort) {
  return (a: Post, b: Post) => {
    if (sort === 'pillar') {
      const d = pillarIdx[a.pillar] - pillarIdx[b.pillar]
      if (d) return d
    } else if (sort === 'platform') {
      const d = (platformIdx[a.platforms[0]] ?? 99) - (platformIdx[b.platforms[0]] ?? 99)
      if (d) return d
    }
    return a.scheduledAt.localeCompare(b.scheduledAt)
  }
}

const laneOf = (p: Post) => p.assigneeId ?? UNASSIGNED

/** Kurzlabels für die Filter-Chips (voller Name im Tooltip) */
const PILLAR_SHORT: Record<Pillar, string> = {
  bohne: 'Bohne',
  roesten: 'Röstung',
  cafe: 'Café',
  bruehen: 'Brühen',
  brueder: 'Brüder & Team',
  events: 'Events',
  shop: 'Shop & Abo',
}

// ---------------------------------------------------------------------------
// Karten-Kontext
// ---------------------------------------------------------------------------

interface CardApi {
  density: Density
  selected: Set<string>
  team: TeamMember[]
  campaignNames: Map<string, string>
  draggingIds: Set<string>
  onOpen: (id: string) => void
  onMenu: (post: Post, anchor: Anchor, returnFocus: HTMLElement | null) => void
  onToggleSelect: (id: string) => void
  onKeyMove: (post: Post, key: string) => void
  onDelete: (id: string) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
}

const CardCtx = createContext<CardApi | null>(null)
const HINT_ID = 'pipe-card-hint'

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

export function PipelinePage() {
  const posts = useStore((s) => s.posts)
  const team = useStore((s) => s.team)
  const campaigns = useStore((s) => s.campaigns)
  const upsertPost = useStore((s) => s.upsertPost)
  const openPost = useUi((s) => s.openPost)

  const [q, setQ] = useState('')
  const [assignee, setAssigneeFilter] = useState<string | null>(null)
  const [pillarFilter, setPillarFilter] = useState<Pillar[]>([])
  const [platformFilter, setPlatformFilter] = useState<Platform[]>([])
  const [showOld, setShowOld] = useState(false)
  const [quick, setQuick] = useState('')
  const [sort, setSort] = useLocalState<Sort>('rb-studio:pipeline-sort', 'date')
  const [density, setDensity] = useLocalState<Density>('rb-studio:pipeline-density', 'comfortable')
  const [lanes, setLanes] = useLocalState<Lanes>('rb-studio:pipeline-lanes', 'none')
  const [collapsed, setCollapsed] = useLocalState<PostStatus[]>('rb-studio:pipeline-collapsed', [])
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<{ status: PostStatus; lane: string } | null>(null)
  const [menu, setMenu] = useState<{ post: Post; anchor: Anchor; returnFocus: HTMLElement | null } | null>(null)

  const campaignNames = useMemo(() => new Map(campaigns.map((c) => [c.id, c.name])), [campaigns])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    const cutoff = subDays(new Date(), 14)
    return posts
      .filter((p) => (showOld ? true : p.status !== 'published' || parseISO(p.scheduledAt) >= cutoff))
      .filter((p) => !assignee || p.assigneeId === assignee)
      .filter((p) => !pillarFilter.length || pillarFilter.includes(p.pillar))
      .filter((p) => !platformFilter.length || p.platforms.some((x) => platformFilter.includes(x)))
      .filter((p) => !term || `${p.title} ${p.caption} ${p.hashtags.join(' ')}`.toLowerCase().includes(term))
      .sort(comparator(sort))
  }, [posts, q, assignee, pillarFilter, platformFilter, showOld, sort])

  const validIds = useMemo(() => new Set(visible.map((p) => p.id)), [visible])
  const sel = useSelection(validIds)
  const selRef = useLatest(sel)

  const laneList = useMemo(() => {
    if (lanes === 'none') return [{ id: '*', label: '', member: null as TeamMember | null }]
    return [
      ...team.map((m) => ({ id: m.id, label: m.name, member: m as TeamMember | null })),
      { id: UNASSIGNED, label: 'Niemand zugewiesen', member: null },
    ].filter((l) => !assignee || l.id === assignee)
  }, [lanes, team, assignee])

  // Zelle (Status × Lane) → Posts, einmal gebaut
  const cells = useMemo(() => {
    const m = new Map<string, Post[]>()
    for (const p of visible) {
      const k = `${p.status}|${lanes === 'none' ? '*' : laneOf(p)}`
      const arr = m.get(k)
      if (arr) arr.push(p)
      else m.set(k, [p])
    }
    return m
  }, [visible, lanes])

  const columnCounts = useMemo(() => {
    const c = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<PostStatus, number>
    for (const p of visible) c[p.status]++
    return c
  }, [visible])

  const idsFor = useCallback((id: string) => affectedIds(selRef.current, id), [selRef])

  const expand = useCallback((s: PostStatus) => setCollapsed((c) => (c.includes(s) ? c.filter((x) => x !== s) : c)), [setCollapsed])

  const cardApi = useMemo<CardApi>(
    () => ({
      density,
      selected: sel.selected,
      team,
      campaignNames,
      draggingIds: new Set(dragId ? affectedIds(sel, dragId) : []),
      onOpen: (id) => openPost(id),
      onMenu: (post, anchor, returnFocus) => setMenu({ post, anchor, returnFocus }),
      onToggleSelect: sel.toggle,
      onDelete: (id) => removePosts(idsFor(id)),
      onDragStart: (id) => setDragId(id),
      onDragEnd: () => {
        setDragId(null)
        setOver(null)
      },
      onKeyMove: (post, key) => {
        const ids = idsFor(post.id)
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
          const i = STATUS_ORDER.indexOf(post.status) + (key === 'ArrowLeft' ? -1 : 1)
          const next = STATUS_ORDER[i]
          if (!next) return
          withViewTransition(
            ids,
            () => {
              expand(next)
              setStatus(ids, next, { coalesce: true })
            },
            () => focusPost(post.id),
          )
          return
        }
        if (lanes !== 'assignee') return
        const order = [...team.map((m) => m.id as string | null), null]
        const i = order.indexOf(post.assigneeId) + (key === 'ArrowUp' ? -1 : 1)
        if (i < 0 || i >= order.length) return
        withViewTransition(
          ids,
          () => setAssignee(ids, order[i]),
          () => focusPost(post.id),
        )
      },
    }),
    [density, sel, team, campaignNames, dragId, idsFor, openPost, expand, lanes],
  )

  const dragPost = dragId ? (posts.find((p) => p.id === dragId) ?? null) : null
  const dragCount = dragId ? affectedIds(sel, dragId).length : 0

  const dropInto = (e: DragEvent, status: PostStatus, lane: string) => {
    e.preventDefault()
    setOver(null)
    setDragId(null)
    const id = e.dataTransfer.getData('text/post-id')
    if (!id) return
    const ids = idsFor(id)
    const assigneeId = lanes === 'assignee' ? (lane === UNASSIGNED ? null : lane) : undefined
    withViewTransition(ids, () => setStatus(ids, status, { assigneeId }))
  }

  const addQuickIdea = () => {
    const title = quick.trim()
    if (!title) return
    const now = new Date().toISOString()
    const post: Post = {
      id: uid('post'),
      title,
      caption: '',
      platforms: platformFilter.length ? [platformFilter[0]] : ['instagram'],
      format: 'feed',
      status: 'idea',
      pillar: pillarFilter[0] ?? 'cafe',
      scheduledAt: setMinutes(setHours(addDays(startOfDay(new Date()), 7), 9), 0).toISOString(),
      location: 'online',
      assigneeId: assignee,
      hashtags: [],
      mediaTone: 'crema',
      campaignId: null,
      notes: '',
      checklist: DEFAULT_CHECKLIST.map((label) => ({ id: uid('chk'), label, done: false })),
      createdAt: now,
      updatedAt: now,
    }
    upsertPost(post)
    setQuick('')
    toast({ title: 'Idee angelegt', description: 'Vorläufig in 7 Tagen eingeplant – Termin im Editor anpassen.', action: { label: 'Öffnen', run: () => openPost(post.id) } })
  }

  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const activeFilters = pillarFilter.length + platformFilter.length + (assignee ? 1 : 0) + (q.trim() ? 1 : 0)
  const expandedCount = STATUSES.length - collapsed.length
  const minWidth = expandedCount * COL_MIN + collapsed.length * COL_COLLAPSED + (STATUSES.length - 1) * GAP
  const colStyle = (s: PostStatus): CSSProperties =>
    collapsed.includes(s) ? { width: COL_COLLAPSED, flex: 'none' } : { flex: '1 1 0', minWidth: COL_MIN }

  /** Wohin würde die gezogene Karte in dieser Zelle einsortiert? */
  const dropIndex = (items: Post[], status: PostStatus, lane: string) => {
    if (!dragPost || !over || over.status !== status || over.lane !== lane) return -1
    const sameCell = dragPost.status === status && (lanes === 'none' || laneOf(dragPost) === lane)
    if (sameCell) return -1
    const cmp = comparator(sort)
    const i = items.findIndex((p) => cmp(dragPost, p) < 0)
    return i === -1 ? items.length : i
  }

  const cellProps = (status: PostStatus, lane: string) => {
    const enter = (e: DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setOver((o) => (o && o.status === status && o.lane === lane ? o : { status, lane }))
    }
    return {
      onDragEnter: enter,
      onDragOver: enter,
      onDragLeave: (e: DragEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o && o.status === status && o.lane === lane ? null : o))
      },
      onDrop: (e: DragEvent) => dropInto(e, status, lane),
    }
  }

  const renderCell = (status: PostStatus, lane: string, opts: { emptyHint: boolean }) => {
    const items = cells.get(`${status}|${lane}`) ?? []
    const isCollapsed = collapsed.includes(status)
    const isOver = !!over && over.status === status && over.lane === lane && !!dragPost
    if (isCollapsed) {
      return (
        <button
          type="button"
          onClick={() => expand(status)}
          aria-label={`${STATUS[status].label} ausklappen (${items.length})`}
          className={cn(
            'flex min-h-16 w-full flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold text-ink-3 tabular transition-colors hover:bg-surface-3/60',
            isOver && 'bg-accent-soft ring-2 ring-accent/50',
          )}
          {...cellProps(status, lane)}
        >
          {items.length ? <span className="rounded-full bg-surface px-1.5">{items.length}</span> : null}
        </button>
      )
    }
    const at = dropIndex(items, status, lane)
    return (
      <ul
        className={cn('flex min-h-24 flex-1 flex-col gap-2 rounded-xl transition-colors', isOver && at >= 0 && 'bg-accent-soft/50')}
        aria-label={`${STATUS[status].label}${lane !== '*' ? ` – ${laneList.find((l) => l.id === lane)?.label ?? ''}` : ''}`}
        {...cellProps(status, lane)}
      >
        {items.map((p, i) => (
          <PipelineItem key={p.id} post={p} indicator={at === i ? dragCount : 0} />
        ))}
        {at === items.length ? <DropIndicator count={dragCount} /> : null}
        {!items.length && at < 0 && opts.emptyHint ? (
          <li className="rounded-xl border border-dashed border-line-strong/70 px-3 py-6 text-center text-[11px] text-ink-3">Hierher ziehen</li>
        ) : null}
      </ul>
    )
  }

  const quickForm = (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        addQuickIdea()
      }}
      className="mb-2 flex items-center gap-1 rounded-xl border border-dashed border-line-strong bg-surface/70 px-2 focus-within:border-accent"
    >
      <Plus className="size-3.5 shrink-0 text-ink-3" />
      <input
        value={quick}
        onChange={(e) => setQuick(e.target.value)}
        placeholder="Schnelle Idee + Enter"
        className="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-3"
        aria-label="Schnelle Idee"
      />
    </form>
  )

  return (
    <div>
      <PageHeader
        eyebrow="Social Media"
        title="Content-Pipeline"
        description="Vom Geistesblitz bis live: Ziehe Karten in die nächste Spalte – oder Alt + Pfeiltasten. Review heißt: Collin oder Vincent schauen drüber, bevor es rausgeht."
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Posts durchsuchen …" className="pl-9" aria-label="Posts durchsuchen" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs text-ink-3">Wer:</span>
            <button
              type="button"
              onClick={() => setAssigneeFilter(null)}
              aria-pressed={!assignee}
              className={cn('h-8 rounded-lg px-2.5 text-xs font-medium', !assignee ? 'bg-ink text-canvas' : 'text-ink-2 hover:bg-surface-2')}
            >
              Alle
            </button>
            {team.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setAssigneeFilter(assignee === m.id ? null : m.id)}
                className={cn('rounded-full ring-offset-2 ring-offset-canvas transition-shadow', assignee === m.id && 'ring-2 ring-accent')}
                aria-pressed={assignee === m.id}
                aria-label={`Nur ${m.name}`}
              >
                <Avatar name={m.name} color={m.color} initials={m.initials} size={28} />
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-2 md:ml-auto">
            <Toggle checked={showOld} onChange={setShowOld} label="Ältere Veröffentlichungen zeigen" />
            Ältere Veröffentlichungen
          </label>
        </div>

        {/* Filter-Chips: Säulen & Kanäle */}
        <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-thin md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0" role="group" aria-label="Nach Säule und Kanal filtern">
          {PILLARS.map((p) => {
            const on = pillarFilter.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPillarFilter((f) => toggleIn(f, p.id))}
                title={`${p.label} – ${p.description}`}
                aria-label={`Säule ${p.label}`}
                className={cn(
                  'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium whitespace-nowrap transition-colors',
                  on ? 'tint tint-border' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
                )}
                style={{ '--c': p.color } as CSSProperties}
              >
                <span className="size-2 rounded-full" style={{ background: p.color }} />
                {PILLAR_SHORT[p.id]}
                {on ? <X className="size-3" aria-hidden /> : null}
              </button>
            )
          })}
          <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />
          {PLATFORMS.map((p) => {
            const on = platformFilter.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                aria-label={`Kanal ${p.label}`}
                title={p.label}
                onClick={() => setPlatformFilter((f) => toggleIn(f, p.id))}
                className={cn(
                  'inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors',
                  on ? 'tint tint-border' : 'border-line bg-surface text-ink-3 hover:border-line-strong hover:text-ink',
                )}
                style={{ '--c': p.color } as CSSProperties}
              >
                <PlatformIcon platform={p.id} className="size-3.5" />
              </button>
            )
          })}
          {activeFilters ? (
            <button
              type="button"
              onClick={() => {
                setPillarFilter([])
                setPlatformFilter([])
                setAssigneeFilter(null)
                setQ('')
              }}
              className="ml-1 inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-accent-text hover:bg-accent-soft"
            >
              <X className="size-3" /> Alle Filter lösen
            </button>
          ) : null}
        </div>
      </PageHeader>

      {/* Ansichts-Optionen */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-xs text-ink-3">
          <span className="font-semibold text-ink tabular">{visible.length}</span> Posts
          {activeFilters ? ' (gefiltert)' : ''}
        </p>
        <Segmented
          size="sm"
          label="Swimlanes"
          value={lanes}
          onChange={setLanes}
          options={[
            { value: 'none', label: 'Ohne', icon: <Kanban className="size-3.5" /> },
            { value: 'assignee', label: 'Nach Person', icon: <UsersRound className="size-3.5" /> },
          ]}
        />
        <label className="relative flex items-center">
          <span className="sr-only">Sortieren nach</span>
          <ArrowDownWideNarrow className="pointer-events-none absolute left-2.5 size-3.5 text-ink-3" aria-hidden />
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-8 w-auto pl-8 text-xs" aria-label="Sortieren nach">
            <option value="date">Nach Datum</option>
            <option value="pillar">Nach Säule</option>
            <option value="platform">Nach Kanal</option>
          </Select>
        </label>
        <Segmented
          size="sm"
          label="Kartendichte"
          value={density}
          onChange={setDensity}
          options={[
            { value: 'comfortable', label: <span className="max-sm:sr-only">Bequem</span>, icon: <Rows2 className="size-3.5" /> },
            { value: 'compact', label: <span className="max-sm:sr-only">Kompakt</span>, icon: <Rows3 className="size-3.5" /> },
          ]}
        />
        <ShortcutHelp items={SHORTCUTS} className="hidden md:flex" />
      </div>

      <p id={HINT_ID} className="sr-only">
        Enter öffnet. Alt und Pfeiltasten links oder rechts ändern den Status. X wählt aus. Umschalt F10 öffnet das Aktionen-Menü.
      </p>

      <CardCtx.Provider value={cardApi}>
        <div className="-mx-4 overflow-x-auto px-4 pb-4 scrollbar-thin md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
          {lanes === 'none' ? (
            <div className="flex gap-2.5" style={{ minWidth }}>
              {STATUSES.map((s) => (
                <section
                  key={s.id}
                  aria-label={s.label}
                  style={colStyle(s.id)}
                  className={cn(
                    'flex flex-col rounded-2xl border border-transparent bg-surface-2/60 p-2 transition-colors',
                    over?.status === s.id && dragPost && dragPost.status !== s.id && 'border-accent/40',
                    (WIP[s.id] ?? Infinity) < columnCounts[s.id] && 'bg-warning-soft/40',
                  )}
                >
                  <ColumnHeader
                    status={s.id}
                    count={columnCounts[s.id]}
                    collapsed={collapsed.includes(s.id)}
                    onToggle={() => setCollapsed((c) => toggleIn(c, s.id))}
                  />
                  {s.id === 'idea' && !collapsed.includes(s.id) ? quickForm : null}
                  {renderCell(s.id, '*', { emptyHint: true })}
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-3" style={{ minWidth }}>
              <div className="flex items-start gap-2.5">
                {STATUSES.map((s) => (
                  <div
                    key={s.id}
                    style={colStyle(s.id)}
                    className={cn('rounded-2xl bg-surface-2/60 p-2', (WIP[s.id] ?? Infinity) < columnCounts[s.id] && 'bg-warning-soft/60')}
                  >
                    <ColumnHeader
                      status={s.id}
                      count={columnCounts[s.id]}
                      collapsed={collapsed.includes(s.id)}
                      onToggle={() => setCollapsed((c) => toggleIn(c, s.id))}
                      flush
                    />
                    {s.id === 'idea' && !collapsed.includes(s.id) ? <div className="mt-2 -mb-2">{quickForm}</div> : null}
                  </div>
                ))}
              </div>
              {laneList.map((lane) => {
                const n = STATUS_ORDER.reduce((acc, s) => acc + (cells.get(`${s}|${lane.id}`)?.length ?? 0), 0)
                return (
                  <section key={lane.id} aria-label={`Swimlane ${lane.label}`} className="rounded-2xl border border-line bg-surface/60 p-2">
                    <header className="sticky left-0 mb-2 flex w-max items-center gap-2 px-1.5 pt-0.5">
                      {lane.member ? (
                        <Avatar name={lane.member.name} color={lane.member.color} initials={lane.member.initials} size={22} />
                      ) : (
                        <span className="flex size-[22px] items-center justify-center rounded-full border border-dashed border-line-strong text-[10px] text-ink-3">?</span>
                      )}
                      <h2 className="text-[13px] font-semibold text-ink">{lane.label}</h2>
                      {lane.member ? <span className="text-[11px] text-ink-3">{lane.member.role}</span> : null}
                      <span className="rounded-full bg-surface-2 px-1.5 text-[11px] font-semibold text-ink-3 tabular">{n}</span>
                    </header>
                    <div className="flex gap-2.5">
                      {STATUSES.map((s) => (
                        <div
                          key={s.id}
                          style={colStyle(s.id)}
                          className={cn(
                            'flex rounded-xl bg-surface-2/50 p-1.5 transition-colors',
                            over?.status === s.id && over.lane === lane.id && dragPost && 'bg-accent-soft/40',
                          )}
                        >
                          {renderCell(s.id, lane.id, { emptyHint: false })}
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>

        {menu ? (
          <PostMenu
            post={posts.find((p) => p.id === menu.post.id) ?? menu.post}
            anchor={menu.anchor}
            returnFocus={menu.returnFocus}
            onClose={() => setMenu(null)}
            selected={sel.selected.has(menu.post.id)}
            onToggleSelect={() => sel.toggle(menu.post.id)}
            onMoved={() => focusPost(menu.post.id)}
          />
        ) : null}
      </CardCtx.Provider>

      <SelectionBar count={sel.selected.size} onClear={sel.clear}>
        <Select
          aria-label="Status setzen"
          className="h-8 w-auto text-xs"
          value=""
          onChange={(e) => {
            const v = e.target.value as PostStatus
            if (v) withViewTransition(sel.ids, () => setStatus(sel.ids, v))
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
        <Select
          aria-label="Verantwortlich setzen"
          className="h-8 w-auto text-xs"
          value=""
          onChange={(e) => {
            const v = e.target.value
            if (v) withViewTransition(sel.ids, () => setAssignee(sel.ids, v === UNASSIGNED ? null : v))
          }}
        >
          <option value="" disabled>
            Verantwortlich …
          </option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
          <option value={UNASSIGNED}>Niemand</option>
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

// ---------------------------------------------------------------------------
// Spaltenkopf
// ---------------------------------------------------------------------------

function ColumnHeader({ status, count, collapsed, onToggle, flush }: { status: PostStatus; count: number; collapsed: boolean; onToggle: () => void; flush?: boolean }) {
  const s = STATUS[status]
  const limit = WIP[status]
  const jam = limit != null && count > limit
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        aria-label={`Spalte ${s.label} ausklappen – ${count} Posts`}
        title={`${s.label} ausklappen`}
        className="flex w-full flex-col items-center gap-2 rounded-lg py-1.5 text-ink-2 hover:bg-surface-3/60 hover:text-ink"
      >
        <span className="size-2 rounded-full" style={{ background: s.color }} />
        <span className={cn('rounded-full px-1.5 text-[11px] font-semibold tabular', jam ? 'bg-warning-soft text-warning' : 'bg-surface text-ink-3')}>{count}</span>
        <span className="text-[12px] font-semibold [writing-mode:vertical-rl]">{s.label}</span>
      </button>
    )
  }
  return (
    <header className={cn('group/col relative px-1.5 pt-1', flush ? 'pb-0.5' : 'pb-2.5')} title={s.hint}>
      <div className="flex items-center gap-1.5">
        <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
        <h2 className="min-w-0 truncate text-[13px] font-semibold text-ink">{s.label}</h2>
        <span
          className={cn('shrink-0 rounded-full px-1.5 text-[11px] font-semibold tabular', jam ? 'bg-warning-soft text-warning' : 'bg-surface text-ink-3')}
          aria-label={limit != null ? `${count} von empfohlen maximal ${limit}` : `${count} Posts`}
        >
          {count}
          {limit != null ? <span className="font-medium">/{limit}</span> : null}
        </span>
      </div>
      {jam ? (
        <p
          className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning"
          title={`Mehr als ${limit} Posts – hier staut es sich. Erst abarbeiten, dann Neues anfangen.`}
        >
          <TriangleAlert className="size-3" aria-hidden /> Staut sich
        </p>
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded
        aria-label={`Spalte ${s.label} einklappen`}
        title="Spalte einklappen"
        className="absolute top-0.5 right-0 flex size-6 items-center justify-center rounded-md bg-surface-2 text-ink-3 opacity-0 shadow-soft ring-1 ring-line transition-opacity group-hover/col:opacity-100 hover:text-ink focus-visible:opacity-100 pointer-coarse:opacity-100"
      >
        <FoldHorizontal className="size-3.5" />
      </button>
    </header>
  )
}

function DropIndicator({ count }: { count: number }) {
  return (
    <li className="relative flex h-1.5 items-center" aria-hidden>
      <span className="absolute -left-1 size-2 rounded-full border-2 border-accent bg-surface" />
      <span className="h-0.5 flex-1 rounded-full bg-accent" />
      {count > 1 ? <span className="absolute right-0 -top-2 rounded-full bg-accent-solid px-1.5 text-[10px] font-bold text-on-accent tabular">{count}</span> : null}
    </li>
  )
}

// ---------------------------------------------------------------------------
// Karte
// ---------------------------------------------------------------------------

function PipelineItem({ post, indicator }: { post: Post; indicator: number }) {
  return (
    <>
      {indicator ? <DropIndicator count={indicator} /> : null}
      <li>
        <KanbanCard post={post} />
      </li>
    </>
  )
}

function KanbanCard({ post }: { post: Post }) {
  const api = useContext(CardCtx) as CardApi
  const selected = api.selected.has(post.id)
  const dragging = api.draggingIds.has(post.id)
  const member = api.team.find((m) => m.id === post.assigneeId)
  const campaignName = post.campaignId ? api.campaignNames.get(post.campaignId) : undefined
  const done = post.checklist.filter((c) => c.done).length
  const total = post.checklist.length
  const days = differenceInCalendarDays(parseISO(post.scheduledAt), new Date())
  const urgent = post.status !== 'published' && post.status !== 'scheduled' && days >= 0 && days <= 2
  const compact = api.density === 'compact'
  const label = `${post.title}, ${STATUS[post.status].label}, ${relative(post.scheduledAt)}, ${PILLAR[post.pillar].label}, ${post.platforms.map((p) => PLATFORM[p].label).join(', ')}${member ? `, ${member.name}` : ''}${selected ? ', ausgewählt' : ''}`

  const meta: ReactNode = (
    <div className="flex items-center gap-1.5 text-[11px] whitespace-nowrap text-ink-3">
      <span className={cn('flex min-w-0 items-center gap-1 overflow-hidden', urgent && 'font-semibold text-danger')}>
        <CalendarClock className="size-3 shrink-0" aria-hidden />
        {relative(post.scheduledAt)}
      </span>
      {campaignName ? <Megaphone className="size-3 shrink-0 text-accent-text" aria-label={`Kampagne: ${campaignName}`} /> : null}
      <span className="ml-auto flex items-center gap-1 tabular" title="Checkliste">
        <ListChecks className="size-3 shrink-0" aria-hidden />
        <span className={cn(done === total && total > 0 && 'text-success')}>
          {done}/{total}
        </span>
      </span>
      {member ? <Avatar name={member.name} color={member.color} initials={member.initials} size={18} /> : null}
    </div>
  )

  return (
    <div data-vt-id={post.id} className={cn('group/card relative transition-opacity', dragging && 'opacity-40')}>
      <div
        role="button"
        tabIndex={0}
        data-focus-id={post.id}
        aria-label={label}
        aria-describedby={HINT_ID}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/post-id', post.id)
          e.dataTransfer.effectAllowed = 'move'
          api.onDragStart(post.id)
        }}
        onDragEnd={api.onDragEnd}
        onClick={(e) => {
          if (isMultiClick(e)) {
            e.preventDefault()
            api.onToggleSelect(post.id)
            return
          }
          api.onOpen(post.id)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          api.onMenu(post, { x: e.clientX, y: e.clientY }, e.currentTarget)
        }}
        onKeyDown={(e) => {
          if (e.altKey && e.key.startsWith('Arrow')) {
            e.preventDefault()
            api.onKeyMove(post, e.key)
            return
          }
          if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
            e.preventDefault()
            api.onMenu(post, e.currentTarget, e.currentTarget)
            return
          }
          if (e.metaKey || e.ctrlKey || e.altKey) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            api.onOpen(post.id)
          } else if (e.key === 'x' || e.key === 'X') {
            e.preventDefault()
            api.onToggleSelect(post.id)
          } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault()
            api.onDelete(post.id)
          }
        }}
        className={cn(
          'relative cursor-grab overflow-hidden rounded-xl border border-line bg-surface shadow-soft transition-[transform,box-shadow,border-color] select-none hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift active:cursor-grabbing',
          selected && 'border-accent ring-2 ring-accent',
        )}
      >
        {compact ? (
          <div className="flex gap-2 p-2 pl-2.5">
            <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full" style={{ background: PILLAR[post.pillar].color }} aria-hidden />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-start gap-1.5 pr-5">
                <p className="line-clamp-2 flex-1 text-[12px] leading-snug font-semibold text-ink">{post.title}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <PlatformStack platforms={post.platforms} size={16} />
                <span className="truncate text-[10px] font-medium text-ink-3">{PILLAR[post.pillar].label}</span>
              </div>
              {meta}
            </div>
          </div>
        ) : (
          <>
            <MediaThumb url={post.mediaUrl} tone={post.mediaTone} className="h-16 w-full">
              <div className="absolute inset-x-2 bottom-2 flex items-end justify-between">
                <PlatformStack platforms={post.platforms} size={18} />
                {post.metrics ? (
                  <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular">
                    {post.metrics.reach.toLocaleString('de-DE')} erreicht
                  </span>
                ) : null}
              </div>
            </MediaThumb>
            <div className="space-y-2 p-2.5">
              <p className="line-clamp-2 text-[13px] leading-snug font-semibold text-ink">{post.title}</p>
              <PillarBadge pillar={post.pillar} />
              {meta}
              <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${total ? (done / total) * 100 : 0}%`, background: 'var(--c)', '--c': STATUS[post.status].color } as CSSProperties}
                />
              </div>
            </div>
          </>
        )}
        {selected ? (
          <span className="absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-accent-solid text-on-accent shadow-soft" aria-hidden>
            <Check className="size-3" strokeWidth={3} />
          </span>
        ) : (
          <span
            className={cn(
              'pointer-events-none absolute top-1.5 left-1 flex h-6 w-4 items-center justify-center rounded opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100',
              compact ? 'hidden' : 'bg-black/35 text-white',
            )}
            aria-hidden
          >
            <GripVertical className="size-3.5" />
          </span>
        )}
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-haspopup="menu"
        aria-label={`Aktionen für ${post.title}`}
        onClick={(e) => {
          e.stopPropagation()
          const card = e.currentTarget.parentElement?.querySelector<HTMLElement>('[data-focus-id]') ?? null
          api.onMenu(post, e.currentTarget, card)
        }}
        className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md bg-surface/95 text-ink-2 opacity-0 shadow-soft ring-1 ring-line transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100 hover:text-ink focus-visible:opacity-100 pointer-coarse:opacity-100"
      >
        <Ellipsis className="size-3.5" />
      </button>
    </div>
  )
}
