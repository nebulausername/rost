import { addDays, addMonths, differenceInCalendarDays, endOfMonth, max as maxDate, min as minDate, parseISO, startOfDay, startOfMonth } from 'date-fns'
import {
  CalendarCheck,
  Check,
  Copy,
  Info,
  Megaphone,
  MessageCircleHeart,
  MousePointerClick,
  RotateCcw,
  ShoppingBag,
  Store,
  TriangleAlert,
  WandSparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, Drawer, Field, Input, Kbd, Segmented, Select, Textarea } from '../components/ui/primitives'
import { AD_CHANNEL, AD_CHANNELS, CAMPAIGN_STATUSES, OBJECTIVES } from '../lib/constants'
import { useStore, useUi } from '../lib/store'
import type { AdChannel, Campaign, CampaignObjective, CampaignStatus } from '../lib/types'
import { buildUtmUrl, cn, dayKey, fmt, slugify, uid } from '../lib/utils'

// ---------------------------------------------------------------------------
// Formularmodell: Zahlen als Strings, damit Felder leer sein dürfen
// ---------------------------------------------------------------------------

interface Draft {
  name: string
  objective: CampaignObjective
  status: CampaignStatus
  channels: AdChannel[]
  budget: string
  dailyLimit: string
  startDate: string
  endDate: string
  audience: string
  radiusKm: string
  ageMin: string
  ageMax: string
  interests: string[]
  offer: string
  landingUrl: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  targetCtr: string
  targetCpc: string
  targetCpa: string
  targetRoas: string
  notes: string
}

type ErrorKey = 'name' | 'channels' | 'budget' | 'dates' | 'age' | 'url'

const str = (v: number | null | undefined, digits = 2) => (v == null || !Number.isFinite(v) ? '' : String(Math.round(v * 10 ** digits) / 10 ** digits))
const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))

function defaults(): Draft {
  const today = startOfDay(new Date())
  return {
    name: '',
    objective: 'awareness',
    status: 'planned',
    channels: ['meta'],
    budget: '500',
    dailyLimit: '',
    startDate: dayKey(today),
    endDate: dayKey(addDays(today, 29)), // 30 Tage Laufzeit inkl. Start- & Endtag
    audience: '',
    radiusKm: '20',
    ageMin: '20',
    ageMax: '55',
    interests: [],
    offer: '',
    landingUrl: 'https://roestbrueder.com/',
    utmSource: 'meta',
    utmMedium: 'paid_social',
    utmCampaign: '',
    targetCtr: '',
    targetCpc: '',
    targetCpa: '',
    targetRoas: '',
    notes: '',
  }
}

function fromCampaign(c: Campaign): Draft {
  return {
    name: c.name,
    objective: c.objective,
    status: c.status,
    channels: c.channels,
    budget: str(c.budget),
    dailyLimit: str(c.dailyLimit),
    startDate: c.startDate,
    endDate: c.endDate,
    audience: c.audience,
    radiusKm: str(c.radiusKm, 0),
    ageMin: str(c.ageMin, 0),
    ageMax: str(c.ageMax, 0),
    interests: c.interests,
    offer: c.offer,
    landingUrl: c.landingUrl,
    utmSource: c.utmSource,
    utmMedium: c.utmMedium,
    utmCampaign: c.utmCampaign,
    targetCtr: c.targets.ctr != null ? str(c.targets.ctr * 100) : '',
    targetCpc: str(c.targets.cpc),
    targetCpa: str(c.targets.cpa),
    targetRoas: str(c.targets.roas, 1),
    notes: c.notes,
  }
}

const suggestUtm = (start: string, name: string) => {
  const slug = slugify(name).slice(0, 32).replace(/-+$/, '')
  return slug ? `${start.slice(0, 7)}_${slug}` : ''
}

const OBJECTIVE_ICON: Record<CampaignObjective, LucideIcon> = {
  awareness: Megaphone,
  traffic: MousePointerClick,
  sales: ShoppingBag,
  visits: Store,
  leads: CalendarCheck,
  engagement: MessageCircleHeart,
}

/** Welche Zielwerte zum Kampagnenziel passen */
const RELEVANT_TARGETS: Record<CampaignObjective, ('ctr' | 'cpc' | 'cpa' | 'roas')[]> = {
  awareness: ['ctr'],
  traffic: ['ctr', 'cpc'],
  sales: ['roas', 'cpa'],
  visits: ['cpc'],
  leads: ['cpa'],
  engagement: ['ctr'],
}

