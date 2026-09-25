import { previousMonday } from 'date-fns'
import { ArrowRight, Check, Hourglass, QrCode } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useStore } from '../../lib/store'
import type { Product } from '../../lib/types'
import { cn, formatDe } from '../../lib/utils'
import { CoffeeBag, Container, Eyebrow, SectionHeading, siteButtonClass } from '../components'
import { hashString, prefersReducedMotion, useDocumentTitle } from '../content/hooks'
import { PageHero, Reveal } from '../content/ui'
import { ROAST_LABELS } from '../lib'

export function OriginPage() {
  useDocumentTitle('Herkunft')
  return (
    <>
      <PageHero
        eyebrow="Herkunft & direkter Handel"
        title={
          <>
            Vom Feld <br className="hidden sm:block" />
            in die <span className="text-accent-text italic">Tasse.</span>
          </>
        }
        text="Guter Kaffee beginnt lange vor unserer Röstmaschine. Wir kaufen Rohkaffee bei kleinen Importeuren, die direkt einkaufen und fair zahlen – und erzählen dir hier, was wir wissen. Und was noch nicht."
        aside={<JourneyArt />}
      >
        <div className="flex flex-wrap gap-3">
          <a href="#geschichte" className={siteButtonClass('primary')}>
            Die Reise ansehen
            <ArrowRight className="size-4" aria-hidden />
          </a>
          <a href="#bohnen-pass" className={siteButtonClass('secondary')}>
            <QrCode className="size-4" aria-hidden />
            Bohnen-Pass
          </a>
        </div>
      </PageHero>
      <Story />
      <BeanPassport />
      <Principles />
    </>
  )
}

// ---------------------------------------------------------------------------
// Scroll-Story in fünf Kapiteln
// ---------------------------------------------------------------------------

