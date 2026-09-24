import { startOfWeek } from 'date-fns'
import {
  Check,
  Database,
  Download,
  Info,
  Keyboard,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plug,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Meter } from '../components/charts'
import { PlatformDot } from '../components/domain'
import { NAV } from '../components/layout/nav'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Kbd, Modal, PageHeader, Segmented, Toggle } from '../components/ui/primitives'
import { PLATFORMS } from '../lib/constants'
import { toast, useStore, type DataState } from '../lib/store'
import type { ChannelAccount, Settings, TeamMember } from '../lib/types'
import { clamp, cn, dayKey, downloadFile, fmt, formatDe, uid } from '../lib/utils'

// ---------------------------------------------------------------------------
// Konstanten & Helfer
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'rb-studio-v1'
const STORAGE_QUOTA = 5 * 1024 * 1024
const APP_VERSION = '0.1'

const SECTIONS = [
  { id: 'darstellung', label: 'Darstellung', icon: Palette },
  { id: 'werbebudget', label: 'Werbebudget', icon: Wallet },
  { id: 'kanaele', label: 'Kanäle', icon: Plug },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'daten', label: 'Daten', icon: Database },
  { id: 'tastenkuerzel', label: 'Tastenkürzel', icon: Keyboard },
  { id: 'ueber', label: 'Über', icon: Info },
] as const

const MEMBER_COLORS = ['#c4702f', '#5b7fa6', '#4f7049', '#a2465e', '#b8860b', '#2f8f7a', '#7a5540', '#6d5fa8']

const DATA_ARRAYS = ['posts', 'campaigns', 'ideas', 'keyDates', 'hashtagSets', 'templates', 'team', 'accounts'] as const

const DATA_LABELS: Record<(typeof DATA_ARRAYS)[number], string> = {
  posts: 'Posts',
  campaigns: 'Kampagnen',
  ideas: 'Ideen',
  keyDates: 'Anlässe',
  hashtagSets: 'Hashtag-Sets',
  templates: 'Vorlagen',
  team: 'Team',
  accounts: 'Kanäle',
}

/** Geschätzte Belegung des lokalen Speichers (UTF-16 → 2 Byte je Zeichen) */
function readStorageBytes(): number | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v == null ? 0 : (v.length + STORAGE_KEY.length) * 2
  } catch {
    return null
  }
}

function useStorageBytes() {
  const [bytes, setBytes] = useState<number | null>(() => readStorageBytes())
  useEffect(() => {
    let t: number | undefined
    // persist schreibt nach dem Benachrichtigen der Listener – daher kurz warten
    const unsub = useStore.subscribe(() => {
      window.clearTimeout(t)
      t = window.setTimeout(() => setBytes(readStorageBytes()), 60)
    })
    return () => {
      unsub()
      window.clearTimeout(t)
    }
  }, [])
  return bytes
}

