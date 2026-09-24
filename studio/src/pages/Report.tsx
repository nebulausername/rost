import { addMonths, endOfMonth, format, isWithinInterval, parseISO, startOfMonth, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Lightbulb, Printer, TrendingUp } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { BarList, Delta } from '../components/charts'
import { MediaThumb, PlatformStack } from '../components/domain'
import { Badge, Button, Card, CardHeader } from '../components/ui/primitives'
import { AD_CHANNELS, AD_CHANNEL, FORMATS, KEYDATE_KINDS, OBJECTIVES, PILLARS, WEEKDAYS_SHORT } from '../lib/constants'
import { occurrencesBetween } from '../lib/keydates'
import { engagementRate, totals } from '../lib/metrics'
import { useStore } from '../lib/store'
import type { AdChannel, Post } from '../lib/types'
import { cn, fmt, formatDe, sum } from '../lib/utils'

function monthRange(d: Date) {
  return { start: startOfMonth(d), end: endOfMonth(d) }
}

function inRange(iso: string, r: { start: Date; end: Date }) {
  return isWithinInterval(parseISO(iso), r)
}

function pctChange(cur: number, prev: number) {
  return prev ? ((cur - prev) / prev) * 100 : 0
}

export function ReportPage() {
  const [params, setParams] = useSearchParams()
  const month = useMemo(() => {
    const p = params.get('monat')
    const d = p ? parseISO(`${p}-01`) : new Date()
    return Number.isNaN(d.getTime()) ? new Date() : d
  }, [params])
  const setMonth = (d: Date) => setParams({ monat: format(d, 'yyyy-MM') }, { replace: true })

  const posts = useStore((s) => s.posts)
  const campaigns = useStore((s) => s.campaigns)
  const budget = useStore((s) => s.budget)
  const accounts = useStore((s) => s.accounts)
  const orders = useStore((s) => s.orders)
  const bookings = useStore((s) => s.bookings)
  const subscribers = useStore((s) => s.subscribers)
  const keyDates = useStore((s) => s.keyDates)
  const demo = useStore((s) => s.settings.demoData)

  const r = useMemo(() => {
    const cur = monthRange(month)
    const prev = monthRange(subMonths(month, 1))
    const next = monthRange(addMonths(month, 1))
    const monthPosts = posts.filter((p) => inRange(p.scheduledAt, cur))
    const published = monthPosts.filter((p) => p.status === 'published')
    const withMetrics = published.filter((p) => p.metrics)
    const prevPublished = posts.filter((p) => p.status === 'published' && p.metrics && inRange(p.scheduledAt, prev))
    const reach = sum(withMetrics, (p) => p.metrics!.reach)
    const reachPrev = sum(prevPublished, (p) => p.metrics!.reach)
    const rate = withMetrics.length ? sum(withMetrics, engagementRate) / withMetrics.length : 0
    const ratePrev = prevPublished.length ? sum(prevPublished, engagementRate) / prevPublished.length : 0
    const saves = sum(withMetrics, (p) => p.metrics!.saves + p.metrics!.shares)
    const clicks = sum(withMetrics, (p) => p.metrics!.clicks)

    const followerAt = (d: Date) =>
      sum(accounts, (a) => {
        const h = a.history.filter((x) => parseISO(x.date) <= d)
        return h.length ? h[h.length - 1].value : a.history[0]?.value ?? 0
      })
    const followersEnd = followerAt(cur.end > new Date() ? new Date() : cur.end)
    const followersStart = followerAt(cur.start)

    const top = [...withMetrics].sort((a, b) => engagementRate(b) * b.metrics!.reach - engagementRate(a) * a.metrics!.reach).slice(0, 3)

    // Werbung
    const campRows = campaigns
      .map((c) => {
        const d = c.daily.filter((x) => inRange(x.date, cur))
        return { c, t: totals(d), days: d.length }
      })
      .filter((x) => x.days > 0 || (x.c.status !== 'completed' && inRange(x.c.startDate, cur)))
      .sort((a, b) => b.t.spend - a.t.spend)
    const adTotals = totals(campaigns.flatMap((c) => c.daily.filter((x) => inRange(x.date, cur))))
    const adPrev = totals(campaigns.flatMap((c) => c.daily.filter((x) => inRange(x.date, prev))))
    const planKey = format(month, 'yyyy-MM')
    const plan = budget[planKey] ?? {}
    const actualByChannel: Partial<Record<AdChannel, number>> = {}
    for (const c of campaigns) {
      const spend = sum(c.daily.filter((x) => inRange(x.date, cur)), (x) => x.spend)
      for (const ch of c.channels) actualByChannel[ch] = (actualByChannel[ch] ?? 0) + spend / c.channels.length
    }
    const planTotal = sum(Object.values(plan), (v) => v ?? 0)

    // Shop
    const monthOrders = orders.filter((o) => inRange(o.createdAt, cur))
    const prevOrders = orders.filter((o) => inRange(o.createdAt, prev))
    const shopRevenue = sum(monthOrders, (o) => o.total)
    const shopPrev = sum(prevOrders, (o) => o.total)
    const monthBookings = bookings.filter((b) => inRange(b.createdAt, cur))
    const newSubs = subscribers.filter((s) => inRange(s.createdAt, cur)).length

    // Content-Mix
    const mix = PILLARS.map((p) => {
      const n = monthPosts.filter((x) => x.pillar === p.id).length
      return { ...p, n, pct: monthPosts.length ? (n / monthPosts.length) * 100 : 0 }
    })

    // Learnings
    const byFormat = Object.entries(
      withMetrics.reduce<Record<string, number[]>>((acc, p) => ((acc[p.format] ??= []).push(p.metrics!.reach), acc), {}),
    )
      .map(([f, v]) => ({ f, avg: sum(v, (x) => x) / v.length, n: v.length }))
      .sort((a, b) => b.avg - a.avg)
    const byDay = Object.entries(
      withMetrics.reduce<Record<string, number[]>>((acc, p) => ((acc[String(parseISO(p.scheduledAt).getDay())] ??= []).push(engagementRate(p)), acc), {}),
    )
      .map(([d, v]) => ({ d: Number(d), avg: sum(v, (x) => x) / v.length, n: v.length }))
      .sort((a, b) => b.avg - a.avg)
    const byPillar = PILLARS.map((p) => {
      const list = withMetrics.filter((x) => x.pillar === p.id)
      return { label: p.label, avg: list.length ? sum(list, engagementRate) / list.length : 0, n: list.length }
    })
      .filter((x) => x.n > 0)
      .sort((a, b) => b.avg - a.avg)

    // Ausblick
    const nextPosts = posts.filter((p) => inRange(p.scheduledAt, next))
    const nextOcc = occurrencesBetween(keyDates, next.start, next.end)
    const nextCampaigns = campaigns.filter((c) => c.status !== 'completed' && parseISO(c.startDate) <= next.end && parseISO(c.endDate) >= next.start)
    const nextPlan = sum(Object.values(budget[format(next.start, 'yyyy-MM')] ?? {}), (v) => v ?? 0)

    return {
      cur,
      monthPosts,
      published,
      withMetrics,
      reach,
      reachPrev,
      rate,
      ratePrev,
      saves,
      clicks,
      followersStart,
      followersEnd,
      top,
      campRows,
      adTotals,
      adPrev,
      plan,
      planTotal,
      actualByChannel,
      monthOrders,
      shopRevenue,
      shopPrev,
      monthBookings,
      newSubs,
      mix,
      byFormat,
      byDay,
      byPillar,
      nextPosts,
      nextOcc,
      nextCampaigns,
      nextPlan,
      next,
    }
  }, [month, posts, campaigns, budget, accounts, orders, bookings, subscribers, keyDates])

  const monthLabel = formatDe(month, 'MMMM yyyy')
  const isCurrent = format(month, 'yyyy-MM') === format(new Date(), 'yyyy-MM')
  const summary = buildSummary(r, monthLabel, isCurrent)

  return (
    <div className="mx-auto max-w-5xl print:max-w-none">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.14em] text-accent-text uppercase">Auswertung</p>
          <h1 className="font-display text-3xl leading-tight font-semibold text-ink md:text-[34px]">
            Monatsreport <span className="text-accent-text capitalize">{monthLabel}</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-2">
            Social Media, Werbung und Shop auf einer Seite – zum Besprechen, Ausdrucken oder als PDF speichern.
            {isCurrent ? ' Der Monat läuft noch: Zahlen bis heute.' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="ghost" size="icon" aria-label="Vormonat" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMonth(new Date())} disabled={isCurrent}>
            Aktueller Monat
          </Button>
          <Button variant="ghost" size="icon" aria-label="Nächster Monat" onClick={() => setMonth(addMonths(month, 1))} disabled={isCurrent}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            <Printer className="size-4" /> Drucken / PDF
          </Button>
        </div>
      </header>

      {demo ? (
        <p className="mb-4 rounded-xl border border-dashed border-line-strong px-4 py-2.5 text-xs text-ink-3">
          Enthält Demo-Daten – sobald echte Zahlen gepflegt sind, entsteht hier euer echter Report.
        </p>
      ) : null}

      <Card className="grain mb-4 overflow-hidden border-0 bg-sidebar text-sidebar-ink print:border print:border-line print:bg-surface print:text-ink">
        <div className="flex gap-4 p-6">
          <TrendingUp className="mt-1 size-5 shrink-0 text-accent" />
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Auf einen Blick</p>
            <p className="mt-2 text-[15px] leading-relaxed">{summary}</p>
          </div>
        </div>
      </Card>

      <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Kennzahlen des Monats">
        <Kpi label="Posts veröffentlicht" value={fmt.num(r.published.length)} hint={`von ${r.monthPosts.length} geplant`} />
        <Kpi label="Reichweite" value={fmt.compact(r.reach)} delta={pctChange(r.reach, r.reachPrev)} />
        <Kpi label="Ø Interaktionsrate" value={fmt.pct(r.rate)} delta={(r.rate - r.ratePrev) * 100} deltaSuffix=" Pp." />
        <Kpi label="Follower" value={fmt.num(r.followersEnd)} hint={`${fmt.signed(r.followersEnd - r.followersStart)} im Monat`} />
        <Kpi label="Werbeausgaben" value={fmt.eur(r.adTotals.spend)} hint={r.planTotal ? `Plan ${fmt.eur(r.planTotal)} (${Math.round((r.adTotals.spend / r.planTotal) * 100)} %)` : 'kein Plan hinterlegt'} />
        <Kpi label="ROAS Werbung" value={r.adTotals.spend ? fmt.ratio(r.adTotals.roas) : '–'} hint={`${fmt.eur(r.adTotals.revenue)} Umsatz · ${fmt.num(r.adTotals.conversions)} Conv.`} />
        <Kpi label="Shop-Umsatz" value={fmt.eur(r.shopRevenue)} delta={pctChange(r.shopRevenue, r.shopPrev)} hint={`${r.monthOrders.length} Bestellungen`} />
        <Kpi label="Workshops & Newsletter" value={`${sum(r.monthBookings, (b) => b.seats)} Plätze`} hint={`${r.newSubs} neue Abonnent:innen`} />
      </section>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
        <Card className="break-inside-avoid">
          <CardHeader title="Top-Posts" subtitle="Nach Reichweite × Interaktionsrate" />
          <ol className="space-y-2 px-5 pb-5">
            {r.top.map((p, i) => (
              <TopPost key={p.id} post={p} rank={i + 1} />
            ))}
            {!r.top.length ? <li className="py-6 text-center text-sm text-ink-3">Keine veröffentlichten Posts mit Zahlen.</li> : null}
          </ol>
        </Card>
        <Card className="break-inside-avoid">
          <CardHeader title="Content-Mix" subtitle="Anteil geplanter Posts je Säule – Ziel in Klammern" />
          <div className="px-5 pb-5">
            <BarList items={r.mix.map((m) => ({ key: m.id, label: m.label, value: m.pct, hint: `(${m.share} %)` }))} format={(v) => `${Math.round(v)} %`} max={40} />
          </div>
        </Card>
      </div>

      <Card className="mb-4 break-inside-avoid">
        <CardHeader title="Kampagnen im Monat" subtitle={`${r.campRows.length} Kampagnen · Ausgaben ${fmt.eur(r.adTotals.spend)} (${fmt.signed(pctChange(r.adTotals.spend, r.adPrev.spend), ' %')} vs. Vormonat)`} />
        <div className="overflow-x-auto px-2 pb-3 scrollbar-thin">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                <th className="px-3 py-2">Kampagne</th>
                <th className="px-3 py-2 text-right">Ausgaben</th>
                <th className="px-3 py-2 text-right">Klicks</th>
                <th className="px-3 py-2 text-right">CTR</th>
                <th className="px-3 py-2 text-right">Conv.</th>
                <th className="px-3 py-2 text-right">Umsatz</th>
                <th className="px-3 py-2 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular">
              {r.campRows.map(({ c, t }) => (
                <tr key={c.id}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-ink">{c.name}</p>
                    <p className="text-[11px] text-ink-3">{OBJECTIVES[c.objective].label}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right">{fmt.eur(t.spend)}</td>
                  <td className="px-3 py-2.5 text-right">{fmt.num(t.clicks)}</td>
                  <td className="px-3 py-2.5 text-right">{t.impressions ? fmt.pct(t.ctr) : '–'}</td>
                  <td className="px-3 py-2.5 text-right">{fmt.num(t.conversions)}</td>
                  <td className="px-3 py-2.5 text-right">{fmt.eur(t.revenue)}</td>
                  <td className={cn('px-3 py-2.5 text-right font-semibold', t.roas >= 3 ? 'text-success' : 'text-ink')}>{t.spend ? fmt.ratio(t.roas) : '–'}</td>
                </tr>
              ))}
              {!r.campRows.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-ink-3">
                    Keine Kampagnen-Daten in diesem Monat.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
        <Card className="break-inside-avoid">
          <CardHeader title="Budget: Plan vs. Ist" subtitle="Je Kanal · Ist = Kampagnenausgaben, gleichmäßig auf Kanäle verteilt" />
          <ul className="space-y-3 px-5 pb-5">
            {AD_CHANNELS.filter((c) => (r.plan[c.id] ?? 0) > 0 || (r.actualByChannel[c.id] ?? 0) > 0).map((c) => {
              const planV = r.plan[c.id] ?? 0
              const act = r.actualByChannel[c.id] ?? 0
              const max = Math.max(planV, act, 1)
              return (
                <li key={c.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <span className="size-2 rounded-full" style={{ background: AD_CHANNEL[c.id].color }} />
                      {c.label}
                    </span>
                    <span className="text-ink tabular">
                      <strong>{fmt.eur(act)}</strong> <span className="text-ink-3">/ {fmt.eur(planV)}</span>
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${(act / max) * 100}%`, background: act > planV * 1.1 && planV ? 'var(--warning)' : 'var(--accent)' }} />
                    {planV ? <div className="absolute -top-1 -bottom-1 w-0.5 bg-ink/70" style={{ left: `calc(${(planV / max) * 100}% - 1px)` }} title="Plan" /> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card className="break-inside-avoid">
          <CardHeader title="Learnings" subtitle="Automatisch aus den Zahlen des Monats" icon={<Lightbulb className="size-4" />} />
          <ul className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-ink-2">
            {r.byFormat[0] ? (
              <Learning>
                <strong className="text-ink">{FORMATS[r.byFormat[0].f as keyof typeof FORMATS]?.label ?? r.byFormat[0].f}</strong> bringt die meiste Reichweite (Ø {fmt.num(r.byFormat[0].avg)} bei {r.byFormat[0].n} Posts).
                {r.byFormat.length > 1 ? ` Am schwächsten: ${FORMATS[r.byFormat[r.byFormat.length - 1].f as keyof typeof FORMATS]?.label}.` : ''}
              </Learning>
            ) : null}
            {r.byDay[0] ? (
              <Learning>
                Bester Posting-Tag: <strong className="text-ink">{WEEKDAYS_SHORT[r.byDay[0].d]}</strong> mit Ø {fmt.pct(r.byDay[0].avg)} Interaktionsrate.
              </Learning>
            ) : null}
            {r.byPillar[0] ? (
              <Learning>
                Stärkste Säule: <strong className="text-ink">{r.byPillar[0].label}</strong> ({fmt.pct(r.byPillar[0].avg)}).
                {r.byPillar.length > 1 ? ` Ausbaufähig: ${r.byPillar[r.byPillar.length - 1].label} – neuer Hook oder anderes Format testen.` : ''}
              </Learning>
            ) : null}
            {r.adTotals.spend ? (
              <Learning>
                Werbung: {fmt.eur(r.adTotals.spend)} ausgegeben, CPC {fmt.eur2(r.adTotals.cpc)}, {r.adTotals.roas >= 3 ? 'ROAS über Ziel – Budget der besten Kampagne vorsichtig erhöhen.' : 'ROAS unter 3× – Creatives und Zielgruppen prüfen, bevor mehr Budget fließt.'}
              </Learning>
            ) : null}
            {!r.byFormat.length && !r.adTotals.spend ? <li className="py-4 text-center text-ink-3">Noch zu wenig Daten für Learnings.</li> : null}
          </ul>
        </Card>
      </div>

      <Card className="mb-4 break-inside-avoid">
        <CardHeader title={`Ausblick ${formatDe(r.next.start, 'MMMM')}`} subtitle="Was im nächsten Monat ansteht" />
        <div className="grid grid-cols-1 gap-6 px-5 pb-5 md:grid-cols-3">
          <div>
            <p className="label">Anlässe</p>
            <ul className="space-y-1.5">
              {r.nextOcc.slice(0, 6).map((o) => (
                <li key={`${o.keyDate.id}-${o.start.toISOString()}`} className="flex items-center gap-2 text-sm">
                  <span className="w-12 shrink-0 text-xs font-semibold text-ink-3 tabular">{format(o.start, 'dd.MM.')}</span>
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: KEYDATE_KINDS[o.keyDate.kind].color }} />
                  <span className="truncate text-ink">{o.keyDate.title}</span>
                </li>
              ))}
              {!r.nextOcc.length ? <li className="text-sm text-ink-3">Keine Anlässe eingetragen.</li> : null}
            </ul>
          </div>
          <div>
            <p className="label">Content</p>
            <p className="text-2xl font-semibold text-ink tabular">{r.nextPosts.length} Posts</p>
            <p className="text-xs text-ink-3">
              bereits geplant · {r.nextPosts.filter((p) => p.status === 'idea' || p.status === 'draft').length} davon noch Idee/Entwurf
            </p>
          </div>
          <div>
            <p className="label">Werbung</p>
            <p className="text-2xl font-semibold text-ink tabular">{fmt.eur(r.nextPlan)}</p>
            <p className="text-xs text-ink-3">Budget geplant · {r.nextCampaigns.length} Kampagnen laufen</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.nextCampaigns.slice(0, 4).map((c) => (
                <Badge key={c.id} tone={c.status === 'planned' ? 'neutral' : 'success'}>
                  {c.name.length > 26 ? `${c.name.slice(0, 25)}…` : c.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <p className="pb-4 text-center text-[11px] text-ink-3">Erstellt am {formatDe(new Date(), "d. MMMM yyyy 'um' HH:mm 'Uhr'")} · Röstbrüder Studio</p>
    </div>
  )
}

function Kpi({ label, value, delta, deltaSuffix = ' %', hint }: { label: string; value: ReactNode; delta?: number; deltaSuffix?: string; hint?: ReactNode }) {
  return (
    <div className="break-inside-avoid rounded-2xl border border-line bg-surface p-4 shadow-soft print:shadow-none">
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className="mt-2 text-2xl leading-none font-semibold tracking-tight text-ink tabular">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
        {delta != null ? <Delta value={delta} suffix={deltaSuffix} /> : null}
        {hint ? <span>{hint}</span> : null}
        {delta != null && !hint ? <span>vs. Vormonat</span> : null}
      </div>
    </div>
  )
}

function TopPost({ post, rank }: { post: Post; rank: number }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-5 text-center font-display text-lg font-semibold text-accent-text">{rank}</span>
      <MediaThumb url={post.mediaUrl} tone={post.mediaTone} className="size-12 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{post.title}</p>
        <p className="flex items-center gap-2 text-[11px] text-ink-3">
          <PlatformStack platforms={post.platforms} size={14} /> {formatDe(post.scheduledAt, 'd. MMM')}
        </p>
      </div>
      <div className="text-right text-[11px] text-ink-3 tabular">
        <p className="text-sm font-semibold text-ink">{fmt.compact(post.metrics?.reach ?? 0)}</p>
        {fmt.pct(engagementRate(post))}
      </div>
    </li>
  )
}

function Learning({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
      <span>{children}</span>
    </li>
  )
}

type ReportData = {
  published: Post[]
  monthPosts: Post[]
  reach: number
  reachPrev: number
  rate: number
  followersEnd: number
  followersStart: number
  adTotals: ReturnType<typeof totals>
  planTotal: number
  shopRevenue: number
  monthOrders: unknown[]
  top: Post[]
}

function buildSummary(r: ReportData, monthLabel: string, isCurrent: boolean) {
  const parts: string[] = []
  parts.push(`Im ${monthLabel} ${isCurrent ? 'sind bisher' : 'wurden'} ${r.published.length} von ${r.monthPosts.length} geplanten Posts veröffentlicht`)
  if (r.reach) {
    const ch = pctChange(r.reach, r.reachPrev)
    parts[0] += ` – mit ${fmt.num(r.reach)} Reichweite${r.reachPrev ? ` (${ch >= 0 ? '+' : '−'}${Math.abs(Math.round(ch))} % zum Vormonat)` : ''}`
  }
  parts[0] += '.'
  if (r.followersEnd - r.followersStart > 0) parts.push(`${fmt.num(r.followersEnd - r.followersStart)} neue Follower über alle Kanäle.`)
  if (r.adTotals.spend) {
    parts.push(
      `Für Werbung flossen ${fmt.eur(r.adTotals.spend)}${r.planTotal ? ` (${Math.round((r.adTotals.spend / r.planTotal) * 100)} % des Plans)` : ''} bei einem ROAS von ${fmt.ratio(r.adTotals.roas)}.`,
    )
  }
  if (r.monthOrders.length) parts.push(`Der Shop machte ${fmt.eur(r.shopRevenue)} Umsatz aus ${r.monthOrders.length} Bestellungen.`)
  if (r.top[0]) parts.push(`Stärkster Post: „${r.top[0].title}“.`)
  return parts.join(' ')
}
