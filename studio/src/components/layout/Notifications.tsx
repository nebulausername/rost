import { differenceInCalendarDays, parseISO, subDays } from 'date-fns'
import { AlertTriangle, Bell, CalendarHeart, CheckCheck, Eye, Mail, Megaphone, ShoppingBag, Ticket } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { occurrencesBetween } from '../../lib/keydates'
import { pacing } from '../../lib/metrics'
import { useStore, useUi } from '../../lib/store'
import { cn, fmt, formatDe } from '../../lib/utils'
import { Button, Segmented } from '../ui/primitives'

type Kind = 'shop' | 'content' | 'werbung'

interface Item {
  id: string
  kind: Kind
  at: string
  title: string
  detail: string
  icon: ReactNode
  tone: 'accent' | 'warning' | 'danger' | 'success' | 'neutral'
  run: () => void
}

const TONES = {
  accent: 'bg-accent-soft text-accent-text',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
  neutral: 'bg-surface-2 text-ink-2',
}

function ago(iso: string) {
  const d = differenceInCalendarDays(new Date(), parseISO(iso))
  if (d <= 0) return `heute, ${formatDe(iso, 'HH:mm')}`
  if (d === 1) return 'gestern'
  return `vor ${d} Tagen`
}

/** Aktivitäten aus allen Bereichen – abgeleitet aus dem Store, nichts wird doppelt gespeichert */
function useActivity(): Item[] {
  const posts = useStore((s) => s.posts)
  const campaigns = useStore((s) => s.campaigns)
  const orders = useStore((s) => s.orders)
  const bookings = useStore((s) => s.bookings)
  const messages = useStore((s) => s.messages)
  const workshops = useStore((s) => s.workshops)
  const keyDates = useStore((s) => s.keyDates)
  const openPost = useUi((s) => s.openPost)
  const navigate = useNavigate()

  return useMemo(() => {
    const now = new Date()
    const since = subDays(now, 3)
    const out: Item[] = []
    for (const o of orders.filter((x) => parseISO(x.createdAt) >= since)) {
      out.push({
        id: `o-${o.id}`,
        kind: 'shop',
        at: o.createdAt,
        title: `Neue Bestellung ${o.number}${o.hasAbo ? ' · mit Abo' : ''}`,
        detail: `${o.customer.name} aus ${o.customer.city} · ${fmt.eur2(o.total)}`,
        icon: <ShoppingBag className="size-4" />,
        tone: 'success',
        run: () => navigate('/studio/website?tab=orders'),
      })
    }
    for (const b of bookings.filter((x) => parseISO(x.createdAt) >= since)) {
      const w = workshops.find((x) => x.id === b.workshopId)
      out.push({
        id: `b-${b.id}`,
        kind: 'shop',
        at: b.createdAt,
        title: `Workshop gebucht${b.gift ? ' (Geschenk)' : ''}`,
        detail: `${b.name} · ${b.seats} ${b.seats === 1 ? 'Platz' : 'Plätze'} · ${w?.title ?? 'Workshop'}`,
        icon: <Ticket className="size-4" />,
        tone: 'accent',
        run: () => navigate('/studio/website?tab=workshops'),
      })
    }
    for (const m of (messages ?? []).filter((x) => !x.done)) {
      out.push({
        id: `m-${m.id}`,
        kind: 'shop',
        at: m.createdAt,
        title: `Kontaktanfrage: ${m.topic}`,
        detail: `${m.name} – „${m.message.slice(0, 60)}${m.message.length > 60 ? '…' : ''}“`,
        icon: <Mail className="size-4" />,
        tone: 'accent',
        run: () => navigate('/studio/website?tab=orders'),
      })
    }
    for (const p of posts.filter((x) => x.status === 'review')) {
      out.push({
        id: `r-${p.id}`,
        kind: 'content',
        at: p.updatedAt,
        title: 'Wartet auf Freigabe',
        detail: `${p.title} · geplant ${formatDe(p.scheduledAt, 'EEE d. MMM')}`,
        icon: <Eye className="size-4" />,
        tone: 'warning',
        run: () => openPost(p.id),
      })
    }
    for (const p of posts.filter((x) => parseISO(x.scheduledAt) < now && x.status !== 'published' && x.status !== 'idea')) {
      out.push({
        id: `od-${p.id}`,
        kind: 'content',
        at: p.scheduledAt,
        title: 'Überfälliger Post',
        detail: `${p.title} · sollte am ${formatDe(p.scheduledAt, 'd. MMM')} raus`,
        icon: <AlertTriangle className="size-4" />,
        tone: 'danger',
        run: () => openPost(p.id),
      })
    }
    for (const o of occurrencesBetween(keyDates, now, new Date(now.getTime() + 10 * 864e5))) {
      const planned = posts.some((p) => Math.abs(differenceInCalendarDays(parseISO(p.scheduledAt), o.start)) <= 2)
      if (planned) continue
      out.push({
        id: `k-${o.keyDate.id}-${o.start.toISOString()}`,
        kind: 'content',
        at: subDays(o.start, 10).toISOString(),
        title: `${o.keyDate.title} ohne Post`,
        detail: `in ${differenceInCalendarDays(o.start, now)} Tagen – ${o.keyDate.angle}`,
        icon: <CalendarHeart className="size-4" />,
        tone: 'warning',
        run: () =>
          openPost(null, {
            scheduledAt: new Date(o.start.getFullYear(), o.start.getMonth(), o.start.getDate(), 9).toISOString(),
            title: o.keyDate.title,
            notes: `Anlass: ${o.keyDate.title} – ${o.keyDate.angle}`,
          }),
      })
    }
    for (const c of campaigns.filter((x) => x.status === 'active')) {
      const p = pacing(c, now)
      if (p.state !== 'over' && p.state !== 'under') continue
      out.push({
        id: `c-${c.id}-${p.state}`,
        kind: 'werbung',
        at: c.daily[c.daily.length - 1]?.date ? `${c.daily[c.daily.length - 1].date}T08:00:00` : c.updatedAt,
        title: p.state === 'over' ? 'Kampagne gibt zu schnell aus' : 'Kampagne gibt zu langsam aus',
        detail: `${c.name} · Empfehlung ${fmt.eur(p.suggestedDaily)}/Tag`,
        icon: <Megaphone className="size-4" />,
        tone: p.state === 'over' ? 'warning' : 'neutral',
        run: () => navigate(`/studio/kampagnen/${c.id}`),
      })
    }
    return out.sort((a, b) => b.at.localeCompare(a.at))
  }, [posts, campaigns, orders, bookings, messages, workshops, keyDates, navigate, openPost])
}