function initialsFrom(name: string) {
  const words = name.trim().split(/[\s-]+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

type ImportResult = { data: Partial<DataState>; exportedAt?: string } | { error: string }

function validateImport(raw: unknown, current: Settings): ImportResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Die Datei enthält keine Studio-Daten.' }
  const o = raw as Record<string, unknown>
  const missing = DATA_ARRAYS.filter((k) => !Array.isArray(o[k]))
  if (missing.length) return { error: `Es fehlen Bereiche: ${missing.map((k) => DATA_LABELS[k]).join(', ')}.` }
  const hasId = (k: (typeof DATA_ARRAYS)[number]) =>
    (o[k] as unknown[]).every((x) => x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string')
  const broken = DATA_ARRAYS.filter((k) => k !== 'accounts' && !hasId(k))
  if (broken.length) return { error: `Ungültige Einträge in: ${broken.map((k) => DATA_LABELS[k]).join(', ')}.` }
  const accountsOk = (o.accounts as unknown[]).every(
    (x) => x && typeof x === 'object' && typeof (x as { platform?: unknown }).platform === 'string' && Array.isArray((x as { history?: unknown }).history),
  )
  if (!accountsOk) return { error: 'Ungültige Einträge in: Kanäle.' }

  const data: Partial<DataState> = {
    posts: o.posts as DataState['posts'],
    campaigns: o.campaigns as DataState['campaigns'],
    ideas: o.ideas as DataState['ideas'],
    keyDates: o.keyDates as DataState['keyDates'],
    hashtagSets: o.hashtagSets as DataState['hashtagSets'],
    templates: o.templates as DataState['templates'],
    team: o.team as DataState['team'],
    accounts: o.accounts as DataState['accounts'],
  }
  if (o.budget && typeof o.budget === 'object' && !Array.isArray(o.budget)) data.budget = o.budget as DataState['budget']
  // Website-Bereiche sind optional (ältere Exporte kennen sie noch nicht)
  for (const k of ['products', 'workshops', 'cafes', 'orders', 'bookings', 'subscribers'] as const) {
    if (Array.isArray(o[k])) (data as Record<string, unknown>)[k] = o[k]
  }
  if (o.site && typeof o.site === 'object' && !Array.isArray(o.site)) data.site = o.site as DataState['site']
  if (o.settings && typeof o.settings === 'object' && !Array.isArray(o.settings)) {
    data.settings = { ...current, ...(o.settings as Partial<Settings>) }
  }
  const meta = o._meta as { exportedAt?: unknown } | undefined
  return { data, exportedAt: typeof meta?.exportedAt === 'string' ? meta.exportedAt : undefined }
}

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

function Section({
  id,
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  id: string
  icon: ReactNode
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card id={id} role="region" className="scroll-mt-20" aria-labelledby={`${id}-title`}>
      <CardHeader icon={icon} title={<span id={`${id}-title`}>{title}</span>} subtitle={subtitle} action={action} />
      <div className="divide-y divide-line border-t border-line">{children}</div>
    </Card>
  )
}

function Row({ title, description, children, htmlFor }: { title: ReactNode; description?: ReactNode; children?: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
            {title}
          </label>
        ) : (
          <p className="text-sm font-medium text-ink">{title}</p>
        )}
        {description ? <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-ink-3">{description}</p> : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  )
}

/** Zahlenfeld, das erst bei Blur/Enter übernimmt (kein Zucken beim Tippen) */
function NumberField({
  id,
  value,
  onCommit,
  suffix,
  min = 0,
  max = 100_000_000,
  label,
  className,
}: {
  id?: string
  value: number
  onCommit: (v: number) => void
  suffix?: string
  min?: number
  max?: number
  label: string
  className?: string
}) {
  const [draft, setDraft] = useState(fmt.num(value))
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    setDraft(fmt.num(value))
  }
  const commit = () => {
    const n = Number(draft.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
    if (!draft.trim() || !Number.isFinite(n)) {
      setDraft(fmt.num(value))
      return
    }
    const v = clamp(Math.round(n), min, max)
    setDraft(fmt.num(v))
    if (v !== value) onCommit(v)
  }
  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        inputMode="numeric"
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setDraft(fmt.num(value))
        }}
        className={cn('text-right tabular', suffix && 'pr-8')}
      />
      {suffix ? <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-3">{suffix}</span> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

export function SettingsPage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-72px 0px -55% 0px' },
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Einstellungen"
        description="Darstellung, Kanäle, Team und deine Daten – alles, was das Studio zu eurem Studio macht."
      />
      <div className="grid gap-6 xl:grid-cols-[190px_minmax(0,1fr)]">
        <nav aria-label="Abschnitte" className="hidden xl:block">
          <ul className="sticky top-20 space-y-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className={cn(
                    'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium transition-colors',
                    active === s.id ? 'bg-surface text-ink shadow-soft' : 'text-ink-3 hover:bg-surface-2 hover:text-ink',
                  )}
                  aria-current={active === s.id ? 'true' : undefined}
                >
                  <s.icon className={cn('size-4', active === s.id ? 'text-accent' : '')} />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 max-w-4xl space-y-6">
          <AppearanceSection />
          <BudgetSection />
          <ChannelsSection />
          <TeamSection />
          <DataSection />
          <ShortcutsSection />
          <AboutSection />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Darstellung
