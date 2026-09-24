import {
  ChartColumnStacked,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Coins,
  CopyPlus,
  Eraser,
  Flame,
  Gift,
  Layers,
  Leaf,
  PiggyBank,
  Snowflake,
  Sun,
  Table2,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Bar, BarChart, BarStack, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART, ChartTooltip, Legend, StatTile } from '../components/charts'
import { Badge, Button, Card, CardHeader, Input, Modal, PageHeader } from '../components/ui/primitives'
import { AD_CHANNEL, AD_CHANNELS } from '../lib/constants'
import { useStore, useUi } from '../lib/store'
import type { AdChannel, BudgetPlan } from '../lib/types'
import { cn, fmt, sum } from '../lib/utils'

// ---------------------------------------------------------------------------
// Konstanten & Szenarien
// ---------------------------------------------------------------------------

const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const MONTH_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
/** Saisonfaktor Jan–Dez: Q4 Geschenke-Saison, Februar ruhig */
const SEASON = [0.8, 0.7, 0.9, 1, 1, 0.9, 1, 0.9, 1, 1.1, 1.4, 1.7]

const monthKey = (year: number, i: number) => `${year}-${String(i + 1).padStart(2, '0')}`

type ScenarioId = 'S' | 'M' | 'L'

interface Scenario {
  id: ScenarioId
  name: string
  monthly: number
  focus: string
  description: string
  split: Partial<Record<AdChannel, number>>
}

const SCENARIOS: Scenario[] = [
  {
    id: 'S',
    name: 'Schlank',
    monthly: 300,
    focus: 'Fokus Meta lokal + Google Search',
    description: 'Always-on-Reichweite im 20-km-Radius um Weimar und Suchanzeigen auf „Kaffeerösterei Weimar“. Print nur für Aktionen in den Cafés.',
    split: { meta: 150, google: 90, local: 30, email: 10, print: 20 },
  },
  {
    id: 'M',
    name: 'Solide',
    monthly: 800,
    focus: 'Lokal stark + Shop & Abo bundesweit',
    description: 'Meta lokal und bundesweit fürs Abo, Google Search & Shopping, erste TikTok-Tests und eine Kooperation pro Quartal.',
    split: { meta: 340, influencer: 70, tiktok: 60, google: 170, pinterest: 30, local: 50, email: 30, print: 50 },
  },
  {
    id: 'L',
    name: 'Wachstum',
    monthly: 2000,
    focus: 'Abo & Geschenke deutschlandweit skalieren',
    description: 'Voller Funnel: Reichweite über Meta & TikTok, Creator-Kooperationen, Google Shopping, Pinterest für Geschenke – plus lokale Präsenz.',
    split: { meta: 750, influencer: 250, tiktok: 200, google: 400, pinterest: 120, local: 100, email: 60, print: 120 },
  },
]

function scenarioPlan(s: Scenario, year: number): BudgetPlan {
  const plan: BudgetPlan = {}
  SEASON.forEach((f, i) => {
    const row: Partial<Record<AdChannel, number>> = {}
    for (const ch of AD_CHANNELS) {
      const base = s.split[ch.id]
      if (base) row[ch.id] = Math.round((base * f) / 5) * 5
    }
    plan[monthKey(year, i)] = row
  })
  return plan
}

const planTotal = (plan: BudgetPlan) => sum(Object.values(plan), (row) => sum(Object.values(row), (v) => v ?? 0))

const PLAN_SWATCH = 'color-mix(in oklab, var(--ink-3) 40%, var(--surface))'

/** ≥ 640px? Schmale Screens bekommen einbuchstabige Monatsachsen. */
const wideQuery = typeof window !== 'undefined' ? window.matchMedia('(min-width: 640px)') : null
function useWide() {
  return useSyncExternalStore(
    (cb) => {
      wideQuery?.addEventListener('change', cb)
      return () => wideQuery?.removeEventListener('change', cb)
    },
    () => wideQuery?.matches ?? true,
  )
}

type Confirm = { title: string; body: ReactNode; confirmLabel: string; danger?: boolean; run: () => void }

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

