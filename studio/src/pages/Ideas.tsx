import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns'
import {
  ArrowBigUp,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Lightbulb,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router'
import { PillarBadge, PlatformChip, PlatformStack } from '../components/domain'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Segmented,
  Select,
  Textarea,
  Tint,
  Toggle,
} from '../components/ui/primitives'
import { FORMATS, KEYDATE_KINDS, PILLAR, PILLARS, PLATFORMS, WEEKDAYS_SHORT } from '../lib/constants'
import { occurrenceInYear, occurrencesBetween } from '../lib/keydates'
import { toast, useStore, useUi } from '../lib/store'
import type { Idea, KeyDate, KeyDateKind, KeyDateOccurrence, Pillar, Platform, Post, PostFormat } from '../lib/types'
import { cn, formatDe, uid } from '../lib/utils'

// ---------------------------------------------------------------------------
// Konstanten & Helfer
// ---------------------------------------------------------------------------

type Effort = Idea['effort']
type SortKey = 'votes' | 'new' | 'effort'

const EFFORTS: { id: Effort; label: string; level: number; hint: string }[] = [
  { id: 'S', label: 'Schnell', level: 1, hint: 'in unter einer Stunde erledigt' },
  { id: 'M', label: 'Mittel', level: 2, hint: 'etwa ein halber Tag' },
  { id: 'L', label: 'Aufwendig', level: 3, hint: 'Planung, Dreh & Schnitt' },
]
const EFFORT = Object.fromEntries(EFFORTS.map((e) => [e.id, e])) as Record<Effort, (typeof EFFORTS)[number]>
const EFFORT_RANK: Record<Effort, number> = { S: 0, M: 1, L: 2 }

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'votes', label: 'Beliebt' },
  { value: 'new', label: 'Neu' },
  { value: 'effort', label: 'Aufwand' },
]

/** Saison-Fokus je Kalendermonat (Jan = 0) */
const SEASON_FOCUS = [
  'Neue Routinen & Brüh-Wissen',
  'Valentinstag & Workshops für zwei',
  'Jubiläum & Frühlingskaffees',
  'Ostern & Terrassen-Start',
  'Neue Ernte, Muttertag, Terrasse',
  'Terrasse & Cold Brew',
  'Terrasse & Cold Brew, Sommergäste',
  'Terrasse & Cold Brew, Kunstfest',
  'Herbstkaffees & Abo-Start',
  'Tag des Kaffees, Zwiebelmarkt, Semesterstart',
  'Geschenke & Abo, Fair Friday',
  'Geschenke & Abo, Weihnachtsmarkt',
]

const isCustomKeyDate = (kd: KeyDate) => !kd.id.startsWith('kd-')

/** Nächstes (oder laufendes) Vorkommen eines Anlasses ab heute */
function nextOccurrence(kd: KeyDate, today: Date): KeyDateOccurrence {
  const current = occurrenceInYear(kd, today.getFullYear())
  return current.end >= startOfDay(today) ? current : occurrenceInYear(kd, today.getFullYear() + 1)
}

/** Termin um 9:00 am Anlass – liegt der schon hinter uns, der nächstmögliche 9-Uhr-Slot */
function planSlot(start: Date, now = new Date()) {
  let slot = setMinutes(setHours(startOfDay(start), 9), 0)
  if (slot < now) {
    slot = setMinutes(setHours(startOfDay(now), 9), 0)
    if (slot < now) slot = addDays(slot, 1)
  }
  return slot.toISOString()
}

function occurrenceDays(o: KeyDateOccurrence) {
  return differenceInCalendarDays(o.end, o.start) + 1
}

function countdown(o: KeyDateOccurrence, today: Date) {
  const d = differenceInCalendarDays(o.start, today)
  if (d > 1) return `in ${d} Tagen`
  if (d === 1) return 'morgen'
  if (d === 0) return 'heute'
  const left = differenceInCalendarDays(o.end, today)
  return left <= 0 ? 'endet heute' : `läuft · noch ${left + 1} Tage`
}

function mdLabel(md: string) {
  const [m, d] = md.split('-')
  return `${Number(d)}.${Number(m)}.`
}

function openIdeaAsPost(idea: Idea, kd: KeyDate | undefined, today: Date) {
  const occ = kd ? nextOccurrence(kd, today) : undefined
  useUi.getState().openPost(null, {
    title: idea.title,
    caption: idea.description,
    pillar: idea.pillar,
    platforms: idea.platforms,
    format: idea.format,
    status: 'draft',
    fromIdeaId: idea.id,
    ...(kd && occ ? { scheduledAt: planSlot(occ.start), notes: `Anlass: ${kd.title} – ${kd.angle}` } : {}),
  })
}

// ---------------------------------------------------------------------------
// Entwürfe für die Formulare
// ---------------------------------------------------------------------------

interface IdeaDraft {
  id: string | null
  title: string
  description: string
  pillar: Pillar
  platforms: Platform[]
  format: PostFormat
  effort: Effort
  keyDateId: string | null
  votes: number
  createdAt: string | null
}