// ---------------------------------------------------------------------------

function AppearanceSection() {
  const theme = useStore((s) => s.settings.theme)
  const colorBy = useStore((s) => s.settings.calendarColorBy)
  const update = useStore((s) => s.updateSettings)
  return (
    <Section id="darstellung" icon={<Palette className="size-4" />} title="Darstellung" subtitle="Wird nur in diesem Browser gespeichert.">
      <Row title="Farbschema" description="„System“ folgt der Einstellung deines Geräts – abends automatisch dunkel.">
        <Segmented
          value={theme}
          onChange={(v) => update({ theme: v })}
          label="Farbschema"
          options={[
            { value: 'system', label: 'System', icon: <Monitor className="size-3.5" /> },
            { value: 'light', label: 'Hell', icon: <Sun className="size-3.5" /> },
            { value: 'dark', label: 'Dunkel', icon: <Moon className="size-3.5" /> },
          ]}
        />
      </Row>
      <Row title="Kalender-Einfärbung" description="Wonach Posts im Redaktionskalender eingefärbt werden.">
        <Segmented
          value={colorBy}
          onChange={(v) => update({ calendarColorBy: v })}
          label="Kalender-Einfärbung"
          options={[
            { value: 'platform', label: 'Kanal' },
            { value: 'pillar', label: 'Säule' },
            { value: 'status', label: 'Status' },
          ]}
        />
      </Row>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Werbebudget
// ---------------------------------------------------------------------------

function BudgetSection() {
  const cap = useStore((s) => s.settings.monthlyBudgetCap)
  const update = useStore((s) => s.updateSettings)
  return (
    <Section id="werbebudget" icon={<Wallet className="size-4" />} title="Werbebudget">
      <Row
        title="Monatliche Obergrenze"
        htmlFor="budget-cap"
        description={
          <>
            Summe über alle Werbekanäle pro Monat. Der{' '}
            <Link to="/studio/budget" className="font-medium text-accent-text underline-offset-2 hover:underline">
              Budget-Planer
            </Link>{' '}
            warnt, sobald ein Monat darüber liegt.
          </>
        }
      >
        <div className="sm:w-48">
          <NumberField id="budget-cap" value={cap} onCommit={(v) => update({ monthlyBudgetCap: v })} suffix="€" label="Monatliche Obergrenze in Euro" max={1_000_000} />
          <p className="mt-1.5 text-[11px] whitespace-nowrap text-ink-3 tabular sm:text-right">
            ≈ {fmt.eur((cap * 12) / 52)} / Woche · {fmt.eur(cap * 12)} / Jahr
          </p>
        </div>
      </Row>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Kanäle
// ---------------------------------------------------------------------------

function ChannelsSection() {
  const accounts = useStore((s) => s.accounts)
  const updateAccount = useStore((s) => s.updateAccount)
  const ordered = useMemo(
    () => PLATFORMS.map((p) => accounts.find((a) => a.platform === p.id)).filter((a): a is ChannelAccount => Boolean(a)),
    [accounts],
  )

  const setFollowers = (a: ChannelAccount, value: number) => {
    const week = dayKey(startOfWeek(new Date(), { weekStartsOn: 1 }))
    const rest = a.history.filter((h) => h.date !== week)
    const history = value === 0 && !a.history.length ? [] : [...rest, { date: week, value }].sort((x, y) => x.date.localeCompare(y.date))
    updateAccount({ ...a, followers: value, history })
  }

  return (
    <Section
      id="kanaele"
      icon={<Plug className="size-4" />}
      title="Kanäle"
      subtitle="Handles & Follower-Stände – die Basis für Analytics"
    >
      <div className="flex items-start gap-3 bg-surface-2/50 px-5 py-3 text-xs leading-relaxed text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
        <p>
          Automatische Veröffentlichung & Zahlen-Import folgen in Phase 2 (Meta Graph API, TikTok, Google Business Profile). Bis dahin:
          Follower-Stand einmal pro Woche eintragen – der Wert landet als Messpunkt der aktuellen Woche in der Wachstumskurve.
        </p>
      </div>
      {ordered.map((a) => {
        const meta = PLATFORMS.find((p) => p.id === a.platform)
        if (!meta) return null
        const last = a.history[a.history.length - 1]
        return (
          <div
            key={a.platform}
            className="grid grid-cols-2 items-end gap-x-3 gap-y-3 px-5 py-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_128px_auto] md:gap-x-4"
          >
            <div className="order-1 flex min-w-0 items-center gap-3 self-center">
              <PlatformDot platform={a.platform} size={32} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{meta.label}</p>
                <p className="truncate text-[11px] text-ink-3">
                  {last ? `Zuletzt: ${fmt.num(last.value)} am ${formatDe(last.date, 'd. MMM')}` : 'Noch keine Messpunkte'}
                </p>
              </div>
            </div>
            <Field label="Handle / Name" htmlFor={`handle-${a.platform}`} className="order-3 min-w-0 md:order-2">
              <Input
                id={`handle-${a.platform}`}
                value={a.handle}
                onChange={(e) => updateAccount({ ...a, handle: e.target.value })}
                placeholder="@roestbrueder"
              />
            </Field>
            <Field
              label={a.platform === 'newsletter' ? 'Abonnent:innen' : 'Follower'}
              htmlFor={`followers-${a.platform}`}
              className="order-4 min-w-0 md:order-3"
            >
              <NumberField
                id={`followers-${a.platform}`}
                value={a.followers}
                onCommit={(v) => setFollowers(a, v)}
                label={`Follower ${meta.label}`}
              />
            </Field>
            <div className="order-2 flex h-9 items-center justify-end gap-2.5 self-center md:order-4 md:self-end">
              <Toggle checked={a.connected} onChange={(v) => updateAccount({ ...a, connected: v })} label={`${meta.label} verbunden`} />
              <span className={cn('text-xs', a.connected ? 'font-medium text-ink' : 'text-ink-3')}>Verbunden</span>
            </div>
          </div>
        )
      })}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

function TeamSection() {
  const team = useStore((s) => s.team)
  const posts = useStore((s) => s.posts)
  const [form, setForm] = useState<TeamMember | 'new' | null>(null)
  const [confirm, setConfirm] = useState<TeamMember | null>(null)
  const deleteMember = useStore((s) => s.deleteMember)
  const assigned = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of posts) if (p.assigneeId) m.set(p.assigneeId, (m.get(p.assigneeId) ?? 0) + 1)
    return m
  }, [posts])

  return (
    <Section
      id="team"
      icon={<Users className="size-4" />}
      title="Team"
      subtitle="Wer plant, schreibt, fotografiert – für Zuständigkeiten in Posts"
      action={
        <Button size="sm" onClick={() => setForm('new')}>
          <Plus className="size-3.5" /> Mitglied
        </Button>
      }
    >
      {team.length ? (
        team.map((m) => {
          const n = assigned.get(m.id) ?? 0
          return (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={m.name} color={m.color} initials={m.initials} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                <p className="truncate text-xs text-ink-3">{m.role || 'Ohne Rolle'}</p>
              </div>
              <span className="hidden text-[11px] text-ink-3 tabular sm:inline">
                {n} {n === 1 ? 'Post' : 'Posts'}
              </span>
              <Button size="icon-sm" variant="ghost" onClick={() => setForm(m)} aria-label={`${m.name} bearbeiten`}>
                <Pencil className="size-3.5" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setConfirm(m)} aria-label={`${m.name} entfernen`} className="hover:text-danger">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )
        })
      ) : (
        <p className="px-5 py-6 text-center text-sm text-ink-3">Noch niemand im Team – füge Collin, Vincent & Co. hinzu.</p>
      )}

      {form ? <MemberModal initial={form === 'new' ? null : form} onClose={() => setForm(null)} /> : null}
      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm ? `${confirm.name} entfernen?` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!confirm) return
                deleteMember(confirm.id)
                toast({ title: `${confirm.name} entfernt`, tone: 'success' })
                setConfirm(null)
              }}
            >
              Entfernen
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          {confirm && (assigned.get(confirm.id) ?? 0) > 0
            ? `${assigned.get(confirm.id)} Posts sind ${confirm.name} zugewiesen – sie verlieren ihre Zuständigkeit und müssen neu verteilt werden.`
            : 'Diesem Mitglied sind keine Posts zugewiesen.'}
        </p>
      </Modal>
    </Section>
  )
}

