import { addMinutes, parseISO } from 'date-fns'
import { ArrowRight, CalendarPlus, Check, CircleCheckBig, Clock, Gift, GraduationCap, MapPin, Minus, Plus, Sparkles, Users } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Field, Input, Modal, Textarea, Toggle } from '../../components/ui/primitives'
import { useCart } from '../../lib/cart'
import { toast, useStore } from '../../lib/store'
import type { Booking, CafeLocation, Workshop, WorkshopSession } from '../../lib/types'
import { cn, downloadFile, formatDe, uid } from '../../lib/utils'
import { Container, SectionHeading, SiteButton, siteButtonClass, useNow } from '../components'
import { useDocumentTitle } from '../content/hooks'
import { PageHero, Reveal } from '../content/ui'
import { price } from '../lib'

const VOUCHER_VALUE = 69
const MAX_SEATS = 4

const seatsLeft = (w: Workshop, s: WorkshopSession) => Math.max(0, w.capacity - s.seatsTaken)
const dateLabel = (iso: string) => formatDe(iso, 'EEEEEE, d. MMM')
const timeLabel = (iso: string) => formatDe(iso, 'HH:mm')
const durationLabel = (min: number) => (min % 60 === 0 ? `${min / 60} Std.` : `${Math.floor(min / 60)},${Math.round(((min % 60) / 60) * 10)} Std.`)