function ideaDraft(preset: Partial<IdeaDraft> = {}): IdeaDraft {
  return {
    id: null,
    title: '',
    description: '',
    pillar: 'bohne',
    platforms: ['instagram'],
    format: 'reel',
    effort: 'M',
    keyDateId: null,
    votes: 0,
    createdAt: null,
    ...preset,
  }
}

function ideaDraftFrom(i: Idea): IdeaDraft {
  return {
    id: i.id,
    title: i.title,
    description: i.description,
    pillar: i.pillar,
    platforms: i.platforms,
    format: i.format,
    effort: i.effort,
    keyDateId: i.keyDateId ?? null,
    votes: i.votes,
    createdAt: i.createdAt,
  }
}

interface KeyDateDraft {
  id: string | null
  title: string
  kind: KeyDateKind
  /** yyyy-MM-dd – nur Monat & Tag werden gespeichert */
  date: string
  days: number
  angle: string
  verify: boolean
}

function keyDateDraft(today: Date, kd?: KeyDate): KeyDateDraft {
  if (!kd) return { id: null, title: '', kind: 'weimar', date: format(addDays(today, 14), 'yyyy-MM-dd'), days: 1, angle: '', verify: false }
  const occ = nextOccurrence(kd, today)
  return {
    id: kd.id,
    title: kd.title,
    kind: kd.kind,
    date: format(occ.start, 'yyyy-MM-dd'),
    days: occurrenceDays(occ),
    angle: kd.angle,
    verify: Boolean(kd.verify),
  }
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

export function IdeasPage() {
  const ideas = useStore((s) => s.ideas)
  const posts = useStore((s) => s.posts)
  const keyDates = useStore((s) => s.keyDates)
  const [params, setParams] = useSearchParams()
  const [ideaForm, setIdeaForm] = useState<IdeaDraft | null>(null)
  const [kdForm, setKdForm] = useState<KeyDateDraft | null>(null)
  const today = useMemo(() => startOfDay(new Date()), [])

  // ?neu=1 (z. B. aus der Befehlspalette) öffnet direkt das Formular –
  // Zustand wird beim Rendern angepasst, der Effekt räumt nur die URL auf.
  const wantsNew = params.get('neu') === '1'
  const [handledNew, setHandledNew] = useState(false)
  if (wantsNew !== handledNew) {
    setHandledNew(wantsNew)
    if (wantsNew) setIdeaForm(ideaDraft())
  }
  useEffect(() => {
    if (!wantsNew) return
    const next = new URLSearchParams(params)
    next.delete('neu')
    setParams(next, { replace: true })
  }, [wantsNew, params, setParams])

  const ideaForKeyDate = (kd: KeyDate) => setIdeaForm(ideaDraft({ keyDateId: kd.id, title: `${kd.title}: `, description: kd.angle }))

  return (
    <>
      <PageHeader
        eyebrow="Social Media"
        title="Ideen & Jahresplan"
        description="Sammle Ideen, stimmt gemeinsam ab und plane rechtzeitig rund um die Anlässe, die Weimar und die Kaffeewelt bewegen."
        actions={
          <>
            <Button variant="secondary" onClick={() => setKdForm(keyDateDraft(today))}>
              <CalendarPlus className="size-4" /> Anlass hinzufügen
            </Button>
            <Button variant="primary" onClick={() => setIdeaForm(ideaDraft())}>
              <Plus className="size-4" /> Idee festhalten
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <PillarMixCard posts={posts} today={today} onIdea={(pillar) => setIdeaForm(ideaDraft({ pillar }))} />
          <Backlog
            ideas={ideas}
            keyDates={keyDates}
            today={today}
            onNew={() => setIdeaForm(ideaDraft())}
            onEdit={(i) => setIdeaForm(ideaDraftFrom(i))}
          />
        </div>
        <KeyDateTimeline keyDates={keyDates} posts={posts} today={today} onIdea={ideaForKeyDate} />
      </div>

      <YearPlan
        keyDates={keyDates}
        posts={posts}
        today={today}
        onIdea={ideaForKeyDate}
        onAdd={() => setKdForm(keyDateDraft(today))}
        onEdit={(kd) => setKdForm(keyDateDraft(today, kd))}
      />

      {ideaForm ? <IdeaFormModal initial={ideaForm} keyDates={keyDates} today={today} onClose={() => setIdeaForm(null)} /> : null}
      {kdForm ? <KeyDateFormModal initial={kdForm} onClose={() => setKdForm(null)} /> : null}
    </>
  )
}

// ---------------------------------------------------------------------------
// Content-Säulen: Ziel-Mix vs. Ist-Mix
// ---------------------------------------------------------------------------

function PillarMixCard({ posts, today, onIdea }: { posts: Post[]; today: Date; onIdea: (p: Pillar) => void }) {
  const mix = useMemo(() => {
    const from = subDays(today, 30).getTime()
    const to = endOfDay(addDays(today, 30)).getTime()
    const inWindow = posts.filter((p) => {
      const t = new Date(p.scheduledAt).getTime()
      return t >= from && t <= to
    })
    const total = inWindow.length
    const rows = PILLARS.map((p) => {
      const count = inWindow.filter((x) => x.pillar === p.id).length
      const actual = total ? (count / total) * 100 : 0
      return { ...p, count, actual, gap: actual - p.share }
    })
    const scale = Math.max(1, ...rows.map((r) => Math.max(r.actual, r.share))) * 1.1
    return { total, rows, scale }
  }, [posts, today])

  const under = mix.total ? mix.rows.filter((r) => r.gap <= -5) : []
  const over = mix.total ? mix.rows.filter((r) => r.gap >= 8) : []

  return (
    <Card>
      <CardHeader
        icon={<Target className="size-4" />}
        title="Content-Säulen"
        subtitle={
          mix.total
            ? `Ist-Anteil aus ${mix.total} Posts (letzte & nächste 30 Tage) gegen euren Ziel-Mix`
            : 'Noch keine Posts in den letzten & nächsten 30 Tagen'
        }
        action={
          <div className="hidden items-center gap-3 text-[11px] text-ink-3 sm:flex" aria-hidden>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-accent" /> Ist
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 rounded-full bg-ink/70" /> Ziel
            </span>
          </div>
        }
      />
      <ul className="grid gap-x-8 gap-y-4 px-5 pb-5 sm:grid-cols-2">
        {mix.rows.map((r) => {
          const isUnder = mix.total > 0 && r.gap <= -5
          return (
            <li key={r.id}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 text-ink-2" title={r.description}>
                  <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="truncate">{r.label}</span>
                </span>
                <span className="shrink-0 tabular">
                  <span className="font-semibold text-ink">{Math.round(r.actual)} %</span>
                  <span className="text-ink-3"> / Ziel {r.share} %</span>
                </span>
              </div>
              <div
                className="relative mt-1.5 h-2 rounded-full bg-surface-2"
                role="img"
                aria-label={`${r.label}: ${Math.round(r.actual)} % Ist-Anteil, Ziel ${r.share} %`}
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${(r.actual / mix.scale) * 100}%` }}
                />
                <div
                  className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink/70"
                  style={{ left: `calc(${(r.share / mix.scale) * 100}% - 1px)` }}
                  title={`Ziel ${r.share} %`}
                />
              </div>
              {isUnder ? (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-warning">
                    <CircleAlert className="size-3.5" aria-hidden /> Hier fehlt Content
                  </span>
                  <button
                    type="button"
                    onClick={() => onIdea(r.id)}
                    className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-accent-text hover:bg-accent-soft"
                  >
                    + Idee
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      {mix.total ? (
        <div className="flex items-start gap-2 border-t border-line px-5 py-3 text-xs text-ink-2">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
          <p>
            {under.length ? (
              <>
                Mehr <strong className="font-semibold text-ink">{under.map((u) => u.label).join(', ')}</strong> einplanen
                {over.length ? (
                  <>
                    {' '}
                    – dafür darf <strong className="font-semibold text-ink">{over.map((o) => o.label).join(', ')}</strong> etwas
                    Pause machen.
                  </>
                ) : (
                  '.'
                )}
              </>
            ) : (
              'Euer Mix ist nah am Ziel – weiter so.'
            )}
          </p>
        </div>
      ) : null}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Ideen-Backlog
// ---------------------------------------------------------------------------

function Backlog({
  ideas,
  keyDates,
  today,
  onNew,
  onEdit,
}: {
  ideas: Idea[]
  keyDates: KeyDate[]
  today: Date
  onNew: () => void
  onEdit: (i: Idea) => void
}) {
  const [pillar, setPillar] = useState<Pillar | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('votes')
  const [query, setQuery] = useState('')
  const voteIdea = useStore((s) => s.voteIdea)
  const deleteIdea = useStore((s) => s.deleteIdea)

  const kdById = useMemo(() => new Map(keyDates.map((k) => [k.id, k])), [keyDates])
  const counts = useMemo(() => {
    const c: Partial<Record<Pillar, number>> = {}
    for (const i of ideas) c[i.pillar] = (c[i.pillar] ?? 0) + 1
    return c
  }, [ideas])
  const topVotes = useMemo(() => Math.max(1, ...ideas.map((i) => i.votes)), [ideas])

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = ideas.filter(
      (i) =>
        (pillar === 'all' || i.pillar === pillar) &&
        (!needle || `${i.title} ${i.description} ${PILLAR[i.pillar].label}`.toLowerCase().includes(needle)),
    )
    return [...filtered].sort((a, b) => {
      if (sort === 'votes') return b.votes - a.votes || b.createdAt.localeCompare(a.createdAt)
      if (sort === 'new') return b.createdAt.localeCompare(a.createdAt)
      return EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort] || b.votes - a.votes
    })
  }, [ideas, pillar, sort, query])

  const remove = (idea: Idea) => {
    deleteIdea(idea.id)
    toast({
      title: 'Idee gelöscht',
      description: idea.title,
      action: { label: 'Rückgängig', run: () => useStore.getState().upsertIdea(idea) },
    })
  }

  return (
    <section aria-labelledby="backlog-heading" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="backlog-heading" className="font-display text-xl font-semibold text-ink">
            Ideen-Backlog
          </h2>
          <p className="mt-0.5 text-xs text-ink-3">
            {ideas.length} {ideas.length === 1 ? 'Idee' : 'Ideen'} · stimmt ab, was als Nächstes umgesetzt wird
          </p>
        </div>
        <Segmented size="sm" value={sort} onChange={setSort} options={SORTS} label="Sortierung" />
      </div>

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ideen durchsuchen …"
            aria-label="Ideen durchsuchen"
            className="pr-9 pl-9"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink"
              aria-label="Suche leeren"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Nach Content-Säule filtern">
          <FilterChip active={pillar === 'all'} onClick={() => setPillar('all')} label="Alle" count={ideas.length} />
          {PILLARS.map((p) => (
            <FilterChip
              key={p.id}
              active={pillar === p.id}
              onClick={() => setPillar(pillar === p.id ? 'all' : p.id)}
              label={p.label}
              count={counts[p.id] ?? 0}
              color={p.color}
            />
          ))}
        </div>
      </div>

      {list.length ? (
        <ul className="grid gap-3 xl:grid-cols-2">
          {list.map((idea) => {
            const kd = idea.keyDateId ? kdById.get(idea.keyDateId) : undefined
            return (
              <li key={idea.id} className="min-w-0">
                <IdeaCard
                  idea={idea}
                  keyDate={kd}
                  today={today}
                  leading={idea.votes > 0 && idea.votes >= topVotes}
                  onVote={(d) => voteIdea(idea.id, d)}
                  onConvert={() => openIdeaAsPost(idea, kd, today)}
                  onEdit={() => onEdit(idea)}
                  onDelete={() => remove(idea)}
                />
              </li>
            )
          })}
        </ul>
      ) : ideas.length ? (
        <EmptyState
          icon={<Search className="size-5" />}
          title="Keine passende Idee"
          description="Probier einen anderen Suchbegriff oder eine andere Säule."
          action={
            <Button
              size="sm"
              onClick={() => {
                setQuery('')
                setPillar('all')
              }}
            >
              Filter zurücksetzen
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={<Lightbulb className="size-5" />}
          title="Der Ideenspeicher ist leer"
          description="Halte jeden Gedanken fest – auch halbe. Aus drei halben Ideen wird oft ein richtig guter Post."
          action={
            <Button variant="primary" size="sm" onClick={onNew}>
              <Plus className="size-4" /> Erste Idee festhalten
            </Button>
          }
        />
      )}
    </section>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  color?: string
}) {
  const c = color ?? 'var(--accent)'
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{ '--c': c } as CSSProperties}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
        active ? 'tint tint-border' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
      )}
    >
      {color ? <span className="size-2 rounded-full" style={{ background: color }} aria-hidden /> : null}
      {label}
      <span className={cn('tabular', active ? 'font-semibold' : 'text-ink-3')}>{count}</span>
    </button>
  )
}

function EffortBadge({ effort }: { effort: Effort }) {
  const e = EFFORT[effort]
  return (
    <span
      title={`Aufwand: ${e.label} – ${e.hint}`}
      className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap text-ink-2"
    >
      <span className="flex items-end gap-px" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn('w-[3px] rounded-[1px]', n <= e.level ? 'bg-ink-2' : 'bg-line-strong')} style={{ height: 3 + n * 2 }} />
        ))}
      </span>
      {effort} · {e.label}
    </span>
  )
}

function IdeaCard({
  idea,
  keyDate,
  today,
  leading,
  onVote,
  onConvert,
  onEdit,
  onDelete,
}: {
  idea: Idea
  keyDate?: KeyDate
  today: Date
  leading: boolean
  onVote: (delta: number) => void
  onConvert: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const occ = keyDate ? nextOccurrence(keyDate, today) : undefined
  return (
    <article className="group flex h-full gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-lift">
      <div
        className={cn(
          'flex w-11 shrink-0 flex-col items-center self-start rounded-xl border py-1',
          leading ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-surface-2/60 text-ink',
        )}
      >
        <button
          type="button"
          onClick={() => onVote(1)}
          className="rounded-md p-1 text-current opacity-70 transition hover:bg-surface hover:opacity-100 active:scale-90"
          aria-label={`Für „${idea.title}“ stimmen`}
          title="Dafür stimmen"
        >
          <ArrowBigUp className="size-5" />
        </button>
        <span className="text-sm leading-5 font-semibold tabular" aria-label={`${idea.votes} Stimmen`}>
          {idea.votes}
        </span>
        <button
          type="button"
          onClick={() => onVote(-1)}
          disabled={idea.votes === 0}
          className="rounded-md p-0.5 text-current opacity-50 transition hover:bg-surface hover:opacity-100 disabled:opacity-20"
          aria-label={`Stimme für „${idea.title}“ zurücknehmen`}
          title="Stimme zurücknehmen"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          <PillarBadge pillar={idea.pillar} />
          <EffortBadge effort={idea.effort} />
        </div>
        <h3 className="mt-2 text-[15px] leading-snug font-semibold text-ink">{idea.title}</h3>
        {idea.description ? <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink-2">{idea.description}</p> : null}
        {keyDate && occ ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-3">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              Anlass: <span className="font-medium text-ink-2">{keyDate.title}</span> · {countdown(occ, today)}
            </span>
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <span className="flex min-w-0 items-center gap-2 text-[11px] text-ink-3">
            <PlatformStack platforms={idea.platforms} />
            <span className="truncate">{FORMATS[idea.format].label}</span>
          </span>
          <span className="flex items-center gap-0.5">
            <Button size="sm" variant="secondary" onClick={onConvert} title="Post-Editor mit dieser Idee öffnen">
              <WandSparkles className="size-3.5" /> In Post umwandeln
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label={`„${idea.title}“ bearbeiten`}>
              <Pencil className="size-3.5" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={onDelete} aria-label={`„${idea.title}“ löschen`} className="hover:text-danger">
              <Trash2 className="size-3.5" />
            </Button>
          </span>
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Anlässe – Zeitleiste der nächsten 120 Tage
// ---------------------------------------------------------------------------

function KeyDateTimeline({
  keyDates,
  posts,
  today,
  onIdea,
}: {
  keyDates: KeyDate[]
  posts: Post[]
  today: Date
  onIdea: (kd: KeyDate) => void
}) {
  const occ = useMemo(() => occurrencesBetween(keyDates, today, addDays(today, 120)), [keyDates, today])
  const times = useMemo(() => posts.map((p) => new Date(p.scheduledAt).getTime()), [posts])
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: KeyDateOccurrence[] }[] = []
    for (const o of occ) {
      const anchor = o.start < today ? today : o.start
      const key = format(anchor, 'yyyy-MM')
      let g = out.find((x) => x.key === key)
      if (!g) {
        g = { key, label: formatDe(anchor, 'LLLL yyyy'), items: [] }
        out.push(g)
      }
      g.items.push(o)
    }
    return out
  }, [occ, today])

  const plannedNear = (o: KeyDateOccurrence) => {
    const from = subDays(o.start, 3).getTime()
    const to = endOfDay(addDays(o.end, 3)).getTime()
    return times.filter((t) => t >= from && t <= to).length
  }

  return (
    <aside className="min-w-0 lg:sticky lg:top-20" aria-label="Anstehende Anlässe">
      <Card className="overflow-hidden">
        <CardHeader
          icon={<CalendarDays className="size-4" />}
          title="Anlässe"
          subtitle="Die nächsten 120 Tage – rechtzeitig vorplanen"
          action={<Badge tone="muted">{occ.length}</Badge>}
        />
        {occ.length ? (
          <div className="overflow-y-auto px-3 pb-3 scrollbar-thin lg:max-h-[calc(100dvh-11.5rem)]">
            {groups.map((g) => (
              <div key={g.key}>
                <h3 className="sticky top-0 z-[1] bg-surface/95 px-2 pt-2 pb-1.5 text-[10px] font-semibold tracking-[0.16em] text-ink-3 uppercase backdrop-blur">
                  {g.label}
                </h3>
                <ol className="space-y-1">
                  {g.items.map((o) => (
                    <TimelineItem
                      key={`${o.keyDate.id}-${o.start.getTime()}`}
                      occ={o}
                      today={today}
                      planned={plannedNear(o)}
                      onIdea={() => onIdea(o.keyDate)}
                    />
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 pb-5">
            <EmptyState
              icon={<CalendarDays className="size-5" />}
              title="Keine Anlässe in Sicht"
              description="Füge eigene Anlässe hinzu – Stadtfeste, Jubiläen, Produkt-Launches."
            />
          </div>
        )}
      </Card>
    </aside>
  )
}

function TimelineItem({ occ, today, planned, onIdea }: { occ: KeyDateOccurrence; today: Date; planned: number; onIdea: () => void }) {
  const kd = occ.keyDate
  const kind = KEYDATE_KINDS[kd.kind]
  const days = occurrenceDays(occ)
  const until = differenceInCalendarDays(occ.start, today)
  const urgent = planned === 0 && until <= 21
  const running = occ.start < today
  return (
    <li className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2/60">
      <div
        className={cn(
          'flex w-12 shrink-0 flex-col items-center self-start rounded-xl border py-1.5 text-center',
          until <= 7 ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface',
        )}
      >
        <span className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">{WEEKDAYS_SHORT[occ.start.getDay()]}</span>
        <span className="text-xl leading-6 font-semibold text-ink tabular">{occ.start.getDate()}</span>
        <span className="text-[10px] text-ink-3">{formatDe(occ.start, 'MMM')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Tint color={kind.color}>{kind.label}</Tint>
          <span className={cn('text-[11px] font-medium', until <= 7 ? 'text-accent-text' : 'text-ink-3')}>{countdown(occ, today)}</span>
        </div>
        <p className="mt-1 leading-snug font-semibold text-ink">
          {kd.title}
          {days > 1 ? (
            <span className="font-normal text-ink-3">
              {' '}
              · {running ? `bis ${formatDe(occ.end, 'd. MMM')}` : `${days} Tage`}
            </span>
          ) : null}
        </p>
        {kd.angle ? <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{kd.angle}</p> : null}
        {kd.verify ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-warning" title="Datum jedes Jahr gegenprüfen">
            <CircleAlert className="size-3.5" aria-hidden /> Termin prüfen
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <span
            className={cn('flex items-center gap-1 text-[11px]', planned ? 'text-ink-2' : urgent ? 'font-medium text-warning' : 'text-ink-3')}
            title="Posts im Zeitraum ±3 Tage um den Anlass"
          >
            {planned ? (
              <CircleCheck className="size-3.5 text-success" aria-hidden />
            ) : urgent ? (
              <CircleAlert className="size-3.5" aria-hidden />
            ) : (
              <CircleDashed className="size-3.5" aria-hidden />
            )}
            {planned ? `${planned} ${planned === 1 ? 'Post' : 'Posts'} geplant` : 'Noch nichts geplant'}
          </span>
          <span className="flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2"
              onClick={() =>
                useUi.getState().openPost(null, {
                  scheduledAt: planSlot(occ.start),
                  title: kd.title,
                  notes: `Anlass: ${kd.title} – ${kd.angle}`,
                  status: 'idea',
                })
              }
            >
              <CalendarPlus className="size-3.5" /> Post planen
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onIdea} title="Idee zu diesem Anlass festhalten">
              <Lightbulb className="size-3.5" /> Idee
            </Button>
          </span>
        </div>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Jahresplan – 12 Monate ab jetzt
// ---------------------------------------------------------------------------

function YearPlan({
  keyDates,
  posts,
  today,
  onIdea,
  onAdd,
  onEdit,
}: {
  keyDates: KeyDate[]
  posts: Post[]
  today: Date
  onIdea: (kd: KeyDate) => void
  onAdd: () => void
  onEdit: (kd: KeyDate) => void
}) {
  const deleteKeyDate = useStore((s) => s.deleteKeyDate)
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => startOfMonth(addMonths(today, i))), [today])
  const occ = useMemo(() => occurrencesBetween(keyDates, months[0], endOfMonth(months[11])), [keyDates, months])
  const postsPerMonth = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of posts) {
      const k = format(new Date(p.scheduledAt), 'yyyy-MM')
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [posts])
  const maxPosts = Math.max(1, ...months.map((m) => postsPerMonth.get(format(m, 'yyyy-MM')) ?? 0))
  const custom = keyDates.filter(isCustomKeyDate)

  const remove = (kd: KeyDate) => {
    deleteKeyDate(kd.id)
    toast({
      title: 'Anlass gelöscht',
      description: kd.title,
      action: { label: 'Rückgängig', run: () => useStore.getState().upsertKeyDate(kd) },
    })
  }

  return (
    <Card className="mt-8">
      <CardHeader
        icon={<Sparkles className="size-4" />}
        title="Jahresplan"
        subtitle="Anlässe, Saison-Fokus & geplante Posts der nächsten zwölf Monate – klick auf einen Anlass, um eine Idee festzuhalten"
        action={
          <Button size="sm" onClick={onAdd}>
            <Plus className="size-3.5" /> Anlass
          </Button>
        }
      />
      <div className="px-5">
        <ul className="flex flex-wrap gap-1.5" aria-label="Legende Anlass-Arten">
          {(Object.keys(KEYDATE_KINDS) as KeyDateKind[]).map((k) => (
            <li key={k}>
              <Tint color={KEYDATE_KINDS[k].color}>{KEYDATE_KINDS[k].label}</Tint>
            </li>
          ))}
          <li>
            <span className="inline-flex items-center rounded-md border border-dashed border-line-strong px-1.5 py-0.5 text-[11px] leading-4 font-medium text-ink-3">
              gestrichelt = eigener Anlass
            </span>
          </li>
        </ul>
      </div>
      <ol className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {months.map((m, idx) => {
          const key = format(m, 'yyyy-MM')
          const mEnd = endOfMonth(m)
          const items = occ.filter((o) => o.start <= mEnd && o.end >= m)
          const n = postsPerMonth.get(key) ?? 0
          const current = idx === 0
          return (
            <li
              key={key}
              className={cn(
                'flex min-w-0 flex-col rounded-xl border p-3.5',
                current ? 'border-accent/45 bg-accent-soft/50' : 'border-line bg-surface-2/40',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-ink">
                  {formatDe(m, 'LLLL')}
                  {current ? <span className="ml-1.5 align-middle font-sans text-[10px] font-semibold tracking-wide text-accent-text uppercase">jetzt</span> : null}
                </h3>
                <span className="text-[11px] text-ink-3 tabular">{format(m, 'yyyy')}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-2">
                <span className="font-medium text-ink-3">Fokus:</span> {SEASON_FOCUS[m.getMonth()]}
              </p>
              <div className="mt-2.5 flex items-center gap-2" title={`${n} Posts in diesem Monat`}>
                <div className="h-1.5 flex-1 rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(n / maxPosts) * 100}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right text-[11px] text-ink-2 tabular">
                  {n} {n === 1 ? 'Post' : 'Posts'}
                </span>
              </div>
              {items.length ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {items.map((o) => {
                    const kd = o.keyDate
                    const continues = o.start < m
                    const past = o.end < today
                    const multi = occurrenceDays(o) > 1
                    const label = continues
                      ? 'läuft'
                      : multi && o.end <= mEnd
                        ? `${o.start.getDate()}.–${o.end.getDate()}.`
                        : `${o.start.getDate()}.`
                    return (
                      <button
                        key={`${kd.id}-${o.start.getTime()}`}
                        type="button"
                        onClick={() => onIdea(kd)}
                        title={`${kd.title} (${formatDe(o.start, 'd. MMM')}${multi ? ` – ${formatDe(o.end, 'd. MMM')}` : ''}): ${kd.angle}\nKlicken, um eine Idee festzuhalten`}
                        style={{ '--c': KEYDATE_KINDS[kd.kind].color } as CSSProperties}
                        className={cn(
                          'tint inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-4 font-medium transition-[filter] hover:brightness-95',
                          isCustomKeyDate(kd) ? 'tint-border border-dashed' : 'border-transparent',
                          past && 'line-through saturate-0',
                        )}
                      >
                        <span className="shrink-0 tabular">{label}</span>
                        <span className="truncate">{kd.title}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-ink-3">Keine festen Anlässe – Raum für eigene Serien.</p>
              )}
            </li>
          )
        })}
      </ol>

      <div className="border-t border-line px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-ink-2">Eigene Anlässe</h3>
          <Button size="sm" variant="ghost" onClick={onAdd}>
            <Plus className="size-3.5" /> Hinzufügen
          </Button>
        </div>
        {custom.length ? (
          <ul className="mt-1 divide-y divide-line">
            {custom.map((kd) => (
              <li key={kd.id} className="flex items-center gap-3 py-2">
                <Tint color={KEYDATE_KINDS[kd.kind].color}>{KEYDATE_KINDS[kd.kind].label}</Tint>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{kd.title}</p>
                  <p className="truncate text-[11px] text-ink-3">
                    {kd.rule.type === 'fixed' ? `jährlich am ${mdLabel(kd.rule.md)}` : 'jährlich'}
                    {kd.rule.days && kd.rule.days > 1 ? ` · ${kd.rule.days} Tage` : ''}
                    {kd.angle ? ` · ${kd.angle}` : ''}
                  </p>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={() => onEdit(kd)} aria-label={`„${kd.title}“ bearbeiten`}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => remove(kd)} aria-label={`„${kd.title}“ löschen`} className="hover:text-danger">
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-ink-3">
            Noch keine – ergänze z. B. euer Hoffest, lokale Märkte oder den Start einer neuen Röstung.
          </p>
        )}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Formulare
// ---------------------------------------------------------------------------

function IdeaFormModal({
  initial,
  keyDates,
  today,
  onClose,
}: {
  initial: IdeaDraft
  keyDates: KeyDate[]
  today: Date
  onClose: () => void
}) {
  const [d, setD] = useState(initial)
  const upsertIdea = useStore((s) => s.upsertIdea)
  const set = <K extends keyof IdeaDraft>(k: K, v: IdeaDraft[K]) => setD((prev) => ({ ...prev, [k]: v }))
  const valid = d.title.trim().length > 0 && d.platforms.length > 0

  // Anlässe chronologisch nach nächstem Vorkommen
  const sortedKeyDates = useMemo(
    () =>
      keyDates
        .map((kd) => ({ kd, occ: nextOccurrence(kd, today) }))
        .sort((a, b) => a.occ.start.getTime() - b.occ.start.getTime()),
    [keyDates, today],
  )

  const togglePlatform = (p: Platform) =>
    set('platforms', d.platforms.includes(p) ? d.platforms.filter((x) => x !== p) : PLATFORMS.map((x) => x.id).filter((x) => x === p || d.platforms.includes(x)))

  const save = () => {
    if (!valid) return
    upsertIdea({
      id: d.id ?? uid('idea'),
      title: d.title.trim(),
      description: d.description.trim(),
      pillar: d.pillar,
      platforms: d.platforms,
      format: d.format,
      effort: d.effort,
      votes: d.votes,
      keyDateId: d.keyDateId,
      createdAt: d.createdAt ?? new Date().toISOString(),
    })
    toast({ title: d.id ? 'Idee aktualisiert' : 'Idee festgehalten', description: d.title.trim(), tone: 'success' })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={d.id ? 'Idee bearbeiten' : 'Idee festhalten'}
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={save} disabled={!valid}>
            {d.id ? 'Speichern' : 'Idee speichern'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Titel" htmlFor="idea-title">
          <Input
            id="idea-title"
            autoFocus
            value={d.title}
            onChange={(e) => set('title', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                save()
              }
            }}
            placeholder="z. B. Latte-Art-Throwdown in der Espressobar"
          />
        </Field>
        <Field label="Worum geht’s?" htmlFor="idea-desc" hint="Hook, Ablauf, wer ist dabei – Stichpunkte reichen.">
          <Textarea
            id="idea-desc"
            rows={3}
            className="min-h-20"
            value={d.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Was passiert, warum ist das spannend?"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Content-Säule" htmlFor="idea-pillar">
            <Select id="idea-pillar" value={d.pillar} onChange={(e) => set('pillar', e.target.value as Pillar)}>
              {PILLARS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Format" htmlFor="idea-format">
            <Select id="idea-format" value={d.format} onChange={(e) => set('format', e.target.value as PostFormat)}>
              {(Object.keys(FORMATS) as PostFormat[]).map((f) => (
                <option key={f} value={f}>
                  {FORMATS[f].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Kanäle" hint={d.platforms.length ? undefined : 'Wähle mindestens einen Kanal.'}>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <PlatformChip key={p.id} platform={p.id} active={d.platforms.includes(p.id)} onClick={() => togglePlatform(p.id)} />
            ))}
          </div>
        </Field>
        <Field label="Aufwand" aside={EFFORT[d.effort].hint}>
          <Segmented
            size="sm"
            value={d.effort}
            onChange={(v) => set('effort', v)}
            options={EFFORTS.map((e) => ({ value: e.id, label: `${e.id} · ${e.label}` }))}
            label="Aufwand"
          />
        </Field>
        <Field label="Anlass (optional)" htmlFor="idea-kd">
          <Select id="idea-kd" value={d.keyDateId ?? ''} onChange={(e) => set('keyDateId', e.target.value || null)}>
            <option value="">Kein Anlass</option>
            {sortedKeyDates.map(({ kd, occ }) => (
              <option key={kd.id} value={kd.id}>
                {kd.title} · {formatDe(occ.start, 'd. MMM yyyy')}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  )
}

function KeyDateFormModal({ initial, onClose }: { initial: KeyDateDraft; onClose: () => void }) {
  const [d, setD] = useState(initial)
  const upsertKeyDate = useStore((s) => s.upsertKeyDate)
  const set = <K extends keyof KeyDateDraft>(k: K, v: KeyDateDraft[K]) => setD((prev) => ({ ...prev, [k]: v }))
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(d.date)
  const valid = d.title.trim().length > 0 && validDate

  const save = () => {
    if (!valid) return
    const days = Math.max(1, Math.min(120, Math.round(d.days) || 1))
    upsertKeyDate({
      id: d.id ?? uid('anlass'),
      title: d.title.trim(),
      kind: d.kind,
      rule: { type: 'fixed', md: d.date.slice(5), days },
      angle: d.angle.trim(),
      verify: d.verify,
    })
    toast({ title: d.id ? 'Anlass aktualisiert' : 'Anlass hinzugefügt', description: d.title.trim(), tone: 'success' })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={d.id ? 'Anlass bearbeiten' : 'Eigenen Anlass hinzufügen'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={save} disabled={!valid}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Titel" htmlFor="kd-title">
          <Input
            id="kd-title"
            autoFocus
            value={d.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="z. B. Hoffest in der Rösterei"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_88px]">
          <Field label="Art" htmlFor="kd-kind">
            <Select id="kd-kind" value={d.kind} onChange={(e) => set('kind', e.target.value as KeyDateKind)}>
              {(Object.keys(KEYDATE_KINDS) as KeyDateKind[]).map((k) => (
                <option key={k} value={k}>
                  {KEYDATE_KINDS[k].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Datum" htmlFor="kd-date">
            <Input id="kd-date" type="date" value={d.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Tage" htmlFor="kd-days">
            <Input
              id="kd-days"
              type="number"
              min={1}
              max={120}
              value={d.days}
              onChange={(e) => set('days', Number(e.target.value))}
              className="tabular"
            />
          </Field>
        </div>
        <p className="-mt-2 text-[11px] text-ink-3">
          Wiederholt sich jedes Jahr am {validDate ? formatDe(parseISO(d.date), 'd. MMMM') : '…'}
          {d.days > 1 ? ` für ${Math.round(d.days)} Tage` : ''}.
        </p>
        <Field label="Unser Dreh" htmlFor="kd-angle" hint="Wie greifen wir den Anlass auf? Erscheint in der Zeitleiste & als Idee-Vorlage.">
          <Textarea
            id="kd-angle"
            rows={2}
            className="min-h-16"
            value={d.angle}
            onChange={(e) => set('angle', e.target.value)}
            placeholder="z. B. Tag der offenen Rösterei mit Cupping & Brüh-Station"
          />
        </Field>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-ink">Termin jährlich prüfen</p>
            <p className="text-[11px] text-ink-3">Für Termine, die sich jedes Jahr leicht verschieben.</p>
          </div>
          <Toggle checked={d.verify} onChange={(v) => set('verify', v)} label="Termin jährlich prüfen" />
        </div>
      </div>
    </Modal>
  )
}
