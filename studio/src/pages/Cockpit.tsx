import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns'
import {
  ArrowRight,
  BarChart3,
  CalendarHeart,
  CircleAlert,
  Eye,
  Heart,
  Lightbulb,
  Megaphone,
  PenLine,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarList, CHART, ChartTooltip, Delta, Meter, StatTile } from '../components/charts'
import { MediaThumb, PlatformStack } from '../components/domain'
import { Avatar, Badge, Button, Card, CardHeader, Tint } from '../components/ui/primitives'
import { AD_CHANNELS, KEYDATE_KINDS, OBJECTIVES, PILLARS, STATUS } from '../lib/constants'
import { occurrencesBetween, occurrencesOnDay } from '../lib/keydates'
import { engagementRate, pacing, totals } from '../lib/metrics'
import { useStore, useUi } from '../lib/store'
import type { Post } from '../lib/types'
import { cn, fmt, formatDe, sum } from '../lib/utils'

function greeting() {
  const h = new Date().getHours()
  if (h < 11) return 'Guten Morgen'
  if (h < 17) return 'Moin'
  return 'Guten Abend'
}

function inWindow(p: Post, from: Date, to: Date) {
  const t = parseISO(p.scheduledAt)
  return t >= from && t < to
}

export function CockpitPage() {
  const posts = useStore((s) => s.posts)
  const campaigns = useStore((s) => s.campaigns)
  const accounts = useStore((s) => s.accounts)
  const keyDates = useStore((s) => s.keyDates)
  const ideas = useStore((s) => s.ideas)
  const budget = useStore((s) => s.budget)
  const team = useStore((s) => s.team)
  const openPost = useUi((s) => s.openPost)

  const today = useMemo(() => new Date(), [])

  const kpi = useMemo(() => {
    const from = subDays(today, 30)
    const prevFrom = subDays(today, 60)
    const pub = posts.filter((p) => p.status === 'published' && p.metrics)
    const cur = pub.filter((p) => inWindow(p, from, today))
    const prev = pub.filter((p) => inWindow(p, prevFrom, from))
    const reach = sum(cur, (p) => p.metrics!.reach)
    const reachPrev = sum(prev, (p) => p.metrics!.reach)
    const rate = cur.length ? sum(cur, engagementRate) / cur.length : 0
    const ratePrev = prev.length ? sum(prev, engagementRate) / prev.length : 0

    // Wöchentliche Reichweite (8 Wochen) für Sparkline & Chart
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = startOfWeek(subWeeks(today, 7 - i), { weekStartsOn: 1 })
      const end = addDays(start, 7)
      const wk = pub.filter((p) => inWindow(p, start, end))
      return { label: `KW ${format(start, 'I')}`, start, reach: sum(wk, (p) => p.metrics!.reach), posts: wk.length }
    })

    const followers = sum(accounts, (a) => a.followers)
    const followers4w = sum(accounts, (a) => {
      const h = a.history
      return h.length > 4 ? h[h.length - 5].value : a.followers
    })
    const followerTrend = Array.from({ length: 12 }, (_, i) =>
      sum(accounts, (a) => a.history[a.history.length - 12 + i]?.value ?? 0),
    )

    // Werbung – aktueller Monat
    const mStart = startOfMonth(today)
    const mEnd = endOfMonth(today)
    const mKey = format(today, 'yyyy-MM')
    const allDaily = campaigns.flatMap((c) => c.daily)
    const monthDaily = allDaily.filter((d) => {
      const t = parseISO(d.date)
      return t >= mStart && t <= mEnd
    })
    const last30 = allDaily.filter((d) => parseISO(d.date) >= from)
    const t30 = totals(last30)
    const monthSpend = sum(monthDaily, (d) => d.spend)
    const monthPlan = sum(Object.values(budget[mKey] ?? {}), (v) => v ?? 0)
    const spendTrend = Array.from({ length: 14 }, (_, i) => {
      const k = format(subDays(today, 13 - i), 'yyyy-MM-dd')
      return sum(allDaily.filter((d) => d.date === k), (d) => d.spend)
    })

    return { reach, reachPrev, rate, ratePrev, weeks, followers, followers4w, followerTrend, monthSpend, monthPlan, t30, spendTrend }
  }, [posts, accounts, campaigns, budget, today])

  const week = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 1 })
    const end = endOfWeek(today, { weekStartsOn: 1 })
    return {
      days: eachDayOfInterval({ start, end }),
      occ: occurrencesBetween(keyDates, start, end),
      posts: posts.filter((p) => inWindow(p, start, addDays(end, 1))).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    }
  }, [posts, keyDates, today])

  const todo = useMemo(() => {
    const review = posts.filter((p) => p.status === 'review')
    const soonOpen = posts.filter((p) => {
      const d = differenceInCalendarDays(parseISO(p.scheduledAt), today)
      return d >= 0 && d <= 3 && p.status !== 'published' && p.checklist.some((c) => !c.done)
    })
    const noMetrics = posts.filter((p) => p.status === 'published' && !p.metrics && parseISO(p.scheduledAt) > subDays(today, 14))
    const overdue = posts.filter((p) => parseISO(p.scheduledAt) < today && p.status !== 'published' && p.status !== 'idea')
    const pacingIssues = campaigns
      .filter((c) => c.status === 'active')
      .map((c) => ({ c, p: pacing(c, today) }))
      .filter(({ p }) => p.state === 'over' || p.state === 'under')
    return { review, soonOpen, noMetrics, overdue, pacingIssues }
  }, [posts, campaigns, today])

  const upcomingOcc = useMemo(() => occurrencesBetween(keyDates, today, addDays(today, 60)).slice(0, 4), [keyDates, today])

  const mix = useMemo(() => {
    const from = subDays(today, 15)
    const to = addDays(today, 15)
    const scope = posts.filter((p) => inWindow(p, from, to))
    return PILLARS.map((pl) => {
      const n = scope.filter((p) => p.pillar === pl.id).length
      return { id: pl.id, label: pl.label, target: pl.share, n, share: scope.length ? (n / scope.length) * 100 : 0 }
    })
  }, [posts, today])

  const active = campaigns.filter((c) => c.status === 'active')
  const topIdea = [...ideas].sort((a, b) => b.votes - a.votes)[0]
  const weekPlanned = week.posts.filter((p) => p.status !== 'published' && parseISO(p.scheduledAt) >= today).length
  const reachDelta = kpi.reachPrev ? ((kpi.reach - kpi.reachPrev) / kpi.reachPrev) * 100 : 0
  const followerDelta = kpi.followers - kpi.followers4w

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="grain relative overflow-hidden rounded-3xl bg-sidebar px-6 py-7 text-sidebar-ink shadow-lift md:px-8 md:py-8">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-[#5b3a29]/40 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">{formatDe(today, "EEEE, d. MMMM yyyy")}</p>
            <h1 className="mt-2 font-display text-3xl leading-tight font-semibold md:text-4xl">
              {greeting()}, Röstbrüder <span aria-hidden>☕</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-sidebar-ink/75">
              Diese Woche {weekPlanned === 1 ? 'steht noch 1 Post' : `stehen noch ${weekPlanned} Posts`} an,{' '}
              {todo.review.length === 1 ? '1 wartet' : `${todo.review.length} warten`} auf eure Freigabe und {active.length} Kampagnen laufen.
              {upcomingOcc[0] ? ` Nächster Anlass: ${upcomingOcc[0].keyDate.title} (${relativeDays(upcomingOcc[0].start, today)}).` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => openPost(null)}>
              <PenLine className="size-4" /> Post planen
            </Button>
            <Link to="/kalender">
              <Button className="border-white/10 bg-white/10 text-sidebar-ink shadow-none hover:bg-white/15">
                Zum Kalender <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1" aria-label="Kennzahlen">
        <StatTile
          label="Reichweite · 30 Tage"
          icon={<Eye className="size-4" />}
          value={fmt.compact(kpi.reach)}
          delta={<Delta value={reachDelta} suffix=" %" />}
          deltaLabel="vs. Vormonat"
          trend={kpi.weeks.map((w) => w.reach)}
          trendLabels={kpi.weeks.map((w) => w.label)}
        />
        <StatTile
          label="Ø Interaktionsrate"
          icon={<Heart className="size-4" />}
          value={fmt.pct(kpi.rate)}
          delta={<Delta value={(kpi.rate - kpi.ratePrev) * 100} suffix=" Pp." />}
          deltaLabel="vs. Vorperiode"
        />
        <StatTile
          label="Follower gesamt"
          icon={<Users className="size-4" />}
          value={fmt.num(kpi.followers)}
          delta={<Delta value={followerDelta} format={(v) => fmt.num(v)} />}
          deltaLabel="in 4 Wochen"
          trend={kpi.followerTrend}
        />
        <StatTile
          label="Werbeausgaben · Monat"
          icon={<Wallet className="size-4" />}
          value={fmt.eur(kpi.monthSpend)}
          footnote={
            <span className="block">
              <span className="mb-1.5 block">von {fmt.eur(kpi.monthPlan)} geplant</span>
              <Meter
                value={kpi.monthSpend}
                max={kpi.monthPlan || 1}
                marker={(kpi.monthPlan * today.getDate()) / endOfMonth(today).getDate()}
                tone={kpi.monthSpend > kpi.monthPlan ? 'danger' : 'accent'}
                label="Werbebudget des Monats"
              />
            </span>
          }
        />
        <StatTile
          label="ROAS · 30 Tage"
          icon={<BarChart3 className="size-4" />}
          value={fmt.ratio(kpi.t30.roas)}
          footnote={`${fmt.eur(kpi.t30.revenue)} Umsatz · ${fmt.num(kpi.t30.conversions)} Conversions`}
          trend={kpi.spendTrend}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Diese Woche */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Diese Woche"
            subtitle={`KW ${format(today, 'I')} · ${week.posts.length} Posts · Doppelklick auf einen Tag plant einen neuen Post`}
            action={
              <Link to="/kalender" className="text-xs font-semibold text-accent-text hover:underline">
                Kalender öffnen
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-7 md:px-5">
            {week.days.map((d) => {
              const dayPosts = week.posts.filter((p) => isSameDay(parseISO(p.scheduledAt), d))
              const dayOcc = occurrencesOnDay(week.occ, d)
              const past = d < startOfDay(today)
              return (
                <div
                  key={d.toISOString()}
                  onDoubleClick={() => openPost(null, { scheduledAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9).toISOString() })}
                  className={cn(
                    'flex min-h-36 flex-col gap-1.5 rounded-xl border p-2',
                    isToday(d) ? 'border-accent/60 bg-accent-soft/40' : 'border-line bg-surface-2/40',
                    past && 'opacity-70',
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <span className={cn('text-[11px] font-semibold uppercase', isToday(d) ? 'text-accent-text' : 'text-ink-3')}>{formatDe(d, 'EEE')}</span>
                    <span className="text-sm font-semibold text-ink tabular">{format(d, 'd')}</span>
                  </div>
                  {dayOcc.map((o) => (
                    <Tint key={o.keyDate.id} color={KEYDATE_KINDS[o.keyDate.kind].color} className="truncate text-[10px]" title={o.keyDate.angle}>
                      {o.keyDate.title}
                    </Tint>
                  ))}
                  {dayPosts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openPost(p.id)}
                      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface text-left shadow-soft transition-transform hover:-translate-y-0.5"
                    >
                      <MediaThumb url={p.mediaUrl} tone={p.mediaTone} className="h-10 w-full">
                        <span className="absolute top-1 left-1">
                          <PlatformStack platforms={p.platforms.slice(0, 3)} size={14} />
                        </span>
                      </MediaThumb>
                      <span className="block px-1.5 pt-1 text-[10px] font-semibold text-ink-3 tabular">{format(parseISO(p.scheduledAt), 'HH:mm')}</span>
                      <span className="line-clamp-2 block px-1.5 pb-1.5 text-[11px] leading-tight font-medium text-ink">{p.title}</span>
                      <span className="h-0.5 w-full" style={{ background: STATUS[p.status].color }} title={STATUS[p.status].label} />
                    </button>
                  ))}
                  {!dayPosts.length && !past ? (
                    <button
                      type="button"
                      onClick={() => openPost(null, { scheduledAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9).toISOString() })}
                      className="mt-auto rounded-lg border border-dashed border-line-strong py-2 text-[11px] text-ink-3 hover:border-accent hover:text-accent-text"
                    >
                      + planen
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </Card>

        {/* To-dos */}
        <Card>
          <CardHeader title="Wartet auf euch" subtitle="Freigaben, offene Punkte & Hinweise" icon={<CircleAlert className="size-4" />} />
          <ul className="space-y-1 px-3 pb-4">
            {todo.review.slice(0, 3).map((p) => (
              <TodoRow key={p.id} onClick={() => openPost(p.id)} tone="warning" label="Freigabe" title={p.title} meta={formatDe(p.scheduledAt, "EEE d. MMM, HH:mm")} />
            ))}
            {todo.overdue.slice(0, 2).map((p) => (
              <TodoRow key={p.id} onClick={() => openPost(p.id)} tone="danger" label="Überfällig" title={p.title} meta={`geplant ${formatDe(p.scheduledAt, 'd. MMM')} · noch ${STATUS[p.status].label}`} />
            ))}
            {todo.soonOpen
              .filter((p) => p.status !== 'review')
              .slice(0, 3)
              .map((p) => (
                <TodoRow
                  key={p.id}
                  onClick={() => openPost(p.id)}
                  tone="accent"
                  label="Checkliste"
                  title={p.title}
                  meta={`${p.checklist.filter((c) => !c.done).length} offene Punkte · ${relativeDays(parseISO(p.scheduledAt), today)}`}
                />
              ))}
            {todo.pacingIssues.map(({ c, p }) => (
              <li key={c.id}>
                <Link to={`/kampagnen/${c.id}`} className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                  <Badge tone={p.state === 'over' ? 'warning' : 'accent'}>{p.state === 'over' ? 'Zu schnell' : 'Zu langsam'}</Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                    <span className="block text-[11px] text-ink-3">Empfehlung: {fmt.eur(p.suggestedDaily)}/Tag für den Rest der Laufzeit</span>
                  </span>
                </Link>
              </li>
            ))}
            {todo.noMetrics.slice(0, 2).map((p) => (
              <TodoRow key={p.id} onClick={() => openPost(p.id)} tone="neutral" label="Zahlen" title={p.title} meta="Insights nachtragen" />
            ))}
            {topIdea ? (
              <li>
                <Link to="/ideen" className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                  <Badge tone="success">
                    <Lightbulb className="size-3" /> Top-Idee
                  </Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{topIdea.title}</span>
                    <span className="block text-[11px] text-ink-3">{topIdea.votes} Stimmen – bereit zum Einplanen?</span>
                  </span>
                </Link>
              </li>
            ) : null}
            {!todo.review.length && !todo.overdue.length && !todo.soonOpen.length && !todo.pacingIssues.length ? (
              <li className="px-2 py-6 text-center text-sm text-ink-3">Alles erledigt. Zeit für einen Espresso. ☕</li>
            ) : null}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Reichweite */}
        <Card className="xl:col-span-2">
          <CardHeader title="Organische Reichweite" subtitle="Summe pro Kalenderwoche aus veröffentlichten Posts" action={<Link to="/analytics" className="text-xs font-semibold text-accent-text hover:underline">Analytics</Link>} />
          <div className="h-64 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpi.weeks} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="reachFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="var(--accent)" stopOpacity={0.18} />
                    <stop offset="1" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART.tick} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={CHART.tick} width={48} tickFormatter={(v: number) => fmt.compact(v)} />
                <Tooltip cursor={{ stroke: 'var(--line-strong)' }} content={<ChartTooltip valueFormat={(v) => fmt.num(v)} />} />
                <Area
                  type="monotone"
                  dataKey="reach"
                  name="Reichweite"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#reachFill)"
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Content-Mix */}
        <Card>
          <CardHeader title="Content-Mix" subtitle="± 15 Tage um heute · Ist vs. Ziel-Anteil" />
          <div className="px-5 pb-5">
            <BarList
              items={mix.map((m) => ({
                key: m.id,
                label: m.label,
                value: m.share,
                hint: `Ziel ${m.target} %`,
              }))}
              format={(v) => `${Math.round(v)} %`}
              max={40}
            />
            {(() => {
              const gap = mix.map((m) => ({ ...m, diff: m.share - m.target })).sort((a, b) => a.diff - b.diff)[0]
              return gap && gap.diff < -4 ? (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-xs text-accent-text">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    <strong>{gap.label}</strong> kommt zu kurz ({Math.round(gap.share)} % statt {gap.target} %). Schau in die Ideen – dort liegen passende Vorschläge.
                  </span>
                </p>
              ) : null
            })()}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Kampagnen */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Laufende Kampagnen"
            subtitle="Budget-Pacing: Strich = Soll bis heute"
            icon={<Megaphone className="size-4" />}
            action={
              <Link to="/kampagnen" className="text-xs font-semibold text-accent-text hover:underline">
                Alle Kampagnen
              </Link>
            }
          />
          <ul className="divide-y divide-line px-5 pb-2">
            {active.length === 0 ? <li className="py-6 text-center text-sm text-ink-3">Gerade läuft keine Kampagne.</li> : null}
            {active.map((c) => {
              const p = pacing(c, today)
              const t = totals(c.daily)
              const tone = p.state === 'over' ? 'warning' : p.state === 'under' ? 'accent' : 'success'
              return (
                <li key={c.id}>
                  <Link to={`/kampagnen/${c.id}`} className="-mx-2 grid grid-cols-1 gap-3 rounded-xl px-2 py-3.5 hover:bg-surface-2/60 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                      <p className="mt-0.5 text-[11px] text-ink-3">
                        {OBJECTIVES[c.objective].label} · noch {Math.max(0, p.totalDays - p.elapsedDays)} Tage
                      </p>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] text-ink-3 tabular">
                        <span>
                          {fmt.eur(t.spend)} / {fmt.eur(c.budget)}
                        </span>
                        <span className={cn(p.state === 'over' && 'text-warning', p.state === 'on-track' && 'text-success')}>
                          {p.state === 'over' ? 'zu schnell' : p.state === 'under' ? 'zu langsam' : 'im Plan'}
                        </span>
                      </div>
                      <Meter value={t.spend} max={c.budget} marker={p.expected} tone={tone} label={`Budget ${c.name}`} />
                    </div>
                    <div className="flex gap-4 text-right text-[11px] text-ink-3 md:w-40 md:justify-end">
                      <span>
                        <span className="block text-sm font-semibold text-ink tabular">{fmt.pct(t.ctr)}</span>CTR
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink tabular">{t.roas ? fmt.ratio(t.roas) : '–'}</span>ROAS
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* Anlässe & Budget */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Nächste Anlässe" icon={<CalendarHeart className="size-4" />} action={<Link to="/ideen" className="text-xs font-semibold text-accent-text hover:underline">Jahresplan</Link>} />
            <ul className="space-y-1 px-3 pb-4">
              {upcomingOcc.map((o) => {
                const planned = posts.filter((p) => Math.abs(differenceInCalendarDays(parseISO(p.scheduledAt), o.start)) <= 3).length
                return (
                  <li key={`${o.keyDate.id}-${o.start.toISOString()}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                    <div className="w-11 shrink-0 rounded-lg bg-surface-2 py-1 text-center">
                      <p className="text-[9px] font-semibold text-ink-3 uppercase">{formatDe(o.start, 'MMM')}</p>
                      <p className="text-base leading-none font-semibold text-ink tabular">{format(o.start, 'd')}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{o.keyDate.title}</p>
                      <p className="text-[11px] text-ink-3">
                        {relativeDays(o.start, today)} · {planned ? `${planned} Posts rund um den Termin` : 'noch nichts geplant'}
                      </p>
                    </div>
                    {!planned ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Post zu ${o.keyDate.title} planen`}
                        onClick={() =>
                          openPost(null, {
                            scheduledAt: new Date(o.start.getFullYear(), o.start.getMonth(), o.start.getDate(), 9).toISOString(),
                            title: o.keyDate.title,
                            notes: `Anlass: ${o.keyDate.title} – ${o.keyDate.angle}`,
                          })
                        }
                      >
                        <PenLine className="size-3.5" />
                      </Button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Budget diesen Monat" subtitle={`Plan je Kanal · ${formatDe(today, 'MMMM')}`} action={<Link to="/budget" className="text-xs font-semibold text-accent-text hover:underline">Planer</Link>} />
            <div className="px-5 pb-5">
              <BarList
                items={AD_CHANNELS.filter((c) => (budget[format(today, 'yyyy-MM')]?.[c.id] ?? 0) > 0).map((c) => ({
                  key: c.id,
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </span>
                  ),
                  value: budget[format(today, 'yyyy-MM')]?.[c.id] ?? 0,
                }))}
                format={(v) => fmt.eur(v)}
                color="var(--roast)"
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-ink-3">
        {team.slice(0, 2).map((m) => (
          <Avatar key={m.id} name={m.name} color={m.color} initials={m.initials} size={20} />
        ))}
        <span>Handgeröstet in Weimar – geplant im Röstbrüder Studio.</span>
      </div>
    </div>
  )
}

function relativeDays(d: Date, today: Date) {
  const n = differenceInCalendarDays(d, today)
  if (n === 0) return 'heute'
  if (n === 1) return 'morgen'
  if (n < 0) return `vor ${-n} Tagen`
  return `in ${n} Tagen`
}

function TodoRow({
  onClick,
  tone,
  label,
  title,
  meta,
}: {
  onClick: () => void
  tone: 'warning' | 'danger' | 'accent' | 'neutral'
  label: ReactNode
  title: string
  meta: string
}) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2">
        <Badge tone={tone}>{label}</Badge>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{title}</span>
          <span className="block text-[11px] text-ink-3">{meta}</span>
        </span>
      </button>
    </li>
  )
}