export function BudgetPage() {
  const budget = useStore((s) => s.budget)
  const campaigns = useStore((s) => s.campaigns)
  const cap = useStore((s) => s.settings.monthlyBudgetCap)
  const demo = useStore((s) => s.settings.demoData)
  const setBudgetMonths = useStore((s) => s.setBudgetMonths)
  const toast = useUi((s) => s.toast)

  const today = useMemo(() => new Date(), [])
  const thisYear = today.getFullYear()
  const [year, setYear] = useState(thisYear)
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const curIdx = year === thisYear ? today.getMonth() : -1
  const wide = useWide()
  const months = useMemo(() => MONTH_SHORT.map((_, i) => monthKey(year, i)), [year])

  // Plan je Monat & Kanal
  const rows = useMemo(
    () =>
      months.map((key, i) => {
        const row = budget[key] ?? {}
        const values = Object.fromEntries(AD_CHANNELS.map((c) => [c.id, row[c.id] ?? 0])) as Record<AdChannel, number>
        return { key, i, month: MONTH_SHORT[i], values, total: sum(AD_CHANNELS, (c) => values[c.id]) }
      }),
    [budget, months],
  )

  // Ist-Ausgaben aus den Tageswerten aller Kampagnen
  const actual = useMemo(() => {
    const out = new Array<number>(12).fill(0)
    const prefix = `${year}-`
    for (const c of campaigns) for (const d of c.daily) if (d.date.startsWith(prefix)) out[Number(d.date.slice(5, 7)) - 1] += d.spend
    return out
  }, [campaigns, year])

  const yearTotal = sum(rows, (r) => r.total)
  const actualTotal = sum(actual, (v) => v)
  const channelTotals = AD_CHANNELS.map((c) => ({ ...c, value: sum(rows, (r) => r.values[c.id]) }))
  const strongest = rows.reduce((best, r) => (r.total > best.total ? r : best), rows[0])
  const overCap = rows.filter((r) => r.total > cap)
  const hasPlan = yearTotal > 0
  const hasPrevPlan = MONTH_SHORT.some((_, i) => budget[monthKey(year - 1, i)] && Object.values(budget[monthKey(year - 1, i)]).some((v) => (v ?? 0) > 0))

  // Soll bis heute (laufender Monat anteilig)
  const planToDate = useMemo(() => {
    if (year < thisYear) return yearTotal
    if (year > thisYear) return 0
    const m = today.getMonth()
    const daysInMonth = new Date(thisYear, m + 1, 0).getDate()
    return sum(rows.slice(0, m), (r) => r.total) + rows[m].total * (today.getDate() / daysInMonth)
  }, [year, thisYear, yearTotal, rows, today])

  const applyScenario = (s: Scenario) => {
    const plan = scenarioPlan(s, year)
    setConfirm({
      title: `Vorschlag ${s.id} für ${year} anwenden?`,
      confirmLabel: `Für ${year} übernehmen`,
      body: <ScenarioPreview scenario={s} plan={plan} year={year} current={yearTotal} />,
      run: () => {
        setBudgetMonths(plan)
        toast({ title: `Vorschlag ${s.id} übernommen`, description: `${fmt.eur(planTotal(plan))} für ${year} – passe die Zellen nach Gefühl an.`, tone: 'success' })
      },
    })
  }

  const copyPrevYear = () => {
    const plan: BudgetPlan = {}
    MONTH_SHORT.forEach((_, i) => {
      plan[monthKey(year, i)] = { ...(budget[monthKey(year - 1, i)] ?? {}) }
    })
    setConfirm({
      title: `Plan aus ${year - 1} übernehmen?`,
      confirmLabel: 'Übernehmen',
      body: (
        <p className="text-sm text-ink-2">
          Alle Werte für {year} werden durch den Plan aus {year - 1} ersetzt ({fmt.eur(planTotal(plan))}).
        </p>
      ),
      run: () => {
        setBudgetMonths(plan)
        toast({ title: `Plan aus ${year - 1} übernommen`, tone: 'success' })
      },
    })
  }

  const clearYear = () => {
    const before: BudgetPlan = {}
    const empty: BudgetPlan = {}
    MONTH_SHORT.forEach((_, i) => {
      before[monthKey(year, i)] = { ...(budget[monthKey(year, i)] ?? {}) }
      empty[monthKey(year, i)] = {}
    })
    setConfirm({
      title: `Plan ${year} leeren?`,
      confirmLabel: 'Leeren',
      danger: true,
      body: <p className="text-sm text-ink-2">Alle {fmt.eur(yearTotal)} Planwerte für {year} werden auf 0 gesetzt.</p>,
      run: () => {
        setBudgetMonths(empty)
        toast({ title: `Plan ${year} geleert`, action: { label: 'Rückgängig', run: () => useStore.getState().setBudgetMonths(before) } })
      },
    })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Werbung"
        title="Budget-Planer"
        description="Plane dein Marketingbudget pro Monat und Kanal – mit Saison im Blick, Deckel im Griff und dem Abgleich, was wirklich ausgegeben wurde."
        actions={
          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
            <div className="inline-flex items-center rounded-lg border border-line bg-surface shadow-soft">
              <Button variant="ghost" size="icon" className="rounded-r-none" onClick={() => setYear((y) => y - 1)} aria-label="Vorheriges Jahr">
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-14 text-center text-sm font-semibold text-ink tabular" aria-live="polite">
                {year}
              </span>
              <Button variant="ghost" size="icon" className="rounded-l-none" onClick={() => setYear((y) => y + 1)} aria-label="Nächstes Jahr">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-soft" role="group" aria-label="Szenario als Vorschlag anwenden">
              <span className="px-2 text-[11px] font-medium text-ink-3">Vorschlag</span>
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => applyScenario(s)}
                  title={`${s.name}: ≈ ${fmt.eur(s.monthly)}/Monat – ${s.focus}`}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  {s.id}
                  <span className="font-normal text-ink-3 tabular">{fmt.eur(s.monthly)}</span>
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* KPI-Kacheln */}
      <section aria-label="Jahresüberblick" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={`Jahresbudget ${year}`}
          icon={<Wallet className="size-4" />}
          value={fmt.eur(yearTotal)}
          trend={hasPlan ? rows.map((r) => r.total) : undefined}
          trendLabels={MONTH_SHORT}
          footnote={
            hasPlan
              ? `Ø ${fmt.eur(yearTotal / 12)} pro Monat · ${channelTotals.filter((c) => c.value > 0).length} Kanäle`
              : 'Noch kein Plan – wende einen Vorschlag an'
          }
        />
        <StatTile
          label="Davon ausgegeben"
          icon={<Coins className="size-4" />}
          value={fmt.eur(actualTotal)}
          trend={actualTotal ? actual.slice(0, curIdx >= 0 ? curIdx + 1 : 12) : undefined}
          trendLabels={MONTH_SHORT}
          footnote={
            hasPlan
              ? `${fmt.pct(actualTotal / yearTotal)} des Plans${year === thisYear ? ` · Soll bis heute ${fmt.eur(planToDate)}` : ''}`
              : 'Aus den Tageswerten aller Kampagnen'
          }
        />
        <StatTile
          label="Stärkster Monat"
          icon={<Flame className="size-4" />}
          value={hasPlan ? MONTH_LONG[strongest.i] : '–'}
          footnote={hasPlan ? `${fmt.eur(strongest.total)} · ${fmt.pct(strongest.total / yearTotal)} des Jahres` : undefined}
        />
        <CapTile cap={cap} overCap={overCap.map((r) => r.i)} avg={yearTotal / 12} />
      </section>

      {/* Chart + Verteilung */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader
            title="Budget nach Monat & Kanal"
            subtitle={`Geplante Ausgaben ${year}, gestapelt nach Kanal${demo ? ' · Demo-Daten' : ''}`}
            icon={<ChartColumnStacked className="size-4" />}
          />
          <div className="px-5">
            <Legend items={[...AD_CHANNELS.map((c) => ({ label: c.label, color: c.color })), { label: 'Monatsdeckel', color: 'var(--ink-3)', dashed: true }]} />
          </div>
          <div className="px-2 pt-3 pb-3">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={rows.map((r) => ({ month: r.month, total: r.total, ...r.values }))} margin={{ top: 16, right: 16, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                {curIdx >= 0 ? <ReferenceArea x1={MONTH_SHORT[curIdx]} x2={MONTH_SHORT[curIdx]} fill="var(--accent-soft)" fillOpacity={0.7} /> : null}
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={<MonthTick current={curIdx} short={!wide} />} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={CHART.tick} width={64} allowDecimals={false} tickFormatter={(v: number) => fmt.eur(v)} />
                <Tooltip cursor={{ fill: 'var(--surface-2)', fillOpacity: 0.7 }} content={<StackTooltip cap={cap} />} />
                <ReferenceLine
                  y={cap}
                  stroke="var(--ink-3)"
                  strokeDasharray="4 4"
                  label={{ value: `Deckel ${fmt.eur(cap)}`, position: 'insideTopLeft', fill: 'var(--ink-3)', fontSize: 11 }}
                  ifOverflow="extendDomain"
                />
                <BarStack radius={[4, 4, 0, 0]}>
                  {AD_CHANNELS.map((c) => (
                    <Bar key={c.id} dataKey={c.id} name={c.label} fill={c.color} stroke="var(--surface)" strokeWidth={2} maxBarSize={24} />
                  ))}
                </BarStack>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <DistributionCard channels={channelTotals} total={yearTotal} />
      </div>

      {/* Editierbares Raster */}
      <BudgetGrid year={year} rows={rows} actual={actual} curIdx={curIdx} cap={cap} onCopyPrev={hasPrevPlan ? copyPrevYear : undefined} onClear={hasPlan ? clearYear : undefined} />

      {/* Plan vs. Ist + Saison */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <PlanVsActualCard rows={rows} actual={actual} curIdx={curIdx} year={year} thisYear={thisYear} planToDate={planToDate} demo={demo} wide={wide} />
        <SeasonCard rows={rows} total={yearTotal} />
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ''}
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>Abbrechen</Button>
            <Button
              variant={confirm?.danger ? 'danger' : 'primary'}
              onClick={() => {
                confirm?.run()
                setConfirm(null)
              }}
            >
              {confirm?.confirmLabel}
            </Button>
          </>
        }
      >
        {confirm?.body}
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI: Monatsdeckel (direkt editierbar)
// ---------------------------------------------------------------------------

function CapTile({ cap, overCap, avg, className }: { cap: number; overCap: number[]; avg: number; className?: string }) {
  const updateSettings = useStore((s) => s.updateSettings)
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className={cn('flex flex-col justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="budget-cap" className="text-xs font-medium text-ink-2">
          Monatsdeckel
        </label>
        <PiggyBank className="size-4 text-ink-3" aria-hidden />
      </div>
      <div>
        <div className="relative w-36">
          <Input
            id="budget-cap"
            inputMode="numeric"
            value={draft ?? fmt.num(cap)}
            onFocus={(e) => {
              setDraft(String(cap))
              e.currentTarget.select()
            }}
            onChange={(e) => {
              const clean = e.target.value.replace(/\D/g, '')
              setDraft(clean)
              if (clean && Number(clean) > 0) updateSettings({ monthlyBudgetCap: Number(clean) })
            }}
            onBlur={() => setDraft(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="pr-7 text-lg! font-semibold tabular"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-3">€</span>
        </div>
        <p className="mt-2 text-[11px] text-ink-3 tabular">Ø-Plan nutzt {fmt.pct(cap ? avg / cap : 0)} des Deckels</p>
        {overCap.length ? (
          <p className="mt-1 flex items-start gap-1 text-[11px] font-medium text-warning">
            <TriangleAlert className="mt-px size-3 shrink-0" aria-hidden />
            {overCap.length === 1 ? '1 Monat' : `${overCap.length} Monate`} darüber: {overCap.map((i) => MONTH_SHORT[i]).join(', ')}
          </p>
        ) : (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-success">
            <CircleCheck className="size-3" aria-hidden /> Alle Monate im Rahmen
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart-Helfer
// ---------------------------------------------------------------------------

function MonthTick({ x, y, payload, current, short }: { x?: number; y?: number; payload?: { value: string }; current: number; short?: boolean }) {
  const active = current >= 0 && payload?.value === MONTH_SHORT[current]
  return (
    <text x={x} y={(y ?? 0) + 12} textAnchor="middle" fontSize={11} fill={active ? 'var(--ink)' : 'var(--ink-3)'} fontWeight={active ? 600 : 400}>
      {short ? payload?.value.slice(0, 1) : payload?.value}
    </text>
  )
}

function StackTooltip({
  active,
  payload,
  cap,
}: {
  active?: boolean
  payload?: { payload?: Record<string, number | string> }[]
  cap: number
}) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  const total = Number(row.total ?? 0)
  const month = MONTH_LONG[MONTH_SHORT.indexOf(String(row.month))] ?? String(row.month)
  return (
    <div className="min-w-48 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      <p className="mb-1.5 font-semibold text-ink">{month}</p>
      <ul className="space-y-1">
        {AD_CHANNELS.filter((c) => Number(row[c.id] ?? 0) > 0).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-2">
              <span className="size-2 rounded-full" style={{ background: c.color }} />
              {c.label}
            </span>
            <span className="font-semibold text-ink tabular">{fmt.eur(Number(row[c.id]))}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex items-center justify-between gap-4 border-t border-line pt-1.5">
        <span className="font-medium text-ink-2">Summe</span>
        <span className="font-semibold text-ink tabular">{fmt.eur(total)}</span>
      </div>
      {total > cap ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-warning">
          <TriangleAlert className="size-3" aria-hidden /> {fmt.eur(total - cap)} über dem Deckel
        </p>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Verteilung
// ---------------------------------------------------------------------------

function DistributionCard({ channels, total }: { channels: { id: AdChannel; label: string; color: string; paid: boolean; value: number }[]; total: number }) {
  const ranked = channels.filter((c) => c.value > 0).sort((a, b) => b.value - a.value)
  const max = Math.max(1, ...ranked.map((c) => c.value))
  const paidShare = total ? sum(ranked.filter((c) => c.paid), (c) => c.value) / total : 0
  return (
    <Card className="flex flex-col">
      <CardHeader title="Verteilung" subtitle="Anteil der Kanäle am Jahresplan" icon={<Layers className="size-4" />} />
      <div className="flex flex-1 flex-col px-5 pb-5">
        {ranked.length ? (
          <ul className="space-y-3">
            {ranked.map((c) => (
              <li key={c.id}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-ink-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                    <span className="truncate">{c.label}</span>
                  </span>
                  <span className="shrink-0 tabular">
                    <span className="font-semibold text-ink">{fmt.pct(c.value / total)}</span>
                    <span className="ml-1.5 text-ink-3">{fmt.eur(c.value)}</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-2">
                  <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(c.value / max) * 100}%`, background: c.color }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">Noch nichts geplant. Starte mit einem Vorschlag oben rechts oder trag Werte ins Raster ein.</p>
        )}
        <div className="mt-auto space-y-2 pt-5 text-xs leading-relaxed text-ink-2">
          {ranked.length ? (
            <p className="text-ink-3">
              {fmt.pct(paidShare)} fließen in bezahlte Reichweite, der Rest in eigene Kanäle wie Newsletter & CRM.
            </p>
          ) : null}
          <p className="rounded-xl bg-accent-soft/60 px-3 py-2.5 text-ink">
            <span className="font-semibold">Faustregel 70 / 20 / 10:</span> 70 % in bewährte Kanäle (Meta lokal, Google Search), 20 % ausbauen (Abo bundesweit),
            10 % testen (TikTok, Creator).
          </p>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Raster (Herzstück)
// ---------------------------------------------------------------------------

interface MonthRow {
  key: string
  i: number
  month: string
  values: Record<AdChannel, number>
  total: number
}

function focusCell(row: number, col: number) {
  const el = document.querySelector<HTMLInputElement>(`[data-budget-cell="${row}-${col}"]`)
  el?.focus()
}

function BudgetGrid({
  year,
  rows,
  actual,
  curIdx,
  cap,
  onCopyPrev,
  onClear,
}: {
  year: number
  rows: MonthRow[]
  actual: number[]
  curIdx: number
  cap: number
  onCopyPrev?: () => void
  onClear?: () => void
}) {
  const yearTotal = sum(rows, (r) => r.total)
  const actualTotal = sum(actual, (v) => v)
  const lastRow = AD_CHANNELS.length - 1
  const colClass = (i: number) => cn(i === curIdx && 'bg-accent-soft/45')

  return (
    <Card className="mt-4 min-w-0">
      <CardHeader
        title={`Monatsplan ${year}`}
        subtitle="Werte in € · Tab springt nach rechts, Enter nach unten · Änderungen werden sofort gespeichert"
        icon={<Table2 className="size-4" />}
        action={
          <>
            {onCopyPrev ? (
              <Button size="sm" variant="ghost" onClick={onCopyPrev}>
                <CopyPlus className="size-3.5" /> <span className="hidden sm:inline">Vorjahr übernehmen</span>
              </Button>
            ) : null}
            {onClear ? (
              <Button size="sm" variant="ghost" onClick={onClear}>
                <Eraser className="size-3.5" /> <span className="hidden sm:inline">Leeren</span>
              </Button>
            ) : null}
          </>
        }
      />
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-[13px]">
          <caption className="sr-only">Geplantes Budget {year} nach Kanal und Monat in Euro, mit Summen und Ist-Ausgaben</caption>
          <thead>
            <tr className="text-[11px] font-semibold text-ink-3">
              <th scope="col" className="sticky left-0 z-20 border-b border-line bg-surface py-2 pr-3 pl-5 text-left">
                Kanal <span className="font-normal">(€)</span>
              </th>
              {MONTH_SHORT.map((m, i) => (
                <th
                  key={m}
                  scope="col"
                  className={cn('border-b border-line px-1 py-2 text-right', i === curIdx ? 'bg-accent-soft/45 text-accent-text' : '')}
                  aria-current={i === curIdx ? 'date' : undefined}
                >
                  <span className="pr-2">{m}</span>
                </th>
              ))}
              <th scope="col" className="border-b border-line py-2 pr-5 pl-3 text-right">
                Summe
              </th>
            </tr>
          </thead>
          <tbody>
            {AD_CHANNELS.map((ch, r) => {
              const rowTotal = sum(rows, (m) => m.values[ch.id])
              return (
                <tr key={ch.id} className="group">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-line/70 bg-surface py-1 pr-3 pl-5 text-left font-medium whitespace-nowrap text-ink-2 group-hover:bg-surface-2"
                  >
                    <span className="flex max-w-32 items-center gap-2 sm:max-w-none" title={ch.label}>
                      <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: ch.color }} aria-hidden />
                      <span className="truncate">{ch.label}</span>
                      {!ch.paid ? <span className="hidden rounded bg-surface-2 px-1 text-[10px] font-normal text-ink-3 sm:inline">eigen</span> : null}
                    </span>
                  </th>
                  {rows.map((m, c) => (
                    <td key={m.key} className={cn('border-b border-line/70 px-1 py-1 group-hover:bg-surface-2/60', colClass(c))}>
                      <BudgetCell
                        month={m.key}
                        channel={ch.id}
                        value={m.values[ch.id]}
                        row={r}
                        col={c}
                        lastRow={lastRow}
                        label={`${ch.label}, ${MONTH_LONG[c]} ${year}`}
                      />
                    </td>
                  ))}
                  <td className="border-b border-line/70 py-1 pr-5 pl-3 text-right font-semibold text-ink tabular group-hover:bg-surface-2/60">
                    {rowTotal ? fmt.num(rowTotal) : <span className="text-ink-3">–</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="sticky left-0 z-10 border-b border-line bg-surface py-2.5 pr-3 pl-5 text-left text-[13px] font-semibold text-ink">
                Summe Plan
              </th>
              {rows.map((m, c) => {
                const over = m.total > cap
                return (
                  <td
                    key={m.key}
                    className={cn('border-b border-line px-1 py-2.5 text-right font-semibold tabular', over ? 'bg-warning-soft text-warning' : cn('text-ink', colClass(c)))}
                    title={over ? `${fmt.eur(m.total - cap)} über dem Monatsdeckel von ${fmt.eur(cap)}` : undefined}
                  >
                    <span className="inline-flex items-center justify-end gap-1 pr-2">
                      {over ? <TriangleAlert className="size-3" aria-label="über dem Deckel" /> : null}
                      {fmt.num(m.total)}
                    </span>
                  </td>
                )
              })}
              <td className="border-b border-line py-2.5 pr-5 pl-3 text-right font-semibold text-ink tabular">{fmt.eur(yearTotal)}</td>
            </tr>
            <tr className="text-ink-2">
              <th scope="row" className="sticky left-0 z-10 bg-surface py-2 pr-3 pl-5 text-left text-[12px] font-medium">
                Ist ausgegeben
              </th>
              {rows.map((m, c) => (
                <td key={m.key} className={cn('px-1 py-2 text-right text-[12px] tabular', colClass(c))}>
                  <span className="pr-2">{actual[c] ? fmt.num(actual[c]) : <span className="text-ink-3">–</span>}</span>
                </td>
              ))}
              <td className="py-2 pr-5 pl-3 text-right text-[12px] font-medium tabular">{fmt.eur(actualTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

function BudgetCell({
  month,
  channel,
  value,
  row,
  col,
  lastRow,
  label,
}: {
  month: string
  channel: AdChannel
  value: number
  row: number
  col: number
  lastRow: number
  label: string
}) {
  const setBudgetCell = useStore((s) => s.setBudgetCell)
  const [draft, setDraft] = useState<string | null>(null)
  const display = draft ?? (value ? fmt.num(value) : '')
  return (
    <input
      data-budget-cell={`${row}-${col}`}
      inputMode="numeric"
      aria-label={label}
      value={display}
      placeholder="–"
      onFocus={(e) => {
        setDraft(value ? String(value) : '')
        const el = e.currentTarget
        requestAnimationFrame(() => el.select())
      }}
      onChange={(e) => {
        const clean = e.target.value.replace(/\D/g, '').slice(0, 7)
        setDraft(clean)
        setBudgetCell(month, channel, clean ? Number(clean) : 0)
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault()
          const up = e.key === 'Enter' && e.shiftKey
          if (up) focusCell(row === 0 ? lastRow : row - 1, row === 0 ? Math.max(0, col - 1) : col)
          else focusCell(row === lastRow ? 0 : row + 1, row === lastRow ? Math.min(11, col + 1) : col)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (row > 0) focusCell(row - 1, col)
        } else if (e.key === 'Escape') {
          e.currentTarget.blur()
        }
      }}
      className="h-8 w-full min-w-14 rounded-md border border-transparent bg-transparent px-2 text-right text-[13px] text-ink tabular transition-colors placeholder:text-ink-3/60 hover:border-line focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/25 focus:outline-none focus-visible:outline-none"
    />
  )
}

// ---------------------------------------------------------------------------
// Plan vs. Ist
// ---------------------------------------------------------------------------

function PlanVsActualCard({
  rows,
  actual,
  curIdx,
  year,
  thisYear,
  planToDate,
  demo,
  wide,
}: {
  rows: MonthRow[]
  actual: number[]
  curIdx: number
  year: number
  thisYear: number
  planToDate: number
  demo: boolean
  wide: boolean
}) {
  const data = rows.map((r) => ({
    month: r.month,
    plan: r.total,
    // Zukunft hat noch kein Ist – Lücke statt Null-Balken
    ist: year > thisYear || (year === thisYear && r.i > curIdx) ? undefined : Math.round(actual[r.i]),
  }))
  const actualToDate = sum(actual, (v) => v)
  const diff = planToDate ? actualToDate / planToDate - 1 : 0
  return (
    <Card className="min-w-0 xl:col-span-2">
      <CardHeader
        title="Plan vs. Ist"
        subtitle={`Geplantes Budget gegen tatsächliche Kampagnen-Ausgaben${demo ? ' · Demo-Daten' : ''}`}
        icon={<ChartNoAxesColumn className="size-4" />}
      />
      <div className="px-5">
        <Legend
          items={[
            { label: 'Plan', color: PLAN_SWATCH },
            { label: 'Ist (aus Tageswerten)', color: 'var(--accent)' },
          ]}
        />
      </div>
      <div className="px-2 pt-3">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 4 }} barGap={2}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            {curIdx >= 0 ? <ReferenceArea x1={MONTH_SHORT[curIdx]} x2={MONTH_SHORT[curIdx]} fill="var(--accent-soft)" fillOpacity={0.7} /> : null}
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={<MonthTick current={curIdx} short={!wide} />} interval={0} />
            <YAxis axisLine={false} tickLine={false} tick={CHART.tick} width={64} allowDecimals={false} tickFormatter={(v: number) => fmt.eur(v)} />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)', fillOpacity: 0.7 }}
              content={<ChartTooltip valueFormat={(v) => fmt.eur(v)} labelFormat={(l) => MONTH_LONG[MONTH_SHORT.indexOf(String(l))] ?? String(l)} />}
            />
            <Bar dataKey="plan" name="Plan" fill="var(--ink-3)" fillOpacity={0.4} radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="ist" name="Ist" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-3 border-t border-line px-5 py-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] text-ink-3">{year === thisYear ? 'Soll bis heute' : year < thisYear ? 'Plan gesamt' : 'Plan gesamt'}</p>
          <p className="text-sm font-semibold text-ink tabular">{fmt.eur(year > thisYear ? sum(rows, (r) => r.total) : planToDate)}</p>
        </div>
        <div>
          <p className="text-[11px] text-ink-3">Ist ausgegeben</p>
          <p className="text-sm font-semibold text-ink tabular">{fmt.eur(actualToDate)}</p>
        </div>
        <div>
          <p className="text-[11px] text-ink-3">Abweichung</p>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink tabular">
            {planToDate ? `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${fmt.pct(Math.abs(diff))}` : '–'}
            {planToDate ? (
              <Badge tone={Math.abs(diff) <= 0.1 ? 'success' : diff > 0 ? 'warning' : 'accent'}>
                {Math.abs(diff) <= 0.1 ? 'im Rahmen' : diff > 0 ? 'über Plan' : 'Luft im Budget'}
              </Badge>
            ) : null}
          </p>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Saison & Quartale
// ---------------------------------------------------------------------------

const QUARTERS: { label: string; months: number[]; icon: typeof Sun; tip: string }[] = [
  { label: 'Q1', months: [0, 1, 2], icon: Snowflake, tip: 'Neujahrs-Routinen & Brüh-Wissen – günstige CPMs für Abo-Neukunden nutzen.' },
  { label: 'Q2', months: [3, 4, 5], icon: Leaf, tip: 'Terrassen-Start, Muttertag & neue Ernte – lokal im kleinen Radius werben.' },
  { label: 'Q3', months: [6, 7, 8], icon: Sun, tip: 'Cold Brew, Kunstfest & Touristen – Espressobar sichtbar machen.' },
  { label: 'Q4', months: [9, 10, 11], icon: Gift, tip: 'Hochsaison: Geschenke, Abo, Workshops – hier bündeln.' },
]

function SeasonCard({ rows, total }: { rows: MonthRow[]; total: number }) {
  const q = QUARTERS.map((x) => ({ ...x, value: sum(x.months, (i) => rows[i].total) }))
  const max = Math.max(1, ...q.map((x) => x.value))
  const q4Share = total ? q[3].value / total : 0
  return (
    <Card className="flex flex-col">
      <CardHeader title="Saison & Quartale" subtitle="Wann dein Budget arbeitet" icon={<Flame className="size-4" />} />
      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="grid grid-cols-4 items-end gap-2" role="img" aria-label={q.map((x) => `${x.label}: ${fmt.eur(x.value)}`).join(', ')}>
          {q.map((x) => (
            <div key={x.label} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-semibold text-ink tabular">{total ? fmt.pct(x.value / total).replace(',0', '') : '–'}</span>
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className="w-full max-w-10 rounded-t-md transition-[height] duration-500"
                  style={{ height: `${Math.max(4, (x.value / max) * 100)}%`, background: x.label === 'Q4' ? 'var(--accent)' : PLAN_SWATCH }}
                />
              </div>
              <span className="text-[11px] text-ink-3">{x.label}</span>
            </div>
          ))}
        </div>
        <ul className="mt-5 space-y-2.5">
          {q.map((x) => (
            <li key={x.label} className="flex gap-2.5 text-xs leading-relaxed">
              <x.icon className={cn('mt-0.5 size-3.5 shrink-0', x.label === 'Q4' ? 'text-accent-text' : 'text-ink-3')} aria-hidden />
              <span className="text-ink-2">
                <span className="font-semibold text-ink">{x.label}</span> · {fmt.eur(x.value)} – {x.tip}
              </span>
            </li>
          ))}
        </ul>
        {total && q4Share < 0.3 ? (
          <p className="mt-auto flex items-start gap-1.5 pt-4 text-[11px] font-medium text-warning">
            <TriangleAlert className="mt-px size-3 shrink-0" aria-hidden />Q4 hat nur {fmt.pct(q4Share)} – für eine Rösterei sind 35–40 % üblich.
          </p>
        ) : null}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Szenario-Vorschau im Bestätigungsdialog
// ---------------------------------------------------------------------------

function ScenarioPreview({ scenario: s, plan, year, current }: { scenario: Scenario; plan: BudgetPlan; year: number; current: number }) {
  const total = planTotal(plan)
  const splitTotal = sum(Object.values(s.split), (v) => v ?? 0)
  const maxSeason = Math.max(...SEASON)
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-ink">
          {s.name} · ≈ {fmt.eur(s.monthly)}/Monat <Badge tone="accent">Vorschlag</Badge>
        </p>
        <p className="mt-0.5 text-xs font-medium text-accent-text">{s.focus}</p>
        <p className="mt-1.5 text-sm text-ink-2">{s.description}</p>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium text-ink-3">Aufteilung pro Monat (Basis)</p>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
          {AD_CHANNELS.filter((c) => s.split[c.id]).map((c) => (
            <div key={c.id} className="h-full border-r-2 border-surface last:border-r-0" style={{ width: `${((s.split[c.id] ?? 0) / splitTotal) * 100}%`, background: c.color }} />
          ))}
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {AD_CHANNELS.filter((c) => s.split[c.id]).map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                <span className="truncate">{AD_CHANNEL[c.id].label}</span>
              </span>
              <span className="font-medium text-ink tabular">{fmt.eur(s.split[c.id] ?? 0)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium text-ink-3">Saisonfaktor</p>
        <div className="flex h-14 items-end gap-1" role="img" aria-label={SEASON.map((f, i) => `${MONTH_SHORT[i]} ${f.toLocaleString('de-DE')}`).join(', ')}>
          {SEASON.map((f, i) => (
            <div key={MONTH_SHORT[i]} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-sm" style={{ height: `${(f / maxSeason) * 40}px`, background: f >= 1.4 ? 'var(--accent)' : PLAN_SWATCH }} />
              <span className="text-[9px] text-ink-3">{MONTH_SHORT[i].slice(0, 1)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3 text-sm">
        <span className="text-ink-2">Jahressumme {year}</span>
        <span className="font-semibold text-ink tabular">{fmt.eur(total)}</span>
      </div>
      {current > 0 ? (
        <p className="flex items-start gap-1.5 text-xs text-warning">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          Ersetzt deinen aktuellen Plan für {year} ({fmt.eur(current)}). Einzelne Zellen kannst du danach frei anpassen.
        </p>
      ) : null}
    </div>
  )
}
