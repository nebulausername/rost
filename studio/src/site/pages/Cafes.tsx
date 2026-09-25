import { ArrowRight, Check, Footprints, Info, MapPin, Navigation } from 'lucide-react'
import type { ReactNode } from 'react'
import { useStore } from '../../lib/store'
import type { CafeLocation } from '../../lib/types'
import { cn } from '../../lib/utils'
import { Container, Eyebrow, OpenBadge, useNow } from '../components'
import { useDocumentTitle } from '../content/hooks'
import { ExampleNote, PageHero, Reveal } from '../content/ui'
import { DAY_NAMES, openState } from '../lib'

const WEEK = [1, 2, 3, 4, 5, 6, 0]

const MENU: { name: string; note: string }[] = [
  { name: 'Espresso', note: 'kurz, dicht, süß' },
  { name: 'Cappuccino', note: 'der Klassiker mit Milchschaum' },
  { name: 'Flat White', note: 'doppelter Espresso, wenig Schaum' },
  { name: 'Filterkaffee der Woche', note: 'frisch gebrüht, wechselnd' },
  { name: 'Espresso Tonic', note: 'im Sommer' },
]

const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Röstbrüder, ${address}`)}`

export function CafesPage() {
  useDocumentTitle('Cafés')
  const cafes = useStore((s) => s.cafes)
  return (
    <>
      <PageHero
        eyebrow="Unsere Cafés in Weimar"
        title={
          <>
            Zwei Cafés. Eine Stadt. <span className="text-accent-text italic">Ein Röster.</span>
          </>
        }
        text="In der Richard-Wagner-Straße rösten wir, am Herderplatz schenken wir aus – und in beiden trinkst du unseren Kaffee so frisch, wie er nur sein kann."
        aside={
          <div className="overflow-hidden rounded-[2.5rem] border border-line bg-surface p-3 shadow-lift">
            <WeimarMap highlight="both" route className="rounded-[2rem]" />
          </div>
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {cafes.map((c) => (
            <li key={c.id}>
              <a href={`#${c.id}`} className="group flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-4 transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-lift">
                <span className="flex items-center justify-between gap-2 font-semibold text-ink">
                  {c.name}
                  <ArrowRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <OpenBadge cafe={c} className="self-start" />
              </a>
            </li>
          ))}
        </ul>
      </PageHero>

      {cafes.map((c, i) => (
        <CafeSection key={c.id} cafe={c} flip={i % 2 === 1} />
      ))}

      <BetweenCafes cafes={cafes} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Café-Abschnitt
// ---------------------------------------------------------------------------

function CafeSection({ cafe: c, flip }: { cafe: CafeLocation; flip: boolean }) {
  const street = c.address.split(',')[0]
  return (
    <section id={c.id} aria-labelledby={`${c.id}-title`} className={cn('scroll-mt-20 py-16 md:py-24', flip && 'border-y border-line bg-surface-2/60')}>
      <Container>
        <div className={cn('grid items-center gap-10 lg:grid-cols-2 lg:gap-16', flip && 'lg:[&>*:first-child]:order-2')}>
          <Reveal>
            <div className="grain relative aspect-square overflow-hidden rounded-[2.5rem] bg-sidebar text-sidebar-ink sm:aspect-[4/3]">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_70%_at_30%_20%,rgb(196_112_47/0.35),transparent_70%)]" />
              <div className="absolute inset-x-6 top-12 bottom-24 flex items-center justify-center md:bottom-28">{c.id === 'roesterei' ? <RoasterArt /> : <BarArt />}</div>
              <div className="absolute top-5 left-5">
                <OpenBadge cafe={c} tone="onDark" />
              </div>
              <p className="absolute right-6 bottom-5 left-6 font-display text-xl leading-snug font-medium text-sidebar-ink/90 italic md:text-2xl">„{c.tagline}“</p>
            </div>
          </Reveal>
          <div>
            <Eyebrow>{street}</Eyebrow>
            <h2 id={`${c.id}-title`} className="mt-3 font-display text-5xl leading-[0.98] font-semibold tracking-tight text-ink md:text-6xl">
              {c.name}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-2">{c.description}</p>
            {c.notice ? (
              <p className="mt-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-[15px] font-medium text-ink" role="status">
                <Info className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
                {c.notice}
              </p>
            ) : null}
            <ul className="mt-6 flex flex-wrap gap-2">
              {c.features.map((f) => (
                <li key={f} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2">
                  <Check className="size-3.5 text-accent-text" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 md:mt-14 lg:grid-cols-3">
          <Reveal>
            <Hours cafe={c} />
          </Reveal>
          <Reveal>
            <Panel title="Anfahrt">
              <address className="flex items-start gap-2 text-[15px] leading-relaxed text-ink not-italic">
                <MapPin className="mt-1 size-4 shrink-0 text-accent-text" aria-hidden />
                {c.address}
              </address>
              <div className="mt-4 overflow-hidden rounded-2xl border border-line">
                <WeimarMap highlight={c.id} />
              </div>
              <a
                href={mapsUrl(c.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-accent-solid px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-solid-hover"
              >
                <Navigation className="size-4" aria-hidden />
                Route planen
                <span className="sr-only">(öffnet Google Maps in neuem Tab)</span>
              </a>
            </Panel>
          </Reveal>
          <Reveal>
            <Panel title="Was es gibt" dark>
              <ul className="space-y-3.5">
                {MENU.map((m) => (
                  <li key={m.name} className="flex items-baseline gap-2">
                    <span className="min-w-0 font-display text-lg leading-snug font-semibold sm:whitespace-nowrap">{m.name}</span>
                    <span className="mb-1 min-w-4 flex-1 border-b border-dotted border-white/25" aria-hidden />
                    <span className="text-right text-sm text-sidebar-muted">{m.note}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-sidebar-muted">Auszug aus der Karte – was gerade läuft, steht an der Tafel. Bohnen zum Mitnehmen gibt’s immer.</p>
            </Panel>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}

function Panel({ title, children, dark }: { title: string; children: ReactNode; dark?: boolean }) {
  return (
    <div className={cn('h-full rounded-3xl p-6 md:p-7', dark ? 'grain bg-sidebar text-sidebar-ink' : 'border border-line bg-surface')}>
      <h3 className={cn('mb-5 text-xs font-semibold tracking-[0.16em] uppercase', dark ? 'text-sidebar-muted' : 'text-ink-3')}>{title}</h3>
      {children}
    </div>
  )
}

function Hours({ cafe: c }: { cafe: CafeLocation }) {
  const now = useNow()
  const today = now.getDay()
  const state = openState(c.hours, now)
  return (
    <Panel title="Öffnungszeiten">
      <table className="w-full text-[15px]">
        <caption className="sr-only">Öffnungszeiten {c.name}</caption>
        <tbody>
          {WEEK.map((d) => {
            const h = c.hours[d]
            const isToday = d === today
            return (
              <tr key={d} className={cn(isToday && 'bg-accent-soft')} aria-current={isToday ? 'date' : undefined}>
                <th scope="row" className={cn('py-2 pl-3 text-left font-medium', isToday ? 'rounded-l-xl text-ink' : 'text-ink-2')}>
                  {DAY_NAMES[d]}
                  {isToday ? <span className="ml-2 rounded-full bg-accent-solid px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-on-accent uppercase">heute</span> : null}
                </th>
                <td className={cn('tabular py-2 pr-3 text-right', isToday && 'rounded-r-xl font-semibold', h ? 'text-ink' : 'text-ink-3')}>
                  {h ? `${h.open} – ${h.close}` : 'geschlossen'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className={cn('mt-4 flex items-center gap-2 text-sm font-medium', state.open ? 'text-success' : 'text-ink-2')}>
        <span className={cn('size-2 rounded-full', state.open ? 'bg-success' : 'bg-ink-3')} aria-hidden />
        {state.open ? `Jetzt ${state.label.replace('Geöffnet', 'geöffnet')}${state.closesSoon ? ' – schließt bald' : ''}` : state.label}
      </p>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Zwischen den Cafés
// ---------------------------------------------------------------------------

function BetweenCafes({ cafes }: { cafes: CafeLocation[] }) {
  const a = cafes.find((c) => c.id === 'roesterei')
  const b = cafes.find((c) => c.id === 'espressobar')
  return (
    <section aria-labelledby="zwischen" className="py-20 md:py-28">
      <Container>
        <div className="grid items-center gap-10 overflow-hidden rounded-[2.5rem] border border-line bg-surface p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-14">
          <div>
            <Footprints className="size-8 text-accent-text" aria-hidden />
            <Eyebrow className="mt-6">Zwischen den Cafés</Eyebrow>
            <h2 id="zwischen" className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink md:text-5xl">
              Von der Röstmaschine zur Espressobar.
            </h2>
            <p className="mt-4 leading-relaxed text-ink-2">
              Morgens die frischen Bohnen in der Rösterei holen, nachmittags den Espresso mit Blick auf den Herderplatz trinken: Dazwischen liegt einmal quer die Weimarer Innenstadt – zu kurz für ein Taxi, genau richtig für einen Spaziergang.
            </p>
            <dl className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-surface-2 p-4">
                <dt className="text-xs font-semibold tracking-[0.12em] text-ink-3 uppercase">Zu Fuß</dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-ink">ca. 10–15 Min.</dd>
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                <dt className="text-xs font-semibold tracking-[0.12em] text-ink-3 uppercase">Mit dem Rad</dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-ink">ca. 5 Min.</dd>
              </div>
            </dl>
            <ExampleNote className="mt-4">Richtwerte – der schnellste Weg hängt von Baustellen, Wochenmarkt und Kaffeedurst ab.</ExampleNote>
            {a && b ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(a.address)}&destination=${encodeURIComponent(b.address)}&travelmode=walking`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-semibold text-ink transition-colors hover:border-ink/40"
              >
                <Navigation className="size-4" aria-hidden />
                Fußweg in Google Maps
                <span className="sr-only">(öffnet in neuem Tab)</span>
              </a>
            ) : null}
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-line">
            <WeimarMap highlight="both" route />
          </div>
        </div>
      </Container>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Schematische Karte der Weimarer Innenstadt (nicht maßstabsgetreu)
// ---------------------------------------------------------------------------

const PLACES = {
  roesterei: { x: 108, y: 226, label: 'Rösterei & Café', sub: 'Richard-Wagner-Str.' },
  espressobar: { x: 246, y: 104, label: 'Espressobar', sub: 'Kaufstraße' },
}

function Pin({ x, y, active, label, sub }: { x: number; y: number; active: boolean; label: string; sub: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {active ? <circle r="18" fill="var(--accent)" opacity="0.18" className="motion-safe:animate-ping" style={{ transformOrigin: 'center', transformBox: 'fill-box' }} /> : null}
      <path d="M0 0c-7-9-11-13.5-11-19.5a11 11 0 0 1 22 0C11-13.5 7-9 0 0Z" fill={active ? 'var(--accent)' : 'var(--ink-3)'} stroke="var(--surface)" strokeWidth="2" />
      <circle cy="-19.5" r="4" fill="var(--surface)" />
      <text x="16" y="-18" fontSize="12" fontWeight="700" fill={active ? 'var(--ink)' : 'var(--ink-2)'} fontFamily="Inter Variable, sans-serif">
        {label}
      </text>
      <text x="16" y="-5" fontSize="10" fill="var(--ink-3)" fontFamily="Inter Variable, sans-serif">
        {sub}
      </text>
    </g>
  )
}

function WeimarMap({ highlight, route, className }: { highlight: 'roesterei' | 'espressobar' | 'both'; route?: boolean; className?: string }) {
  const on = (id: 'roesterei' | 'espressobar') => highlight === 'both' || highlight === id
  return (
    <svg
      viewBox="0 0 400 300"
      className={cn('block h-auto w-full bg-surface-2', className)}
      role="img"
      aria-label="Schematische Karte der Weimarer Innenstadt mit Rösterei (Richard-Wagner-Straße) und Espressobar (Kaufstraße am Herderplatz) – nicht maßstabsgetreu"
    >
      {/* Park an der Ilm */}
      <path d="M318 0h82v300h-120c10-40 30-70 26-120-3-40 8-120 12-180Z" fill="var(--success)" opacity="0.14" />
      <text x="352" y="200" fontSize="9" letterSpacing="1.5" fill="var(--success)" textAnchor="middle" fontFamily="Inter Variable, sans-serif" transform="rotate(-80 352 200)">
        PARK AN DER ILM
      </text>
      {/* Ilm */}
      <path d="M336 -4c-14 40 12 70 0 110s-26 66-12 104 4 70-10 94" fill="none" stroke="#6f9cc4" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
      <text x="322" y="60" fontSize="10" fontStyle="italic" fill="#5b87ad" fontFamily="Fraunces Variable, Georgia, serif">
        Ilm
      </text>
      {/* Straßen (abstrahiert) */}
      <g fill="none" stroke="var(--line-strong)" strokeLinecap="round">
        <path d="M20 120C80 112 140 104 200 108s90 10 110 14" strokeWidth="7" />
        <path d="M40 260c30-30 60-60 90-96s50-70 70-110" strokeWidth="7" />
        <path d="M150 20c10 50 20 110 40 160s50 80 60 110" strokeWidth="5" />
        <path d="M200 60c20 30 40 60 50 100s0 80-10 120" strokeWidth="5" />
        <path d="M60 190c50 0 100 0 150-10s80-20 100-24" strokeWidth="5" />
        <path d="M246 104l-12 50" strokeWidth="4" />
      </g>
      {/* Plätze */}
      <g fontFamily="Inter Variable, sans-serif" fontSize="10" fill="var(--ink-3)">
        <rect x="236" y="80" width="26" height="18" rx="3" fill="var(--surface)" stroke="var(--line-strong)" />
        <path d="M249 70v-8m-3 3h6" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" />
        <text x="231" y="78" textAnchor="end">Herderplatz</text>
        <rect x="222" y="150" width="28" height="20" rx="3" fill="var(--surface)" stroke="var(--line-strong)" />
        <text x="256" y="166">Markt</text>
        <rect x="126" y="96" width="30" height="18" rx="3" fill="var(--surface)" stroke="var(--line-strong)" />
        <text x="118" y="90">Goetheplatz</text>
        <rect x="178" y="132" width="24" height="16" rx="3" fill="var(--surface)" stroke="var(--line-strong)" />
        <text x="160" y="164">Theaterplatz</text>
      </g>
      {/* Route */}
      {route ? (
        <path
          d={`M${PLACES.roesterei.x} ${PLACES.roesterei.y - 4}C120 180 130 140 141 114s40 22 50 22 40-26 55-32`}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
      ) : null}
      {/* Nordpfeil */}
      <g transform="translate(28 30)" fontFamily="Inter Variable, sans-serif">
        <path d="M0 -12 6 6 0 2 -6 6Z" fill="var(--ink-2)" />
        <text y="20" fontSize="9" textAnchor="middle" fill="var(--ink-3)" fontWeight="700">
          N
        </text>
      </g>
      <Pin {...PLACES.roesterei} active={on('roesterei')} />
      <Pin {...PLACES.espressobar} active={on('espressobar')} />
      <text x="12" y="290" fontSize="9" fill="var(--ink-3)" fontFamily="Inter Variable, sans-serif">
        Schematisch · nicht maßstabsgetreu
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Illustrationen
// ---------------------------------------------------------------------------

function RoasterArt() {
  return (
    <svg viewBox="0 0 320 240" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Schornstein & Rauch */}
      <path d="M232 70V22h14v48" />
      <path d="M239 16c-6-8 6-10 0-18" opacity="0.5" className="motion-safe:animate-[pulse_3s_ease-in-out_infinite]" />
      {/* Trichter */}
      <path d="M136 28h54l-12 30h-30Z" />
      <path d="M148 58v8h30v-8" />
      {/* Trommel */}
      <rect x="96" y="66" width="152" height="84" rx="14" />
      <circle cx="140" cy="108" r="30" />
      <circle cx="140" cy="108" r="21" fill="var(--accent)" fillOpacity="0.28" />
      <path d="M170 108h20" />
      <circle cx="222" cy="92" r="6" />
      <path d="M212 120h22M212 130h22" opacity="0.6" />
      {/* Beine */}
      <path d="M112 150v44M232 150v44" />
      {/* Kühlsieb */}
      <path d="M140 150c0 14 10 22 30 24" />
      <ellipse cx="196" cy="188" rx="74" ry="16" />
      <path d="M122 188v8c0 9 33 16 74 16s74-7 74-16v-8" />
      <g fill="var(--accent)" stroke="none">
        {[
          [160, 186],
          [176, 190],
          [192, 184],
          [208, 191],
          [224, 186],
          [184, 194],
          [214, 182],
          [240, 190],
          [150, 191],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="4.5" ry="3" transform={`rotate(${i * 25} ${x} ${y})`} />
        ))}
      </g>
      <path d="M196 188l40-8" opacity="0.6" />
      <path d="M60 212h220" opacity="0.4" />
    </svg>
  )
}

function BarArt() {
  return (
    <svg viewBox="0 0 320 240" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Kirchturm im Hintergrund */}
      <path d="M44 206V70h30v136" opacity="0.45" />
      <path d="M44 70l15-44 15 44" opacity="0.45" />
      <path d="M59 26v-12m-4 4h8" opacity="0.45" />
      <path d="M53 96h12v16H53z" opacity="0.45" />
      {/* Altstadthaus mit Giebel */}
      <path d="M96 206V92l52-44 52 44v114" />
      <path d="M136 72h24v14h-24z" opacity="0.7" />
      <path d="M112 104h24v22h-24zM160 104h24v22h-24z" opacity="0.7" />
      {/* Markise */}
      <path d="M100 142h96l-8 18H108Z" fill="var(--accent)" fillOpacity="0.35" />
      <path d="M116 142l-4 18M132 142v18M148 142v18M164 142v18M180 142l4 18" opacity="0.6" />
      {/* Schaufenster & Tür */}
      <path d="M110 166h44v40h-44zM164 166h24v40" />
      <path d="M118 184c0-6 12-6 12 0v4h-12Z" fill="var(--accent)" fillOpacity="0.5" stroke="none" />
      <path d="M130 185h3a2 2 0 0 1 0 4h-3" strokeWidth="1.6" />
      {/* Terrasse */}
      <path d="M232 116c20-22 56-22 76 0Z" fill="var(--accent)" fillOpacity="0.35" />
      <path d="M270 110v96" />
      <ellipse cx="270" cy="178" rx="26" ry="6" />
      <path d="M252 184l-4 22M288 184l4 22" />
      <path d="M226 170v36M226 186h14v20M314 170v36M314 186h-14v20" opacity="0.7" />
      <path d="M262 170c0-4 6-4 6 0v4h-6Z" fill="currentColor" stroke="none" />
      {/* Pflaster */}
      <path d="M20 206h290" />
      <path d="M40 218h30M90 218h40M150 218h30M200 218h50M270 218h30" opacity="0.35" />
    </svg>
  )
}
