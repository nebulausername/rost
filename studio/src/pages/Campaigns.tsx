import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns'
import {
  ArrowUpRight,
  CalendarRange,
  ChartGantt,
  ChartPie,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Coins,
  Flag,
  Gauge,
  Megaphone,
  MousePointerClick,
  Pause,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import { Delta, Legend, Meter, StatTile } from '../components/charts'
import { Badge, Button, Card, CardHeader, EmptyState, Input, PageHeader, Segmented, Select, Tint } from '../components/ui/primitives'
import { AD_CHANNEL, AD_CHANNELS, CAMPAIGN_STATUSES, KEYDATE_KINDS, OBJECTIVES } from '../lib/constants'
import { occurrencesBetween } from '../lib/keydates'
import { pacing, totals, type Pacing } from '../lib/metrics'
import { useStore, useUi } from '../lib/store'
import type { AdChannel, Campaign, CampaignStatus, DailyStat, KeyDateOccurrence } from '../lib/types'
import { clamp, cn, dayKey, fmt, sum } from '../lib/utils'

// ---------------------------------------------------------------------------
// Geteilte Bausteine (auch in der Kampagnen-Detailseite genutzt)
// ---------------------------------------------------------------------------

const CHANNEL_SHORT: Record<AdChannel, string> = {
  meta: 'Meta',
  influencer: 'Influencer',
  tiktok: 'TikTok',
  google: 'Google',
  pinterest: 'Pinterest',
  local: 'Lokal',
  email: 'E-Mail',
  print: 'Print',
}

/** Kanal-Chips in fester Reihenfolge, Farbe folgt dem Kanal */
export function ChannelChips({ channels, className, long }: { channels: AdChannel[]; className?: string; long?: boolean }) {
  const ordered = AD_CHANNELS.filter((c) => channels.includes(c.id))
  if (!ordered.length) return <span className={cn('text-xs text-ink-3', className)}>Kein Kanal</span>
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {ordered.map((c) => (
        <Tint key={c.id} color={c.color} title={c.label}>
          <span className="size-1.5 rounded-full" style={{ background: c.color }} aria-hidden />
          {long ? c.label : CHANNEL_SHORT[c.id]}
        </Tint>
      ))}
    </div>
  )
}

export function CampaignStatusBadge({ status, className }: { status: CampaignStatus; className?: string }) {
  const s = CAMPAIGN_STATUSES[status]
  return (
    <Badge tone={s.tone} dot className={className}>
      {s.label}
    </Badge>
  )
}

/** „1. Sep. – 30. Okt. 2026“ – Jahr nur einmal, wenn gleich */
export function DateRange({ start, end }: { start: string; end: string }) {
  const s = parseISO(start)
  const e = parseISO(end)
  const same = s.getFullYear() === e.getFullYear()
  return (
    <>
      {fmt.date(s, same ? 'd. MMM' : 'd. MMM yyyy')} – {fmt.date(e, 'd. MMM yyyy')}
    </>
  )
}

/** „noch 12 Tage“, „startet in 5 Tagen“, „beendet“ … */
export function RuntimeLabel({ campaign, today }: { campaign: Campaign; today: Date }) {
  const start = parseISO(campaign.startDate)
  const end = parseISO(campaign.endDate)
  const toStart = differenceInCalendarDays(start, today)
  const toEnd = differenceInCalendarDays(end, today)
  let text: string
  if (campaign.status === 'completed' || toEnd < 0) text = toEnd < 0 ? `beendet vor ${plural(-toEnd, 'Tag', 'Tagen')}` : 'beendet'
  else if (toStart > 1) text = `startet in ${toStart} Tagen`
  else if (toStart === 1) text = 'startet morgen'
  else if (toStart === 0) text = 'startet heute'
  else if (toEnd === 0) text = 'endet heute'
  else text = `noch ${plural(toEnd + 1, 'Tag', 'Tage')}`
  return <>{text}</>
}

function plural(n: number, one: string, many: string) {
  return `${fmt.num(n)} ${n === 1 ? one : many}`
}

type Tone = 'accent' | 'success' | 'warning'

function pacingView(c: Campaign, p: Pacing, spent: number): { tone: Tone; text: string; icon: LucideIcon } {
  if (c.status === 'paused') return { tone: 'warning', text: `Pausiert – ${fmt.eur(p.remaining)} Restbudget`, icon: Pause }
  switch (p.state) {
    case 'not-started':
      return { tone: 'accent', text: `Startklar – ≈ ${fmt.eur2(c.budget / p.totalDays)} pro Tag geplant`, icon: Flag }
    case 'done':
      return { tone: 'accent', text: `Abgeschlossen – ${fmt.pct(c.budget ? spent / c.budget : 0)} des Budgets genutzt`, icon: Flag }
    case 'over':
      return { tone: 'warning', text: `Zu schnell – Tageslimit auf ${fmt.eur(p.suggestedDaily)} senken`, icon: TriangleAlert }
    case 'under':
      return { tone: 'accent', text: `Zu langsam – ${fmt.eur(p.suggestedDaily)}/Tag möglich`, icon: Gauge }
    default:
      return { tone: 'success', text: 'Im Plan', icon: CircleCheck }
  }
}