const SOURCE_FOR: Record<AdChannel, { source: string; medium: string }> = {
  meta: { source: 'meta', medium: 'paid_social' },
  influencer: { source: 'influencer', medium: 'influencer' },
  tiktok: { source: 'tiktok', medium: 'paid_social' },
  google: { source: 'google', medium: 'cpc' },
  pinterest: { source: 'pinterest', medium: 'paid_social' },
  local: { source: 'local', medium: 'print' },
  email: { source: 'newsletter', medium: 'email' },
  print: { source: 'print', medium: 'qr' },
}

const MEDIUMS = [
  { value: 'paid_social', label: 'paid_social – Social Ads' },
  { value: 'cpc', label: 'cpc – Suchanzeigen' },
  { value: 'display', label: 'display – Banner' },
  { value: 'email', label: 'email – Newsletter' },
  { value: 'qr', label: 'qr – QR-Code' },
  { value: 'influencer', label: 'influencer – Kooperation' },
  { value: 'print', label: 'print – Flyer & Plakat' },
]

const LANDING_PICKS = [
  { label: 'Startseite', url: 'https://roestbrueder.com/' },
  { label: 'Shop', url: 'https://roestbrueder.com/shop/' },
  { label: 'Cafés', url: 'https://roestbrueder.com/cafes/' },
  { label: 'Workshops', url: 'https://roestbrueder.com/produkt-kategorie/workshops/' },
]

const INTEREST_IDEAS = ['Kaffee', 'Specialty Coffee', 'Barista', 'Espressomaschine', 'Filterkaffee', 'Frühstück', 'Cafés', 'Geschenkideen', 'Feinkost', 'Bauhaus', 'Städtereisen']

const DURATIONS = [
  { label: '1 Woche', days: 7 },
  { label: '2 Wochen', days: 14 },
  { label: '30 Tage', days: 30 },
  { label: '3 Monate', days: 90 },
]

// ---------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------

export function CampaignEditor() {
  const editor = useUi((s) => s.campaignEditor)
  const close = useUi((s) => s.closeCampaign)
  if (!editor.open) return null
  // key: frischer Formularzustand bei jedem Öffnen / jeder Kampagne
  return <EditorDrawer key={editor.campaignId ?? 'new'} campaignId={editor.campaignId} onClose={close} />
}

