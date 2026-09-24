import { addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import {
  ArrowLeft,
  CalendarPlus,
  CalendarRange,
  ChartColumn,
  ChartLine,
  CircleCheck,
  ClipboardList,
  Coins,
  Copy,
  Download,
  ExternalLink,
  Flag,
  Funnel,
  Gauge,
  Lightbulb,
  Link2,
  MapPin,
  Megaphone,
  MousePointerClick,
  NotebookPen,
  Pencil,
  Plus,
  Rocket,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART, ChartTooltip, Delta, Legend, Meter, StatTile } from '../components/charts'
import { MediaThumb, PlatformStack, StatusBadge } from '../components/domain'
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, Segmented, Select, Textarea } from '../components/ui/primitives'
import { CAMPAIGN_STATUSES, OBJECTIVES } from '../lib/constants'
import { pacing, totals, type CampaignTotals, type Pacing } from '../lib/metrics'
import { useStore, useUi } from '../lib/store'
import type { Campaign, CampaignStatus, DailyStat } from '../lib/types'
import { buildUtmUrl, cn, dayKey, downloadFile, fmt, slugify, sum } from '../lib/utils'
import { CampaignStatusBadge, ChannelChips, DateRange, RuntimeLabel } from './Campaigns'

const ACTIVE_DOT = { r: 4, stroke: 'var(--surface)', strokeWidth: 2 }

export function CampaignDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const campaign = useStore((s) => s.campaigns.find((c) => c.id === id))

  if (!campaign) {
    return (
      <div className="py-10">
        <EmptyState
          icon={<Megaphone className="size-5" />}
          title="Diese Kampagne gibt es nicht (mehr)"
          description="Vielleicht wurde sie gelöscht oder der Link ist veraltet. Alle laufenden und geplanten Kampagnen findest du in der Übersicht."
          action={
            <Button onClick={() => navigate('/kampagnen')}>
              <ArrowLeft className="size-4" /> Alle Kampagnen
            </Button>
          }
        />
      </div>
    )
  }
  return <CampaignDetail key={campaign.id} campaign={campaign} />
}

// ---------------------------------------------------------------------------
// Detailansicht
// ---------------------------------------------------------------------------

