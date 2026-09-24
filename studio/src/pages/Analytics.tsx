import { addDays, differenceInCalendarDays, endOfDay, startOfDay, subDays } from 'date-fns'
import {
  ArrowRight,
  Bookmark,
  ChartLine,
  CircleAlert,
  Clock3,
  Eye,
  Gauge,
  Info,
  Layers,
  MousePointerClick,
  PencilLine,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarList, CHART, ChartTooltip, Delta, Legend, StatTile } from '../components/charts'
import { MediaThumb, PlatformDot, PlatformStack } from '../components/domain'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Segmented } from '../components/ui/primitives'
import { FORMATS, PILLAR, PILLARS, PLATFORMS, WEEKDAYS_SHORT, type PlatformMeta } from '../lib/constants'
import { engagement, engagementRate } from '../lib/metrics'
import { useStore, useUi } from '../lib/store'
import type { ChannelAccount, Post, PostFormat } from '../lib/types'
import { cn, dayKey, fmt, formatDe, sum } from '../lib/utils'

// ---------------------------------------------------------------------------
// Helfer
// ---------------------------------------------------------------------------

type Period = '30' | '90' | '180'

const PERIODS: { value: Period; label: string }[] = [
  { value: '30', label: '30 Tage' },
  { value: '90', label: '90 Tage' },
  { value: '180', label: '180 Tage' },
]

interface Agg {
  count: number
  reach: number
  interactions: number
  saves: number
  shares: number
  clicks: number
  /** Interaktionen / Reichweite */
  rate: number
}

function aggregate(list: Post[]): Agg {
  let reach = 0
  let interactions = 0
  let saves = 0
  let shares = 0
  let clicks = 0
  for (const p of list) {
    const m = p.metrics
    if (!m) continue
    reach += m.reach
    interactions += m.likes + m.comments + m.shares + m.saves
    saves += m.saves
    shares += m.shares
    clicks += m.clicks
  }
  return { count: list.length, reach, interactions, saves, shares, clicks, rate: reach ? interactions / reach : 0 }
}

const ts = (p: Post) => new Date(p.scheduledAt).getTime()
const shortLabel = (p: PlatformMeta) => p.label.replace(' Unternehmensprofil', '')

/** Prozentuale Veränderung als Delta-Badge – ohne Vorperiode kein Vergleich */
function pctDelta(cur: number, prev: number, goodWhenUp = true): ReactNode {
  if (!prev) return null
  return <Delta value={((cur - prev) / prev) * 100} suffix=" %" goodWhenUp={goodWhenUp} />
}

/** Letzter bekannter Stand bis einschließlich `key` (yyyy-MM-dd) – History muss sortiert sein */
function valueAt(history: ChannelAccount['history'], key: string): number | null {
  let v: number | null = null
  for (const h of history) {
    if (h.date <= key) v = h.value
    else break
  }
  return v
}