const CHAPTERS: { key: string; title: string; kicker: string; text: string; facts: string[]; icon: ReactNode; cta?: { to: string; label: string } }[] = [
  {
    key: 'farm',
    kicker: 'Farm & Ernte',
    title: 'Alles beginnt mit einer Kirsche.',
    text: 'Kaffee wächst an Sträuchern, meist in Höhenlagen der Tropen. Die Kirschen reifen nicht gleichzeitig – gute Farmen pflücken deshalb mehrmals und nur die reifen. Das ist Handarbeit und einer der Gründe, warum richtig guter Kaffee seinen Preis hat.',
    facts: ['Selektive Ernte von Hand', 'Höhe, Boden & Sorte prägen den Geschmack', 'Pro Strauch nur eine überschaubare Menge Kaffee im Jahr'],
    icon: (
      <>
        <path d="M32 58V30M32 40c-8-2-14-8-15-16 8 0 14 5 15 12M32 34c7-2 12-7 13-14-7 0-12 5-13 11" />
        <circle cx="22" cy="46" r="5" fill="var(--accent)" fillOpacity="0.5" />
        <circle cx="30" cy="50" r="5" fill="var(--accent)" fillOpacity="0.5" />
        <circle cx="40" cy="47" r="5" fill="var(--accent)" fillOpacity="0.5" />
        <path d="M8 58h48" />
      </>
    ),
  },
  {
    key: 'aufbereitung',
    kicker: 'Aufbereitung',
    title: 'Aus der Kirsche wird die Bohne.',
    text: 'Direkt nach der Ernte wird das Fruchtfleisch entfernt – gewaschen, natural (in der ganzen Kirsche getrocknet) oder als Honey irgendwo dazwischen. Die Methode prägt den Geschmack: gewaschen eher klar, natural eher fruchtig und süß.',
    facts: ['Gewaschen: klar & präzise', 'Natural: fruchtig & süß', 'Trocknen auf Beeten – oft wochenlang'],
    icon: (
      <>
        <path d="M6 44h52M10 44l4-10h36l4 10" />
        <g fill="var(--accent)" fillOpacity="0.5" stroke="none">
          <ellipse cx="20" cy="39" rx="3" ry="2" />
          <ellipse cx="28" cy="38" rx="3" ry="2" />
          <ellipse cx="36" cy="39" rx="3" ry="2" />
          <ellipse cx="44" cy="38" rx="3" ry="2" />
        </g>
        <circle cx="46" cy="14" r="6" />
        <path d="M46 3v3M46 22v3M35 14h3M54 14h3M38 6l2 2M52 20l2 2M38 22l2-2M52 8l2-2" />
        <path d="M16 52v6M32 52v6M48 52v6" />
      </>
    ),
  },
  {
    key: 'import',
    kicker: 'Der kleine Importeur',
    title: 'Direkt eingekauft, fair bezahlt.',
    text: 'Wir kaufen nicht anonym an der Börse, sondern bei kleinen Importeuren, die direkt bei Farmen und Kooperativen einkaufen und fair zahlen. Sie kennen die Menschen hinter dem Kaffee, organisieren Proben, Transport und Lagerung – und wir wissen, woher unser Rohkaffee kommt.',
    facts: ['Direkter Einkauf statt Börse', 'Faire Bezahlung für die Produzent:innen', 'Proben, Transport & Lagerung aus einer Hand'],
    icon: (
      <>
        <path d="M8 40h48l-6 12H14Z" />
        <path d="M18 40V28h12v12M30 40V22h12v18" />
        <path d="M34 22v-6h4v6" />
        <path d="M4 58c6-3 10-3 14 0s10 3 14 0 10-3 14 0 10 3 14 0" stroke="var(--accent)" />
      </>
    ),
  },
  {
    key: 'roesterei',
    kicker: 'Rösterei Weimar',
    title: 'Probenröstung, Cupping, Profil.',
    text: 'In der Richard-Wagner-Straße wird es ernst: Wir rösten Proben, verkosten sie beim Cupping blind und entwickeln für jeden Kaffee ein eigenes Röstprofil – so lange, bis er genau so schmeckt, wie wir ihn uns vorstellen. Und dann bekommt er einen Namen.',
    facts: ['Probenröstung zum Kennenlernen', 'Cupping: blind verkosten', 'Ein eigenes Röstprofil pro Kaffee'],
    icon: (
      <>
        <rect x="10" y="18" width="40" height="26" rx="5" />
        <circle cx="24" cy="31" r="8" fill="var(--accent)" fillOpacity="0.3" />
        <path d="M26 8h12l-3 10h-6Z" />
        <path d="M44 18V6h5v12" />
        <path d="M16 44v10M44 44v10M6 54h52" />
        <path d="M38 31h6" />
      </>
    ),
  },
  {
    key: 'tasse',
    kicker: 'Deine Tasse',
    title: 'Die letzten Meter machst du.',
    text: 'Frisch geröstet, bei dir gebrüht. Mahlgrad, Wasser und Zeit entscheiden, ob all die Arbeit davor in der Tasse ankommt. Keine Sorge: Unsere Anleitungen und der Brüh-Timer helfen dir dabei.',
    facts: ['Frisch mahlen, wenn möglich', 'Weiches Wasser, richtige Temperatur', 'Rezept notieren, nachjustieren, genießen'],
    icon: (
      <>
        <path d="M12 26h34v10a14 14 0 0 1-14 14h-6A14 14 0 0 1 12 36Z" fill="var(--accent)" fillOpacity="0.3" />
        <path d="M12 26h34v10a14 14 0 0 1-14 14h-6A14 14 0 0 1 12 36Z" />
        <path d="M46 29h3a5 5 0 0 1 0 10h-4" />
        <path d="M22 18c-3-4 3-6 0-10M30 18c-3-4 3-6 0-10M38 18c-3-4 3-6 0-10" />
        <path d="M6 56h48" />
      </>
    ),
    cta: { to: '/anleitungen', label: 'Zu den Brühanleitungen' },
  },
]