const TONE_TEXT: Record<Tone, string> = {
  accent: 'text-accent-text',
  success: 'text-success',
  warning: 'text-warning',
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

type StatusFilter = 'all' | CampaignStatus
type SortKey = 'relevance' | 'start' | 'budget' | 'roas'
type Period = '30' | '90'

const STATUS_ORDER: Record<CampaignStatus, number> = { active: 0, paused: 1, planned: 2, completed: 3 }

const EMPTY_DAY = (date: string): DailyStat => ({ date, spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 })

function relChange(cur: number, prev: number) {
  return prev > 0 ? ((cur - prev) / prev) * 100 : null
}

export function CampaignsPage() {
  const campaigns = useStore((s) => s.campaigns)
  const demo = useStore((s) => s.settings.demoData)
  const openCampaign = useUi((s) => s.openCampaign)
  const navigate = useNavigate()
  const today = useMemo(() => startOfDay(new Date()), [])

  const [period, setPeriod] = useState<Period>('30')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [channels, setChannels] = useState<AdChannel[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('relevance')

  // --- Kennzahlen über alle Kampagnen im Zeitraum ---------------------------
  const kpi = useMemo(() => {
    const n = Number(period)
    const byDay = new Map<string, DailyStat>()
    for (const c of campaigns) {
      for (const d of c.daily) {
        const e = byDay.get(d.date)
        if (e) {
          e.spend += d.spend
          e.impressions += d.impressions
          e.clicks += d.clicks
          e.conversions += d.conversions
          e.revenue += d.revenue
        } else byDay.set(d.date, { ...d })
      }
    }
    // Heute zählt erst, wenn schon Werte erfasst sind – sonst endet die Kurve gestern.
    const end = byDay.has(dayKey(today)) ? today : subDays(today, 1)
    const keys = (offset: number) => Array.from({ length: n }, (_, i) => dayKey(subDays(end, offset + n - 1 - i)))
    const curKeys = keys(0)
    const prevKeys = keys(n)
    const curDays = curKeys.map((k) => byDay.get(k) ?? EMPTY_DAY(k))
    const prevDays = prevKeys.map((k) => byDay.get(k) ?? EMPTY_DAY(k))
    return {
      from: curKeys[0],
      to: curKeys[n - 1],
      curDays,
      cur: totals(curDays),
      prev: totals(prevDays),
      labels: curKeys.map((k) => fmt.date(k, 'd. MMM')),
    }
  }, [campaigns, period, today])

  const activeBudget = useMemo(() => {
    const active = campaigns.filter((c) => c.status === 'active')
    return { budget: sum(active, (c) => c.budget), spent: sum(active, (c) => sum(c.daily, (d) => d.spend)), count: active.length }
  }, [campaigns])

  // --- Filter & Sortierung ---------------------------------------------------
  const counts = useMemo(() => {
    const out: Record<StatusFilter, number> = { all: campaigns.length, active: 0, planned: 0, paused: 0, completed: 0 }
    for (const c of campaigns) out[c.status]++
    return out
  }, [campaigns])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = campaigns.filter((c) => {
      if (status !== 'all' && c.status !== status) return false
      if (channels.length && !c.channels.some((ch) => channels.includes(ch))) return false
      if (q) {
        const hay = [c.name, c.audience, c.offer, OBJECTIVES[c.objective].label, ...c.channels.map((ch) => AD_CHANNEL[ch].label)].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    const roas = (c: Campaign) => totals(c.daily).roas
    return list.sort((a, b) => {
      switch (sort) {
        case 'start':
          return b.startDate.localeCompare(a.startDate)
        case 'budget':
          return b.budget - a.budget
        case 'roas':
          return roas(b) - roas(a)
        default:
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.startDate.localeCompare(b.startDate)
      }
    })
  }, [campaigns, status, channels, query, sort])

  const filtered = status !== 'all' || channels.length > 0 || query.trim() !== ''
  const resetFilters = () => {
    setStatus('all')
    setChannels([])
    setQuery('')
  }

  const { cur, prev } = kpi
  const periodLabel = `letzte ${period} Tage`
  const revChange = relChange(cur.revenue, prev.revenue)
  const convChange = relChange(cur.conversions, prev.conversions)

  return (
    <div>
      <PageHeader
        eyebrow="Werbung"
        title="Kampagnen & Werbung"
        description="Alle bezahlten Aktionen an einem Ort: Budget im Blick, Pacing im Griff und sehen, was sich für Rösterei, Espressobar und Shop wirklich lohnt."
        actions={
          <>
            <Button onClick={() => navigate('/budget')}>
              <Wallet className="size-4" /> Budget-Planer
            </Button>
            <Button variant="primary" onClick={() => openCampaign(null)}>
              <Plus className="size-4" /> Neue Kampagne
            </Button>
          </>
        }
      />

      {/* KPI-Reihe */}
      <section aria-labelledby="kpi-heading" className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 id="kpi-heading" className="text-sm font-semibold text-ink">
              Leistung aller Kampagnen
            </h2>
            <span className="text-xs text-ink-3 tabular">
              {fmt.date(kpi.from, 'd. MMM')} – {fmt.date(kpi.to, 'd. MMM yyyy')}
            </span>
            {demo ? (
              <Badge tone="muted">Demo-Daten</Badge>
            ) : null}
          </div>
          <Segmented
            size="sm"
            label="Zeitraum"
            value={period}
            onChange={setPeriod}
            options={[
              { value: '30', label: '30 Tage' },
              { value: '90', label: '90 Tage' },
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Ausgaben"
            icon={<Coins className="size-4" />}
            value={fmt.eur(cur.spend)}
            trend={kpi.curDays.map((d) => d.spend)}
            trendLabels={kpi.labels}
            footnote={
              activeBudget.count ? (
                <div className="space-y-1.5">
                  <Meter value={activeBudget.spent} max={activeBudget.budget} height={5} label="Budgetverbrauch aktiver Kampagnen" />
                  <p>
                    Aktive Kampagnen: <span className="font-medium text-ink-2 tabular">{fmt.eur(activeBudget.spent)}</span> von{' '}
                    <span className="tabular">{fmt.eur(activeBudget.budget)}</span>
                  </p>
                </div>
              ) : (
                'Gerade läuft keine Kampagne'
              )
            }
          />
          <StatTile
            label="Umsatz aus Werbung"
            icon={<ShoppingBag className="size-4" />}
            value={fmt.eur(cur.revenue)}
            trend={kpi.curDays.map((d) => d.revenue)}
            trendLabels={kpi.labels}
            delta={revChange != null ? <Delta value={revChange} suffix=" %" /> : undefined}
            deltaLabel="vs. Vorperiode"
            footnote={
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <Target className="size-3" aria-hidden />
                ROAS <span className="font-semibold text-ink-2 tabular">{cur.spend ? fmt.ratio(cur.roas) : '–'}</span>
                {prev.spend && cur.spend ? (
                  <>
                    <Delta value={cur.roas - prev.roas} format={fmt.ratio} />
                    <span>vs. {fmt.ratio(prev.roas)}</span>
                  </>
                ) : null}
              </span>
            }
          />
          <StatTile
            label="Conversions"
            icon={<Sparkles className="size-4" />}
            value={fmt.num(cur.conversions)}
            trend={kpi.curDays.map((d) => d.conversions)}
            trendLabels={kpi.labels}
            delta={convChange != null ? <Delta value={convChange} suffix=" %" /> : undefined}
            deltaLabel="vs. Vorperiode"
            footnote={`CPA ${cur.conversions ? fmt.eur2(cur.cpa) : '–'} · CVR ${cur.clicks ? fmt.pct(cur.cvr) : '–'}`}
          />
          <StatTile
            label="Klickrate"
            icon={<MousePointerClick className="size-4" />}
            value={cur.impressions ? fmt.pct(cur.ctr) : '–'}
            delta={prev.impressions && cur.impressions ? <Delta value={(cur.ctr - prev.ctr) * 100} suffix=" Pp." /> : undefined}
            deltaLabel="vs. Vorperiode"
            footnote={`CPC ${cur.clicks ? fmt.eur2(cur.cpc) : '–'} · ${fmt.num(cur.clicks)} Klicks · ${fmt.compact(cur.impressions)} Impr.`}
          />
        </div>
      </section>

      {/* Filter */}
      <section aria-label="Kampagnen filtern" className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-4 overflow-x-auto px-4 pb-0.5 scrollbar-thin md:mx-0 md:px-0">
            <Segmented<StatusFilter>
              label="Status"
              value={status}
              onChange={setStatus}
              options={(['all', 'active', 'planned', 'paused', 'completed'] as const).map((s) => ({
                value: s,
                label: (
                  <>
                    {s === 'all' ? 'Alle' : CAMPAIGN_STATUSES[s].label}
                    <span className="text-[11px] text-ink-3 tabular">{counts[s]}</span>
                  </>
                ),
              }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kampagnen durchsuchen …"
                aria-label="Kampagnen durchsuchen"
                className="pl-9"
              />
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sortierung" className="w-auto!">
              <option value="relevance">Relevanz</option>
              <option value="start">Startdatum</option>
              <option value="budget">Budget</option>
              <option value="roas">ROAS</option>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Nach Kanal filtern">
          <button
            type="button"
            aria-pressed={channels.length === 0}
            onClick={() => setChannels([])}
            className={cn(
              'inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors',
              channels.length === 0 ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-ink-3 hover:border-line-strong hover:text-ink',
            )}
          >
            Alle Kanäle
          </button>
          {AD_CHANNELS.map((ch) => {
            const active = channels.includes(ch.id)
            return (
              <button
                key={ch.id}
                type="button"
                aria-pressed={active}
                onClick={() => setChannels((cur) => (active ? cur.filter((x) => x !== ch.id) : [...cur, ch.id]))}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
                  active ? 'tint tint-border' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
                )}
                style={{ '--c': ch.color } as CSSProperties}
              >
                <span className="size-2 rounded-full" style={{ background: ch.color }} aria-hidden />
                {ch.label}
              </button>
            )
          })}
          {filtered ? (
            <button type="button" onClick={resetFilters} className="ml-1 text-xs font-medium text-accent-text hover:underline">
              Filter zurücksetzen
            </button>
          ) : null}
        </div>
      </section>

      {/* Kampagnen-Karten */}
      {visible.length ? (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" aria-label="Kampagnen">
          {visible.map((c) => (
            <li key={c.id} className="flex">
              <CampaignCard campaign={c} today={today} />
            </li>
          ))}
        </ul>
      ) : campaigns.length ? (
        <EmptyState
          icon={<Search className="size-5" />}
          title="Keine Kampagne passt zu diesen Filtern"
          description="Lockere die Filter oder such nach einem anderen Begriff."
          action={<Button onClick={resetFilters}>Filter zurücksetzen</Button>}
        />
      ) : (
        <EmptyState
          icon={<Megaphone className="size-5" />}
          title="Noch keine Kampagne angelegt"
          description="Leg deine erste Kampagne an – mit Budget, Laufzeit, Zielgruppe und sauberem UTM-Link. Den Rest rechnen wir."
          action={
            <Button variant="primary" onClick={() => openCampaign(null)}>
              <Plus className="size-4" /> Erste Kampagne planen
            </Button>
          }
        />
      )}

      {/* Timeline & Kanal-Mix */}
      <div className="mt-8 grid gap-4 xl:grid-cols-3">
        <CampaignTimeline campaigns={campaigns} today={today} />
        <ChannelMix campaigns={campaigns} from={kpi.from} to={kpi.to} periodLabel={periodLabel} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kampagnen-Karte
// ---------------------------------------------------------------------------

function CampaignCard({ campaign: c, today }: { campaign: Campaign; today: Date }) {
  const t = totals(c.daily)
  const p = pacing(c, today)
  const view = pacingView(c, p, t.spend)
  const Icon = view.icon
  const hasData = c.daily.length > 0
  const showMarker = p.state === 'over' || p.state === 'under' || p.state === 'on-track'
  const kpis = [
    { label: 'CTR', value: hasData && t.impressions ? fmt.pct(t.ctr) : '–' },
    { label: 'CPC', value: hasData && t.clicks ? fmt.eur2(t.cpc) : '–' },
    { label: 'Conv.', value: hasData ? fmt.num(t.conversions) : '–' },
    { label: 'ROAS', value: hasData && t.spend ? fmt.ratio(t.roas) : '–' },
  ]
  return (
    <Link
      to={`/kampagnen/${c.id}`}
      className="group flex w-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CampaignStatusBadge status={c.status} />
          <span className="truncate text-xs text-ink-3">{OBJECTIVES[c.objective].label}</span>
        </div>
        <ArrowUpRight
          className="size-4 shrink-0 text-ink-3 opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
      </div>

      <h3 className="mt-3 line-clamp-2 font-display text-lg leading-snug font-semibold text-ink">{c.name}</h3>
      <ChannelChips channels={c.channels} className="mt-2.5" />

      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-2">
        <CalendarRange className="size-3.5 text-ink-3" aria-hidden />
        <span className="tabular">
          <DateRange start={c.startDate} end={c.endDate} />
        </span>
        <span className="text-ink-3">
          · <RuntimeLabel campaign={c} today={today} />
        </span>
      </p>

      <div className="mt-auto pt-5">
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
          <span className="text-ink-3">
            <span className="text-sm font-semibold text-ink tabular">{fmt.eur(t.spend)}</span> von <span className="tabular">{fmt.eur(c.budget)}</span>
          </span>
          <span className="text-ink-3 tabular">{fmt.pct(p.spendShare)}</span>
        </div>
        <Meter value={t.spend} max={c.budget} marker={showMarker ? p.expected : undefined} tone={view.tone} label={`Budgetverbrauch ${c.name}`} />
        <p className={cn('mt-2 flex items-center gap-1.5 text-xs font-medium', TONE_TEXT[view.tone])}>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{view.text}</span>
        </p>

        <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-3">
          {kpis.map((k) => (
            <div key={k.label} className="min-w-0">
              <dt className="text-[11px] text-ink-3">{k.label}</dt>
              <dd className="truncate text-[13px] font-semibold text-ink tabular">{k.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Kanal-Mix
// ---------------------------------------------------------------------------

function ChannelMix({ campaigns, from, to, periodLabel }: { campaigns: Campaign[]; from: string; to: string; periodLabel: string }) {
  const rows = useMemo(() => {
    const spend = Object.fromEntries(AD_CHANNELS.map((c) => [c.id, 0])) as Record<AdChannel, number>
    const revenue = Object.fromEntries(AD_CHANNELS.map((c) => [c.id, 0])) as Record<AdChannel, number>
    const count = Object.fromEntries(AD_CHANNELS.map((c) => [c.id, 0])) as Record<AdChannel, number>
    for (const c of campaigns) {
      if (!c.channels.length) continue
      let touched = false
      for (const d of c.daily) {
        if (d.date < from || d.date > to) continue
        touched = true
        // Mehrkanal-Kampagnen: Ausgaben gleichmäßig auf ihre Kanäle verteilen
        for (const ch of c.channels) {
          spend[ch] += d.spend / c.channels.length
          revenue[ch] += d.revenue / c.channels.length
        }
      }
      if (touched) for (const ch of c.channels) count[ch]++
    }
    return AD_CHANNELS.map((c) => ({ ...c, value: spend[c.id], revenue: revenue[c.id], campaigns: count[c.id] }))
  }, [campaigns, from, to])
  const total = sum(rows, (r) => r.value)
  const withSpend = rows.filter((r) => r.value > 0)
  const ranked = [...withSpend].sort((a, b) => b.value - a.value)
  const max = Math.max(1, ...ranked.map((r) => r.value))

  return (
    <Card className="flex flex-col">
      <CardHeader title="Kanal-Mix" subtitle={`Ausgaben nach Kanal · ${periodLabel}`} icon={<ChartPie className="size-4" />} />
      <div className="flex flex-1 flex-col px-5 pb-5">
        {total > 0 ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-2xl font-semibold tracking-tight text-ink">{fmt.eur(total)}</p>
              <p className="text-xs text-ink-3">{plural(withSpend.length, 'Kanal', 'Kanäle')} im Einsatz</p>
            </div>
            {/* Anteile als ein gestapelter Balken – feste Kanal-Reihenfolge */}
            <div
              className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
              role="img"
              aria-label={`Anteile: ${ranked.map((r) => `${r.label} ${fmt.pct(r.value / total)}`).join(', ')}`}
            >
              {withSpend.map((r) => (
                <div
                  key={r.id}
                  className="h-full border-r-2 border-surface last:border-r-0"
                  style={{ width: `${(r.value / total) * 100}%`, background: r.color }}
                  title={`${r.label}: ${fmt.eur(r.value)}`}
                />
              ))}
            </div>
            <ul className="mt-5 space-y-4">
              {ranked.map((r) => (
                <li key={r.id}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-ink-2">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
                      <span className="truncate">{r.label}</span>
                    </span>
                    <span className="shrink-0 tabular">
                      <span className="font-semibold text-ink">{fmt.eur(r.value)}</span>
                      <span className="ml-1.5 text-ink-3">{fmt.pct(r.value / total)}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-2">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-3 tabular">
                    {plural(r.campaigns, 'Kampagne', 'Kampagnen')} · Umsatz {fmt.eur(r.revenue)} · ROAS {r.value ? fmt.ratio(r.revenue / r.value) : '–'}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-5 text-[11px] leading-relaxed text-ink-3">
              Kampagnen über mehrere Kanäle werden gleichmäßig aufgeteilt, bis die Meta- & Google-Anbindung echte Kanalwerte liefert.
            </p>
          </>
        ) : (
          <EmptyState
            className="flex-1"
            icon={<ChartPie className="size-5" />}
            title="Noch keine Ausgaben im Zeitraum"
            description="Sobald Tageswerte erfasst sind, siehst du hier, wohin dein Budget fließt."
          />
        )}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Timeline (Gantt)
// ---------------------------------------------------------------------------

type Hover = { kind: 'campaign'; id: string } | { kind: 'date'; occ: KeyDateOccurrence } | null

const WINDOW_MONTHS = 6

// Halbtransparente Füllung: Monatslinien & Heute-Linie scheinen durch, Text bleibt obenauf
const BAR_STYLE: Record<CampaignStatus, { color: string; fill: number; dashed?: boolean; progress: string }> = {
  active: { color: 'var(--accent)', fill: 16, progress: 'var(--accent)' },
  paused: { color: 'var(--warning)', fill: 18, progress: 'var(--warning)' },
  planned: { color: 'var(--ink-3)', fill: 12, dashed: true, progress: 'var(--accent)' },
  completed: { color: 'var(--ink-3)', fill: 20, progress: 'var(--ink-3)' },
}

const barCss = (s: (typeof BAR_STYLE)[CampaignStatus]): CSSProperties => ({
  background: `color-mix(in oklab, ${s.color} ${s.fill}%, transparent)`,
  borderColor: `color-mix(in oklab, ${s.color} ${s.dashed ? 55 : 38}%, transparent)`,
  borderStyle: s.dashed ? 'dashed' : 'solid',
  color: `color-mix(in oklab, ${s.color} 70%, var(--ink))`,
})

const STATUS_DOT: Record<CampaignStatus, string> = {
  active: 'var(--success)',
  paused: 'var(--warning)',
  planned: 'var(--ink-3)',
  completed: 'var(--line-strong)',
}

function CampaignTimeline({ campaigns, today }: { campaigns: Campaign[]; today: Date }) {
  const keyDates = useStore((s) => s.keyDates)
  const [offset, setOffset] = useState(0)
  const [hover, setHover] = useState<Hover>(null)

  const win = useMemo(() => {
    const start = startOfMonth(addMonths(today, offset - 2))
    const end = endOfMonth(addMonths(start, WINDOW_MONTHS - 1))
    const days = differenceInCalendarDays(end, start) + 1
    const months = Array.from({ length: WINDOW_MONTHS }, (_, i) => addMonths(start, i))
    return { start, end, days, months }
  }, [today, offset])

  const pct = (d: Date) => (differenceInCalendarDays(d, win.start) / win.days) * 100

  const rows = useMemo(
    () =>
      campaigns
        .filter((c) => parseISO(c.startDate) <= win.end && parseISO(c.endDate) >= win.start)
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate)),
    [campaigns, win],
  )
  const occ = useMemo(() => occurrencesBetween(keyDates, win.start, win.end), [keyDates, win])
  const showToday = today >= win.start && today <= win.end
  const todayPct = pct(today) + 50 / win.days
  const rangeLabel = `${fmt.date(win.months[0], 'MMM yyyy')} – ${fmt.date(win.months[WINDOW_MONTHS - 1], 'MMM yyyy')}`

  const hoverCampaign = hover?.kind === 'campaign' ? campaigns.find((c) => c.id === hover.id) : undefined

  return (
    <Card className="flex min-w-0 flex-col xl:col-span-2">
      <CardHeader
        title="Timeline"
        subtitle={`${rangeLabel} · Kampagnen & Anlässe aus dem Jahresplan`}
        icon={<ChartGantt className="size-4" />}
        action={
          <>
            <Button variant="ghost" size="icon-sm" onClick={() => setOffset((o) => o - 1)} aria-label="Einen Monat zurück">
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="sm" onClick={() => setOffset(0)} disabled={offset === 0}>
              Heute
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setOffset((o) => o + 1)} aria-label="Einen Monat vor">
              <ChevronRight className="size-4" />
            </Button>
          </>
        }
      />
      <div className="px-5 pb-3">
        <Legend
          items={[
            { label: 'Aktiv', color: 'color-mix(in oklab, var(--accent) 45%, var(--surface))' },
            { label: 'Geplant', color: 'var(--ink-3)', dashed: true },
            { label: 'Pausiert', color: 'color-mix(in oklab, var(--warning) 45%, var(--surface))' },
            { label: 'Abgeschlossen', color: 'var(--surface-3)' },
            { label: 'Budget verbraucht (Unterkante)', color: 'var(--accent)' },
          ]}
        />
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex min-w-[720px]">
          {/* Namensspalte (bleibt beim horizontalen Scrollen stehen) */}
          <div className="sticky left-0 z-20 w-40 shrink-0 bg-surface pl-5 sm:w-52">
            <div className="flex h-10 items-end pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">Kampagne</div>
            <div className="flex h-8 items-center border-y border-line text-[11px] font-medium text-ink-3">Anlässe</div>
            {rows.map((c) => (
              <Link
                key={c.id}
                to={`/kampagnen/${c.id}`}
                onMouseEnter={() => setHover({ kind: 'campaign', id: c.id })}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ kind: 'campaign', id: c.id })}
                onBlur={() => setHover(null)}
                className={cn(
                  '-ml-5 flex h-11 items-center gap-2 border-b border-line/70 pr-3 pl-5 text-[13px] transition-colors',
                  hoverCampaign?.id === c.id ? 'bg-surface-2/60 text-ink' : 'text-ink-2',
                )}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_DOT[c.status] }} aria-hidden />
                <span className={cn('truncate', hoverCampaign?.id === c.id && 'font-medium')}>{c.name}</span>
              </Link>
            ))}
          </div>

          {/* Zeitachse */}
          <div className="relative min-w-0 flex-1 pr-5">
            <div className="relative h-full">
              {/* Monatslinien */}
              {win.months.map((m, i) =>
                i === 0 ? null : (
                  <div key={m.toISOString()} className="absolute top-0 bottom-0 w-px" style={{ left: `${pct(m)}%`, background: 'var(--grid)' }} aria-hidden />
                ),
              )}

              {/* Heute-Linie (hinter den Balken) */}
              {showToday ? (
                <div className="pointer-events-none absolute top-9 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-accent" style={{ left: `${todayPct}%` }} aria-hidden />
              ) : null}

              {/* Monatsköpfe */}
              <div className="relative h-10">
                {win.months.map((m, i) => {
                  const current = isSameMonth(m, today)
                  const next = i + 1 < win.months.length ? pct(win.months[i + 1]) : 100
                  return (
                    <div
                      key={m.toISOString()}
                      className={cn('absolute top-1.5 truncate pl-2 text-[11px]', current ? 'font-semibold text-ink' : 'font-medium text-ink-3')}
                      style={{ left: `${pct(m)}%`, width: `${next - pct(m)}%` }}
                    >
                      {fmt.date(m, i === 0 || m.getMonth() === 0 ? 'MMMM yyyy' : 'MMMM')}
                    </div>
                  )
                })}
                {showToday ? (
                  <span
                    className="absolute bottom-1 z-10 -translate-x-1/2 rounded-full bg-accent px-1.5 text-[10px] leading-4 font-semibold text-white shadow-soft"
                    style={{ left: `${todayPct}%` }}
                  >
                    Heute
                  </span>
                ) : null}
              </div>

              {/* Anlässe */}
              <div className="relative h-8 border-y border-line">
                {occ.map((o) => {
                  const multi = differenceInCalendarDays(o.end, o.start) > 0
                  const color = KEYDATE_KINDS[o.keyDate.kind].color
                  const left = clamp(pct(o.start), 0, 100)
                  const right = clamp(pct(addDays(o.end, 1)), 0, 100)
                  const label = `${o.keyDate.title} · ${fmt.date(o.start, 'd. MMM')}${multi ? ` – ${fmt.date(o.end, 'd. MMM')}` : ''}`
                  const isHover = hover?.kind === 'date' && hover.occ === o
                  const diamond = (
                    <span
                      className={cn('size-2.5 rotate-45 rounded-[2px] ring-2 ring-surface transition-transform', isHover && 'scale-125')}
                      style={{ background: color }}
                    />
                  )
                  const events = {
                    onMouseEnter: () => setHover({ kind: 'date', occ: o }),
                    onMouseLeave: () => setHover(null),
                  }
                  return multi ? (
                    <span
                      key={`${o.keyDate.id}-${o.start.toISOString()}`}
                      role="img"
                      aria-label={label}
                      title={label}
                      {...events}
                      className="absolute top-0 flex h-full items-center"
                      style={{ left: `${left}%`, width: `${Math.max(0.8, right - left)}%` }}
                    >
                      <span className="h-1.5 w-full rounded-full transition-opacity" style={{ background: color, opacity: isHover ? 0.75 : 0.35 }} />
                      {o.start >= win.start ? <span className="absolute left-0 flex -translate-x-1/2">{diamond}</span> : null}
                    </span>
                  ) : (
                    <span
                      key={`${o.keyDate.id}-${o.start.toISOString()}`}
                      role="img"
                      aria-label={label}
                      title={label}
                      {...events}
                      className="absolute top-0 z-[1] flex h-full w-4 -translate-x-1/2 items-center justify-center"
                      style={{ left: `${left + 50 / win.days}%` }}
                    >
                      {diamond}
                    </span>
                  )
                })}
              </div>

              {/* Kampagnen-Balken */}
              {rows.map((c) => {
                const s = parseISO(c.startDate)
                const e = parseISO(c.endDate)
                const left = Math.max(0, pct(s))
                const right = Math.min(100, pct(addDays(e, 1)))
                const width = Math.max(0, right - left)
                const clipL = s < win.start
                const clipR = e > win.end
                const style = BAR_STYLE[c.status]
                const spent = sum(c.daily, (d) => d.spend)
                const share = c.budget ? clamp(spent / c.budget, 0, 1) : 0
                // Unterkante relativ zur vollen Laufzeit, auch wenn der Balken am Fensterrand abgeschnitten ist
                const fullLeft = pct(s)
                const progressEnd = fullLeft + share * (pct(addDays(e, 1)) - fullLeft)
                const progress = width ? clamp((progressEnd - left) / width, 0, 1) : 0
                const isHover = hoverCampaign?.id === c.id
                return (
                  <div key={c.id} className={cn('relative h-11 border-b border-line/70 transition-colors', isHover && 'bg-surface-2/60')}>
                    <Link
                      to={`/kampagnen/${c.id}`}
                      onMouseEnter={() => setHover({ kind: 'campaign', id: c.id })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ kind: 'campaign', id: c.id })}
                      onBlur={() => setHover(null)}
                      aria-label={`${c.name}, ${CAMPAIGN_STATUSES[c.status].label}, Budget ${fmt.eur(c.budget)}`}
                      className={cn(
                        'absolute top-1/2 flex h-7 -translate-y-1/2 items-center gap-1.5 overflow-hidden rounded-lg border px-2 text-[11px] font-medium transition-shadow',
                        clipL && 'rounded-l-none border-l-0',
                        clipR && 'rounded-r-none border-r-0',
                        isHover && 'shadow-lift',
                      )}
                      style={{ left: `${left}%`, width: `${width}%`, minWidth: 8, ...barCss(style) }}
                    >
                      {width > 5 ? (
                        <span className="flex shrink-0 -space-x-0.5" aria-hidden>
                          {AD_CHANNELS.filter((ch) => c.channels.includes(ch.id)).map((ch) => (
                            <span key={ch.id} className="size-2 rounded-full ring-1 ring-surface" style={{ background: ch.color }} />
                          ))}
                        </span>
                      ) : null}
                      {width > 7 + c.channels.length * 1.5 + fmt.eur(c.budget).length * 1.4 ? <span className="whitespace-nowrap tabular">{fmt.eur(c.budget)}</span> : null}
                      {spent > 0 ? (
                        <span className="absolute bottom-0 left-0 h-[3px] rounded-r-full" style={{ width: `${progress * 100}%`, background: style.progress }} aria-hidden />
                      ) : null}
                    </Link>
                  </div>
                )
              })}

              {!rows.length ? (
                <p className="py-10 text-center text-xs text-ink-3">In diesem Zeitraum läuft keine Kampagne – Platz für eine neue Idee.</p>
              ) : null}

            </div>
          </div>
        </div>
      </div>

      {/* Detailzeile – ersetzt schwebende Tooltips, damit im Scroll-Container nichts abgeschnitten wird */}
      <div className="mt-auto flex min-h-14 items-center border-t border-line bg-surface-2/40 px-5 py-2.5 text-xs" aria-live="polite">
        {hoverCampaign ? (
          <TimelineCampaignInfo campaign={hoverCampaign} today={today} />
        ) : hover?.kind === 'date' ? (
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <span className="size-2 rotate-45 rounded-[2px]" style={{ background: KEYDATE_KINDS[hover.occ.keyDate.kind].color }} aria-hidden />
              {hover.occ.keyDate.title}
              <span className="font-normal text-ink-3">
                {fmt.date(hover.occ.start, 'EEE, d. MMM')}
                {hover.occ.end > hover.occ.start ? ` – ${fmt.date(hover.occ.end, 'EEE, d. MMM')}` : ''}
              </span>
            </p>
            <p className="mt-0.5 truncate text-ink-2">{hover.occ.keyDate.angle}</p>
          </div>
        ) : (
          <p className="text-ink-3">
            {plural(rows.length, 'Kampagne', 'Kampagnen')} und {plural(occ.length, 'Anlass', 'Anlässe')} im Zeitraum. Fahre über einen Balken oder eine Raute für
            Details – Klick öffnet die Kampagne.
          </p>
        )}
      </div>
    </Card>
  )
}

function TimelineCampaignInfo({ campaign: c, today }: { campaign: Campaign; today: Date }) {
  const t = totals(c.daily)
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
      <span className="flex min-w-0 items-center gap-2">
        <CampaignStatusBadge status={c.status} />
        <span className="truncate font-semibold text-ink">{c.name}</span>
      </span>
      <span className="text-ink-2 tabular">
        <DateRange start={c.startDate} end={c.endDate} /> · <RuntimeLabel campaign={c} today={today} />
      </span>
      <span className="text-ink-2 tabular">
        <span className="font-semibold text-ink">{fmt.eur(t.spend)}</span> von {fmt.eur(c.budget)}
      </span>
      {t.spend ? <span className="text-ink-2 tabular">ROAS {fmt.ratio(t.roas)}</span> : null}
    </div>
  )
}