function MemberModal({ initial, onClose }: { initial: TeamMember | null; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertMember)
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState(initial?.role ?? '')
  const [initials, setInitials] = useState(initial?.initials ?? '')
  const [initialsTouched, setInitialsTouched] = useState(Boolean(initial))
  const [color, setColor] = useState(initial?.color ?? MEMBER_COLORS[0])
  const shownInitials = (initialsTouched ? initials : initialsFrom(name)).slice(0, 3)
  const valid = name.trim().length > 0

  const save = () => {
    if (!valid) return
    upsert({
      id: initial?.id ?? uid('member'),
      name: name.trim(),
      role: role.trim(),
      initials: shownInitials.trim() || initialsFrom(name),
      color,
    })
    toast({ title: initial ? 'Mitglied aktualisiert' : 'Mitglied hinzugefügt', description: name.trim(), tone: 'success' })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'Mitglied bearbeiten' : 'Neues Team-Mitglied'}
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
        <div className="flex items-center gap-3 rounded-xl bg-surface-2/60 p-3">
          <Avatar name={name || 'Neu'} color={color} initials={shownInitials || '?'} size={44} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{name || 'Name'}</p>
            <p className="truncate text-xs text-ink-3">{role || 'Rolle'}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_96px]">
          <Field label="Name" htmlFor="member-name">
            <Input id="member-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Lena" />
          </Field>
          <Field label="Kürzel" htmlFor="member-initials">
            <Input
              id="member-initials"
              value={shownInitials}
              maxLength={3}
              onChange={(e) => {
                setInitialsTouched(true)
                setInitials(e.target.value.toUpperCase())
              }}
            />
          </Field>
        </div>
        <Field label="Rolle" htmlFor="member-role">
          <Input id="member-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="z. B. Barista · Social Media" />
        </Field>
        <Field label="Farbe">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Farbe">
            {MEMBER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`Farbe ${c}`}
                onClick={() => setColor(c)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition',
                  color === c ? 'ring-2 ring-ink' : 'hover:scale-110',
                )}
                style={{ background: c }}
              >
                {color === c ? <Check className="size-4 text-white" /> : null}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Daten