function useUpcoming(w: Workshop, now: Date) {
  return useMemo(() => w.sessions.filter((s) => parseISO(s.startsAt) > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [w.sessions, now])
}

export function WorkshopsPage() {
  useDocumentTitle('Workshops')
  const workshops = useStore((s) => s.workshops)
  const cafes = useStore((s) => s.cafes)
  const add = useCart((s) => s.add)
  const now = useNow()
  const [booking, setBooking] = useState<{ workshopId: string; sessionId: string | null } | null>(null)

  const upcomingAll = useMemo(
    () =>
      workshops
        .flatMap((w) => w.sessions.filter((s) => parseISO(s.startsAt) > now).map((s) => ({ w, s })))
        .sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt)),
    [workshops, now],
  )
  const maxCap = workshops.reduce((m, w) => Math.max(m, w.capacity), 0)
  const bookingWorkshop = booking ? workshops.find((w) => w.id === booking.workshopId) : undefined

  const giftVoucher = () => add({ kind: 'voucher', value: VOUCHER_VALUE, qty: 1 })

  return (
    <>
      <PageHero
        eyebrow="Workshops in der Rösterei"
        title={
          <>
            Lern Kaffee von denen, die ihn <span className="text-accent-text italic">rösten.</span>
          </>
        }
        text={
          <>
            Kleine Gruppen{maxCap ? ` bis ${maxCap} Personen` : ''}, echte Maschinen, ehrliche Antworten. Du stehst selbst an Siebträger, Kanne und Cupping-Tisch – mitten in der Rösterei, während nebenan der Röster läuft.
          </>
        }
        aside={<UpcomingCard items={upcomingAll.slice(0, 4)} onBook={(w, s) => setBooking({ workshopId: w.id, sessionId: s.id })} />}
      >
        <div className="flex flex-wrap gap-3">
          <a href="#termine" className={siteButtonClass('primary')}>
            Workshops & Termine
            <ArrowRight className="size-4" aria-hidden />
          </a>
          <SiteButton variant="secondary" onClick={giftVoucher}>
            <Gift className="size-4" aria-hidden />
            Gutschein verschenken
          </SiteButton>
        </div>
      </PageHero>

      <section id="termine" aria-labelledby="termine-title" className="scroll-mt-24 pb-20 md:pb-28">
        <Container>
          <h2 id="termine-title" className="sr-only">
            Alle Workshops
          </h2>
          <div className="space-y-8">
            {workshops.map((w) => (
              <Reveal key={w.id}>
                <WorkshopCard workshop={w} cafe={cafes.find((c) => c.id === w.location)} now={now} onBook={(sessionId) => setBooking({ workshopId: w.id, sessionId })} />
              </Reveal>
            ))}
            {!workshops.length ? (
              <p className="rounded-3xl border border-dashed border-line-strong p-10 text-center text-ink-2">Gerade planen wir neue Workshops. Schau bald wieder vorbei!</p>
            ) : null}
          </div>
        </Container>
      </section>

      <HowItWorks />

      <section aria-label="Gutschein und Team-Events" className="pb-20 md:pb-28">
        <Container className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Reveal className="h-full">
            <div className="grain relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-accent-soft p-8 md:p-10">
              <Gift className="size-8 text-accent-text" aria-hidden />
              <h2 className="mt-6 font-display text-3xl leading-tight font-semibold text-ink md:text-4xl">Workshop verschenken</h2>
              <p className="mt-3 max-w-md leading-relaxed text-ink-2">
                Für alle, die schon alles haben – außer einem perfekten Milchschaum. Der Gutschein über {price(VOUCHER_VALUE)} kommt per E-Mail, den Termin sucht sich die beschenkte Person selbst aus.
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-4 pt-8">
                <SiteButton onClick={giftVoucher}>
                  Gutschein {price(VOUCHER_VALUE)} in den Warenkorb
                </SiteButton>
              </div>
            </div>
          </Reveal>
          <Reveal className="h-full">
            <div className="grain relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-sidebar p-8 text-sidebar-ink md:p-10">
              <Users className="size-8 text-accent" aria-hidden />
              <h2 className="mt-6 font-display text-3xl leading-tight font-semibold md:text-4xl">Für Teams & Firmen</h2>
              <p className="mt-3 max-w-md leading-relaxed text-sidebar-muted">
                Private Workshops für eure Gruppe, ein Cupping als Team-Event oder Barista-Basics fürs Büro mit Siebträger: Wir stellen euch etwas zusammen, das passt.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {['Private Termine für eure Gruppe', 'Cupping als Team-Event', 'Inhalte nach Wunsch – von Latte Art bis Filter'].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <Check className="size-4 text-accent" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <Link to="/ueber-uns#kontakt" className={siteButtonClass('light')}>
                  Anfrage stellen
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {bookingWorkshop ? (
        <BookingModal
          key={`${bookingWorkshop.id}-${booking?.sessionId}`}
          workshop={bookingWorkshop}
          cafe={cafes.find((c) => c.id === bookingWorkshop.location)}
          initialSessionId={booking?.sessionId ?? null}
          now={now}
          onClose={() => setBooking(null)}
        />
      ) : null}
    </>
  )
}

// ---------------------------------------------------------------------------
// Hero-Karte „Demnächst“
// ---------------------------------------------------------------------------