export function NotificationBell() {
  const items = useActivity()
  const seenAt = useStore((s) => s.settings.notificationsSeenAt)
  const update = useStore((s) => s.updateSettings)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | Kind>('all')
  const ref = useRef<HTMLDivElement>(null)
  const unread = items.filter((i) => !seenAt || i.at > seenAt)
  const list = filter === 'all' ? items : items.filter((i) => i.kind === filter)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Benachrichtigungen${unread.length ? ` – ${unread.length} neu` : ''}`}
        className="relative"
      >
        <Bell className="size-[18px]" />
        {unread.length ? (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-accent-solid px-1 text-[9px] leading-4 font-bold text-on-accent tabular ring-2 ring-canvas">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-label="Benachrichtigungen"
          className="fixed inset-x-3 top-16 z-40 flex max-h-[min(70vh,560px)] animate-pop-in flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-float sm:absolute sm:inset-x-auto sm:top-11 sm:right-0 sm:w-[400px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">Benachrichtigungen</p>
              <p className="text-[11px] text-ink-3">{unread.length ? `${unread.length} neu seit deinem letzten Blick` : 'Alles gesehen'}</p>
            </div>
            <Button size="sm" variant="ghost" disabled={!unread.length} onClick={() => update({ notificationsSeenAt: new Date().toISOString() })}>
              <CheckCheck className="size-3.5" /> Gelesen
            </Button>
          </div>
          <div className="border-b border-line px-4 py-2">
            <Segmented
              size="sm"
              label="Filter"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `Alle ${items.length}` },
                { value: 'shop', label: 'Shop' },
                { value: 'content', label: 'Content' },
                { value: 'werbung', label: 'Werbung' },
              ]}
            />
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
            {list.map((i) => {
              const isNew = !seenAt || i.at > seenAt
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      i.run()
                    }}
                    className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', TONES[i.tone])}>{i.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{i.title}</span>
                        {isNew ? <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-label="neu" /> : null}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-ink-2">{i.detail}</span>
                      <span className="mt-1 block text-[10px] text-ink-3">{ago(i.at)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
            {!list.length ? <li className="px-4 py-10 text-center text-sm text-ink-3">Nichts Neues. Zeit für einen Espresso. ☕</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