/** Wochen-Summen über den Zeitraum (für Sparklines) */
function weekly(list: Post[], start: Date, days: number, pick: (p: Post) => number) {
  const n = Math.max(2, Math.ceil(days / 7))
  const values = Array.from({ length: n }, () => 0)
  const labels = Array.from({ length: n }, (_, i) => `ab ${formatDe(addDays(start, i * 7), 'd. MMM')}`)
  for (const p of list) {
    const i = Math.floor(differenceInCalendarDays(new Date(p.scheduledAt), start) / 7)
    if (i >= 0) values[Math.min(n - 1, i)] += pick(p)
  }
  return { values, labels }
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

export function AnalyticsPage() {
  const posts = useStore((s) => s.posts)
  const accounts = useStore((s) => s.accounts)
  const demo = useStore((s) => s.settings.demoData)
  const [period, setPeriod] = useState<Period>('90')
  const days = Number(period)
  const now = useMemo(() => new Date(), [])

  const range = useMemo(() => {
    const start = startOfDay(subDays(now, days - 1))
    return { start, prevStart: subDays(start, days), end: endOfDay(now) }
  }, [now, days])

  const data = useMemo(() => {
    const s = range.start.getTime()
    const ps = range.prevStart.getTime()
    const e = range.end.getTime()
    const published = posts.filter((p) => p.status === 'published')
    const inPeriod = published.filter((p) => ts(p) >= s && ts(p) <= e)
    const withMetrics = inPeriod.filter((p) => p.metrics)
    const prevPosts = published.filter((p) => p.metrics && ts(p) >= ps && ts(p) < s)
    return {
      list: withMetrics,
      missing: inPeriod.filter((p) => !p.metrics).sort((a, b) => ts(b) - ts(a)),
      cur: aggregate(withMetrics),
      prev: aggregate(prevPosts),
    }
  }, [posts, range])

  const followers = useMemo(() => {
    const accs = PLATFORMS.map((p) => accounts.find((a) => a.platform === p.id))
      .filter((a): a is ChannelAccount => Boolean(a))
      .map((a) => ({ ...a, history: [...a.history].sort((x, y) => x.date.localeCompare(y.date)) }))
    const startKey = dayKey(range.start)
    const withHistory = accs.filter((a) => a.history.length > 0)
    const total = sum(accs, (a) => a.followers)
    const delta = sum(withHistory, (a) => a.followers - (valueAt(a.history, startKey) ?? a.history[0].value))
    const allDates = Array.from(new Set(withHistory.flatMap((a) => a.history.map((h) => h.date)))).sort()
    const baseIdx = Math.max(0, allDates.findLastIndex((d) => d <= startKey))
    const dates = allDates.slice(baseIdx)
    const trend = dates.map((d) => sum(accs, (a) => (a.history.length ? (valueAt(a.history, d) ?? 0) : a.followers)))
    return { accs, withHistory, total, delta, dates, trend, startKey }
  }, [accounts, range])

  const reachTrend = useMemo(() => weekly(data.list, range.start, days, (p) => p.metrics?.reach ?? 0), [data.list, range.start, days])
  const savesTrend = useMemo(
    () => weekly(data.list, range.start, days, (p) => (p.metrics?.saves ?? 0) + (p.metrics?.shares ?? 0)),
    [data.list, range.start, days],
  )
  const clickTrend = useMemo(() => weekly(data.list, range.start, days, (p) => p.metrics?.clicks ?? 0), [data.list, range.start, days])

  const { cur, prev } = data
  const hasPosts = data.list.length > 0

  return (
    <>
      <PageHeader
        eyebrow="Auswertung"
        title="Analytics"
        description="Was wirkt, wann und wo? Reichweite, Interaktion und Wachstum eurer Kanäle – als Grundlage für den nächsten Redaktionsplan."
        actions={
          <>
            {demo ? (
              <Badge tone="muted" className="border border-dashed border-line-strong">
                Demo-Daten
              </Badge>
            ) : null}
            <Segmented value={period} onChange={setPeriod} options={PERIODS} label="Zeitraum" />
          </>
        }
      >
        {demo ? (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-line-strong bg-surface-2/50 px-4 py-3 text-xs leading-relaxed text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
            <p>
              <span className="font-semibold text-ink">Beispielzahlen.</span> Echte Werte kommen in Phase 2 automatisch per API. Bis dahin
              trägst du Post-Kennzahlen im Post-Editor nach und Follower-Stände unter{' '}
              <Link to="/studio/einstellungen" className="font-medium text-accent-text underline-offset-2 hover:underline">
                Einstellungen → Kanäle
              </Link>
              .
            </p>
          </div>
        ) : null}
      </PageHeader>

      {data.missing.length ? <MissingMetricsBanner missing={data.missing} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          className="sm:col-span-2 xl:col-span-1"
          label="Follower gesamt"
          icon={<Users className="size-4" />}
          value={fmt.num(followers.total)}
          delta={followers.withHistory.length ? <Delta value={followers.delta} format={(v) => fmt.num(v)} /> : undefined}
          deltaLabel={followers.withHistory.length ? `in ${days} Tagen` : undefined}
          trend={followers.trend}
          trendLabels={followers.dates.map((d) => formatDe(d, 'd. MMM'))}
        />
        <StatTile
          label="Reichweite"
          icon={<Eye className="size-4" />}
          value={hasPosts ? fmt.num(cur.reach) : '–'}
          delta={hasPosts ? pctDelta(cur.reach, prev.reach) : undefined}
          deltaLabel={hasPosts && prev.reach ? 'vs. Vorperiode' : undefined}
          footnote={hasPosts && !prev.reach ? 'Keine Vorperiode zum Vergleich' : undefined}
          trend={hasPosts ? reachTrend.values : undefined}
          trendLabels={reachTrend.labels}
        />
        <StatTile
          label="Ø Interaktionsrate"
          icon={<Gauge className="size-4" />}
          value={hasPosts ? fmt.pct(cur.rate) : '–'}
          delta={hasPosts && prev.reach ? <Delta value={(cur.rate - prev.rate) * 100} suffix=" Pp." /> : undefined}
          deltaLabel={hasPosts && prev.reach ? 'vs. Vorperiode' : undefined}
          footnote={hasPosts ? `Basis: ${cur.count} ${cur.count === 1 ? 'Post' : 'Posts'}` : undefined}
        />
        <StatTile
          label="Gespeichert & geteilt"
          icon={<Bookmark className="size-4" />}
          value={hasPosts ? fmt.num(cur.saves + cur.shares) : '–'}
          delta={hasPosts ? pctDelta(cur.saves + cur.shares, prev.saves + prev.shares) : undefined}
          deltaLabel={hasPosts && prev.saves + prev.shares ? 'vs. Vorperiode' : undefined}
          trend={hasPosts ? savesTrend.values : undefined}
          trendLabels={savesTrend.labels}
        />
        <StatTile
          label="Link-Klicks"
          icon={<MousePointerClick className="size-4" />}
          value={hasPosts ? fmt.num(cur.clicks) : '–'}
          delta={hasPosts ? pctDelta(cur.clicks, prev.clicks) : undefined}
          deltaLabel={hasPosts && prev.clicks ? 'vs. Vorperiode' : undefined}
          trend={hasPosts ? clickTrend.values : undefined}
          trendLabels={clickTrend.labels}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <FollowerCard className="xl:col-span-2" accounts={followers.withHistory} dates={followers.dates} startKey={followers.startKey} />
        <ChannelRateCard posts={data.list} overall={cur.rate} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <HeatmapCard className="xl:col-span-3" posts={data.list} />
        <PillarCard className="xl:col-span-2" posts={data.list} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <TopPostsCard className="xl:col-span-2" posts={data.list} />
        <FormatCard posts={data.list} />
      </div>
    </>
  )
}

/** Karten-Kopf, der Umschalter auf schmalen Screens umbricht statt den Titel zu kürzen */
function WrapHeader({ icon, title, subtitle, action }: { icon: ReactNode; title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-4 pb-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="mt-0.5 text-ink-3">{icon}</div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

function NoPostData({ compact }: { compact?: boolean }) {
  return (
    <EmptyState
      className={compact ? 'py-8' : undefined}
      icon={<ChartLine className="size-5" />}
      title="Noch keine Zahlen im Zeitraum"
      description="Sobald veröffentlichte Posts Kennzahlen haben, erscheint hier die Auswertung. Zahlen trägst du im Post-Editor nach – oder wähle einen längeren Zeitraum."
    />
  )
}

function MissingMetricsBanner({ missing }: { missing: Post[] }) {
  const openPost = useUi((s) => s.openPost)
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2.5 text-sm text-ink-2">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <span>
          <span className="font-semibold text-ink">
            {missing.length} veröffentlichte{missing.length === 1 ? 'r Post' : ' Posts'} ohne Zahlen
          </span>{' '}
          – trag Reichweite & Interaktionen nach, damit die Auswertung stimmt.
        </span>
      </p>
      <Button size="sm" onClick={() => openPost(missing[0].id)} className="self-start sm:self-auto">
        <PencilLine className="size-3.5" /> „{missing[0].title.length > 28 ? `${missing[0].title.slice(0, 28)}…` : missing[0].title}“ öffnen
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Follower-Wachstum
// ---------------------------------------------------------------------------

function FollowerCard({
  accounts,
  dates,
  startKey,
  className,
}: {
  accounts: ChannelAccount[]
  dates: string[]
  startKey: string
  className?: string
}) {
  const [mode, setMode] = useState<'abs' | 'idx'>('abs')
  const series = useMemo(() => PLATFORMS.filter((p) => accounts.some((a) => a.platform === p.id)), [accounts])

  const rows = useMemo(() => {
    const raw = dates.map((date) => {
      const row: Record<string, number | string | null> = { date }
      for (const a of accounts) row[a.platform] = a.history[0].date > date ? null : valueAt(a.history, date)
      return row
    })
    if (mode === 'abs') return raw
    const base: Record<string, number> = {}
    for (const a of accounts) {
      const first = raw.find((r) => typeof r[a.platform] === 'number')
      base[a.platform] = first ? (first[a.platform] as number) : 0
    }
    return raw.map((r) => {
      const out: Record<string, number | string | null> = { date: r.date }
      for (const a of accounts) {
        const v = r[a.platform]
        out[a.platform] = typeof v === 'number' && base[a.platform] ? Math.round((v / base[a.platform]) * 1000) / 10 : null
      }
      return out
    })
  }, [accounts, dates, mode])

  const table = useMemo(
    () =>
      series.map((p) => {
        const a = accounts.find((x) => x.platform === p.id) as ChannelAccount
        const start = valueAt(a.history, startKey) ?? a.history[0].value
        return { p, start, end: a.followers, diff: a.followers - start, pct: start ? (a.followers - start) / start : 0 }
      }),
    [series, accounts, startKey],
  )

  const valueFormat = (v: number) => (mode === 'abs' ? fmt.num(v) : v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))

  return (
    <Card className={cn('min-w-0', className)}>
      <WrapHeader
        icon={<Users className="size-4" />}
        title="Follower-Wachstum"
        subtitle={mode === 'abs' ? 'Wöchentliche Stände je Kanal' : 'Indexiert: Start des Zeitraums = 100 – so wird jeder Kanal vergleichbar'}
        action={
          <Segmented
            size="sm"
            value={mode}
            onChange={setMode}
            label="Darstellung"
            options={[
              { value: 'abs', label: 'Absolut' },
              { value: 'idx', label: 'Wachstum in %' },
            ]}
          />
        }
      />
      {series.length && dates.length >= 2 ? (
        <div className="px-5 pb-5">
          <Legend items={series.map((p) => ({ label: shortLabel(p), color: p.color }))} className="mb-3" />
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => formatDe(d, 'd. MMM')}
                axisLine={false}
                tickLine={false}
                tick={CHART.tick}
                minTickGap={28}
                tickMargin={8}
              />
              <YAxis
                width={48}
                axisLine={false}
                tickLine={false}
                tick={CHART.tick}
                allowDecimals={false}
                domain={mode === 'abs' ? [0, 'auto'] : ['auto', 'auto']}
                tickFormatter={(v: number) => v.toLocaleString('de-DE')}
              />
              <Tooltip
                cursor={{ stroke: 'var(--line-strong)' }}
                content={<ChartTooltip valueFormat={valueFormat} labelFormat={(l) => `Woche ab ${formatDe(String(l), 'd. MMMM yyyy')}`} />}
              />
              {mode === 'idx' ? <ReferenceLine y={100} stroke="var(--ink-3)" strokeDasharray="4 4" /> : null}
              {series.map((p) => (
                <Line
                  key={p.id}
                  type="monotone"
                  dataKey={p.id}
                  name={shortLabel(p)}
                  stroke={p.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          {mode === 'abs' && series.length > 1 ? (
            <p className="mt-2 text-[11px] text-ink-3">Tipp: Kleine Kanäle gehen neben Instagram unter – „Wachstum in %“ zeigt, wer wirklich zulegt.</p>
          ) : null}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[440px] text-xs">
              <caption className="sr-only">Follower je Kanal: Start des Zeitraums, aktueller Stand und Veränderung</caption>
              <thead>
                <tr className="border-b border-line text-left text-[11px] text-ink-3">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Kanal
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Start
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Aktuell
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Veränderung
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    in %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {table.map((r) => (
                  <tr key={r.p.id}>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2 text-ink-2">
                        <PlatformDot platform={r.p.id} size={18} />
                        {shortLabel(r.p)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-ink-3 tabular">{fmt.num(r.start)}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-ink tabular">{fmt.num(r.end)}</td>
                    <td className="py-2 pr-3 text-right text-ink-2 tabular">{fmt.signed(r.diff)}</td>
                    <td className="py-2 text-right">
                      <Delta value={r.pct * 100} suffix=" %" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-5">
          <EmptyState
            icon={<Users className="size-5" />}
            title="Noch keine Follower-Stände"
            description="Trag die aktuellen Follower-Zahlen deiner Kanäle ein – jede Woche ein Wert reicht, dann entsteht hier die Wachstumskurve."
            action={
              <Link
                to="/studio/einstellungen"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink shadow-soft hover:border-line-strong hover:bg-surface-2"
              >
                Zu den Kanälen <ArrowRight className="size-3.5" />
              </Link>
            }
          />
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Interaktionsrate nach Kanal
// ---------------------------------------------------------------------------

function ChannelRateCard({ posts, overall }: { posts: Post[]; overall: number }) {
  const items = useMemo(
    () =>
      PLATFORMS.map((p) => {
        const list = posts.filter((x) => x.platforms.includes(p.id))
        const a = aggregate(list)
        return {
          key: p.id,
          label: (
            <span className="flex items-center gap-2">
              <PlatformDot platform={p.id} size={16} />
              {shortLabel(p)}
            </span>
          ),
          value: a.rate,
          hint: `${a.count} ${a.count === 1 ? 'Post' : 'Posts'}`,
          count: a.count,
        }
      })
        .filter((i) => i.count > 0)
        .sort((a, b) => b.value - a.value),
    [posts],
  )
  return (
    <Card className="min-w-0">
      <CardHeader icon={<Gauge className="size-4" />} title="Interaktionsrate nach Kanal" subtitle={items.length ? `Ø gesamt ${fmt.pct(overall)}` : undefined} />
      <div className="px-5 pb-5">
        {items.length ? (
          <>
            <BarList items={items} format={fmt.pct} />
            <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
              Kennzahlen werden pro Post erfasst – ein Post auf mehreren Kanälen zählt für jeden davon.
            </p>
          </>
        ) : (
          <NoPostData compact />
        )}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Beste Posting-Zeiten (Heatmap, CSS-Grid)
// ---------------------------------------------------------------------------

const HOUR_BUCKETS = [
  { from: 6, to: 9, label: '6–9' },
  { from: 9, to: 12, label: '9–12' },
  { from: 12, to: 15, label: '12–15' },
  { from: 15, to: 18, label: '15–18' },
  { from: 18, to: 21, label: '18–21' },
  { from: 21, to: 24, label: '21–24' },
]
/** Zeilen Mo–So als getDay()-Werte */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
/** Sequenzielle Stufen (Akzent-Anteil in %), hell → dunkel */
const RAMP = [14, 32, 52, 74, 100]
const rampColor = (step: number) => `color-mix(in oklab, var(--accent) ${RAMP[step]}%, var(--surface-2))`

type HeatMetric = 'rate' | 'score'

function HeatmapCard({ posts, className }: { posts: Post[]; className?: string }) {
  const [metric, setMetric] = useState<HeatMetric>('rate')
  const [active, setActive] = useState<string | null>(null)

  const heat = useMemo(() => {
    const acc = DAY_ORDER.map(() => HOUR_BUCKETS.map(() => ({ count: 0, sum: 0 })))
    let outside = 0
    for (const p of posts) {
      const t = new Date(p.scheduledAt)
      const row = DAY_ORDER.indexOf(t.getDay())
      const h = t.getHours() + t.getMinutes() / 60
      const col = HOUR_BUCKETS.findIndex((b) => h >= b.from && h < b.to)
      if (col < 0) {
        outside++
        continue
      }
      acc[row][col].count++
      acc[row][col].sum += metric === 'rate' ? engagementRate(p) : engagement(p)
    }
    const cells = acc.flatMap((r, d) => r.map((c, b) => ({ id: `${d}-${b}`, d, b, count: c.count, avg: c.count ? c.sum / c.count : 0 })))
    const filled = cells.filter((c) => c.count > 0)
    const min = Math.min(...filled.map((c) => c.avg))
    const max = Math.max(...filled.map((c) => c.avg))
    const step = (v: number) => (max > min ? Math.min(RAMP.length - 1, Math.floor(((v - min) / (max - min)) * RAMP.length)) : 2)
    const top = [...filled].sort((a, b) => b.avg - a.avg || b.count - a.count).slice(0, 3)
    return { cells, filled, step, top, outside }
  }, [posts, metric])

  const fmtValue = (v: number) => (metric === 'rate' ? fmt.pct(v) : `${fmt.num(v)} Interaktionen`)
  const metricLabel = metric === 'rate' ? 'Interaktionsrate' : 'gewichtete Interaktionen'
  const slotLabel = (c: { d: number; b: number }) => `${DAY_LONG[DAY_ORDER[c.d]]}, ${HOUR_BUCKETS[c.b].label} Uhr`
  const activeCell = heat.cells.find((c) => c.id === active)
  const rankOf = new Map(heat.top.map((c, i) => [c.id, i + 1]))
  const thin = heat.top.some((c) => c.count < 2)

  return (
    <Card className={cn('min-w-0', className)}>
      <WrapHeader
        icon={<Clock3 className="size-4" />}
        title="Beste Posting-Zeiten"
        subtitle={`Ø ${metricLabel} nach Wochentag & Uhrzeit`}
        action={
          <Segmented
            size="sm"
            value={metric}
            onChange={setMetric}
            label="Kennzahl"
            options={[
              { value: 'rate', label: 'Rate' },
              { value: 'score', label: 'Interaktionen' },
            ]}
          />
        }
      />
      <div className="px-5 pb-5">
        {heat.filled.length ? (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_200px] 2xl:grid-cols-[minmax(0,1fr)_240px]">
            <div className="min-w-0">
              <div
                className="grid grid-cols-[2.25rem_repeat(6,minmax(0,1fr))] gap-1"
                role="grid"
                aria-label={`Heatmap: Ø ${metricLabel} nach Wochentag und Uhrzeit`}
                onMouseLeave={() => setActive(null)}
              >
                <div role="row" className="contents">
                  <div role="columnheader" className="flex items-end pb-1 text-[10px] text-ink-3">
                    Uhr
                  </div>
                  {HOUR_BUCKETS.map((b) => (
                    <div key={b.label} role="columnheader" className="pb-1 text-center text-[10px] font-medium text-ink-3 tabular">
                      {b.label}
                    </div>
                  ))}
                </div>
                {DAY_ORDER.map((day, d) => (
                  <div key={day} role="row" className="contents">
                    <div role="rowheader" className="flex items-center text-[11px] font-medium text-ink-2">
                      {WEEKDAYS_SHORT[day]}
                    </div>
                    {HOUR_BUCKETS.map((b, bi) => {
                      const c = heat.cells[d * HOUR_BUCKETS.length + bi]
                      const rank = rankOf.get(c.id)
                      const label = c.count
                        ? `${slotLabel(c)}: ${c.count} ${c.count === 1 ? 'Post' : 'Posts'}, Ø ${fmtValue(c.avg)}`
                        : `${slotLabel(c)}: keine Posts`
                      return (
                        <button
                            key={b.label}
                            type="button"
                            role="gridcell"
                            title={label}
                            aria-label={label}
                            onMouseEnter={() => setActive(c.id)}
                            onFocus={() => setActive(c.id)}
                            onBlur={() => setActive(null)}
                            className={cn(
                              'relative h-9 rounded-md transition-[box-shadow,transform] sm:h-10',
                              c.count ? 'hover:scale-[1.04]' : 'border border-dashed border-line',
                              active === c.id && 'ring-2 ring-ink/50 ring-offset-1 ring-offset-surface',
                            )}
                            style={c.count ? { background: rampColor(heat.step(c.avg)) } : undefined}
                          >
                            {rank ? (
                              <span className="absolute inset-0 m-auto flex size-5 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-ink shadow-soft">
                                {rank}
                              </span>
                            ) : null}
                          </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex min-h-9 items-center rounded-lg bg-surface-2/60 px-3 py-2 text-xs" aria-live="polite">
                {activeCell ? (
                  <span className="text-ink-2">
                    <span className="font-semibold text-ink">{slotLabel(activeCell)}</span>
                    {activeCell.count
                      ? ` · ${activeCell.count} ${activeCell.count === 1 ? 'Post' : 'Posts'} · Ø ${fmtValue(activeCell.avg)}`
                      : ' · noch keine Posts – ein Test lohnt sich'}
                  </span>
                ) : (
                  <span className="text-ink-3">Zeig auf ein Feld für Details.</span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-3">
                <span className="flex items-center gap-1.5" aria-hidden>
                  wenig
                  <span className="flex gap-0.5">
                    {RAMP.map((_, i) => (
                      <span key={i} className="h-2.5 w-5 rounded-[3px]" style={{ background: rampColor(i) }} />
                    ))}
                  </span>
                  viel
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-5 rounded-[3px] border border-dashed border-line-strong" aria-hidden /> keine Posts
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="flex size-4 items-center justify-center rounded-full bg-surface text-[9px] font-bold text-ink shadow-soft" aria-hidden>
                    1
                  </span>
                  Top-Slot
                </span>
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <Sparkles className="size-3.5 text-accent" aria-hidden /> Unsere Empfehlung
              </h3>
              <ol className="mt-3 space-y-2.5">
                {heat.top.map((c, i) => (
                  <li key={c.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent-text">
                      {i + 1}
                    </span>
                    <span className="min-w-0 text-xs">
                      <span className="block font-semibold text-ink">{slotLabel(c)}</span>
                      <span className="text-ink-3 tabular">
                        Ø {fmtValue(c.avg)} · {c.count} {c.count === 1 ? 'Post' : 'Posts'}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
                {thin ? 'Wenig Daten: Einzelne Posts prägen das Bild – lies es als Tendenz und teste gezielt. ' : ''}
                Leere Felder heißen nicht „schlecht“, sondern „noch nicht probiert“.
                {heat.outside ? ` ${heat.outside} ${heat.outside === 1 ? 'Post' : 'Posts'} vor 6 Uhr nicht berücksichtigt.` : ''}
              </p>
            </div>
          </div>
        ) : (
          <NoPostData compact />
        )}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Content-Säulen-Performance
// ---------------------------------------------------------------------------

function PillarCard({ posts, className }: { posts: Post[]; className?: string }) {
  const items = useMemo(
    () =>
      PILLARS.map((p) => {
        const a = aggregate(posts.filter((x) => x.pillar === p.id))
        return { id: p.id, rate: a.rate, count: a.count }
      })
        .filter((i) => i.count > 0)
        .sort((a, b) => b.rate - a.rate),
    [posts],
  )
  const best = items[0]
  const worst = items.length > 1 ? items[items.length - 1] : undefined
  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader icon={<Layers className="size-4" />} title="Content-Säulen-Performance" subtitle="Ø Interaktionsrate je Säule" />
      <div className="px-5 pb-5">
        {items.length ? (
          <>
            <BarList
              format={fmt.pct}
              items={items.map((i) => ({
                key: i.id,
                label: (
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: PILLAR[i.id].color }} aria-hidden />
                    {PILLAR[i.id].label}
                  </span>
                ),
                value: i.rate,
                hint: `${i.count} ${i.count === 1 ? 'Post' : 'Posts'}`,
              }))}
            />
            {best ? (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-accent-soft/60 px-3 py-2.5 text-xs leading-relaxed text-ink-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                <p>
                  <strong className="font-semibold text-ink">{PILLAR[best.id].label}</strong> zieht am stärksten (Ø {fmt.pct(best.rate)}).
                  {worst ? (
                    <>
                      {' '}
                      <strong className="font-semibold text-ink">{PILLAR[worst.id].label}</strong> bleibt mit Ø {fmt.pct(worst.rate)} zurück –
                      neuer Hook oder anderes Format?
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <NoPostData compact />
        )}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Top-Posts
// ---------------------------------------------------------------------------

function TopPostsCard({ posts, className }: { posts: Post[]; className?: string }) {
  const openPost = useUi((s) => s.openPost)
  const top = useMemo(() => [...posts].sort((a, b) => engagement(b) - engagement(a)).slice(0, 8), [posts])
  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader icon={<Trophy className="size-4" />} title="Top-Posts" subtitle="Die acht stärksten Posts nach Interaktionen – klick öffnet den Post" />
      {top.length ? (
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full min-w-[560px] text-xs">
            <caption className="sr-only">Top-Posts im Zeitraum mit Reichweite, Interaktionsrate und Speicherungen</caption>
            <thead>
              <tr className="text-left text-[11px] text-ink-3">
                <th scope="col" className="w-8 px-3 py-2 font-medium">
                  #
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Post
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Reichweite
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Interaktionsrate
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Gespeichert
                </th>
              </tr>
            </thead>
            <tbody>
              {top.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => openPost(p.id)}
                  className="cursor-pointer border-t border-line transition-colors hover:bg-surface-2/70"
                >
                  <td className="px-3 py-2.5 font-semibold text-ink-3 tabular">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <MediaThumb url={p.mediaUrl} tone={p.mediaTone} label={p.title} className="size-10 shrink-0 rounded-lg" />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openPost(p.id)
                          }}
                          className="block max-w-[18rem] truncate text-left text-[13px] font-medium text-ink hover:text-accent-text"
                        >
                          {p.title}
                        </button>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-3">
                          <PlatformStack platforms={p.platforms} size={16} />
                          {formatDe(p.scheduledAt, 'EEE, d. MMM')} · {FORMATS[p.format].label}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-ink tabular">{fmt.num(p.metrics?.reach ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-ink tabular">{fmt.pct(engagementRate(p))}</td>
                  <td className="px-3 py-2.5 text-right text-ink-2 tabular">{fmt.num(p.metrics?.saves ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 pb-5">
          <NoPostData compact />
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Format-Vergleich
// ---------------------------------------------------------------------------

function FormatCard({ posts }: { posts: Post[] }) {
  const items = useMemo(() => {
    const by = new Map<PostFormat, Post[]>()
    for (const p of posts) by.set(p.format, [...(by.get(p.format) ?? []), p])
    return Array.from(by.entries())
      .map(([f, list]) => {
        const a = aggregate(list)
        return { key: f, label: FORMATS[f].label, value: a.count ? a.reach / a.count : 0, rate: a.rate, hint: `${a.count} ${a.count === 1 ? 'Post' : 'Posts'}` }
      })
      .sort((a, b) => b.value - a.value)
  }, [posts])
  const bestReach = items[0]
  const bestRate = [...items].sort((a, b) => b.rate - a.rate)[0]
  return (
    <Card className="min-w-0">
      <CardHeader icon={<ChartLine className="size-4" />} title="Format-Vergleich" subtitle="Ø Reichweite pro Post" />
      <div className="px-5 pb-5">
        {items.length ? (
          <>
            <BarList items={items} format={(v) => fmt.num(v)} />
            {bestReach && bestRate && items.length > 1 ? (
              <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
                {bestReach.label} bringt die meiste Reichweite
                {bestRate.key !== bestReach.key
                  ? `, ${bestRate.label} die höchste Interaktionsrate (Ø ${fmt.pct(bestRate.rate)}). Reichweite ist nicht gleich Wirkung.`
                  : ` und die höchste Interaktionsrate (Ø ${fmt.pct(bestRate.rate)}).`}
              </p>
            ) : null}
          </>
        ) : (
          <NoPostData compact />
        )}
      </div>
    </Card>
  )
}