function Story() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    refs.current.forEach((el) => el && io.observe(el))
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const mid = window.innerHeight / 2
        setProgress(Math.min(1, Math.max(0, (mid - r.top) / r.height)))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const jump = (i: number) => refs.current[i]?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' })

  return (
    <section id="geschichte" ref={sectionRef} aria-labelledby="story-title" className="relative scroll-mt-20 border-t border-line">
      <h2 id="story-title" className="sr-only">
        Vom Feld in die Tasse – fünf Kapitel
      </h2>
      {/* Mobil: Fortschritt oben */}
      <div className="sticky top-16 z-20 border-b border-line bg-canvas/90 backdrop-blur-md lg:hidden">
        <Container className="flex items-center gap-3 py-2.5">
          <span className="tabular font-display text-sm font-semibold text-accent-text">0{active + 1}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{CHAPTERS[active].kicker}</span>
          <span className="h-1 w-24 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <span className="block h-full rounded-full bg-accent transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
          </span>
        </Container>
      </div>
      <Container className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-20">
        {/* Desktop: klebender Fortschritt */}
        <nav aria-label="Kapitel" className="hidden lg:block">
          <div className="sticky top-32 py-24">
            <p className="text-xs font-semibold tracking-[0.18em] text-ink-3 uppercase">Die Reise</p>
            <ol className="relative mt-6 space-y-1">
              <span className="absolute top-3 bottom-3 left-[15px] w-0.5 rounded-full bg-surface-3" aria-hidden />
              <span className="absolute top-3 left-[15px] w-0.5 rounded-full bg-accent transition-[height] duration-150" style={{ height: `calc(${progress} * (100% - 1.5rem))` }} aria-hidden />
              {CHAPTERS.map((c, i) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => jump(i)}
                    aria-current={active === i ? 'step' : undefined}
                    className={cn('group relative flex w-full items-center gap-4 rounded-xl py-2 pr-2 text-left transition-colors', active === i ? 'text-ink' : 'text-ink-3 hover:text-ink')}
                  >
                    <span
                      className={cn(
                        'tabular relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                        i <= active ? 'border-accent bg-accent-solid text-on-accent' : 'border-surface-3 bg-canvas',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className={cn('text-sm transition-[font-weight]', active === i ? 'font-semibold' : 'font-medium')}>{c.kicker}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div>
          {CHAPTERS.map((c, i) => (
            <article
              key={c.key}
              ref={(el) => {
                refs.current[i] = el
              }}
              data-index={i}
              aria-labelledby={`kap-${c.key}`}
              className="flex min-h-[80vh] flex-col justify-center border-b border-line py-20 last:border-b-0 md:py-24"
            >
              <Reveal>
                <div className="flex items-start justify-between gap-6">
                  <span
                    className="tabular font-display text-[7rem] leading-[0.8] font-semibold tracking-tighter text-accent/25 before:content-[attr(data-n)] md:text-[10rem]"
                    data-n={`0${i + 1}`}
                    aria-hidden
                  />
                  <svg viewBox="0 0 64 64" className="size-20 shrink-0 text-ink md:size-24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {c.icon}
                  </svg>
                </div>
                <Eyebrow className="mt-8">{c.kicker}</Eyebrow>
                <h3 id={`kap-${c.key}`} className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink md:text-6xl">
                  {c.title}
                </h3>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2 md:text-xl">{c.text}</p>
                <ul className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
                  {c.facts.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface p-3 text-sm leading-snug font-medium text-ink sm:block sm:p-4">
                      <Check className="size-4 shrink-0 text-accent-text sm:mb-2" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                {c.cta ? (
                  <Link to={c.cta.to} className={cn(siteButtonClass('primary'), 'mt-8')}>
                    {c.cta.label}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                ) : null}
              </Reveal>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

function JourneyArt() {
  return (
    <div className="grain relative mx-auto aspect-[5/4] w-full max-w-xl overflow-hidden rounded-[2.5rem] bg-sidebar text-sidebar-ink" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_80%,rgb(79_112_73/0.45),transparent_70%),radial-gradient(50%_50%_at_85%_20%,rgb(196_112_47/0.35),transparent_70%)]" />
      <svg viewBox="0 0 400 320" className="absolute inset-0 size-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Berge & Pflanzen */}
        <path d="M0 270l70-90 40 40 50-70 70 120" opacity="0.5" />
        <path d="M0 300h400" opacity="0.3" />
        {[40, 80, 120, 160].map((x, i) => (
          <g key={x} transform={`translate(${x} ${258 - (i % 2) * 10})`}>
            <path d="M0 40V0M0 12c-8-2-12-8-12-14 7 0 12 5 12 11M0 22c8-2 12-8 12-14-7 0-12 5-12 11" />
            <circle cx="-4" cy="30" r="3" fill="var(--accent)" stroke="none" />
            <circle cx="4" cy="33" r="3" fill="var(--accent)" stroke="none" />
          </g>
        ))}
        {/* Route */}
        <path d="M150 230C190 120 280 70 340 90" stroke="var(--accent)" strokeWidth="2.5" strokeDasharray="3 9" />
        <g transform="translate(250 106) rotate(-18)">
          <path d="M-18 0h36l-6 9h-24Z" fill="var(--accent)" fillOpacity="0.4" />
          <path d="M-8 0v-9h9v9M2 0v-13h8v13" />
        </g>
        {/* Weimar */}
        <g transform="translate(340 92)">
          <circle r="22" fill="var(--accent)" fillOpacity="0.2" stroke="none" />
          <path d="M0 0c-7-9-11-13.5-11-19.5a11 11 0 0 1 22 0C11-13.5 7-9 0 0Z" fill="var(--accent)" stroke="none" />
          <circle cy="-19.5" r="4" fill="var(--sidebar)" stroke="none" />
        </g>
      </svg>
      <p className="absolute top-6 right-6 text-right text-xs font-semibold tracking-[0.18em] text-sidebar-muted uppercase">
        Weimar
        <br />
        <span className="font-display text-2xl tracking-normal text-sidebar-ink normal-case">Rösterei</span>
      </p>
      <p className="absolute bottom-6 left-6 text-xs font-semibold tracking-[0.18em] text-sidebar-muted uppercase">Farm & Ernte</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bohnen-Pass
// ---------------------------------------------------------------------------

const PAPER = '#f6ecdf'
const INK = '#1c130e'

const ascii = (s: string) =>
  s
    .toUpperCase()
    .replace(/Ä/g, 'AE')
    .replace(/Ö/g, 'OE')
    .replace(/Ü/g, 'UE')
    .replace(/ß/g, 'SS')
    .replace(/[^A-Z0-9]+/g, '<')

function BeanPassport() {
  const products = useStore((s) => s.products)
  const coffees = useMemo(() => products.filter((p) => p.kind !== 'gift' && p.kind !== 'voucher'), [products])
  const [params] = useSearchParams()
  const [slug, setSlug] = useState(() => params.get('kaffee') ?? '')
  const p = coffees.find((x) => x.slug === slug) ?? coffees[0]
  const ref = useRef<HTMLElement>(null)

  // QR-Idee: /herkunft?kaffee=<slug> springt direkt zum Pass
  const deepLinked = Boolean(params.get('kaffee'))
  useEffect(() => {
    if (!deepLinked) return
    const t = window.setTimeout(() => ref.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' }), 150)
    return () => window.clearTimeout(t)
  }, [deepLinked])

  if (!p) return null
  const roastDate = previousMonday(new Date())

  return (
    <section ref={ref} id="bohnen-pass" aria-labelledby="pass-title" className="scroll-mt-20 border-t border-line bg-surface-2/60 py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Bohnen-Pass"
          title={<span id="pass-title">Jede Bohne hat Papiere.</span>}
          text="Wähl einen Kaffee und sieh dir seinen Pass an: Herkunft, Aufbereitung, Röstung – und warum er so heißt, wie er heißt."
        />
        <div role="radiogroup" aria-label="Kaffee wählen" className="mb-8 flex flex-wrap gap-2">
          {coffees.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={c.id === p.id}
              onClick={() => setSlug(c.slug)}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-full border pr-4 pl-1.5 text-sm font-semibold transition-colors',
                c.id === p.id ? 'border-transparent bg-ink text-canvas' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
              )}
            >
              <span className="size-8 rounded-full" style={{ background: c.color }} aria-hidden />
              {c.name}
            </button>
          ))}
        </div>

        <Passport key={p.id} product={p} roastDate={roastDate} />

        <div className="mt-8 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-text" aria-hidden>
            <QrCode className="size-6" />
          </span>
          <p className="max-w-3xl text-[15px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">Unsere Idee für später:</span> Auf jede Tüte kommt ein QR-Code, der genau hierher führt – mit dem echten Röstdatum deiner Charge. Der Code im Pass ist bis dahin nur Deko.
          </p>
        </div>
      </Container>
    </section>
  )
}

function Passport({ product: p, roastDate }: { product: Product; roastDate: Date }) {
  const code = `RB-${ascii(p.slug).slice(0, 4)}-${String(hashString(p.id) % 10000).padStart(4, '0')}`
  const mrz1 = `P<RBR<${ascii(p.name)}<<${ascii(p.subtitle)}`.padEnd(44, '<').slice(0, 44)
  const mrz2 = `${code.replace(/-/g, '')}<WEIMAR<${ascii(p.process)}`.padEnd(44, '<').slice(0, 44)
  return (
    <article
      aria-label={`Bohnen-Pass ${p.name}`}
      className="animate-pop-in overflow-hidden rounded-[2rem] shadow-lift md:grid md:grid-cols-[0.8fr_1.2fr]"
      style={{ background: PAPER, color: INK, '--pc': p.color } as CSSProperties}
    >
      {/* linke Seite */}
      <div className="relative overflow-hidden border-b border-dashed border-black/15 p-7 md:border-r md:border-b-0 md:p-10">
        <Guilloche color={p.color} />
        <p className="relative text-[10px] font-bold tracking-[0.3em] text-black/55 uppercase">Röstbrüder · Bohnen-Pass</p>
        <div className="relative mx-auto mt-6 w-40 -rotate-3 md:w-48">
          <CoffeeBag product={p} />
        </div>
        <div
          className="absolute right-6 bottom-8 flex size-28 rotate-[-14deg] flex-col items-center justify-center rounded-full border-[3px] border-double text-center"
          style={{ borderColor: p.color, color: p.color }}
          aria-hidden
        >
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase">Geröstet in</span>
          <span className="font-display text-xl leading-none font-semibold">Weimar</span>
          <span className="mt-1 text-[9px] font-bold tracking-[0.2em]">{formatDe(roastDate, 'dd.MM.yy')}</span>
        </div>
      </div>

      {/* rechte Seite */}
      <div className="relative p-7 md:p-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-black/55 uppercase">Name / Name</p>
            <h3 className="mt-1 font-display text-5xl leading-none font-semibold tracking-tight">{p.name}</h3>
            <p className="mt-2 text-sm text-black/65">{p.subtitle}</p>
          </div>
          <FakeQr seed={p.id} className="hidden w-24 shrink-0 sm:block" />
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 text-sm sm:grid-cols-3">
          <PassField label="Herkunft" value={p.origin} />
          <PassField label="Region" value={p.region} />
          <PassField label="Aufbereitung" value={p.process} />
          <PassField
            label="Röstgrad"
            value={
              <span className="flex items-center gap-2">
                <span className="flex gap-0.5" aria-hidden>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="size-2 rounded-full border" style={{ borderColor: p.color, background: i <= p.roast ? p.color : 'transparent' }} />
                  ))}
                </span>
                {ROAST_LABELS[p.roast]}
              </span>
            }
          />
          <PassField label="Röstdatum" value={<>{formatDe(roastDate, 'd. MMM yyyy')} <span className="text-[11px] font-normal text-black/70">(Beispiel)</span></>} />
          <PassField label="Pass-Nr." value={<span className="font-mono text-[13px]">{code}</span>} />
        </dl>

        <div className="mt-6">
          <p className="text-[10px] font-bold tracking-[0.3em] text-black/55 uppercase">Aromen</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {p.notes.map((n) => (
              <li key={n} className="rounded-full border border-black/15 px-2.5 py-1 text-xs font-medium">
                {n}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 border-l-2 pl-4" style={{ borderColor: p.color }}>
          <p className="text-[10px] font-bold tracking-[0.3em] text-black/55 uppercase">Warum heißt er so?</p>
          <p className="mt-1.5 font-display text-lg leading-snug italic">{p.story}</p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Link to={`/shop/${p.slug}`} className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: `color-mix(in oklab, ${p.color} 80%, #000)` }}>
            {p.name} probieren
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          {p.verify ? <span className="text-[11px] text-black/70">Angaben werden noch mit dem Shop abgeglichen.</span> : null}
        </div>

        <div className="mt-8 overflow-hidden rounded-lg bg-black/[0.04] px-3 py-2 font-mono text-[10px] leading-relaxed tracking-[0.12em] whitespace-nowrap text-black/55 sm:text-[11px]" aria-hidden>
          <div>{mrz1}</div>
          <div>{mrz2}</div>
        </div>
      </div>
    </article>
  )
}

function PassField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-bold tracking-[0.3em] text-black/55 uppercase">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  )
}

/** Guilloche-Muster wie auf Wertpapieren – reine SVG-Deko */
function Guilloche({ color }: { color: string }) {
  const paths = useMemo(() => {
    const out: string[] = []
    for (let k = 0; k < 9; k++) {
      let d = ''
      for (let i = 0; i <= 360; i += 4) {
        const a = (i * Math.PI) / 180
        const r = 60 + k * 14 + 8 * Math.sin(a * 7 + k)
        d += `${i === 0 ? 'M' : 'L'}${(160 + r * Math.cos(a)).toFixed(1)} ${(200 + r * Math.sin(a)).toFixed(1)}`
      }
      out.push(`${d}Z`)
    }
    return out
  }, [])
  return (
    <svg viewBox="0 0 320 400" className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeOpacity="0.16" strokeWidth="0.8" />
      ))}
    </svg>
  )
}