function CampaignDetail({ campaign: c }: { campaign: Campaign }) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const navigate = useNavigate()
  const upsertCampaign = useStore((s) => s.upsertCampaign)
  const deleteCampaign = useStore((s) => s.deleteCampaign)
  const demo = useStore((s) => s.settings.demoData)
  const openCampaign = useUi((s) => s.openCampaign)
  const toast = useUi((s) => s.toast)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const t = useMemo(() => totals(c.daily), [c.daily])
  const p = useMemo(() => pacing(c, today), [c, today])
  const recent = c.daily.slice(-30)
  const trendLabels = recent.map((d) => fmt.date(d.date, 'd. MMM'))
  const tg = c.targets
  const hasData = c.daily.length > 0

  const setStatus = (status: CampaignStatus) => {
    if (status === c.status) return
    upsertCampaign({ ...c, status })
    toast({ title: `Status: ${CAMPAIGN_STATUSES[status].label}`, description: c.name, tone: 'success' })
  }

  const remove = () => {
    setConfirmDelete(false)
    navigate('/kampagnen')
    deleteCampaign(c.id)
    toast({ title: 'Kampagne gelöscht', description: `„${c.name}“ ist weg. Verknüpfte Posts bleiben erhalten.` })
  }

  const dash = (v: string, ok: boolean) => (ok ? v : '–')

  return (
    <div>
      {/* Kopf */}
      <header className="mb-6">
        <Link to="/kampagnen" className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-ink-3 transition-colors hover:text-ink">
          <ArrowLeft className="size-3.5" /> Alle Kampagnen
        </Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CampaignStatusBadge status={c.status} />
              <span className="text-xs font-semibold tracking-[0.14em] text-accent-text uppercase">{OBJECTIVES[c.objective].label}</span>
              <span className="text-xs text-ink-3">· KPI: {OBJECTIVES[c.objective].kpi}</span>
              {demo ? <Badge tone="muted">Demo-Daten</Badge> : null}
            </div>
            <h1 className="mt-2 font-display text-3xl leading-tight font-semibold text-ink md:text-[34px]">{c.name}</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-2">
              <span className="inline-flex items-center gap-1.5 tabular">
                <CalendarRange className="size-4 text-ink-3" aria-hidden />
                <DateRange start={c.startDate} end={c.endDate} />
                <span className="text-ink-3">
                  · {p.totalDays} Tage · <RuntimeLabel campaign={c} today={today} />
                </span>
              </span>
              <ChannelChips channels={c.channels} long />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={c.status} onChange={(e) => setStatus(e.target.value as CampaignStatus)} aria-label="Status ändern" className="w-auto! min-w-36">
              {(Object.keys(CAMPAIGN_STATUSES) as CampaignStatus[]).map((s) => (
                <option key={s} value={s}>
                  {CAMPAIGN_STATUSES[s].label}
                </option>
              ))}
            </Select>
            <Button onClick={() => openCampaign(c.id)}>
              <Pencil className="size-4" /> Bearbeiten
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(true)} aria-label="Kampagne löschen" title="Kampagne löschen">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <section aria-label="Kennzahlen" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Ausgaben"
          icon={<Coins className="size-4" />}
          value={fmt.eur(t.spend)}
          trend={recent.map((d) => d.spend)}
          trendLabels={trendLabels}
          footnote={
            <div className="space-y-1.5">
              <Meter
                value={t.spend}
                max={c.budget}
                marker={p.state === 'over' || p.state === 'under' || p.state === 'on-track' ? p.expected : undefined}
                tone={p.state === 'over' || c.status === 'paused' ? 'warning' : p.state === 'on-track' ? 'success' : 'accent'}
                height={5}
                label="Budgetverbrauch"
              />
              <p className="tabular">
                {fmt.pct(p.spendShare)} von {fmt.eur(c.budget)} Budget
              </p>
            </div>
          }
        />
        <StatTile
          label="Klicks"
          icon={<MousePointerClick className="size-4" />}
          value={fmt.num(t.clicks)}
          trend={recent.map((d) => d.clicks)}
          trendLabels={trendLabels}
          delta={tg.ctr != null && t.impressions ? <Delta value={(t.ctr - tg.ctr) * 100} suffix=" Pp." /> : undefined}
          deltaLabel={tg.ctr != null && t.impressions ? `CTR ${fmt.pct(t.ctr)} · Ziel ≥ ${fmt.pct(tg.ctr)}` : undefined}
          footnote={[
            tg.ctr == null || !t.impressions ? `CTR ${dash(fmt.pct(t.ctr), t.impressions > 0)}${tg.ctr != null ? ` (Ziel ≥ ${fmt.pct(tg.ctr)})` : ''}` : null,
            `CPC ${dash(fmt.eur2(t.cpc), t.clicks > 0)}${tg.cpc != null ? ` (Ziel ≤ ${fmt.eur2(tg.cpc)})` : ''}`,
            `${fmt.compact(t.impressions)} Impr.`,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <StatTile
          label="Conversions"
          icon={<Sparkles className="size-4" />}
          value={fmt.num(t.conversions)}
          trend={recent.map((d) => d.conversions)}
          trendLabels={trendLabels}
          delta={tg.cpa != null && t.conversions ? <Delta value={t.cpa - tg.cpa} goodWhenUp={false} format={fmt.eur2} /> : undefined}
          deltaLabel={tg.cpa != null && t.conversions ? `CPA ${fmt.eur2(t.cpa)} · Ziel ≤ ${fmt.eur2(tg.cpa)}` : undefined}
          footnote={
            tg.cpa != null && t.conversions
              ? `CVR ${fmt.pct(t.cvr)}`
              : `CPA ${dash(fmt.eur2(t.cpa), t.conversions > 0)}${tg.cpa != null ? ` · Ziel ≤ ${fmt.eur2(tg.cpa)}` : ''} · CVR ${dash(fmt.pct(t.cvr), t.clicks > 0)}`
          }
        />
        <StatTile
          label="Umsatz"
          icon={<ShoppingBag className="size-4" />}
          value={fmt.eur(t.revenue)}
          trend={recent.map((d) => d.revenue)}
          trendLabels={trendLabels}
          delta={tg.roas != null && t.spend ? <Delta value={t.roas - tg.roas} format={fmt.ratio} /> : undefined}
          deltaLabel={tg.roas != null && t.spend ? `ROAS ${fmt.ratio(t.roas)} · Ziel ≥ ${fmt.ratio(tg.roas)}` : undefined}
          footnote={tg.roas != null && t.spend ? undefined : `ROAS ${dash(fmt.ratio(t.roas), t.spend > 0)}${tg.roas != null ? ` · Ziel ≥ ${fmt.ratio(tg.roas)}` : ''}`}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <PacingCard campaign={c} pacing={p} spent={t.spend} today={today} />
        <div className="flex flex-col gap-4">
          <RecommendationsCard campaign={c} totals={t} pacing={p} today={today} />
          <NotesCard campaign={c} />
        </div>

        <DailyPerformanceCard campaign={c} hasData={hasData} />
        <FunnelCard totals={t} hasData={hasData} />

        <TargetingCard campaign={c} />
        <UtmCard campaign={c} />
        <LinkedPostsCard campaign={c} />

        <DailyStatsCard campaign={c} today={today} />
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Kampagne löschen?"
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Abbrechen</Button>
            <Button variant="danger" onClick={remove}>
              <Trash2 className="size-4" /> Endgültig löschen
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          „<span className="font-medium text-ink">{c.name}</span>“ wird mit allen {c.daily.length} Tageswerten gelöscht. Verknüpfte Posts bleiben erhalten, verlieren aber
          die Zuordnung. Das lässt sich nicht rückgängig machen.
        </p>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Budget-Pacing
// ---------------------------------------------------------------------------

interface PacingRow {
  date: string
  soll: number
  ist?: number
  prognose?: number
}

function PacingCard({ campaign: c, pacing: p, spent, today }: { campaign: Campaign; pacing: Pacing; spent: number; today: Date }) {
  const model = useMemo(() => {
    const start = parseISO(c.startDate)
    const end = parseISO(c.endDate)
    const total = Math.max(1, differenceInCalendarDays(end, start) + 1)
    const spendByDate = new Map(c.daily.map((d) => [d.date, d.spend]))
    // „Ist“ reicht bis heute, falls heute schon erfasst ist – sonst bis gestern.
    const lastActual = spendByDate.has(dayKey(today)) ? today : addDays(today, -1)
    const actualEnd = lastActual < end ? lastActual : end
    const actualKey = dayKey(actualEnd)
    const last7 = c.daily.filter((d) => d.date <= actualKey).slice(-7)
    const avg = last7.length ? sum(last7, (d) => d.spend) / last7.length : 0
    const forecast = c.status === 'active' && actualEnd >= start && actualEnd < end && avg > 0
    const rows: PacingRow[] = []
    let cum = 0
    let cumAtActual = 0
    for (let i = 0; i < total; i++) {
      const d = addDays(start, i)
      const k = dayKey(d)
      cum += spendByDate.get(k) ?? 0
      const row: PacingRow = { date: k, soll: (c.budget * (i + 1)) / total }
      if (c.daily.length && d <= actualEnd) {
        row.ist = cum
        cumAtActual = cum
      }
      if (forecast) {
        const n = differenceInCalendarDays(d, actualEnd)
        if (n >= 0) row.prognose = cumAtActual + avg * n
      }
      rows.push(row)
    }
    const projected = forecast ? cumAtActual + avg * differenceInCalendarDays(end, actualEnd) : spent
    return { rows, avg, forecast, projected, start, end }
  }, [c, today, spent])

  const todayKey = dayKey(today)
  const showToday = todayKey >= c.startDate && todayKey <= c.endDate
  const daysLeft = Math.max(0, p.totalDays - p.elapsedDays)
  const diff = p.expected ? spent / p.expected - 1 : 0

  let sentence: ReactNode
  if (c.status === 'paused') {
    sentence = (
      <>
        Pausiert. Es sind noch <strong className="text-ink">{fmt.eur(p.remaining)}</strong> übrig – wenn du jetzt wieder startest, sind bis zum{' '}
        {fmt.date(model.end, 'd. MMM')} <strong className="text-ink">{fmt.eur2(p.suggestedDaily)}/Tag</strong> drin.
      </>
    )
  } else if (p.state === 'not-started') {
    sentence = (
      <>
        Startet am {fmt.date(model.start, 'EEEE, d. MMMM')}. Geplant sind ≈ <strong className="text-ink">{fmt.eur2(c.budget / p.totalDays)} pro Tag</strong> über{' '}
        {p.totalDays} Tage.
      </>
    )
  } else if (p.state === 'done') {
    sentence = (
      <>
        Abgeschlossen: <strong className="text-ink">{fmt.eur(spent)}</strong> von {fmt.eur(c.budget)} ausgegeben ({fmt.pct(p.spendShare)}).
        {p.spendShare < 0.9 ? ' Das Restbudget kannst du im Budget-Planer neu verteilen.' : ' Saubere Punktlandung.'}
      </>
    )
  } else if (p.state === 'over') {
    sentence = (
      <>
        Du gibst schneller aus als geplant: <strong className="text-ink">{fmt.eur(spent)}</strong> statt {fmt.eur(p.expected)} Soll bis heute (+{fmt.pct(diff)}). Senke
        das Tageslimit auf <strong className="text-ink">{fmt.eur2(p.suggestedDaily)}</strong>, damit das Budget bis {fmt.date(model.end, 'd. MMM')} reicht.
      </>
    )
  } else if (p.state === 'under') {
    sentence = (
      <>
        Du liegst unter Plan: <strong className="text-ink">{fmt.eur(spent)}</strong> statt {fmt.eur(p.expected)} Soll bis heute ({fmt.pct(diff)}). Es sind{' '}
        {fmt.eur(p.remaining)} übrig – bis {fmt.date(model.end, 'd. MMM')} sind <strong className="text-ink">{fmt.eur2(p.suggestedDaily)}/Tag</strong> möglich.
      </>
    )
  } else {
    sentence = (
      <>
        Punktlandung in Sicht: <strong className="text-ink">{fmt.eur(spent)}</strong> ausgegeben, Soll bis heute {fmt.eur(p.expected)}. Weiter mit ≈{' '}
        <strong className="text-ink">{fmt.eur2(p.suggestedDaily)}/Tag</strong>.
      </>
    )
  }

  const tone = c.status === 'paused' || p.state === 'over' ? 'warning' : p.state === 'on-track' ? 'success' : 'accent'
  const Icon = tone === 'warning' ? TriangleAlert : tone === 'success' ? CircleCheck : Gauge

  const facts = [
    { label: 'Restbudget', value: fmt.eur(p.remaining) },
    { label: 'Resttage', value: fmt.num(daysLeft) },
    { label: 'Empfohlen / Tag', value: daysLeft ? fmt.eur2(p.suggestedDaily) : '–', hint: c.dailyLimit ? `Limit ${fmt.eur(c.dailyLimit)}` : undefined },
    {
      label: 'Hochrechnung',
      value: fmt.eur(model.projected),
      hint: c.budget ? `${fmt.pct(model.projected / c.budget)} vom Budget` : undefined,
    },
  ]

  return (
    <Card className="min-w-0 lg:col-span-2">
      <CardHeader
        title="Budget-Pacing"
        subtitle="Kumulierte Ausgaben gegen den linearen Soll-Verlauf über die gesamte Laufzeit"
        icon={<ChartLine className="size-4" />}
      />
      <div className="px-5">
        <Legend
          items={[
            { label: 'Ist (kumuliert)', color: 'var(--accent)' },
            { label: 'Soll (linear)', color: 'var(--ink-3)', dashed: true },
            ...(model.forecast ? [{ label: `Prognose (Ø ${fmt.eur(model.avg)}/Tag)`, color: 'var(--accent)', dashed: true }] : []),
          ]}
        />
      </div>
      <div className="px-2 pt-2">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={model.rows} margin={{ top: 20, right: 16, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={CHART.tick}
              tickMargin={8}
              minTickGap={36}
              tickFormatter={(v: string) => fmt.date(v, 'd. MMM')}
            />
            <YAxis axisLine={false} tickLine={false} tick={CHART.tick} width={64} allowDecimals={false} tickFormatter={(v: number) => fmt.eur(v)} />
            <Tooltip
              cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
              content={<ChartTooltip valueFormat={(v) => fmt.eur(v)} labelFormat={(l) => fmt.date(String(l), 'EEE, d. MMM yyyy')} />}
            />
            {showToday ? (
              <ReferenceLine x={todayKey} stroke="var(--ink-3)" strokeOpacity={0.6} label={{ value: 'Heute', position: 'top', fill: 'var(--ink-3)', fontSize: 11 }} />
            ) : null}
            <Area
              type="monotone"
              dataKey="ist"
              name="Ist"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="var(--accent)"
              fillOpacity={0.1}
              dot={false}
              activeDot={ACTIVE_DOT}
            />
            <Line type="linear" dataKey="soll" name="Soll" stroke="var(--ink-3)" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={ACTIVE_DOT} />
            {model.forecast ? (
              <Line
                type="linear"
                dataKey="prognose"
                name="Prognose"
                stroke="var(--accent)"
                strokeOpacity={0.7}
                strokeWidth={2}
                strokeDasharray="2 4"
                dot={false}
                activeDot={ACTIVE_DOT}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="border-t border-line px-5 py-4">
        <p className="flex gap-2 text-sm leading-relaxed text-ink-2">
          <Icon className={cn('mt-0.5 size-4 shrink-0', tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : 'text-accent-text')} aria-hidden />
          <span>{sentence}</span>
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl bg-surface-2 px-3 py-2.5">
              <dt className="text-[11px] text-ink-3">{f.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink tabular">{f.value}</dd>
              {f.hint ? <dd className="text-[11px] text-ink-3">{f.hint}</dd> : null}
            </div>
          ))}
        </dl>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Empfehlungen
// ---------------------------------------------------------------------------

interface Hint {
  id: string
  tone: 'warning' | 'success' | 'accent'
  icon: LucideIcon
  title: string
  text: string
  action?: { label: string; run: () => void }
}

function RecommendationsCard({ campaign: c, totals: t, pacing: p, today }: { campaign: Campaign; totals: CampaignTotals; pacing: Pacing; today: Date }) {
  const upsertCampaign = useStore((s) => s.upsertCampaign)
  const posts = useStore((s) => s.posts)
  const openCampaign = useUi((s) => s.openCampaign)
  const openPost = useUi((s) => s.openPost)
  const toast = useUi((s) => s.toast)

  const linked = posts.filter((x) => x.campaignId === c.id).length
  const tg = c.targets
  const end = parseISO(c.endDate)
  const start = parseISO(c.startDate)
  const daysLeft = differenceInCalendarDays(end, today)
  const startsIn = differenceInCalendarDays(start, today)
  const last7 = c.daily.slice(-7)
  const avg7 = last7.length ? sum(last7, (d) => d.spend) / last7.length : 0
  const lastEntry = c.daily.length ? c.daily[c.daily.length - 1].date : null
  const staleDays = lastEntry ? differenceInCalendarDays(today, parseISO(lastEntry)) : null
  const running = c.status === 'active'
  const planCreative = () => openPost(null, { campaignId: c.id, title: `Creative: ${c.name}` })

  const hints: Hint[] = []

  if (running && daysLeft >= 0 && daysLeft <= 7) {
    hints.push({
      id: 'successor',
      tone: 'accent',
      icon: CalendarPlus,
      title: daysLeft === 0 ? 'Endet heute – Nachfolger planen' : `Endet in ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tagen'} – Nachfolger planen`,
      text: 'Plane jetzt die Anschlusskampagne, damit keine Lücke entsteht. Übernimm Zielgruppe & bestes Creative, halte Learnings in den Notizen fest.',
      action: { label: 'Neue Kampagne', run: () => openCampaign(null) },
    })
  }

  if (running && p.state === 'over') {
    const depletion = avg7 > 0 ? addDays(today, Math.floor(p.remaining / avg7)) : null
    const early = depletion ? differenceInCalendarDays(end, depletion) : 0
    const limit = Math.max(1, Math.round(p.suggestedDaily))
    hints.push({
      id: 'pacing-over',
      tone: 'warning',
      icon: TriangleAlert,
      title: `Budget läuft zu schnell – Tageslimit auf ${fmt.eur(limit)} senken`,
      text:
        depletion && early > 0
          ? `Bei Ø ${fmt.eur(avg7)}/Tag ist das Budget am ${fmt.date(depletion, 'd. MMM')} aufgebraucht – ${early} Tage vor Kampagnenende.`
          : `Du liegst ${fmt.pct(p.ratio - 1)} über dem Soll. Mit ${fmt.eur(limit)}/Tag reicht das Restbudget bis zum Ende.`,
      action: {
        label: `Limit ${fmt.eur(limit)} übernehmen`,
        run: () => {
          upsertCampaign({ ...c, dailyLimit: limit })
          toast({ title: `Tageslimit auf ${fmt.eur(limit)} gesetzt`, description: 'Denk dran, es auch im Werbeanzeigenmanager umzustellen.', tone: 'success' })
        },
      },
    })
  } else if (running && p.state === 'under') {
    const limit = Math.max(1, Math.round(p.suggestedDaily))
    hints.push({
      id: 'pacing-under',
      tone: 'accent',
      icon: Gauge,
      title: `Budget bleibt liegen – ${fmt.eur(limit)}/Tag möglich`,
      text: `Es sind ${fmt.eur(p.remaining)} übrig, bisher gibst du Ø ${fmt.eur(avg7)}/Tag aus. Erhöhe Tageslimit oder Gebote – oder schieb das Restbudget in eine stärkere Kampagne.`,
      action: {
        label: `Limit ${fmt.eur(limit)} übernehmen`,
        run: () => {
          upsertCampaign({ ...c, dailyLimit: limit })
          toast({ title: `Tageslimit auf ${fmt.eur(limit)} gesetzt`, description: 'Denk dran, es auch im Werbeanzeigenmanager umzustellen.', tone: 'success' })
        },
      },
    })
  }

  if (tg.ctr != null && t.impressions > 500 && t.ctr < tg.ctr) {
    hints.push({
      id: 'ctr',
      tone: 'warning',
      icon: Sparkles,
      title: 'Klickrate unter Ziel – Creative tauschen',
      text: `CTR ${fmt.pct(t.ctr)} statt ≥ ${fmt.pct(tg.ctr)}. Teste einen neuen Hook in den ersten 2 Sekunden: Röster in Aktion, Latte-Art-Close-up oder Collin & Vincent mit klarer Ansage.`,
      action: { label: 'Neues Creative planen', run: planCreative },
    })
  }

  if (tg.cpc != null && t.clicks > 20 && t.cpc > tg.cpc * 1.1) {
    hints.push({
      id: 'cpc',
      tone: 'warning',
      icon: MousePointerClick,
      title: 'Klicks sind zu teuer',
      text: `CPC ${fmt.eur2(t.cpc)} statt ≤ ${fmt.eur2(tg.cpc)}. Zielgruppe schärfen (Radius, Interessen), schwache Placements ausschließen und Anzeigentext näher an die Suchintention bringen.`,
    })
  }

  if (tg.roas != null && t.spend > 50) {
    if (t.roas >= tg.roas * 1.1) {
      const plus = Math.round(c.budget * 0.2)
      hints.push({
        id: 'roas-up',
        tone: 'success',
        icon: TrendingUp,
        title: 'ROAS über Ziel – Budget um 20 % erhöhen',
        text: `${fmt.ratio(t.roas)} statt ≥ ${fmt.ratio(tg.roas)}: Jeder Euro kommt mehrfach zurück. Mit +${fmt.eur(plus)} skalierst du, solange die Frequenz stabil bleibt.`,
        action: running
          ? {
              label: `Budget +${fmt.eur(plus)}`,
              run: () => {
                const before = c.budget
                upsertCampaign({ ...c, budget: before + plus })
                toast({
                  title: `Budget auf ${fmt.eur(before + plus)} erhöht`,
                  tone: 'success',
                  action: { label: 'Rückgängig', run: () => upsertCampaign({ ...c, budget: before }) },
                })
              },
            }
          : undefined,
      })
    } else if (t.roas < tg.roas * 0.9) {
      hints.push({
        id: 'roas-down',
        tone: 'warning',
        icon: ShoppingBag,
        title: 'ROAS unter Ziel – Angebot schärfen',
        text: `${fmt.ratio(t.roas)} statt ≥ ${fmt.ratio(tg.roas)}. Mehr Retargeting (Shop-Besucher 30 Tage), Angebot klarer machen (Bonus-Beutel, Gratisversand) und Warenkorb-Abbrecher ansprechen.`,
      })
    }
  }

  if (tg.cpa != null && t.conversions >= 3) {
    if (t.cpa > tg.cpa * 1.1) {
      hints.push({
        id: 'cpa-up',
        tone: 'warning',
        icon: Link2,
        title: 'CPA über Ziel – Landingpage prüfen',
        text: `${fmt.eur2(t.cpa)} statt ≤ ${fmt.eur2(tg.cpa)} pro Conversion. Ladezeit, klarer CTA und das Angebot „above the fold“ – oft entscheidet die Seite, nicht die Anzeige.`,
      })
    } else if (t.cpa <= tg.cpa * 0.8) {
      hints.push({
        id: 'cpa-good',
        tone: 'success',
        icon: CircleCheck,
        title: 'CPA deutlich unter Ziel',
        text: `${fmt.eur2(t.cpa)} pro Conversion – ${fmt.pct(1 - t.cpa / tg.cpa)} günstiger als geplant. Guter Moment, um die Zielgruppe vorsichtig zu erweitern.`,
      })
    }
  }

  if (running && staleDays != null && staleDays > 3) {
    hints.push({
      id: 'stale',
      tone: 'accent',
      icon: ClipboardList,
      title: `Seit ${staleDays} Tagen keine Tageswerte`,
      text: 'Trag die Zahlen aus dem Werbeanzeigenmanager nach – sonst stimmen Pacing und Empfehlungen nicht.',
      action: { label: 'Werte erfassen', run: () => document.getElementById('daily-spend')?.focus() },
    })
  }

  if (c.status === 'planned' && startsIn >= 0 && startsIn <= 14) {
    hints.push(
      linked
        ? {
            id: 'launch',
            tone: 'accent',
            icon: Rocket,
            title: `Start in ${startsIn === 0 ? 'wenigen Stunden' : `${startsIn} ${startsIn === 1 ? 'Tag' : 'Tagen'}`} – Launch-Check`,
            text: 'UTM-Link testen, Pixel/Conversion-Event prüfen, Freigabe von Collin oder Vincent einholen, Tageslimit setzen.',
          }
        : {
            id: 'creative-missing',
            tone: 'warning',
            icon: Sparkles,
            title: 'Noch kein Creative verknüpft',
            text: `Die Kampagne startet ${startsIn === 0 ? 'heute' : `in ${startsIn} ${startsIn === 1 ? 'Tag' : 'Tagen'}`}. Plane mindestens zwei Motive, damit du testen kannst.`,
            action: { label: 'Post planen', run: planCreative },
          },
    )
  }

  if (c.status === 'completed') {
    hints.push({
      id: 'learnings',
      tone: 'accent',
      icon: NotebookPen,
      title: 'Learnings sichern',
      text: t.spend
        ? `Ergebnis: ${fmt.eur(t.spend)} eingesetzt, ${fmt.num(t.conversions)} Conversions${t.revenue ? `, ROAS ${fmt.ratio(t.roas)}` : ''}. Was nimmst du fürs nächste Mal mit?`
        : 'Halte fest, was funktioniert hat – die nächste Kampagne dankt es dir.',
      action: { label: 'Notizen ergänzen', run: () => openCampaign(c.id) },
    })
  }

  if (tg.ctr == null && tg.cpc == null && tg.cpa == null && tg.roas == null) {
    hints.push({
      id: 'targets',
      tone: 'accent',
      icon: Flag,
      title: 'Ziele festlegen',
      text: `Ohne Zielwert (z. B. ${OBJECTIVES[c.objective].kpi}) kann niemand sagen, ob die Kampagne gut läuft. Zwei Minuten, großer Effekt.`,
      action: { label: 'Ziele setzen', run: () => openCampaign(c.id) },
    })
  }

  if (!hints.length && running) {
    hints.push({
      id: 'fine',
      tone: 'success',
      icon: CircleCheck,
      title: 'Läuft rund',
      text: 'Budget im Plan, Ziele im grünen Bereich. Nächster Hebel: ein zweites Creative testen, um Ermüdung vorzubeugen.',
      action: { label: 'Creative planen', run: planCreative },
    })
  }

  const order = { warning: 0, accent: 1, success: 2 }
  const shown = [...hints].sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 4)
  const toneClass = {
    warning: 'bg-warning-soft text-warning',
    accent: 'bg-accent-soft text-accent-text',
    success: 'bg-success-soft text-success',
  }

  return (
    <Card>
      <CardHeader title="Empfehlungen" subtitle="Automatisch aus Pacing, Zielen & Laufzeit" icon={<Lightbulb className="size-4" />} />
      <div className="px-5 pb-5">
        {shown.length ? (
          <ul className="space-y-3">
            {shown.map((h) => (
              <li key={h.id} className="flex gap-3 rounded-xl border border-line p-3">
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', toneClass[h.tone])}>
                  <h.icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug font-semibold text-ink">{h.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-2">{h.text}</p>
                  {h.action ? (
                    <button type="button" onClick={h.action.run} className="mt-2 text-xs font-semibold text-accent-text hover:underline">
                      {h.action.label} →
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">Gerade nichts zu tun. Sobald Daten da sind, melden wir uns hier.</p>
        )}
      </div>
    </Card>
  )
}

function NotesCard({ campaign: c }: { campaign: Campaign }) {
  const openCampaign = useUi((s) => s.openCampaign)
  return (
    <Card className="flex-1">
      <CardHeader
        title="Notizen"
        icon={<NotebookPen className="size-4" />}
        action={
          <Button variant="ghost" size="icon-sm" onClick={() => openCampaign(c.id)} aria-label="Notizen bearbeiten">
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <div className="px-5 pb-5">
        {c.notes.trim() ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-2">{c.notes}</p>
        ) : (
          <p className="text-sm text-ink-3">Noch keine Notizen. Halte Learnings, Creative-Ideen und Absprachen fest.</p>
        )}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Tagesleistung
// ---------------------------------------------------------------------------

type Metric = 'clicks' | 'conversions' | 'revenue' | 'spend'

const METRICS: Record<Metric, { label: string; title: string; format: (v: number) => string; axis: (v: number) => string }> = {
  clicks: { label: 'Klicks', title: 'Klicks pro Tag', format: fmt.num, axis: fmt.num },
  conversions: { label: 'Conversions', title: 'Conversions pro Tag', format: fmt.num, axis: fmt.num },
  revenue: { label: 'Umsatz', title: 'Umsatz pro Tag', format: fmt.eur2, axis: fmt.eur },
  spend: { label: 'Ausgaben', title: 'Ausgaben pro Tag', format: fmt.eur2, axis: fmt.eur },
}

function DailyPerformanceCard({ campaign: c, hasData }: { campaign: Campaign; hasData: boolean }) {
  const [metric, setMetric] = useState<Metric>('clicks')
  const m = METRICS[metric]
  const data = useMemo(() => c.daily.map((d) => ({ date: d.date, value: d[metric] })), [c.daily, metric])
  const avg = data.length ? sum(data, (d) => d.value) / data.length : 0
  const best = data.reduce<{ date: string; value: number } | null>((acc, d) => (!acc || d.value > acc.value ? d : acc), null)

  return (
    <Card className="min-w-0 lg:col-span-2">
      <CardHeader
        title="Tagesleistung"
        subtitle={hasData ? `${m.title} · Ø ${m.format(avg)}${best ? ` · Bester Tag ${fmt.date(best.date, 'd. MMM')} (${m.format(best.value)})` : ''}` : 'Noch keine Tageswerte'}
        icon={<ChartColumn className="size-4" />}
      />
      <div className="-mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pb-1">
        {hasData ? (
          <Legend
            className="order-2"
            items={[
              { label: m.label, color: 'var(--accent)' },
              { label: `Ø ${m.format(avg)} pro Tag`, color: 'var(--ink-3)', dashed: true },
            ]}
          />
        ) : null}
        <Segmented
          size="sm"
          label="Kennzahl"
          value={metric}
          onChange={setMetric}
          options={(Object.keys(METRICS) as Metric[]).map((k) => ({ value: k, label: METRICS[k].label }))}
        />
      </div>
      {hasData ? (
        <div className="px-2 pt-3 pb-3">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={CHART.tick}
                tickMargin={8}
                minTickGap={28}
                tickFormatter={(v: string) => fmt.date(v, 'd. MMM')}
              />
              <YAxis axisLine={false} tickLine={false} tick={CHART.tick} width={56} allowDecimals={metric === 'revenue' || metric === 'spend'} tickFormatter={m.axis} />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)' }}
                content={<ChartTooltip valueFormat={m.format} labelFormat={(l) => fmt.date(String(l), 'EEE, d. MMM')} />}
              />
              <ReferenceLine y={avg} stroke="var(--ink-3)" strokeDasharray="4 4" />
              <Bar dataKey="value" name={m.label} fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="px-5 pt-3 pb-5">
          <EmptyState
            icon={<ChartColumn className="size-5" />}
            title="Noch keine Tageswerte"
            description="Sobald die Kampagne läuft und du Werte erfasst (unten), erscheint hier der Tagesverlauf."
          />
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------

function FunnelCard({ totals: t, hasData }: { totals: CampaignTotals; hasData: boolean }) {
  // Ordinale Stufen einer Farbe: hell → kräftig, je näher am Umsatz
  const steps = [
    { label: 'Impressionen', value: t.impressions, width: 100, color: 'color-mix(in oklab, var(--accent) 40%, var(--surface))' },
    { label: 'Klicks', value: t.clicks, width: 66, color: 'color-mix(in oklab, var(--accent) 70%, var(--surface))', rate: t.ctr, rateLabel: 'Klickrate' },
    { label: 'Conversions', value: t.conversions, width: 38, color: 'var(--accent)', rate: t.cvr, rateLabel: 'Conversion-Rate' },
  ]
  const aov = t.conversions ? t.revenue / t.conversions : 0
  return (
    <Card className="flex flex-col">
      <CardHeader title="Funnel" subtitle="Von der Einblendung bis zum Kauf" icon={<Funnel className="size-4" />} />
      <div className="flex flex-1 flex-col px-5 pb-5">
        <ol className="space-y-1">
          {steps.map((s) => (
            <li key={s.label}>
              {s.rate != null ? (
                <p className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-ink-3">
                  <span aria-hidden>↓</span>
                  <span className="font-semibold text-ink-2 tabular">{hasData ? fmt.pct(s.rate) : '–'}</span> {s.rateLabel}
                </p>
              ) : null}
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="text-ink-2">{s.label}</span>
                <span className="font-semibold text-ink tabular">{fmt.num(s.value)}</span>
              </div>
              <div className="flex justify-center">
                <div className="h-7 rounded-lg transition-[width] duration-500" style={{ width: `${s.width}%`, background: s.color }} />
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
          <div>
            <p className="text-[11px] text-ink-3">Umsatz</p>
            <p className="text-sm font-semibold text-ink tabular">{fmt.eur(t.revenue)}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-3">ROAS</p>
            <p className="text-sm font-semibold text-ink tabular">{t.spend ? fmt.ratio(t.roas) : '–'}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-3">Ø Warenkorb</p>
            <p className="text-sm font-semibold text-ink tabular">{aov ? fmt.eur2(aov) : '–'}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Zielgruppe, Landingpage, Posts
// ---------------------------------------------------------------------------

function TargetingCard({ campaign: c }: { campaign: Campaign }) {
  const openCampaign = useUi((s) => s.openCampaign)
  return (
    <Card>
      <CardHeader
        title="Zielgruppe & Angebot"
        icon={<Users className="size-4" />}
        action={
          <Button variant="ghost" size="icon-sm" onClick={() => openCampaign(c.id)} aria-label="Zielgruppe bearbeiten">
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <div className="space-y-4 px-5 pb-5">
        <p className="text-sm leading-relaxed text-ink">{c.audience || <span className="text-ink-3">Noch keine Beschreibung.</span>}</p>
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-2 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-[11px] text-ink-3">
              <MapPin className="size-3.5" aria-hidden /> Radius
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink">{c.radiusKm ? `${c.radiusKm} km um Weimar` : 'Bundesweit'}</dd>
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-[11px] text-ink-3">
              <UserRound className="size-3.5" aria-hidden /> Alter
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink tabular">
              {c.ageMin}–{c.ageMax} Jahre
            </dd>
          </div>
        </dl>
        {c.interests.length ? (
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-ink-3">Interessen & Keywords</p>
            <ul className="flex flex-wrap gap-1.5">
              {c.interests.map((i) => (
                <li key={i} className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink-2">
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {c.offer ? (
          <div className="rounded-xl border-l-2 border-accent bg-accent-soft/50 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-accent-text uppercase">Angebot / Hook</p>
            <p className="mt-1 text-sm leading-relaxed text-ink">{c.offer}</p>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function copyText(text: string, what: string) {
  const ui = useUi.getState()
  if (!navigator.clipboard) {
    ui.toast({ title: 'Kopieren nicht möglich', description: 'Dein Browser erlaubt keinen Zugriff auf die Zwischenablage.', tone: 'danger' })
    return
  }
  navigator.clipboard.writeText(text).then(
    () => ui.toast({ title: `${what} kopiert`, tone: 'success' }),
    () => ui.toast({ title: 'Kopieren nicht möglich', description: 'Bitte manuell markieren und kopieren.', tone: 'danger' }),
  )
}

function UtmCard({ campaign: c }: { campaign: Campaign }) {
  const url = buildUtmUrl(c.landingUrl, { source: c.utmSource, medium: c.utmMedium, campaign: c.utmCampaign })
  const [base, query = ''] = url.split('?')
  const params = query
    ? query.split('&').map((kv) => {
        const [k, v = ''] = kv.split('=')
        return [decodeURIComponent(k), decodeURIComponent(v.replace(/\+/g, ' '))] as const
      })
    : []
  return (
    <Card className="flex flex-col">
      <CardHeader title="Landingpage & UTM" subtitle="Damit jeder Klick in Analytics der Kampagne zugeordnet wird" icon={<Link2 className="size-4" />} />
      <div className="flex flex-1 flex-col px-5 pb-5">
        {url ? (
          <>
            <p className="rounded-xl border border-line bg-surface-2 p-3 font-mono text-xs leading-relaxed break-all">
              <span className="text-ink">{base}</span>
              {params.map(([k, v], i) => (
                <span key={k}>
                  <span className="text-ink-3">{i === 0 ? '?' : '&'}</span>
                  <span className="text-ink-3">{k}=</span>
                  <span className="font-semibold text-accent-text">{v}</span>
                </span>
              ))}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => copyText(url, 'Link')}>
                <Copy className="size-3.5" /> Link kopieren
              </Button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink shadow-soft transition-colors hover:border-line-strong hover:bg-surface-2"
              >
                <ExternalLink className="size-3.5" /> Öffnen
              </a>
            </div>
            <dl className="mt-4 space-y-1.5 text-xs">
              {[
                ['Quelle', c.utmSource],
                ['Medium', c.utmMedium],
                ['Kampagne', c.utmCampaign],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="truncate font-medium text-ink">{v || '–'}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-auto pt-4 text-[11px] leading-relaxed text-ink-3">
              Tipp: Häng pro Creative <code className="rounded bg-surface-2 px-1">utm_content</code> an (z. B. <em>reel-roester</em>), dann siehst du, welches Motiv
              verkauft.
            </p>
          </>
        ) : (
          <EmptyState
            icon={<Link2 className="size-5" />}
            title="Keine gültige Landingpage"
            description="Hinterlege eine URL – wir bauen den UTM-Link automatisch."
          />
        )}
      </div>
    </Card>
  )
}

function LinkedPostsCard({ campaign: c }: { campaign: Campaign }) {
  const allPosts = useStore((s) => s.posts)
  const openPost = useUi((s) => s.openPost)
  const posts = useMemo(() => allPosts.filter((p) => p.campaignId === c.id).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)), [allPosts, c.id])
  const plan = () => openPost(null, { campaignId: c.id, title: `Creative: ${c.name}` })
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Verknüpfte Posts"
        subtitle={posts.length ? `${posts.length} ${posts.length === 1 ? 'Creative' : 'Creatives'} für diese Kampagne` : 'Creatives & begleitende Posts'}
        icon={<Megaphone className="size-4" />}
      />
      <div className="flex flex-1 flex-col px-5 pb-5">
        {posts.length ? (
          <ul className="-mx-2 max-h-80 space-y-0.5 overflow-y-auto scrollbar-thin">
            {posts.map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => openPost(post.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <MediaThumb url={post.mediaUrl} tone={post.mediaTone} className="size-11 shrink-0 rounded-lg" label={post.title} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{post.title}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-3">
                      <span className="tabular">{fmt.date(post.scheduledAt, 'EEE, d. MMM · HH:mm')}</span>
                      <PlatformStack platforms={post.platforms} size={16} />
                    </span>
                  </span>
                  <StatusBadge status={post.status} className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-xs text-ink-3">
            Noch kein Post verknüpft. Eine Kampagne ohne Creative ist wie Espresso ohne Bohne.
          </p>
        )}
        <div className="mt-auto pt-4">
          <Button className="w-full" onClick={plan}>
            <Plus className="size-4" /> Post für diese Kampagne planen
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Tageswerte: erfassen, importieren, Tabelle
// ---------------------------------------------------------------------------

interface EntryDraft {
  date: string
  spend: string
  impressions: string
  clicks: string
  conversions: string
  revenue: string
}

const NUM_FIELDS = ['spend', 'impressions', 'clicks', 'conversions', 'revenue'] as const
type NumField = (typeof NUM_FIELDS)[number]

const FIELD_META: Record<NumField, { label: string; step: string; suffix?: string }> = {
  spend: { label: 'Ausgaben', step: '0.01', suffix: '€' },
  impressions: { label: 'Impressionen', step: '1' },
  clicks: { label: 'Klicks', step: '1' },
  conversions: { label: 'Conversions', step: '1' },
  revenue: { label: 'Umsatz', step: '0.01', suffix: '€' },
}

function toDraft(date: string, stat?: DailyStat): EntryDraft {
  if (!stat) return { date, spend: '', impressions: '', clicks: '', conversions: '', revenue: '' }
  return {
    date,
    spend: String(stat.spend),
    impressions: String(stat.impressions),
    clicks: String(stat.clicks),
    conversions: String(stat.conversions),
    revenue: String(stat.revenue),
  }
}

function parseNumber(raw: string | undefined) {
  if (!raw) return 0
  let v = raw.replace(/[€\s]/g, '')
  if (v.includes(',') && v.includes('.')) {
    v = v.lastIndexOf(',') > v.lastIndexOf('.') ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '')
  } else if (v.includes(',')) v = v.replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, '')
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function parseDate(raw: string) {
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/)
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

function parseCsv(text: string) {
  const rows: DailyStat[] = []
  let skipped = 0
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const delim = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ','
    const cells = line.split(delim).map((x) => x.trim().replace(/^"|"$/g, ''))
    const date = parseDate(cells[0] ?? '')
    if (!date) {
      skipped++
      continue
    }
    const [spend, impressions, clicks, conversions, revenue] = cells.slice(1, 6).map(parseNumber)
    rows.push({
      date,
      spend: Math.round((spend ?? 0) * 100) / 100,
      impressions: Math.round(impressions ?? 0),
      clicks: Math.round(clicks ?? 0),
      conversions: Math.round(conversions ?? 0),
      revenue: Math.round((revenue ?? 0) * 100) / 100,
    })
  }
  return { rows, skipped }
}

const dec = (v: number) => v.toLocaleString('de-DE', { maximumFractionDigits: 2, useGrouping: false })

function DailyStatsCard({ campaign: c, today }: { campaign: Campaign; today: Date }) {
  const upsertDaily = useStore((s) => s.upsertDaily)
  const deleteDaily = useStore((s) => s.deleteDaily)
  const toast = useUi((s) => s.toast)

  const todayKey = dayKey(today)
  const limitKey = todayKey < c.endDate ? todayKey : c.endDate
  const defaultDate = todayKey < c.startDate ? c.startDate : limitKey
  const [draft, setDraft] = useState<EntryDraft>(() =>
    toDraft(
      defaultDate,
      c.daily.find((d) => d.date === defaultDate),
    ),
  )
  const [tried, setTried] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [csv, setCsv] = useState('')

  const existing = c.daily.find((d) => d.date === draft.date)
  const rows = useMemo(() => [...c.daily].sort((a, b) => b.date.localeCompare(a.date)), [c.daily])
  const sumT = useMemo(() => totals(c.daily), [c.daily])
  const parsed = useMemo(() => parseCsv(csv), [csv])

  const values = Object.fromEntries(NUM_FIELDS.map((f) => [f, parseNumber(draft[f])])) as Record<NumField, number>
  const empty = NUM_FIELDS.every((f) => draft[f].trim() === '')
  const errors = {
    date: !draft.date ? 'Datum fehlt' : null,
    values: empty ? 'Trag mindestens einen Wert ein' : null,
  }
  const warnings = [
    draft.date && (draft.date < c.startDate || draft.date > c.endDate) ? 'Datum liegt außerhalb der Laufzeit.' : null,
    draft.date > todayKey ? 'Datum liegt in der Zukunft.' : null,
    values.clicks > values.impressions && values.impressions > 0 ? 'Mehr Klicks als Impressionen? Bitte prüfen.' : null,
    values.conversions > values.clicks && values.clicks > 0 ? 'Mehr Conversions als Klicks? Bitte prüfen.' : null,
  ].filter(Boolean) as string[]

  const changeDate = (date: string) => {
    const hit = c.daily.find((d) => d.date === date)
    setDraft(hit ? toDraft(date, hit) : { ...draft, date })
  }

  const save = () => {
    setTried(true)
    if (errors.date || errors.values) return
    const stat: DailyStat = {
      date: draft.date,
      spend: Math.round(values.spend * 100) / 100,
      impressions: Math.round(values.impressions),
      clicks: Math.round(values.clicks),
      conversions: Math.round(values.conversions),
      revenue: Math.round(values.revenue * 100) / 100,
    }
    upsertDaily(c.id, stat)
    toast({ title: `Tageswerte für ${fmt.date(stat.date, 'EEE, d. MMM')} gespeichert`, tone: 'success' })
    setTried(false)
    // Für schnelles Nachtragen: direkt zum nächsten Tag springen
    const next = dayKey(addDays(parseISO(stat.date), 1))
    if (next <= limitKey) setDraft(toDraft(next, c.daily.find((d) => d.date === next)))
    else setDraft(toDraft(stat.date, stat))
  }

  const edit = (d: DailyStat) => {
    setDraft(toDraft(d.date, d))
    requestAnimationFrame(() => document.getElementById('daily-spend')?.focus())
  }

  const remove = (d: DailyStat) => {
    deleteDaily(c.id, d.date)
    toast({
      title: 'Tageswert gelöscht',
      description: fmt.date(d.date, 'EEEE, d. MMMM'),
      action: { label: 'Rückgängig', run: () => upsertDaily(c.id, d) },
    })
  }

  const runImport = () => {
    for (const r of parsed.rows) upsertDaily(c.id, r)
    toast({ title: `${parsed.rows.length} Tageswerte importiert`, description: parsed.skipped ? `${parsed.skipped} Zeilen übersprungen (z. B. Kopfzeile).` : undefined, tone: 'success' })
    setImportOpen(false)
    setCsv('')
  }

  const exportCsv = () => {
    const head = 'Datum;Ausgaben;Impressionen;Klicks;Conversions;Umsatz'
    const body = [...c.daily].map((d) => [d.date, dec(d.spend), d.impressions, d.clicks, d.conversions, dec(d.revenue)].join(';'))
    downloadFile(`${slugify(c.name) || 'kampagne'}-tageswerte.csv`, [head, ...body].join('\n'), 'text/csv;charset=utf-8')
  }

  return (
    <Card className="min-w-0 lg:col-span-3">
      <CardHeader
        title="Tageswerte"
        subtitle={`${c.daily.length} ${c.daily.length === 1 ? 'Tag' : 'Tage'} erfasst · Grundlage für Pacing, Charts & Empfehlungen`}
        icon={<ClipboardList className="size-4" />}
        action={
          <>
            <Button size="sm" variant="ghost" onClick={() => setImportOpen(true)}>
              <Upload className="size-3.5" /> <span className="hidden sm:inline">CSV importieren</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={exportCsv} disabled={!c.daily.length}>
              <Download className="size-3.5" /> <span className="hidden sm:inline">Export</span>
            </Button>
          </>
        }
      />
      <div className="grid gap-6 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Erfassen */}
        <div className="rounded-2xl border border-line bg-surface-2/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">Tageswerte erfassen</h3>
            {existing ? <Badge tone="warning">Überschreibt Eintrag</Badge> : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-3">
            Bis zur Meta- & Google-Anbindung (Phase 2) trägst du die Werte aus dem Werbeanzeigenmanager hier ein – oder importierst sie als CSV.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Datum" htmlFor="daily-date" className="col-span-2">
              <Input
                id="daily-date"
                type="date"
                value={draft.date}
                min={c.startDate}
                max={c.endDate}
                onChange={(e) => changeDate(e.target.value)}
                aria-invalid={tried && !!errors.date}
              />
            </Field>
            {NUM_FIELDS.map((f) => (
              <Field key={f} label={FIELD_META[f].label} htmlFor={`daily-${f}`} className={f === 'spend' ? 'col-span-2 sm:col-span-1' : undefined}>
                <div className="relative">
                  <Input
                    id={`daily-${f}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={FIELD_META[f].step}
                    placeholder="0"
                    value={draft[f]}
                    onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        save()
                      }
                    }}
                    className={cn('text-right tabular', FIELD_META[f].suffix && 'pr-7')}
                  />
                  {FIELD_META[f].suffix ? (
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-3">{FIELD_META[f].suffix}</span>
                  ) : null}
                </div>
              </Field>
            ))}
          </div>
          {tried && (errors.date || errors.values) ? <p className="mt-3 text-xs font-medium text-danger">{errors.date ?? errors.values}</p> : null}
          {warnings.length ? (
            <ul className="mt-3 space-y-1">
              {warnings.map((w) => (
                <li key={w} className="flex items-start gap-1.5 text-xs text-warning">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden /> {w}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-[11px] text-ink-3">
              {values.impressions && values.clicks ? `CTR ${fmt.pct(values.clicks / values.impressions)}` : ''}
              {values.spend && values.revenue ? ` · ROAS ${fmt.ratio(values.revenue / values.spend)}` : ''}
            </p>
            <Button variant="primary" onClick={save}>
              {existing ? 'Aktualisieren' : 'Speichern'}
            </Button>
          </div>
        </div>

        {/* Tabelle */}
        <div className="min-w-0">
          {rows.length ? (
            <div className="max-h-[440px] overflow-auto rounded-xl border border-line scrollbar-thin">
              <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[13px]">
                <caption className="sr-only">Tageswerte der Kampagne, neueste zuerst</caption>
                <thead className="sticky top-0 z-10 bg-surface-2 text-[11px] font-semibold text-ink-3">
                  <tr>
                    {['Datum', 'Ausgaben', 'Impr.', 'Klicks', 'CTR', 'Conv.', 'Umsatz'].map((h, i) => (
                      <th key={h} scope="col" className={cn('border-b border-line px-3 py-2', i === 0 ? 'text-left' : 'text-right')}>
                        {h}
                      </th>
                    ))}
                    <th scope="col" className="border-b border-line px-2 py-2">
                      <span className="sr-only">Aktionen</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.date} className={cn('group transition-colors hover:bg-surface-2/60', d.date === draft.date && 'bg-accent-soft/40')}>
                      <td className="border-b border-line/70 px-3 py-2 whitespace-nowrap text-ink-2">{fmt.date(d.date, 'EEE, d. MMM')}</td>
                      <td className="border-b border-line/70 px-3 py-2 text-right font-medium text-ink tabular">{fmt.eur2(d.spend)}</td>
                      <td className="border-b border-line/70 px-3 py-2 text-right text-ink-2 tabular">{fmt.num(d.impressions)}</td>
                      <td className="border-b border-line/70 px-3 py-2 text-right text-ink-2 tabular">{fmt.num(d.clicks)}</td>
                      <td className="border-b border-line/70 px-3 py-2 text-right text-ink-2 tabular">{d.impressions ? fmt.pct(d.clicks / d.impressions) : '–'}</td>
                      <td className="border-b border-line/70 px-3 py-2 text-right text-ink-2 tabular">{fmt.num(d.conversions)}</td>
                      <td className="border-b border-line/70 px-3 py-2 text-right text-ink-2 tabular">{fmt.eur(d.revenue)}</td>
                      <td className="border-b border-line/70 px-2 py-1 text-right whitespace-nowrap">
                        <span className="inline-flex opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button variant="ghost" size="icon-sm" onClick={() => edit(d)} aria-label={`Werte vom ${fmt.date(d.date, 'd. MMM')} bearbeiten`}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => remove(d)} aria-label={`Werte vom ${fmt.date(d.date, 'd. MMM')} löschen`}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 bg-surface text-[13px] font-semibold text-ink">
                  <tr>
                    <th scope="row" className="border-t border-line px-3 py-2 text-left">
                      Summe
                    </th>
                    <td className="border-t border-line px-3 py-2 text-right tabular">{fmt.eur(sumT.spend)}</td>
                    <td className="border-t border-line px-3 py-2 text-right tabular">{fmt.compact(sumT.impressions)}</td>
                    <td className="border-t border-line px-3 py-2 text-right tabular">{fmt.num(sumT.clicks)}</td>
                    <td className="border-t border-line px-3 py-2 text-right tabular">{sumT.impressions ? fmt.pct(sumT.ctr) : '–'}</td>
                    <td className="border-t border-line px-3 py-2 text-right tabular">{fmt.num(sumT.conversions)}</td>
                    <td className="border-t border-line px-3 py-2 text-right tabular">{fmt.eur(sumT.revenue)}</td>
                    <td className="border-t border-line" />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <EmptyState
              className="h-full"
              icon={<ClipboardList className="size-5" />}
              title="Noch keine Tageswerte"
              description="Trag links den ersten Tag ein oder importiere eine CSV aus dem Werbeanzeigenmanager."
            />
          )}
        </div>
      </div>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Tageswerte importieren"
        footer={
          <>
            <Button onClick={() => setImportOpen(false)}>Abbrechen</Button>
            <Button variant="primary" onClick={runImport} disabled={!parsed.rows.length}>
              <Upload className="size-4" /> {parsed.rows.length ? `${parsed.rows.length} Zeilen importieren` : 'Importieren'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          Füge Zeilen aus Excel, Google Sheets oder dem Werbeanzeigenmanager ein – eine Zeile pro Tag, getrennt durch Semikolon oder Tab:
        </p>
        <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 font-mono text-[11px] text-ink-2">Datum; Ausgaben; Impressionen; Klicks; Conversions; Umsatz</p>
        <Field label="Daten" htmlFor="csv-input" className="mt-4" aside={csv ? `${parsed.rows.length} erkannt · ${parsed.skipped} übersprungen` : undefined}>
          <Textarea
            id="csv-input"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={'24.09.2026;18,40;4.210;41;2;76,50\n25.09.2026;21,10;4.890;52;1;38,00'}
            className="min-h-40! font-mono text-xs!"
          />
        </Field>
        <p className="mt-2 text-[11px] text-ink-3">Datum als TT.MM.JJJJ oder JJJJ-MM-TT. Vorhandene Tage werden überschrieben.</p>
      </Modal>
    </Card>
  )
}