function EditorDrawer({ campaignId, onClose }: { campaignId: string | null; onClose: () => void }) {
  const campaigns = useStore((s) => s.campaigns)
  const cap = useStore((s) => s.settings.monthlyBudgetCap)
  const upsertCampaign = useStore((s) => s.upsertCampaign)
  const toast = useUi((s) => s.toast)
  const navigate = useNavigate()

  const original = useMemo(() => (campaignId ? campaigns.find((c) => c.id === campaignId) : undefined), [campaignId, campaigns])
  const isNew = !original
  const [draft, setDraft] = useState<Draft>(() => (original ? fromCampaign(original) : defaults()))
  const [utmTouched, setUtmTouched] = useState(() => !!original?.utmCampaign)
  const [tried, setTried] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  // --- abgeleitete Werte ------------------------------------------------------
  const budget = num(draft.budget) ?? 0
  const dailyLimit = num(draft.dailyLimit)
  const datesValid = !!draft.startDate && !!draft.endDate && draft.endDate >= draft.startDate
  const days = datesValid ? differenceInCalendarDays(parseISO(draft.endDate), parseISO(draft.startDate)) + 1 : 0
  const perDay = days && budget > 0 ? budget / days : 0
  const suggestion = suggestUtm(draft.startDate || dayKey(new Date()), draft.name)
  const utmCampaign = utmTouched ? draft.utmCampaign : suggestion
  const finalUrl = buildUtmUrl(draft.landingUrl.trim(), { source: draft.utmSource.trim(), medium: draft.utmMedium.trim(), campaign: utmCampaign.trim() })
  const ageMin = num(draft.ageMin)
  const ageMax = num(draft.ageMax)

  const errors: Partial<Record<ErrorKey, string>> = {}
  if (!draft.name.trim()) errors.name = 'Gib der Kampagne einen Namen.'
  if (!draft.channels.length) errors.channels = 'Wähle mindestens einen Kanal.'
  if (!(budget > 0)) errors.budget = 'Das Budget muss größer als 0 € sein.'
  if (!draft.startDate || !draft.endDate) errors.dates = 'Start und Ende angeben.'
  else if (draft.endDate < draft.startDate) errors.dates = 'Das Ende liegt vor dem Start.'
  if (ageMin != null && ageMax != null && ageMin > ageMax) errors.age = 'Das Mindestalter liegt über dem Höchstalter.'
  if (draft.landingUrl.trim() && !buildUtmUrl(draft.landingUrl.trim(), {})) errors.url = 'Das sieht nicht nach einer gültigen URL aus.'
  const errorList = Object.entries(errors) as [ErrorKey, string][]
  const show = (k: ErrorKey) => (tried ? errors[k] : undefined)

  // Monatsdeckel: aktive & geplante Kampagnen anteilig pro Monat
  const capCheck = useMemo(() => {
    if (!datesValid || !(budget > 0) || draft.status === 'completed') return []
    const items = campaigns
      .filter((c) => c.id !== campaignId && c.status !== 'completed')
      .map((c) => ({ start: c.startDate, end: c.endDate, budget: c.budget }))
    const own = { start: draft.startDate, end: draft.endDate, budget }
    const share = (x: typeof own, m: Date) => {
      const s = parseISO(x.start)
      const e = parseISO(x.end)
      const total = differenceInCalendarDays(e, s) + 1
      const overlap = differenceInCalendarDays(minDate([e, endOfMonth(m)]), maxDate([s, m])) + 1
      return total > 0 && overlap > 0 ? (x.budget * overlap) / total : 0
    }
    const out: { month: Date; total: number; own: number }[] = []
    const last = parseISO(draft.endDate)
    for (let m = startOfMonth(parseISO(draft.startDate)), i = 0; m <= last && i < 36; m = addMonths(m, 1), i++) {
      const ownShare = share(own, m)
      const total = ownShare + items.reduce((acc, x) => acc + share(x, m), 0)
      if (total > cap) out.push({ month: m, total, own: ownShare })
    }
    return out
  }, [campaigns, campaignId, datesValid, budget, draft.startDate, draft.endDate, draft.status, cap])

  // --- Aktionen -------------------------------------------------------------
  const toggleChannel = (ch: AdChannel) => {
    const next = draft.channels.includes(ch) ? draft.channels.filter((x) => x !== ch) : [...draft.channels, ch]
    set(
      'channels',
      AD_CHANNELS.filter((c) => next.includes(c.id)).map((c) => c.id),
    )
  }

  const setDuration = (n: number) => {
    if (!draft.startDate) return
    set('endDate', dayKey(addDays(parseISO(draft.startDate), n - 1)))
  }

  const setStart = (v: string) => {
    // Laufzeit beibehalten, wenn der Start verschoben wird
    if (datesValid && v) {
      set('startDate', v)
      set('endDate', dayKey(addDays(parseISO(v), days - 1)))
    } else set('startDate', v)
  }

  const save = () => {
    setTried(true)
    if (errorList.length) {
      const first = errorList[0][0]
      const target = { name: 'cmp-name', channels: 'cmp-channels', budget: 'cmp-budget', dates: 'cmp-start', age: 'cmp-age-min', url: 'cmp-url' }[first]
      const el = document.getElementById(target)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
      return
    }
    const now = new Date().toISOString()
    const targets: Campaign['targets'] = {}
    const ctr = num(draft.targetCtr)
    const cpc = num(draft.targetCpc)
    const cpa = num(draft.targetCpa)
    const roas = num(draft.targetRoas)
    if (ctr != null && ctr > 0) targets.ctr = ctr / 100
    if (cpc != null && cpc > 0) targets.cpc = cpc
    if (cpa != null && cpa > 0) targets.cpa = cpa
    if (roas != null && roas > 0) targets.roas = roas
    const landing = draft.landingUrl.trim()
    const campaign: Campaign = {
      id: original?.id ?? uid('cmp'),
      name: draft.name.trim(),
      objective: draft.objective,
      channels: draft.channels,
      status: draft.status,
      startDate: draft.startDate,
      endDate: draft.endDate,
      budget: Math.round(budget * 100) / 100,
      dailyLimit: dailyLimit != null && dailyLimit > 0 ? Math.round(dailyLimit * 100) / 100 : null,
      audience: draft.audience.trim(),
      radiusKm: num(draft.radiusKm) && (num(draft.radiusKm) ?? 0) > 0 ? Math.round(num(draft.radiusKm) ?? 0) : null,
      ageMin: Math.round(ageMin ?? 18),
      ageMax: Math.round(ageMax ?? 65),
      interests: draft.interests,
      offer: draft.offer.trim(),
      landingUrl: landing && !/^https?:\/\//.test(landing) ? `https://${landing}` : landing,
      utmSource: draft.utmSource.trim(),
      utmMedium: draft.utmMedium.trim(),
      utmCampaign: utmCampaign.trim(),
      targets,
      daily: original?.daily ?? [],
      notes: draft.notes.trim(),
      createdAt: original?.createdAt ?? now,
      updatedAt: now,
    }
    upsertCampaign(campaign)
    toast({
      title: isNew ? 'Kampagne angelegt' : 'Änderungen gespeichert',
      description: isNew ? `„${campaign.name}“ – jetzt Creatives planen und loslegen.` : campaign.name,
      tone: 'success',
    })
    onClose()
    if (isNew) navigate(`/studio/kampagnen/${campaign.id}`)
  }

  const copyUrl = () => {
    if (!finalUrl) return
    navigator.clipboard?.writeText(finalUrl).then(
      () => toast({ title: 'Link kopiert', tone: 'success' }),
      () => toast({ title: 'Kopieren nicht möglich', tone: 'danger' }),
    )
  }

  const sourceIdeas = Array.from(new Map(draft.channels.map((ch) => [SOURCE_FOR[ch].source, SOURCE_FOR[ch]])).values())
  const relevant = RELEVANT_TARGETS[draft.objective]

  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? 'Neue Kampagne' : 'Kampagne bearbeiten'}
      subtitle={isNew ? 'Ziel, Budget, Zielgruppe & Tracking – einmal sauber aufsetzen, dann rechnet das Studio mit.' : original.name}
      width="max-w-4xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="hidden items-center gap-1 text-[11px] text-ink-3 sm:flex">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
            <span className="ml-1">speichert</span>
            {tried && errorList.length ? <span className="ml-3 font-medium text-danger">{errorList.length === 1 ? '1 Feld prüfen' : `${errorList.length} Felder prüfen`}</span> : null}
          </p>
          <div className="ml-auto flex gap-2">
            <Button onClick={onClose}>Abbrechen</Button>
            <Button variant="primary" onClick={save}>
              <Check className="size-4" /> {isNew ? 'Kampagne anlegen' : 'Speichern'}
            </Button>
          </div>
        </div>
      }
    >
      <div
        className="grid grid-cols-1 gap-5 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_260px]"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            save()
          }
        }}
      >
        <div className="min-w-0 space-y-4">
          {/* 1 Grundlagen */}
          <Section n={1} title="Grundlagen" description="Worum geht’s und woran misst du Erfolg?">
            <Field label="Name" htmlFor="cmp-name">
              <Input
                id="cmp-name"
                autoFocus={isNew}
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="z. B. Kaffee-Abo Frühjahrsstart"
                aria-invalid={!!show('name')}
                className={cn(show('name') && 'border-danger!')}
              />
              <FieldError text={show('name')} />
            </Field>

            <div className="mt-4">
              <p className="label" id="cmp-objective-label">
                Ziel
              </p>
              <div role="radiogroup" aria-labelledby="cmp-objective-label" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(OBJECTIVES) as CampaignObjective[]).map((o) => {
                  const meta = OBJECTIVES[o]
                  const active = draft.objective === o
                  const Icon = OBJECTIVE_ICON[o]
                  return (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set('objective', o)}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow]',
                        active ? 'border-accent bg-accent-soft/60 shadow-soft ring-1 ring-accent' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
                      )}
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                          <Icon className={cn('size-4', active ? 'text-accent-text' : 'text-ink-3')} aria-hidden />
                          {meta.label}
                        </span>
                        {active ? <Check className="size-3.5 text-accent-text" aria-hidden /> : null}
                      </span>
                      <span className="text-[11px] leading-snug text-ink-2">{meta.description}</span>
                      <span className="mt-auto pt-1 text-[10px] font-medium text-ink-3">KPI: {meta.kpi}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4">
              <p className="label">Status</p>
              <div className="overflow-x-auto scrollbar-thin">
                <Segmented
                  label="Status"
                  value={draft.status}
                  onChange={(v) => set('status', v)}
                  options={(Object.keys(CAMPAIGN_STATUSES) as CampaignStatus[]).map((s) => ({ value: s, label: CAMPAIGN_STATUSES[s].label }))}
                />
              </div>
            </div>
          </Section>

          {/* 2 Kanäle */}
          <Section n={2} title="Kanäle" description="Wo läuft die Kampagne? Mehrfachauswahl möglich.">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Kanäle">
              {AD_CHANNELS.map((ch, i) => {
                const active = draft.channels.includes(ch.id)
                return (
                  <button
                    key={ch.id}
                    id={i === 0 ? 'cmp-channels' : undefined}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleChannel(ch.id)}
                    className={cn(
                      'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors',
                      active ? 'tint tint-border' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
                    )}
                    style={{ '--c': ch.color } as CSSProperties}
                  >
                    <span
                      className={cn('flex size-4 items-center justify-center rounded-[5px] border transition-colors', active ? 'border-transparent' : 'border-line-strong')}
                      style={active ? { background: ch.color } : undefined}
                      aria-hidden
                    >
                      {active ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
                    </span>
                    {ch.label}
                    {!ch.paid ? <span className="text-[10px] font-normal opacity-70">eigener Kanal</span> : null}
                  </button>
                )
              })}
            </div>
            <FieldError text={show('channels')} />
          </Section>

          {/* 3 Budget & Laufzeit */}
          <Section n={3} title="Budget & Laufzeit" description="Gesamtbudget verteilt sich linear über die Laufzeit – daraus rechnet das Pacing.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Gesamtbudget" htmlFor="cmp-budget">
                <EuroInput id="cmp-budget" value={draft.budget} onChange={(v) => set('budget', v)} invalid={!!show('budget')} step="10" />
                <FieldError text={show('budget')} />
              </Field>
              <Field label="Tageslimit" htmlFor="cmp-limit" aside="optional">
                <EuroInput id="cmp-limit" value={draft.dailyLimit} onChange={(v) => set('dailyLimit', v)} placeholder={perDay ? fmt.num(Math.ceil(perDay * 1.3)) : ''} step="1" />
              </Field>
              <Field label="Start" htmlFor="cmp-start">
                <Input id="cmp-start" type="date" value={draft.startDate} onChange={(e) => setStart(e.target.value)} aria-invalid={!!show('dates')} />
              </Field>
              <Field label="Ende" htmlFor="cmp-end">
                <Input
                  id="cmp-end"
                  type="date"
                  value={draft.endDate}
                  min={draft.startDate || undefined}
                  onChange={(e) => set('endDate', e.target.value)}
                  aria-invalid={!!show('dates')}
                  className={cn(show('dates') && 'border-danger!')}
                />
              </Field>
            </div>
            <FieldError text={show('dates')} />
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] text-ink-3">Laufzeit:</span>
              {DURATIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDuration(d.days)}
                  className={cn(
                    'h-7 rounded-full border px-2.5 text-xs font-medium transition-colors',
                    days === d.days ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl bg-surface-2 px-4 py-3">
              <span className="text-xl font-semibold tracking-tight text-ink">{perDay ? `≈ ${fmt.eur2(perDay)}` : '–'}</span>
              <span className="text-sm text-ink-2">pro Tag{days ? ` über ${days} ${days === 1 ? 'Tag' : 'Tage'}` : ''}</span>
              {dailyLimit != null && dailyLimit > 0 && days ? (
                <span className="w-full text-xs text-ink-3">
                  Mit Tageslimit {fmt.eur(dailyLimit)} sind max. {fmt.eur(dailyLimit * days)} ausgebbar
                  {dailyLimit * days < budget ? ' – weniger als das Budget.' : '.'}
                </span>
              ) : null}
            </div>

            {dailyLimit != null && dailyLimit > 0 && days && dailyLimit * days < budget ? (
              <Callout tone="warning">
                Das Tageslimit ist zu niedrig, um das Budget auszuschöpfen. Setz es auf mindestens <strong>{fmt.eur(Math.ceil(perDay))}</strong>.
              </Callout>
            ) : null}

            {capCheck.length ? (
              <Callout tone="warning">
                <p className="font-medium">Monatsdeckel von {fmt.eur(cap)} wird überschritten</p>
                <ul className="mt-1 space-y-0.5">
                  {capCheck.map((r) => (
                    <li key={r.month.toISOString()} className="tabular">
                      {fmt.date(r.month, 'MMMM yyyy')}: ≈ {fmt.eur(r.total)} verplant (diese Kampagne ≈ {fmt.eur(r.own)})
                    </li>
                  ))}
                </ul>
                <p className="mt-1 opacity-80">Summe aller aktiven & geplanten Kampagnen, anteilig nach Tagen. Budget kürzen, Laufzeit strecken oder Deckel anpassen.</p>
              </Callout>
            ) : null}
          </Section>

          {/* 4 Zielgruppe */}
          <Section n={4} title="Zielgruppe" description="Wen willst du erreichen – und mit welchem Versprechen?">
            <Field label="Beschreibung" htmlFor="cmp-audience">
              <Textarea
                id="cmp-audience"
                value={draft.audience}
                onChange={(e) => set('audience', e.target.value)}
                placeholder="z. B. Home-Baristas in Weimar & Umland, Retargeting Shop-Besucher 30 Tage"
              />
            </Field>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Field label="Radius" htmlFor="cmp-radius" hint="leer = bundesweit">
                <div className="relative">
                  <Input
                    id="cmp-radius"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={draft.radiusKm}
                    onChange={(e) => set('radiusKm', e.target.value)}
                    className="pr-9 text-right tabular"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-3">km</span>
                </div>
              </Field>
              <Field label="Alter von" htmlFor="cmp-age-min">
                <Input
                  id="cmp-age-min"
                  type="number"
                  min={13}
                  max={99}
                  inputMode="numeric"
                  value={draft.ageMin}
                  onChange={(e) => set('ageMin', e.target.value)}
                  aria-invalid={!!show('age')}
                  className="text-right tabular"
                />
              </Field>
              <Field label="bis" htmlFor="cmp-age-max">
                <Input
                  id="cmp-age-max"
                  type="number"
                  min={13}
                  max={99}
                  inputMode="numeric"
                  value={draft.ageMax}
                  onChange={(e) => set('ageMax', e.target.value)}
                  aria-invalid={!!show('age')}
                  className="text-right tabular"
                />
              </Field>
            </div>
            <FieldError text={show('age')} />
            <Field label="Interessen & Keywords" htmlFor="cmp-interests" className="mt-3" aside="Enter oder Komma zum Hinzufügen">
              <TagInput id="cmp-interests" value={draft.interests} onChange={(v) => set('interests', v)} placeholder="z. B. Specialty Coffee" />
              <div className="mt-2 flex flex-wrap gap-1">
                {INTEREST_IDEAS.filter((i) => !draft.interests.includes(i))
                  .slice(0, 7)
                  .map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => set('interests', [...draft.interests, i])}
                      className="h-6 rounded-full border border-dashed border-line-strong px-2 text-[11px] text-ink-3 transition-colors hover:border-accent hover:text-accent-text"
                    >
                      + {i}
                    </button>
                  ))}
              </div>
            </Field>
            <Field label="Angebot / Hook" htmlFor="cmp-offer" className="mt-3">
              <Input id="cmp-offer" value={draft.offer} onChange={(e) => set('offer', e.target.value)} placeholder="z. B. Erste Abo-Lieferung mit Bonus-Beutel" />
            </Field>
          </Section>

          {/* 5 Landingpage & Tracking */}
          <Section n={5} title="Landingpage & Tracking" description="UTM-Parameter sorgen dafür, dass Verkäufe in Analytics der Kampagne zugeordnet werden.">
            <Field label="Landingpage" htmlFor="cmp-url">
              <Input
                id="cmp-url"
                type="url"
                inputMode="url"
                value={draft.landingUrl}
                onChange={(e) => set('landingUrl', e.target.value)}
                placeholder="https://roestbrueder.com/shop/"
                aria-invalid={!!show('url')}
                className={cn(show('url') && 'border-danger!')}
              />
              <FieldError text={show('url')} />
              <div className="mt-2 flex flex-wrap gap-1">
                {LANDING_PICKS.map((l) => (
                  <button
                    key={l.url}
                    type="button"
                    onClick={() => set('landingUrl', l.url)}
                    className={cn(
                      'h-6 rounded-full border px-2 text-[11px] transition-colors',
                      draft.landingUrl === l.url ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-ink-3 hover:border-line-strong hover:text-ink',
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="utm_source" htmlFor="cmp-source">
                <Input id="cmp-source" value={draft.utmSource} onChange={(e) => set('utmSource', e.target.value)} list="cmp-source-list" placeholder="meta" />
                <datalist id="cmp-source-list">
                  {['meta', 'instagram', 'facebook', 'google', 'tiktok', 'pinterest', 'newsletter', 'influencer', 'print', 'local'].map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
              <Field label="utm_medium" htmlFor="cmp-medium">
                <Select id="cmp-medium" value={draft.utmMedium} onChange={(e) => set('utmMedium', e.target.value)}>
                  {MEDIUMS.some((m) => m.value === draft.utmMedium) || !draft.utmMedium ? null : <option value={draft.utmMedium}>{draft.utmMedium}</option>}
                  {MEDIUMS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {sourceIdeas.length ? (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="mr-1 text-[11px] text-ink-3">Passend zu den Kanälen:</span>
                {sourceIdeas.map((s) => {
                  const active = draft.utmSource === s.source && draft.utmMedium === s.medium
                  return (
                    <button
                      key={s.source}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, utmSource: s.source, utmMedium: s.medium }))}
                      className={cn(
                        'h-6 rounded-full border px-2 font-mono text-[10px] transition-colors',
                        active ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-ink-3 hover:border-line-strong hover:text-ink',
                      )}
                    >
                      {s.source} / {s.medium}
                    </button>
                  )
                })}
              </div>
            ) : null}
            <Field
              label="utm_campaign"
              htmlFor="cmp-utm"
              className="mt-3"
              aside={
                utmTouched && suggestion && draft.utmCampaign !== suggestion ? (
                  <button type="button" onClick={() => setUtmTouched(false)} className="inline-flex items-center gap-1 font-medium text-accent-text hover:underline">
                    <RotateCcw className="size-3" /> Vorschlag nutzen
                  </button>
                ) : !utmTouched ? (
                  <span className="inline-flex items-center gap-1">
                    <WandSparkles className="size-3" /> automatisch aus Startmonat & Name
                  </span>
                ) : undefined
              }
            >
              <Input
                id="cmp-utm"
                value={utmCampaign}
                onChange={(e) => {
                  setUtmTouched(true)
                  set('utmCampaign', e.target.value)
                }}
                placeholder="2026-10_kaffee-abo-herbst"
                className="font-mono"
              />
            </Field>
            <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-ink-3">Finaler Link</p>
                <Button size="sm" variant="ghost" onClick={copyUrl} disabled={!finalUrl} className="-my-1">
                  <Copy className="size-3.5" /> Kopieren
                </Button>
              </div>
              <p className="font-mono text-xs leading-relaxed break-all text-ink">{finalUrl || <span className="text-ink-3">Gib eine Landingpage ein.</span>}</p>
            </div>
          </Section>

          {/* 6 Ziele */}
          <Section n={6} title="Ziele" description="Zielwerte machen die Empfehlungen auf der Detailseite erst möglich.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TargetField id="cmp-t-ctr" label="Ziel-CTR" suffix="%" value={draft.targetCtr} onChange={(v) => set('targetCtr', v)} placeholder="1,2" recommended={relevant.includes('ctr')} step="0.1" />
              <TargetField id="cmp-t-cpc" label="Ziel-CPC" suffix="€" value={draft.targetCpc} onChange={(v) => set('targetCpc', v)} placeholder="0,50" recommended={relevant.includes('cpc')} step="0.05" />
              <TargetField id="cmp-t-cpa" label="Ziel-CPA" suffix="€" value={draft.targetCpa} onChange={(v) => set('targetCpa', v)} placeholder="18" recommended={relevant.includes('cpa')} step="1" />
              <TargetField id="cmp-t-roas" label="Ziel-ROAS" suffix="×" value={draft.targetRoas} onChange={(v) => set('targetRoas', v)} placeholder="3" recommended={relevant.includes('roas')} step="0.1" />
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-3">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              Für „{OBJECTIVES[draft.objective].label}“ zählen vor allem {OBJECTIVES[draft.objective].kpi}. Richtwerte lokal: CTR 0,8–1,5 % (Social), CPC 0,30–0,80 €.
            </p>
          </Section>

          {/* 7 Notizen */}
          <Section n={7} title="Notizen" description="Creatives, Absprachen, Learnings – alles, was das Team wissen sollte.">
            <Textarea
              id="cmp-notes"
              aria-label="Notizen"
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="z. B. 3 Creatives im Wechsel, Frequenz ≤ 3/Woche. Freigabe durch Vincent."
            />
          </Section>
        </div>

        {/* Zusammenfassung */}
        <aside className="min-w-0" aria-label="Zusammenfassung">
          <div className="space-y-3 lg:sticky lg:top-0">
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-accent-text uppercase">Zusammenfassung</p>
              <p className={cn('mt-1 font-display text-lg leading-snug font-semibold', draft.name.trim() ? 'text-ink' : 'text-ink-3')}>
                {draft.name.trim() || 'Unbenannte Kampagne'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={CAMPAIGN_STATUSES[draft.status].tone} dot>
                  {CAMPAIGN_STATUSES[draft.status].label}
                </Badge>
                <span className="text-xs text-ink-3">{OBJECTIVES[draft.objective].label}</span>
              </div>

              <div className="mt-4 rounded-xl bg-surface-2 p-3">
                <p className="text-[11px] text-ink-3">Budget pro Tag</p>
                <p className="mt-0.5 text-2xl leading-none font-semibold tracking-tight text-ink">{perDay ? fmt.eur2(perDay) : '–'}</p>
                <p className="mt-1.5 text-[11px] text-ink-3 tabular">
                  {budget > 0 ? fmt.eur(budget) : '– €'} · {days ? `${days} ${days === 1 ? 'Tag' : 'Tage'}` : 'Laufzeit offen'}
                </p>
              </div>

              <dl className="mt-4 space-y-3 text-xs">
                <div>
                  <dt className="text-ink-3">Laufzeit</dt>
                  <dd className="mt-0.5 font-medium text-ink tabular">
                    {datesValid ? `${fmt.date(draft.startDate, 'd. MMM')} – ${fmt.date(draft.endDate, 'd. MMM yyyy')}` : '–'}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">Kanäle & Anteil</dt>
                  <dd className="mt-1">
                    {draft.channels.length ? (
                      <ul className="space-y-1">
                        {draft.channels.map((ch) => (
                          <li key={ch} className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
                              <span className="size-2 shrink-0 rounded-full" style={{ background: AD_CHANNEL[ch].color }} aria-hidden />
                              <span className="truncate">{AD_CHANNEL[ch].label}</span>
                            </span>
                            <span className="shrink-0 font-medium text-ink tabular">{budget > 0 ? fmt.eur(budget / draft.channels.length) : '–'}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-ink-3">Noch kein Kanal</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">Zielgruppe</dt>
                  <dd className="mt-0.5 text-ink-2">
                    {draft.radiusKm && Number(draft.radiusKm) > 0 ? `${draft.radiusKm} km um Weimar` : 'Bundesweit'} · {draft.ageMin || '?'}–{draft.ageMax || '?'} Jahre
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">Link</dt>
                  <dd className="mt-0.5 line-clamp-3 font-mono text-[10px] leading-relaxed break-all text-ink-2">{finalUrl || '–'}</dd>
                </div>
              </dl>
            </div>

            {tried && errorList.length ? (
              <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-xs text-danger" role="alert">
                <p className="font-semibold">Bitte noch prüfen:</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                  {errorList.map(([k, msg]) => (
                    <li key={k}>{msg}</li>
                  ))}
                </ul>
              </div>
            ) : capCheck.length ? (
              <div className="flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-xs text-warning">
                <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                <p>Monatsdeckel in {capCheck.length === 1 ? 'einem Monat' : `${capCheck.length} Monaten`} überschritten.</p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </Drawer>
  )
}

// ---------------------------------------------------------------------------
// Kleine Formular-Bausteine
// ---------------------------------------------------------------------------

function Section({ n, title, description, children }: { n: number; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-soft md:p-5" aria-labelledby={`cmp-sec-${n}`}>
      <header className="mb-4 flex items-start gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-text tabular" aria-hidden>
          {n}
        </span>
        <div className="min-w-0">
          <h3 id={`cmp-sec-${n}`} className="text-sm font-semibold text-ink">
            {title}
          </h3>
          {description ? <p className="mt-0.5 text-xs text-ink-3">{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  )
}

function FieldError({ text }: { text?: string }) {
  if (!text) return null
  return (
    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-danger" role="alert">
      <TriangleAlert className="size-3" aria-hidden /> {text}
    </p>
  )
}

function Callout({ tone, children }: { tone: 'warning'; children: ReactNode }) {
  return (
    <div className={cn('mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-relaxed', tone === 'warning' && 'bg-warning-soft text-warning')}>
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function EuroInput({
  id,
  value,
  onChange,
  invalid,
  placeholder,
  step,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  invalid?: boolean
  placeholder?: string
  step?: string
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className={cn('pr-8 text-right tabular', invalid && 'border-danger!')}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-3">€</span>
    </div>
  )
}

function TargetField({
  id,
  label,
  suffix,
  value,
  onChange,
  placeholder,
  recommended,
  step,
}: {
  id: string
  label: string
  suffix: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  recommended: boolean
  step: string
}) {
  return (
    <Field label={label} htmlFor={id} aside={recommended ? <span className="font-medium text-accent-text">empfohlen</span> : undefined}>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn('pr-7 text-right tabular', recommended && !value && 'border-accent/40!')}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-3">{suffix}</span>
      </div>
    </Field>
  )
}

function TagInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const add = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!parts.length) return
    onChange(Array.from(new Set([...value, ...parts])))
    setText('')
  }
  return (
    <div
      className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 hover:border-line-strong"
      onClick={() => ref.current?.focus()}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-0.5 rounded-md bg-surface-2 py-0.5 pr-0.5 pl-2 text-xs text-ink">
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(value.filter((t) => t !== tag))
            }}
            className="rounded p-0.5 text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
            aria-label={`${tag} entfernen`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        ref={ref}
        value={text}
        onChange={(e) => {
          const v = e.target.value
          if (v.includes(',')) add(v)
          else setText(v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(text)
          } else if (e.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => add(text)}
        placeholder={value.length ? 'weiteres …' : placeholder}
        className="h-6 min-w-28 flex-1 bg-transparent px-1 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-none"
      />
    </div>
  )
}