/** Dekorativer „QR-Code“ – deterministisches Muster, kein echter Code */
function FakeQr({ seed, className }: { seed: string; className?: string }) {
  const n = 21
  const cells = useMemo(() => {
    let h = hashString(seed)
    const rnd = () => {
      h ^= h << 13
      h ^= h >>> 17
      h ^= h << 5
      return ((h >>> 0) % 1000) / 1000
    }
    const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)
    const out: [number, number][] = []
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rnd() > 0.52) out.push([x, y])
    return out
  }, [seed])
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill={INK} />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill={PAPER} />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill={INK} />
    </g>
  )
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className={className} shapeRendering="crispEdges" aria-hidden>
      <rect x="-1" y="-1" width={n + 2} height={n + 2} fill={PAPER} />
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width="1" height="1" fill={INK} />
      ))}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Transparenz
// ---------------------------------------------------------------------------

function Principles() {
  const promise = [
    'Wir kaufen bei kleinen Importeuren, die direkt einkaufen und fair zahlen.',
    'Wir nennen Herkunft und Aufbereitung jedes Kaffees – soweit wir sie kennen.',
    'Wir rösten selbst, in kleinen Chargen, in Weimar.',
    'Wir erzählen nur, was wir belegen können. Keine erfundenen Siegel, keine Farm-Romantik.',
  ]
  const working = [
    'Einkaufspreise transparent machen – wir suchen ein Format, das ehrlich und verständlich ist.',
    'Für jeden Kaffee mehr über Farm oder Kooperative erzählen.',
    'Ein QR-Code auf jeder Tüte, der zum Bohnen-Pass führt.',
  ]
  return (
    <section aria-labelledby="transparenz" className="py-20 md:py-28">
      <Container>
        <SectionHeading eyebrow="Transparenz" title={<span id="transparenz">Was wir versprechen. Und was noch fehlt.</span>} text="Ehrlich gesagt: Wir sind nicht perfekt. Aber wir wissen, wo wir hinwollen." />
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="h-full">
            <div className="h-full rounded-[2rem] border border-line bg-surface p-7 md:p-10">
              <h3 className="font-display text-2xl font-semibold text-ink">Was wir versprechen</h3>
              <ul className="mt-6 space-y-4">
                {promise.map((t) => (
                  <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success" aria-hidden>
                      <Check className="size-3.5" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal className="h-full">
            <div className="grain h-full rounded-[2rem] bg-sidebar p-7 text-sidebar-ink md:p-10">
              <h3 className="font-display text-2xl font-semibold">Woran wir noch arbeiten</h3>
              <ul className="mt-6 space-y-4">
                {working.map((t) => (
                  <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-sidebar-muted">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent" aria-hidden>
                      <Hourglass className="size-3.5" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-sm text-sidebar-muted">
                Fragen zu einem Kaffee?{' '}
                <Link to="/ueber-uns#kontakt" className="font-semibold text-sidebar-ink underline underline-offset-4">
                  Frag uns einfach
                </Link>
                .
              </p>
            </div>
          </Reveal>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <Link to="/shop" className={siteButtonClass('primary')}>
            Kaffees entdecken
          </Link>
          <Link to="/geschmacksfinder" className={siteButtonClass('secondary')}>
            Welcher passt zu mir?
          </Link>
        </div>
      </Container>
    </section>
  )
}