function UpcomingCard({ items, onBook }: { items: { w: Workshop; s: WorkshopSession }[]; onBook: (w: Workshop, s: WorkshopSession) => void }) {
  return (
    <div className="grain relative overflow-hidden rounded-[2.5rem] bg-sidebar p-6 text-sidebar-ink sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/30 blur-3xl" />
      <p className="relative text-xs font-semibold tracking-[0.18em] text-sidebar-muted uppercase">Demnächst in der Rösterei</p>
      {items.length ? (
        <ul className="relative mt-5 space-y-2">
          {items.map(({ w, s }) => {
            const left = seatsLeft(w, s)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!left}
                  onClick={() => onBook(w, s)}
                  className="group flex w-full items-center gap-4 rounded-2xl bg-white/[0.06] p-3 text-left ring-1 ring-white/10 transition-colors hover:bg-white/[0.12] disabled:opacity-60"
                >
                  <span className="flex w-14 shrink-0 flex-col items-center rounded-xl py-1.5 text-center" style={{ background: w.color }}>
                    <span className="text-[10px] font-semibold tracking-wider text-white/80 uppercase">{formatDe(s.startsAt, 'MMM')}</span>
                    <span className="tabular font-display text-2xl leading-none font-semibold text-white">{formatDe(s.startsAt, 'd')}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{w.title}</span>
                    <span className="tabular block text-sm text-sidebar-muted">
                      {formatDe(s.startsAt, 'EEEE')}, {timeLabel(s.startsAt)} Uhr · {left ? (left === 1 ? 'nur noch 1 Platz' : `${left} Plätze frei`) : 'ausgebucht'}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-sidebar-muted transition-transform group-hover:translate-x-1 group-hover:text-sidebar-ink" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="relative mt-5 text-sidebar-muted">Neue Termine folgen bald.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Workshop-Karte
// ---------------------------------------------------------------------------

function WorkshopCard({ workshop: w, cafe, now, onBook }: { workshop: Workshop; cafe?: CafeLocation; now: Date; onBook: (sessionId: string | null) => void }) {
  const upcoming = useUpcoming(w, now)
  const firstFree = upcoming.find((s) => seatsLeft(w, s) > 0)
  return (
    <article id={w.slug} aria-labelledby={`${w.slug}-title`} className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-line bg-surface shadow-soft" style={{ '--c': w.color } as CSSProperties}>
      <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
        {/* Farbfeld */}
        <div className="grain relative flex flex-col overflow-hidden bg-[color-mix(in_oklab,var(--c)_82%,#000)] p-7 text-white md:p-10">
          <svg viewBox="0 0 200 200" className="pointer-events-none absolute -right-10 -bottom-12 w-64 opacity-[0.13]" aria-hidden>
            <g transform="rotate(-28 100 100)">
              <ellipse cx="100" cy="100" rx="58" ry="84" fill="currentColor" />
              <path d="M100 18c-20 28 20 52 0 82s20 54 0 82" fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="10" strokeLinecap="round" />
            </g>
          </svg>
          <div className="relative flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <GraduationCap className="size-3.5" aria-hidden />
              {w.level}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Clock className="size-3.5" aria-hidden />
              {durationLabel(w.durationMin)}
            </span>
          </div>
          <h3 id={`${w.slug}-title`} className="relative mt-8 font-display text-4xl leading-[1.02] font-semibold tracking-tight md:text-5xl">
            {w.title}
          </h3>
          <p className="relative mt-3 text-lg text-white/80">{w.subtitle}</p>
          <dl className="relative mt-auto grid grid-cols-2 gap-4 pt-10 text-sm">
            <div>
              <dt className="text-white/60">Preis</dt>
              <dd className="tabular font-display text-3xl font-semibold">{price(w.price)}</dd>
              <dd className="text-xs text-white/60">pro Person</dd>
            </div>
            <div>
              <dt className="text-white/60">Gruppe</dt>
              <dd className="font-display text-3xl font-semibold">max. {w.capacity}</dd>
              <dd className="text-xs text-white/60">Personen</dd>
            </div>
            <div className="col-span-2 flex items-start gap-2 text-white/80">
              <dt className="sr-only">Ort</dt>
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <dd>{cafe ? `${cafe.name} · ${cafe.address}` : w.location === 'roesterei' ? 'Rösterei' : 'Espressobar'}</dd>
            </div>
          </dl>
        </div>

        {/* Inhalt */}
        <div className="p-7 md:p-10">
          <p className="text-[17px] leading-relaxed text-ink-2">{w.description}</p>
          <h4 className="mt-8 text-xs font-semibold tracking-[0.16em] text-ink-3 uppercase">Das lernst du</h4>
          <ul className="mt-3 space-y-2.5">
            {w.learn.map((l) => (
              <li key={l} className="flex gap-3 text-[15px] text-ink">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--c)_18%,var(--surface))] text-[var(--c)]" aria-hidden>
                  <Check className="size-3.5" />
                </span>
                {l}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex items-baseline justify-between gap-3">
            <h4 className="text-xs font-semibold tracking-[0.16em] text-ink-3 uppercase">Nächste Termine</h4>
            {upcoming.length ? <span className="text-xs text-ink-3">{upcoming.length} geplant</span> : null}
          </div>
          {upcoming.length ? (
            <ul className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
              {upcoming.map((s) => (
                <li key={s.id}>
                  <SessionChip workshop={w} session={s} onClick={() => onBook(s.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-2">
              Gerade keine Termine geplant.{' '}
              <Link to="/ueber-uns#kontakt" className="font-semibold text-accent-text underline underline-offset-4">
                Sag uns Bescheid
              </Link>
              , dann melden wir uns beim nächsten.
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SiteButton onClick={() => onBook(firstFree?.id ?? null)} disabled={!firstFree}>
              {firstFree ? 'Platz buchen' : 'Alle Termine ausgebucht'}
            </SiteButton>
          </div>
        </div>
      </div>
    </article>
  )
}

function SessionChip({ workshop: w, session: s, onClick }: { workshop: Workshop; session: WorkshopSession; onClick: () => void }) {
  const left = seatsLeft(w, s)
  const full = left === 0
  const last = left === 1
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={full}
      className={cn(
        'group flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-[border-color,background-color,transform] duration-200 sm:w-auto sm:min-w-[9.5rem] sm:flex-col sm:items-start sm:justify-start sm:gap-0',
        full ? 'cursor-not-allowed border-line bg-surface-2 opacity-70' : 'border-line bg-surface hover:-translate-y-0.5 hover:border-[var(--c)]',
        last && 'border-accent bg-accent-soft',
      )}
      aria-label={`${dateLabel(s.startsAt)}, ${timeLabel(s.startsAt)} Uhr – ${full ? 'ausgebucht' : `${left} ${left === 1 ? 'Platz' : 'Plätze'} frei`}`}
    >
      <span className={cn('tabular text-sm font-semibold whitespace-nowrap text-ink', full && 'line-through decoration-ink-3')}>
        {dateLabel(s.startsAt)} · {timeLabel(s.startsAt)}
      </span>
      <span className="flex items-center gap-2 sm:mt-1.5">
        <span className="hidden h-1 w-12 overflow-hidden rounded-full bg-surface-3 min-[400px]:block" aria-hidden>
          <span className={cn('block h-full rounded-full', full ? 'bg-ink-3' : last ? 'bg-accent' : 'bg-success')} style={{ width: `${(left / w.capacity) * 100}%` }} />
        </span>
        <span className={cn('text-xs font-medium whitespace-nowrap', full ? 'text-ink-3' : last ? 'font-semibold text-accent-text' : 'text-ink-3')}>
          {full ? 'Ausgebucht' : last ? 'Nur noch 1 Platz!' : `${left} frei`}
        </span>
      </span>
    </button>
  )
}

function HowItWorks() {
  const steps = [
    { t: 'Termin wählen', d: 'Such dir einen Workshop und einen Termin aus – bis zu vier Plätze auf einmal.' },
    { t: 'Kurz eintragen', d: 'Name und E-Mail genügen. Als Geschenk? Dann legen wir eine Karte bereit.' },
    { t: 'Vorbeikommen', d: 'Wir treffen uns in der Rösterei. Schürze und Kaffee sind da – du bringst nur Neugier mit.' },
  ]
  return (
    <section aria-labelledby="ablauf" className="border-y border-line bg-surface-2/60 py-20 md:py-24">
      <Container>
        <SectionHeading eyebrow="So läuft’s" title={<span id="ablauf">In drei Schritten an die Maschine.</span>} />
        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t} className="relative">
              <span className="font-display text-7xl leading-none font-semibold text-accent/30" aria-hidden>
                0{i + 1}
              </span>
              <h3 className="mt-3 text-xl font-semibold text-ink">{s.t}</h3>
              <p className="mt-2 leading-relaxed text-ink-2">{s.d}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Buchung
// ---------------------------------------------------------------------------

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

function downloadIcs(b: Booking, w: Workshop, s: WorkshopSession, cafe?: CafeLocation) {
  const start = parseISO(s.startsAt)
  const end = addMinutes(start, w.durationMin)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Röstbrüder//Workshops//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.id}@roestbrueder`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(`${w.title} · Röstbrüder`)}`,
    `LOCATION:${icsEscape(cafe ? `Röstbrüder ${cafe.name}, ${cafe.address}` : 'Röstbrüder, Weimar')}`,
    `DESCRIPTION:${icsEscape(`${w.subtitle}\n${b.seats} ${b.seats === 1 ? 'Platz' : 'Plätze'} für ${b.name}`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(w.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  downloadFile(`roestbrueder-${w.slug}.ics`, lines.join('\r\n'), 'text/calendar;charset=utf-8')
}

function BookingModal({
  workshop: w,
  cafe,
  initialSessionId,
  now,
  onClose,
}: {
  workshop: Workshop
  cafe?: CafeLocation
  initialSessionId: string | null
  now: Date
  onClose: () => void
}) {
  const bookWorkshop = useStore((s) => s.bookWorkshop)
  const upcoming = useUpcoming(w, now)
  const [sessionId, setSessionId] = useState<string | null>(() => initialSessionId ?? upcoming.find((s) => seatsLeft(w, s) > 0)?.id ?? null)
  const [seats, setSeats] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [gift, setGift] = useState(false)
  const [giftNote, setGiftNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Booking | null>(null)

  const session = upcoming.find((s) => s.id === sessionId) ?? null
  const left = session ? seatsLeft(w, session) : 0
  const maxSeats = Math.max(1, Math.min(MAX_SEATS, left))
  const seatCount = Math.min(seats, maxSeats)
  const total = seatCount * w.price

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!session) return setError('Bitte wähle einen Termin.')
    if (name.trim().length < 2) return setError('Bitte gib deinen Namen an.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('Bitte prüf deine E-Mail-Adresse.')
    const b: Booking = {
      id: uid('bk'),
      workshopId: w.id,
      sessionId: session.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      seats: seatCount,
      gift,
      giftNote: gift && giftNote.trim() ? giftNote.trim() : undefined,
      createdAt: new Date().toISOString(),
    }
    const res = bookWorkshop(b)
    if (!res.ok) {
      setError(res.reason ?? 'Das hat leider nicht geklappt.')
      toast({ title: 'Buchung nicht möglich', description: res.reason, tone: 'danger' })
      return
    }
    setDone(b)
    toast({ title: 'Platz gesichert!', description: `${w.title} · ${dateLabel(session.startsAt)}`, tone: 'success' })
  }

  if (done) {
    const s = w.sessions.find((x) => x.id === done.sessionId)!
    return (
      <Modal open onClose={onClose} title="Gebucht!" className="max-w-xl">
        <div className="py-2 text-center">
          <div className="mx-auto flex size-16 animate-pop-in items-center justify-center rounded-full bg-success-soft text-success">
            <CircleCheckBig className="size-8" aria-hidden />
          </div>
          <p className="mt-5 font-display text-3xl font-semibold text-ink">Du bist dabei, {done.name.split(' ')[0]}!</p>
          <p className="mt-2 text-ink-2">
            {w.title} · {formatDe(s.startsAt, 'EEEE, d. MMMM')} um {timeLabel(s.startsAt)} Uhr
            <br />
            {done.seats} {done.seats === 1 ? 'Platz' : 'Plätze'} · {cafe ? cafe.name : 'Rösterei'}
            {done.gift ? ' · als Geschenk' : ''}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <SiteButton onClick={() => downloadIcs(done, w, s, cafe)}>
              <CalendarPlus className="size-4" aria-hidden />
              In den Kalender (.ics)
            </SiteButton>
            <SiteButton variant="secondary" onClick={onClose}>
              Fertig
            </SiteButton>
          </div>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-1.5 text-xs text-ink-2">
            <Sparkles className="size-3.5 text-accent-text" aria-hidden />
            Deine Buchung liegt jetzt im Studio.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title={`${w.title} buchen`} className="max-w-xl">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <p className="text-sm text-ink-3">
          {w.subtitle} · {durationLabel(w.durationMin)} · {price(w.price)} pro Person
        </p>

        <fieldset>
          <legend className="label">Termin</legend>
          {upcoming.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {upcoming.map((s) => {
                const l = seatsLeft(w, s)
                const active = s.id === sessionId
                return (
                  <label
                    key={s.id}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accent',
                      active ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong',
                      !l && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <input type="radio" name="session" className="sr-only" disabled={!l} checked={active} onChange={() => setSessionId(s.id)} />
                    <span className="tabular font-semibold whitespace-nowrap text-ink">
                      {dateLabel(s.startsAt)} · {timeLabel(s.startsAt)}
                    </span>
                    <span className={cn('text-right text-xs whitespace-nowrap', l === 1 ? 'font-semibold text-accent-text' : 'text-ink-3')}>{l ? (l === 1 ? 'Letzter Platz!' : `${l} frei`) : 'Ausgebucht'}</span>
                  </label>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-2">Gerade keine Termine geplant.</p>
          )}
        </fieldset>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="label mb-0" id="seats-label">
              Plätze
            </p>
            <p className="text-xs text-ink-3">max. {maxSeats} für diesen Termin</p>
          </div>
          <div className="flex items-center gap-2" role="group" aria-labelledby="seats-label">
            <button type="button" onClick={() => setSeats(Math.max(1, seatCount - 1))} disabled={seatCount <= 1} className="flex size-9 items-center justify-center rounded-full border border-line hover:border-line-strong disabled:opacity-40" aria-label="Einen Platz weniger">
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="tabular w-8 text-center font-display text-2xl font-semibold text-ink" aria-live="polite">
              {seatCount}
            </span>
            <button type="button" onClick={() => setSeats(Math.min(maxSeats, seatCount + 1))} disabled={seatCount >= maxSeats} className="flex size-9 items-center justify-center rounded-full border border-line hover:border-line-strong disabled:opacity-40" aria-label="Einen Platz mehr">
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="bk-name">
            <Input id="bk-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-[15px]" required />
          </Field>
          <Field label="E-Mail" htmlFor="bk-mail">
            <Input id="bk-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-[15px]" required />
          </Field>
        </div>

        <div className="rounded-2xl bg-surface-2 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              <Gift className="size-4 text-accent-text" aria-hidden />
              Als Geschenk buchen
            </span>
            <Toggle checked={gift} onChange={setGift} label="Als Geschenk buchen" />
          </div>
          {gift ? (
            <div className="mt-3 animate-fade-in">
              <Field label="Grußtext für die Karte (optional)" htmlFor="bk-note" hint="Wir legen am Workshop-Tag eine Karte bereit.">
                <Textarea id="bk-note" value={giftNote} onChange={(e) => setGiftNote(e.target.value)} maxLength={240} className="min-h-20" placeholder="Alles Gute! Auf viele perfekte Herzen im Milchschaum …" />
              </Field>
            </div>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-line pt-4">
          <div className="text-sm text-ink-3">
            {seatCount} × {price(w.price)}
            {session ? (
              <>
                <br />
                {formatDe(session.startsAt, 'EEEE, d. MMMM')} · {timeLabel(session.startsAt)} Uhr
              </>
            ) : null}
          </div>
          <p className="tabular font-display text-3xl font-semibold text-ink">{price(total)}</p>
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}

        <SiteButton type="submit" className="w-full" disabled={!session}>
          {gift ? 'Als Geschenk buchen' : 'Jetzt Platz buchen'} · {price(total)}
        </SiteButton>
      </form>
    </Modal>
  )
}