// ---------------------------------------------------------------------------

function DataSection() {
  const bytes = useStorageBytes()
  const demo = useStore((s) => s.settings.demoData)
  const posts = useStore((s) => s.posts)
  const update = useStore((s) => s.updateSettings)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ data: Partial<DataState>; file: string; exportedAt?: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearText, setClearText] = useState('')
  const images = posts.filter((p) => p.mediaUrl).length

  const exportData = () => {
    const s = useStore.getState()
    const data: DataState = {
      posts: s.posts,
      campaigns: s.campaigns,
      ideas: s.ideas,
      keyDates: s.keyDates,
      hashtagSets: s.hashtagSets,
      templates: s.templates,
      team: s.team,
      accounts: s.accounts,
      budget: s.budget,
      settings: s.settings,
      products: s.products,
      workshops: s.workshops,
      cafes: s.cafes,
      site: s.site,
      orders: s.orders,
      bookings: s.bookings,
      subscribers: s.subscribers,
    }
    const payload = { ...data, _meta: { app: 'Röstbrüder Studio', version: APP_VERSION, exportedAt: new Date().toISOString() } }
    downloadFile(`roestbrueder-studio-${dayKey(new Date())}.json`, JSON.stringify(payload, null, 2))
    toast({ title: 'Export erstellt', description: `${data.posts.length} Posts, ${data.campaigns.length} Kampagnen, ${data.ideas.length} Ideen`, tone: 'success' })
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const raw: unknown = JSON.parse(await file.text())
      const res = validateImport(raw, useStore.getState().settings)
      if ('error' in res) {
        toast({ title: 'Import nicht möglich', description: res.error, tone: 'danger' })
        return
      }
      setPending({ data: res.data, exportedAt: res.exportedAt, file: file.name })
    } catch {
      toast({ title: 'Import nicht möglich', description: 'Die Datei ist kein gültiges JSON.', tone: 'danger' })
    }
  }

  const share = bytes != null ? bytes / STORAGE_QUOTA : 0
  const tone = share > 0.9 ? 'danger' : share > 0.7 ? 'warning' : 'accent'

  return (
    <Section id="daten" icon={<Database className="size-4" />} title="Daten" subtitle="Phase 1: alles liegt lokal in diesem Browser">
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-ink">Lokaler Speicher</p>
          <p className="text-xs text-ink-2 tabular">
            {bytes == null ? (
              'nicht verfügbar'
            ) : (
              <>
                <span className="font-semibold text-ink">{fmt.num(bytes / 1024)} KB</span> von ca. 5 MB · {fmt.pct(share)}
              </>
            )}
          </p>
        </div>
        <div className="mt-2.5">
          <Meter value={bytes ?? 0} max={STORAGE_QUOTA} tone={tone} label="Belegung des lokalen Speichers" />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-3">
          {bytes == null
            ? 'Der Browser erlaubt keinen Zugriff auf den lokalen Speicher (z. B. privates Fenster) – Änderungen gehen beim Schließen verloren.'
            : bytes === 0
              ? 'Noch nichts gespeichert – die Beispieldaten landen mit deiner ersten Änderung im Speicher.'
              : `Anderer Browser oder privates Fenster = andere Daten. Bilder belegen am meisten Platz${images ? ` (aktuell ${images} ${images === 1 ? 'Bild' : 'Bilder'})` : ''} – sie werden beim Hochladen komprimiert.`}
        </p>
        {share > 0.7 ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning">
            <TriangleAlert className="size-3.5" aria-hidden /> Speicher wird knapp – exportiere und entferne alte Bilder.
          </p>
        ) : null}
      </div>
      <Row title="Daten exportieren" description="Sicherung als JSON-Datei – für Backups oder den Umzug in einen anderen Browser.">
        <Button onClick={exportData}>
          <Download className="size-4" /> Exportieren
        </Button>
      </Row>
      <Row title="Daten importieren" description="Ersetzt die aktuellen Inhalte durch eine exportierte Studio-Datei. Du bekommst vorher eine Übersicht.">
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
        <Button onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> Datei wählen …
        </Button>
      </Row>
      <Row title="Demo-Hinweis anzeigen" description="Blendet „Demo-Daten“ in Kopfzeile und Analytics ein. Schalte ihn aus, sobald ihr echte Zahlen pflegt.">
        <Toggle checked={demo} onChange={(v) => update({ demoData: v })} label="Demo-Hinweis anzeigen" />
      </Row>
      <Row title="Demo-Daten neu laden" description="Ersetzt alle Inhalte durch frische Beispieldaten rund um heute. Darstellung & Budget-Grenze bleiben.">
        <Button onClick={() => setConfirmReset(true)}>
          <RotateCcw className="size-4" /> Neu laden
        </Button>
      </Row>
      <Row
        title={<span className="text-danger">Alles leeren</span>}
        description="Löscht Posts, Kampagnen, Ideen, Budgetplan und Follower-Zahlen. Bibliothek, Anlässe und Team bleiben erhalten."
      >
        <Button variant="danger" onClick={() => setConfirmClear(true)}>
          <Trash2 className="size-4" /> Alles leeren
        </Button>
      </Row>

      <Modal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Daten importieren?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!pending) return
                useStore.getState().importData(pending.data)
                toast({ title: 'Import abgeschlossen', description: pending.file, tone: 'success' })
                setPending(null)
              }}
            >
              Importieren & ersetzen
            </Button>
          </>
        }
      >
        {pending ? (
          <div className="space-y-3 text-sm text-ink-2">
            <p>
              <span className="font-medium text-ink">{pending.file}</span>
              {pending.exportedAt ? ` · exportiert am ${formatDe(pending.exportedAt, 'd. MMMM yyyy, HH:mm')} Uhr` : ''}
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DATA_ARRAYS.map((k) => (
                <li key={k} className="rounded-lg bg-surface-2/70 px-2.5 py-2">
                  <p className="text-base font-semibold text-ink tabular">{fmt.num((pending.data[k] ?? []).length)}</p>
                  <p className="text-[11px] text-ink-3">{DATA_LABELS[k]}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-3">Die aktuellen Inhalte werden ersetzt. Tipp: vorher exportieren.</p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Demo-Daten neu laden?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                useStore.getState().resetDemo()
                toast({ title: 'Demo-Daten geladen', description: 'Frische Beispieldaten rund um heute.', tone: 'success' })
                setConfirmReset(false)
              }}
            >
              <RotateCcw className="size-4" /> Neu laden
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          Alle Posts, Kampagnen, Ideen, Anlässe, Bibliothek, Team und Kanäle werden durch Beispieldaten ersetzt. Eigene Inhalte gehen dabei
          verloren – exportiere sie vorher, wenn du sie behalten willst.
        </p>
        <Button size="sm" variant="ghost" className="mt-3 -ml-2" onClick={exportData}>
          <Download className="size-3.5" /> Erst exportieren
        </Button>
      </Modal>

      <Modal
        open={confirmClear}
        onClose={() => {
          setConfirmClear(false)
          setClearText('')
        }}
        title="Wirklich alles leeren?"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmClear(false)
                setClearText('')
              }}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              disabled={clearText.trim() !== 'LEEREN'}
              onClick={() => {
                useStore.getState().clearAll()
                toast({ title: 'Alles geleert', description: 'Frischer Start – viel Spaß beim Planen.', tone: 'success' })
                setConfirmClear(false)
                setClearText('')
              }}
            >
              <Trash2 className="size-4" /> Endgültig leeren
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-ink-2">
          <p className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Das lässt sich nicht rückgängig machen.</span>
          </p>
          <p>
            Gelöscht werden alle Posts, Kampagnen, Ideen, der Budgetplan und die Follower-Zahlen. Bibliothek, Anlässe und Team bleiben
            erhalten.
          </p>
          <Field label={<>Tippe <span className="font-semibold text-ink">LEEREN</span> zur Bestätigung</>} htmlFor="clear-confirm">
            <Input id="clear-confirm" value={clearText} onChange={(e) => setClearText(e.target.value)} autoComplete="off" placeholder="LEEREN" />
          </Field>
          <Button size="sm" variant="ghost" className="-ml-2" onClick={exportData}>
            <Download className="size-3.5" /> Vorher exportieren
          </Button>
        </div>
      </Modal>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Tastenkürzel
// ---------------------------------------------------------------------------

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((k, i) =>
        k === 'dann' || k === 'oder' ? (
          <span key={i} className="px-0.5 text-[11px] text-ink-3">
            {k}
          </span>
        ) : (
          <Kbd key={i}>{k}</Kbd>
        ),
      )}
    </span>
  )
}

function ShortcutsSection() {
  const general: { label: string; keys: string[] }[] = [
    { label: 'Neuer Post', keys: ['N'] },
    { label: 'Neue Kampagne', keys: ['W'] },
    { label: 'Befehlspalette', keys: ['⌘', 'K', 'oder', 'Strg', 'K'] },
    { label: 'Suche', keys: ['/'] },
    { label: 'Dialog schließen', keys: ['Esc'] },
  ]
  const nav = NAV.filter((n) => n.shortcut).map((n) => ({ label: n.label, keys: (n.shortcut ?? '').split(' ') }))
  return (
    <Section id="tastenkuerzel" icon={<Keyboard className="size-4" />} title="Tastenkürzel" subtitle="Schneller ohne Maus – funktionieren überall, außer beim Tippen">
      <div className="grid gap-x-8 gap-y-6 px-5 py-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Allgemein</h3>
          <ul className="divide-y divide-line">
            {general.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3 py-2 text-sm text-ink-2">
                {s.label}
                <Keys keys={s.keys} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Navigation</h3>
          <ul className="divide-y divide-line">
            {nav.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3 py-2 text-sm text-ink-2">
                <span className="truncate">{s.label}</span>
                <Keys keys={[s.keys[0], 'dann', ...s.keys.slice(1)]} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Über
// ---------------------------------------------------------------------------

const ROADMAP = [
  { phase: 'Phase 1', title: 'Lokal im Browser', text: 'Planen, Kampagnen, Budget & Analytics – ohne Konto, ohne Server.', now: true },
  { phase: 'Phase 2', title: 'Supabase: Multi-User & Freigaben', text: 'Gemeinsame Daten fürs ganze Team, Freigabe-Workflow, Zahlen-Import per API.' },
  { phase: 'Phase 3', title: 'API-Publishing', text: 'Posts direkt an Instagram, Facebook, TikTok & Google senden.' },
  { phase: 'Phase 4', title: 'KI-Caption-Assistent', text: 'Captions in unserer Markenstimme vorschlagen – aus Idee, Bild & Vorlage.' },
]

function AboutSection() {
  return (
    <Section id="ueber" icon={<Info className="size-4" />} title="Über Röstbrüder Studio">
      <div className="flex flex-wrap items-center gap-2 px-5 py-4 text-sm text-ink-2">
        <span className="font-semibold text-ink">Version {APP_VERSION}</span>
        <span aria-hidden>·</span>
        <span>Phase 1: lokal im Browser gespeichert</span>
        <Badge tone="accent" dot>
          aktiv
        </Badge>
      </div>
      <div className="px-5 py-4">
        <h3 className="mb-3 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Roadmap</h3>
        <ol className="relative space-y-4">
          <span className="absolute top-2 bottom-2 left-[7px] w-px bg-line" aria-hidden />
          {ROADMAP.map((r) => (
            <li key={r.phase} className="relative flex gap-3">
              <span
                className={cn(
                  'relative mt-1 size-[15px] shrink-0 rounded-full border-2',
                  r.now ? 'border-accent bg-accent shadow-[0_0_0_4px_var(--accent-soft)]' : 'border-line-strong bg-surface',
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm text-ink">
                  <span className="font-semibold">{r.phase}</span> · {r.title}
                  {r.now ? <span className="ml-2 text-[11px] font-semibold text-accent-text">jetzt</span> : null}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{r.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="px-5 py-3 text-[11px] text-ink-3">Handgeröstet in Weimar – und dieses Studio auch ein bisschen.</p>
    </Section>
  )
}
