import { addDays, isSameMonth, startOfMonth, startOfWeek, addMonths, isSameDay } from 'date-fns'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Cherry,
  Clock3,
  Cookie,
  Flame,
  MapPin,
  Milk,
  Package,
  Quote,
  Ship,
  Sparkles,
  Sprout,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { MediaThumb, PlatformIcon } from '../../components/domain'
import { ABO_PRICES, useCart } from '../../lib/cart'
import { PLATFORM } from '../../lib/constants'
import { useStore } from '../../lib/store'
import type { CafeLocation, Product, Workshop, WorkshopSession } from '../../lib/types'
import { cn, formatDe } from '../../lib/utils'
import { CoffeeBag, Container, Eyebrow, NoteChips, OpenBadge, SectionHeading, siteButtonClass, useNow } from '../components'
import { compactHours, price } from '../lib'
import { AddToCartButton, ProductCard } from '../shell/commerce'
import { bestMatch, INSTAGRAM_URL, isCoffee, mapsUrl, stageTint, useReducedMotion } from '../shell/hooks'
import { BeanMark } from '../shell/Logo'

// ---------------------------------------------------------------------------
// Startseite – alle Inhalte kommen aus dem Studio-Store
// ---------------------------------------------------------------------------

export function HomePage() {
  const products = useStore((s) => s.products)
  const featured = useMemo(() => products.filter((p) => p.featured && p.available), [products])
  return (
    <>
      <Hero featured={featured} />
      <Marquee />
      <FeaturedCoffees featured={featured} />
      <NameStories products={products} />
      <FinderTeaser products={products} />
      <AboBand />
      <CafesSection />
      <WorkshopsTeaser />
      <OriginTeaser />
      <SocialStrip />
    </>
  )
}

// ---------------------------------------------------------------------------
// 1 · Hero
// ---------------------------------------------------------------------------

function splitTitle(t: string): [string, string] {
  const i = t.indexOf('. ')
  if (i === -1) return [t, '']
  return [t.slice(0, i + 1), t.slice(i + 2)]
}

function Hero({ featured }: { featured: Product[] }) {
  const site = useStore((s) => s.site)
  const cafes = useStore((s) => s.cafes)
  const [lead, tail] = splitTitle(site.heroTitle)
  return (
    <section aria-labelledby="hero-title" className="grain relative -mt-[65px] overflow-hidden bg-sidebar pt-[65px] text-sidebar-ink lg:-mt-[81px] lg:pt-[81px]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[30%] -right-[20%] size-[80vmax] rounded-full bg-[radial-gradient(closest-side,rgb(196_112_47/0.34),transparent)] lg:-right-[8%] lg:size-[62vmax]" />
        <div className="absolute -bottom-[40%] -left-[20%] size-[70vmax] rounded-full bg-[radial-gradient(closest-side,rgb(120_70_40/0.45),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/25 to-transparent" />
      </div>
      <Container className="relative grid items-center gap-6 pt-8 pb-14 sm:pt-12 lg:min-h-[min(820px,calc(100svh-5rem))] lg:grid-cols-[1.12fr_1fr] lg:gap-4 lg:pt-10 lg:pb-20">
        <div className="animate-[rb-rise_700ms_cubic-bezier(0.2,0.8,0.2,1)_both]">
          <p className="mb-5 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-accent uppercase">
            <span className="h-px w-8 bg-accent/70" aria-hidden />
            Kaffeerösterei & Cafés in Weimar
          </p>
          <h1
            id="hero-title"
            className="font-display text-[44px] leading-[0.98] font-semibold tracking-[-0.03em] text-white sm:text-6xl md:text-7xl xl:text-[88px]"
          >
            {lead}
            {tail ? (
              <>
                {' '}
                <em className="font-medium text-accent italic">{tail}</em>
              </>
            ) : null}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-sidebar-ink/80 sm:text-lg">{site.heroText}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/shop" className={siteButtonClass('primary')}>
              Kaffee entdecken
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link to="/geschmacksfinder" className={siteButtonClass('light')}>
              <Sparkles className="size-4" aria-hidden />
              Welcher Kaffee passt zu mir?
            </Link>
          </div>
          <ul className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:flex-wrap sm:gap-x-8" aria-label="Unsere Cafés gerade">
            {cafes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 sm:justify-start">
                <Link to="/cafes" className="text-sm font-semibold text-white/90 underline-offset-4 hover:underline">
                  {c.name}
                </Link>
                <OpenBadge cafe={c} tone="onDark" />
              </li>
            ))}
          </ul>
        </div>
        <HeroBags bags={featured.slice(0, 3)} />
      </Container>
    </section>
  )
}

function HeroBags({ bags }: { bags: Product[] }) {
  const pathId = useId().replace(/:/g, '')
  const [a, b, c] = bags
  // Mitte = erster Kaffee (vorn), links/rechts dahinter gefächert
  const slots: { p: Product | undefined; className: string; float: string }[] = [
    { p: b, className: 'left-[3%] top-[20%] w-[38%] -rotate-[13deg] z-0', float: '1.4s' },
    { p: c, className: 'right-[3%] top-[22%] w-[38%] rotate-[11deg] z-0', float: '2.6s' },
    { p: a, className: 'left-1/2 top-[10%] w-[46%] -translate-x-1/2 z-10', float: '0s' },
  ]
  return (
    <div className="relative mx-auto aspect-[1/0.92] w-full max-w-[380px] animate-[rb-rise_900ms_120ms_cubic-bezier(0.2,0.8,0.2,1)_both] sm:max-w-[460px] lg:max-w-[560px]" aria-hidden>
      {/* Lichtkegel & Bodenschatten */}
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,rgb(233_216_196/0.16),transparent)]" />
      <div className="absolute bottom-[6%] left-1/2 h-8 w-[70%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-xl" />
      {/* Dampf */}
      <svg viewBox="0 0 120 90" className="absolute top-[-4%] left-1/2 z-20 w-[30%] -translate-x-1/2 text-sidebar-ink/55">
        {[22, 60, 98].map((x, i) => (
          <path
            key={x}
            d={`M${x} 88 C ${x - 14} 70, ${x + 14} 58, ${x} 44 S ${x - 12} 16, ${x} 2`}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray="34 72"
            className="rb-loop"
            style={{ animation: `rb-steam 3.8s ease-in-out ${i * 1.1}s infinite` }}
          />
        ))}
      </svg>
      {slots.map((s, i) =>
        s.p ? (
          <div key={s.p.id} className={cn('absolute', s.className)}>
            <div className="rb-loop" style={{ animation: `rb-float ${6 + i}s ease-in-out ${s.float} infinite` }}>
              <CoffeeBag product={s.p} className="drop-shadow-[0_30px_36px_rgba(0,0,0,0.45)]" />
            </div>
          </div>
        ) : null,
      )}
      {/* Rotierender Stempel */}
      <div className="absolute bottom-[0%] left-[-2%] z-20 size-24 sm:size-28 lg:bottom-[2%] lg:left-[-6%] lg:size-32">
        <svg viewBox="0 0 120 120" className="rb-loop size-full animate-[rb-spin-slow_28s_linear_infinite] text-sidebar-ink/80">
          <defs>
            <path id={pathId} d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" />
          </defs>
          <text fontSize="10" fontWeight="600" letterSpacing="2" fill="currentColor" fontFamily="Inter Variable, sans-serif">
            <textPath href={`#${pathId}`} textLength="280" lengthAdjust="spacing">
              FRISCH GERÖSTET · IN WEIMAR ·
            </textPath>
          </text>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <BeanMark className="size-10 lg:size-11" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2 · Laufband
// ---------------------------------------------------------------------------

const PHRASES = ['Frisch geröstet in Weimar', 'Direkt gehandelt', 'Jede Bohne hat einen Namen', 'Von Brüdern gemacht']

function Marquee() {
  const half = [...PHRASES, ...PHRASES]
  return (
    <section aria-label="Röstbrüder in vier Sätzen" className="rb-marquee relative overflow-hidden bg-accent-solid py-4 text-on-accent md:py-5">
      <p className="sr-only">{PHRASES.join(' · ')}</p>
      <div aria-hidden className="rb-marquee-track rb-loop flex w-max animate-[rb-marquee_46s_linear_infinite]">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {half.map((t, i) => (
              <span key={`${copy}-${i}`} className="flex items-center">
                <span className={cn('px-5 font-display text-2xl leading-none font-semibold tracking-tight whitespace-nowrap md:px-7 md:text-4xl', i % 2 === 1 && 'font-medium italic')}>
                  {t}
                </span>
                <svg viewBox="0 0 24 24" className="size-4 shrink-0 opacity-70 md:size-5">
                  <g transform="rotate(-30 12 12)">
                    <ellipse cx="12" cy="12" rx="6" ry="8.5" fill="currentColor" />
                    <path d="M12 4c-2 3 2 5 0 8s2 5 0 8" fill="none" stroke="var(--accent-solid)" strokeWidth="1.6" strokeLinecap="round" />
                  </g>
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 3 · Unsere Kaffees
// ---------------------------------------------------------------------------

function FeaturedCoffees({ featured }: { featured: Product[] }) {
  if (!featured.length) return null
  return (
    <section aria-labelledby="coffees-title" className="py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Unsere Kaffees"
          title={
            <span id="coffees-title">
              Kaffees mit Charakter – <em className="font-medium text-accent-text italic">und Namen.</em>
            </span>
          }
          text="Vom schokoladigen Haus-Espresso bis zum saftigen Filterkaffee: Such dir deinen Lieblingsmenschen aus. Äh – Lieblingskaffee."
          action={
            <Link to="/shop" className={siteButtonClass('secondary')}>
              Alle Kaffees
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        <ul className="rb-no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-12 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4">
          {featured.map((p) => (
            <li key={p.id} className="rb-reveal flex w-[80%] shrink-0 snap-start sm:w-[46%] md:w-auto">
              <ProductCard product={p} pricePrefix="ab" priority addVariant="icon" className="w-full" />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 4 · Jede Bohne hat einen Namen
// ---------------------------------------------------------------------------

function NameStories({ products }: { products: Product[] }) {
  const named = useMemo(() => products.filter((p) => p.available && p.story && isCoffee(p)), [products])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [touched, setTouched] = useState(false)
  const reduced = useReducedMotion()
  const baseId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const sectionRef = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)

  // Nur rotieren, solange der Block sichtbar ist (verhindert Sprünge beim Lesen weiter unten)
  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (reduced || paused || touched || !inView || named.length < 2) return
    const t = window.setInterval(() => setIndex((i) => (i + 1) % named.length), 7000)
    return () => window.clearInterval(t)
  }, [reduced, paused, touched, inView, named.length])

  if (!named.length) return null
  const active = named[Math.min(index, named.length - 1)]

  const select = (i: number, focus = false) => {
    setTouched(true)
    setIndex(i)
    if (focus) tabRefs.current[i]?.focus()
  }
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = named.length - 1
    const map: Record<string, number> = { ArrowDown: i === last ? 0 : i + 1, ArrowRight: i === last ? 0 : i + 1, ArrowUp: i === 0 ? last : i - 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }
    if (e.key in map) {
      e.preventDefault()
      select(map[e.key], true)
    }
  }

  return (
    <section ref={sectionRef} aria-labelledby="names-title" className="relative overflow-hidden bg-surface-2/60 py-20 md:py-28">
      <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr] lg:gap-16">
        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <Eyebrow className="mb-3">Warum die so heißen</Eyebrow>
          <h2 id="names-title" className="font-display text-4xl leading-[1.04] font-semibold tracking-tight text-ink md:text-5xl lg:text-6xl">
            Jede Bohne hat einen <em className="font-medium text-accent-text italic">Namen.</em>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-2 md:text-lg">
            Weil jeder Kaffee seinen eigenen Charakter hat. Und weil sich „Brasilien Santos natural“ am Tresen einfach schlechter bestellen lässt als „Einmal Dörte, bitte“.
          </p>
          <div role="tablist" aria-label="Kaffees und ihre Namensgeschichten" aria-orientation="vertical" className="mt-8 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {named.map((p, i) => {
              const selected = p.id === active.id
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    tabRefs.current[i] = el
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${i}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(i)}
                  onKeyDown={(e) => onKey(e, i)}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-full border px-4 py-2 text-left transition-all lg:rounded-2xl lg:border-transparent lg:px-4 lg:py-3',
                    selected ? 'border-ink bg-ink text-canvas lg:bg-surface lg:text-ink lg:shadow-soft' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink lg:hover:bg-surface/60',
                  )}
                >
                  <span className="hidden size-2.5 shrink-0 rounded-full lg:block" style={{ background: p.color }} aria-hidden />
                  <span className="font-display text-lg font-semibold lg:text-2xl">{p.name}</span>
                  <span className={cn('hidden text-sm lg:inline', selected ? 'text-ink-3' : 'text-ink-3/80')}>{p.subtitle}</span>
                  {selected && !touched && !reduced && inView && named.length > 1 ? (
                    <span aria-hidden className="absolute inset-x-4 bottom-1.5 hidden h-0.5 overflow-hidden rounded-full bg-surface-3 lg:block">
                      <span key={`${active.id}-${paused}`} className="block h-full origin-left bg-accent" style={{ animation: paused ? 'none' : 'rb-grow 7s linear both' }} />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <div
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${named.indexOf(active)}`}
          className="relative isolate overflow-hidden rounded-[36px] p-8 sm:p-12 lg:p-14"
          style={{ background: stageTint(active.color, 30) }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div key={active.id} className="relative grid animate-[rb-rise_600ms_cubic-bezier(0.2,0.8,0.2,1)_both] gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Quote className="mb-5 size-9 -scale-x-100 text-ink/25" aria-hidden />
              <p className="text-xs font-semibold tracking-[0.2em] text-ink-2 uppercase">
                {active.name} · {active.subtitle}
              </p>
              <blockquote className="mt-5 font-display text-[28px] leading-[1.15] font-medium tracking-tight text-ink sm:text-4xl lg:text-[44px]">
                {active.story}
              </blockquote>
              <NoteChips notes={active.notes} className="mt-7" />
              <Link to={`/shop/${active.slug}`} className="mt-8 inline-flex items-center gap-2 text-[15px] font-semibold text-ink underline decoration-ink/30 underline-offset-[6px] transition hover:decoration-ink">
                {active.name} kennenlernen
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mx-auto w-36 rotate-6 sm:w-40 lg:w-48" aria-hidden>
              <CoffeeBag product={active} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 5 · Geschmacksfinder-Teaser
// ---------------------------------------------------------------------------

const CHOICES: { id: string; label: string; hint: string; icon: LucideIcon; color: string; target: Product['taste'] }[] = [
  { id: 'schoko', label: 'Schokoladig & rund', hint: 'Nougat, Kakao, wenig Säure', icon: Cookie, color: '#8a5634', target: { acidity: 2, body: 3, sweetness: 4, chocolate: 5, fruit: 2 } },
  { id: 'frucht', label: 'Fruchtig & hell', hint: 'Steinobst, Beeren, saftig', icon: Cherry, color: '#c4702f', target: { acidity: 4, body: 2, sweetness: 3, chocolate: 1, fruit: 5 } },
  { id: 'milch', label: 'Kräftig mit Milch', hint: 'Cappuccino, Flat White & Co.', icon: Milk, color: '#2c3448', target: { acidity: 1, body: 5, sweetness: 3, chocolate: 4, fruit: 1 } },
]

function FinderTeaser({ products }: { products: Product[] }) {
  const [choice, setChoice] = useState<string | null>(null)
  const add = useCart((s) => s.add)
  const resultRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const pickChoice = (id: string) => {
    setChoice(id)
    // Auf kleinen Screens liegt das Ergebnis unter den Antworten → sanft hinscrollen
    requestAnimationFrame(() => {
      const el = resultRef.current
      if (!el || window.innerWidth >= 1024) return
      const r = el.getBoundingClientRect()
      if (r.top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
    })
  }
  const selected = CHOICES.find((c) => c.id === choice) ?? null
  const match = useMemo(() => (selected ? bestMatch(products, selected.target) : null), [products, selected])
  return (
    <section aria-labelledby="finder-title" className="py-20 md:py-28">
      <Container className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <Eyebrow className="mb-3">Geschmacksfinder · in 5 Sekunden</Eyebrow>
          <h2 id="finder-title" className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink md:text-5xl">
            Wie trinkst du deinen Kaffee am liebsten?
          </h2>
          <div role="radiogroup" aria-labelledby="finder-title" className="mt-8 grid gap-3">
            {CHOICES.map((c) => {
              const active = c.id === choice
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pickChoice(c.id)}
                  className={cn(
                    'group flex items-center gap-4 rounded-3xl border-2 p-4 text-left transition-all duration-200 sm:p-5',
                    active ? 'border-accent bg-accent-soft shadow-soft' : 'border-line bg-surface hover:-translate-y-0.5 hover:border-line-strong hover:shadow-soft',
                  )}
                >
                  <span className="tint flex size-14 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105" style={{ '--c': c.color } as CSSProperties}>
                    <c.icon className="size-6" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-semibold text-ink sm:text-2xl">{c.label}</span>
                    <span className="block text-sm text-ink-3">{c.hint}</span>
                  </span>
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      active ? 'border-accent bg-accent-solid text-on-accent' : 'border-line-strong text-transparent',
                    )}
                    aria-hidden
                  >
                    <Check className="size-4" />
                  </span>
                </button>
              )
            })}
          </div>
          <Link to="/geschmacksfinder" className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-accent-text underline-offset-4 hover:underline">
            Zum ausführlichen Geschmacksfinder
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div ref={resultRef} aria-live="polite" className="relative">
          {match ? (
            <div key={match.id} className="relative animate-[rb-rise_500ms_cubic-bezier(0.2,0.8,0.2,1)_both] overflow-hidden rounded-[36px] p-6 sm:p-10" style={{ background: stageTint(match.color, 28) }}>
              <div className="grid items-center gap-6 sm:grid-cols-[0.8fr_1fr]">
                <div className="mx-auto w-40 -rotate-3 sm:w-full sm:max-w-[220px]">
                  <CoffeeBag product={match} />
                </div>
                <div>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-xs font-semibold text-ink backdrop-blur">
                    <Sparkles className="size-3.5 text-accent" aria-hidden /> Dein Match
                  </p>
                  <h3 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">{match.name}</h3>
                  <p className="text-sm text-ink-2">{match.subtitle}</p>
                  <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{match.description}</p>
                  <NoteChips notes={match.notes} className="mt-4" />
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <AddToCartButton
                      onAdd={() => add({ kind: 'product', productId: match.id, size: '250', grind: 'bohne', qty: 1 })}
                      label={`${match.name} (250 g, ganze Bohne) in den Warenkorb`}
                    >
                      In den Warenkorb · {price(match.price)}
                    </AddToCartButton>
                    <Link to={`/shop/${match.slug}`} className="text-sm font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[36px] border-2 border-dashed border-line-strong bg-surface/50 p-10 text-center">
              <div className="relative mb-6 w-28 opacity-90" aria-hidden>
                <svg viewBox="0 0 200 280" className="w-full">
                  <path d="M22 34 Q20 30 24 28 L176 28 Q180 30 178 34 L186 262 Q187 272 176 273 L24 273 Q13 272 14 262 Z" fill="var(--surface-3)" />
                  <rect x="20" y="8" width="160" height="26" rx="3" fill="var(--surface-3)" />
                  <text x="100" y="178" textAnchor="middle" fontFamily="Fraunces Variable, serif" fontSize="96" fontWeight="600" fill="var(--ink-3)">
                    ?
                  </text>
                </svg>
              </div>
              <p className="font-display text-2xl font-semibold text-ink">Dein Kaffee wartet schon.</p>
              <p className="mt-2 max-w-xs text-sm text-ink-3">Wähl eine Richtung – wir zeigen dir sofort, welcher unserer Kaffees am besten passt.</p>
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 6 · Kaffee-Abo
// ---------------------------------------------------------------------------

const ABO_BENEFITS = [
  { title: 'Frisch geröstet', text: 'Jede Lieferung kommt frisch aus unserer Rösterei in Weimar.' },
  { title: 'Jederzeit pausierbar', text: 'Urlaub, Vorrat, Teepause? Einfach aussetzen oder kündigen.' },
  { title: 'Versandkostenfrei', text: 'Jede Abo-Lieferung, ohne Mindestbestellwert.' },
]

function AboBand() {
  const [rhythm, setRhythm] = useState<2 | 4>(2)
  const now = useNow(3_600_000)
  const cal = useMemo(() => {
    const month = startOfMonth(addMonths(now, 1))
    const gridStart = startOfWeek(month, { weekStartsOn: 1 })
    const days = Array.from({ length: 35 }, (_, i) => addDays(gridStart, i))
    let first = month
    while (first.getDay() !== 2) first = addDays(first, 1)
    return { month, days, first }
  }, [now])
  const deliveries = useMemo(() => {
    const out: Date[] = []
    for (let d = cal.first; d <= cal.days[cal.days.length - 1]; d = addDays(d, rhythm * 7)) out.push(d)
    return out
  }, [cal, rhythm])

  return (
    <section aria-labelledby="abo-title" className="pb-20 md:pb-28">
      <Container>
        <div className="grain relative overflow-hidden rounded-[40px] bg-crema/70 px-6 py-12 sm:px-10 md:py-16 lg:px-16">
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-[radial-gradient(closest-side,rgb(196_112_47/0.22),transparent)]" />
          <div className="relative grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <Eyebrow className="mb-3">Kaffee-Abo</Eyebrow>
              <h2 id="abo-title" className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink md:text-5xl">
                Nie wieder ohne Bohnen <em className="font-medium text-accent-text italic">aufwachen.</em>
              </h2>
              <ul className="mt-8 space-y-4">
                {ABO_BENEFITS.map((b) => (
                  <li key={b.title} className="flex gap-3.5">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-solid text-on-accent">
                      <Check className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-semibold text-ink">{b.title}</span>
                      <span className="block text-[15px] text-ink-2">{b.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap items-end gap-x-8 gap-y-5">
                <p>
                  <span className="block text-sm text-ink-2">ab</span>
                  <span className="tabular font-display text-5xl leading-none font-semibold text-ink">{price(ABO_PRICES[250])}</span>
                  <span className="mt-1 block text-sm text-ink-2">pro Lieferung · 250 g</span>
                </p>
                <Link to="/abo" className={siteButtonClass('primary')}>
                  Abo zusammenstellen
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] bg-surface p-5 shadow-lift sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-xl font-semibold text-ink">
                  {formatDe(cal.month, 'MMMM')} <span className="font-normal text-ink-3">mit Abo</span>
                </p>
                <div role="radiogroup" aria-label="Lieferrhythmus" className="inline-flex rounded-full bg-surface-2 p-1">
                  {([2, 4] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={rhythm === r}
                      onClick={() => setRhythm(r)}
                      className={cn('h-8 rounded-full px-3.5 text-xs font-semibold transition-colors', rhythm === r ? 'bg-ink text-canvas' : 'text-ink-2 hover:text-ink')}
                    >
                      alle {r} Wochen
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-7 gap-1.5 text-center" aria-hidden>
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                  <span key={d} className="pb-1 text-[11px] font-semibold text-ink-3">
                    {d}
                  </span>
                ))}
                {cal.days.map((d) => {
                  const delivery = deliveries.some((x) => isSameDay(x, d))
                  const inMonth = isSameMonth(d, cal.month)
                  return (
                    <span
                      key={d.toISOString()}
                      className={cn(
                        'relative flex aspect-square items-center justify-center rounded-xl text-xs transition-all duration-300',
                        delivery ? 'scale-105 bg-accent-solid font-bold text-on-accent shadow-[0_6px_16px_-6px_rgb(165_90_34/0.7)]' : inMonth ? 'bg-surface-2 text-ink-2' : 'text-ink-3/50',
                      )}
                    >
                      {delivery ? <Package className="size-4" /> : d.getDate()}
                    </span>
                  )
                })}
              </div>
              <p className="mt-4 text-sm text-ink-2">
                <span className="font-semibold text-ink">{deliveries.length} Lieferungen</span> im Beispielmonat – der Rhythmus lässt sich jederzeit ändern.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 7 · Zwei Orte in Weimar
// ---------------------------------------------------------------------------

const MAPS: Record<CafeLocation['id'], { bg: string; line: string; streets: string[]; square?: string }> = {
  roesterei: {
    bg: 'linear-gradient(145deg, #2b1b12, #5b3a29)',
    line: '#e9d8c4',
    streets: ['M-10 58 L410 34', 'M-10 138 L410 158', 'M118 -10 L96 230', 'M262 -10 L292 230', 'M-10 212 L176 92 L410 104', 'M340 -10 L376 230', 'M20 -10 L40 230'],
  },
  espressobar: {
    bg: 'linear-gradient(145deg, #2c3448, #141824)',
    line: '#f6d58e',
    streets: ['M-10 86 Q120 60 200 104 T410 92', 'M40 -10 Q64 120 28 230', 'M150 -10 L168 92 L138 230', 'M262 -10 Q238 110 282 230', 'M200 104 L410 176', 'M-10 168 Q100 152 200 104', 'M330 -10 L360 90'],
    square: 'M176 84 L230 78 L238 122 L182 130 Z',
  },
}

function CafeMap({ cafe }: { cafe: CafeLocation }) {
  const m = MAPS[cafe.id] ?? MAPS.roesterei
  return (
    <div className="absolute inset-0" style={{ background: m.bg }} aria-hidden>
      <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <path d="M-10 190 C 70 150, 150 214, 236 176 S 360 128, 410 156" fill="none" stroke="#7fa0c4" strokeOpacity="0.35" strokeWidth="12" strokeLinecap="round" />
        <path d="M300 20 q40 -10 70 20 q10 40 -30 50 q-50 0 -40 -70Z" fill="#86a980" fillOpacity="0.18" />
        {m.streets.map((d, i) => (
          <path key={d} d={d} fill="none" stroke={m.line} strokeOpacity={i < 2 ? 0.34 : 0.18} strokeWidth={i < 2 ? 5 : 2.5} strokeLinecap="round" />
        ))}
        {m.square ? <path d={m.square} fill={m.line} fillOpacity="0.14" stroke={m.line} strokeOpacity="0.35" /> : null}
        <path d="M200 102 m-40 0 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0" fill="none" stroke={m.line} strokeOpacity="0.25" strokeDasharray="3 6" />
      </svg>
      <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-full">
        <span className="rb-loop absolute bottom-0 left-1/2 size-10 -translate-x-1/2 translate-y-1/2 animate-ping rounded-full bg-accent/40" />
        <svg viewBox="0 0 32 40" className="relative w-8 drop-shadow-[0_6px_10px_rgba(0,0,0,0.4)]">
          <path d="M16 0C7.2 0 0 7 0 15.6 0 27 16 40 16 40s16-13 16-24.4C32 7 24.8 0 16 0Z" fill="#c4702f" />
          <circle cx="16" cy="15" r="6" fill="#1c130e" />
        </svg>
      </div>
    </div>
  )
}

function CafesSection() {
  const cafes = useStore((s) => s.cafes)
  if (!cafes.length) return null
  return (
    <section aria-labelledby="cafes-title" className="py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Unsere Cafés"
          title={<span id="cafes-title">Zwei Orte in Weimar</span>}
          text="Einer mit Röster, einer mit Altstadtblick. Komm vorbei – der Espresso ist schneller gemacht als erklärt."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {cafes.map((c) => (
            <article key={c.id} className="rb-reveal group flex flex-col overflow-hidden rounded-[32px] border border-line bg-surface shadow-soft transition-shadow duration-300 hover:shadow-lift">
              <div className="relative h-60 overflow-hidden sm:h-72">
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
                  <CafeMap cafe={c} />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/25 to-transparent" aria-hidden />
                <OpenBadge cafe={c} tone="onDark" className="absolute top-5 left-5" />
                <div className="absolute inset-x-6 bottom-5 text-white">
                  <h3 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{c.name}</h3>
                  <p className="mt-1 text-[15px] text-white/85">{c.tagline}</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                {c.notice ? (
                  <p className="mb-4 rounded-2xl bg-warning-soft px-4 py-2.5 text-sm font-medium text-warning">{c.notice}</p>
                ) : null}
                <p className="text-[15px] leading-relaxed text-ink-2">{c.description}</p>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-ink-3 uppercase">Adresse</p>
                    <p className="flex gap-2 text-[15px] text-ink">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
                      {c.address}
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-ink-3 uppercase">Öffnungszeiten</p>
                    <dl className="space-y-1 text-[15px]">
                      {compactHours(c.hours).map((r) => (
                        <div key={r.days} className="flex justify-between gap-4">
                          <dt className="text-ink-2">{r.days}</dt>
                          <dd className={cn('tabular', r.time === 'geschlossen' ? 'text-ink-3' : 'font-medium text-ink')}>{r.time}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
                <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Besonderheiten">
                  {c.features.map((f) => (
                    <li key={f} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-ink-2">
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap gap-3 pt-8">
                  <a href={mapsUrl(c.address)} target="_blank" rel="noopener noreferrer" className={siteButtonClass('primary')}>
                    Route planen
                    <ArrowUpRight className="size-4" aria-hidden />
                    <span className="sr-only">(Google Maps, neues Fenster)</span>
                  </a>
                  <Link to="/cafes" className={siteButtonClass('secondary')}>
                    Mehr erfahren
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 8 · Workshops
// ---------------------------------------------------------------------------

function seatsLabel(left: number) {
  if (left <= 0) return { text: 'Ausgebucht', tone: 'bg-surface-2 text-ink-3' }
  if (left <= 2) return { text: left === 1 ? 'Noch 1 Platz' : `Noch ${left} Plätze`, tone: 'bg-warning-soft text-warning' }
  return { text: `Noch ${left} Plätze frei`, tone: 'bg-success-soft text-success' }
}

function WorkshopsTeaser() {
  const workshops = useStore((s) => s.workshops)
  const cafes = useStore((s) => s.cafes)
  const now = useNow()
  const upcoming = useMemo(() => {
    const t = now.getTime()
    const list: { w: Workshop; s: WorkshopSession }[] = []
    for (const w of workshops) for (const s of w.sessions) if (new Date(s.startsAt).getTime() > t) list.push({ w, s })
    return list.sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt)).slice(0, 3)
  }, [workshops, now])
  if (!upcoming.length) return null
  return (
    <section aria-labelledby="workshops-title" className="border-y border-line bg-surface-2/50 py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Workshops"
          title={
            <span id="workshops-title">
              Lern von denen, <em className="font-medium text-accent-text italic">die rösten.</em>
            </span>
          }
          text="Latte Art, Espresso, Filter oder Cupping – in kleinen Gruppen, direkt in unserer Rösterei."
          action={
            <Link to="/workshops" className={siteButtonClass('secondary')}>
              Alle Termine
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        <ul className="grid gap-5 lg:grid-cols-3">
          {upcoming.map(({ w, s }) => {
            const left = w.capacity - s.seatsTaken
            const seats = seatsLabel(left)
            const date = new Date(s.startsAt)
            const place = cafes.find((c) => c.id === w.location)?.name ?? 'Rösterei'
            return (
              <li key={s.id} className="rb-reveal">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-line bg-surface p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: w.color }} aria-hidden />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="tint flex w-16 flex-col items-center rounded-2xl py-2 text-center" style={{ '--c': w.color } as CSSProperties}>
                        <span className="text-[11px] font-bold tracking-widest uppercase">{formatDe(date, 'MMM')}</span>
                        <span className="tabular font-display text-3xl leading-none font-semibold">{formatDe(date, 'd')}</span>
                      </div>
                      <div className="text-sm text-ink-2">
                        <p className="font-semibold text-ink">{formatDe(date, 'EEEE')}</p>
                        <p className="tabular">{formatDe(date, 'HH:mm')} Uhr</p>
                      </div>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', seats.tone)}>{seats.text}</span>
                  </div>
                  <h3 className="mt-6 font-display text-2xl leading-tight font-semibold tracking-tight text-ink">{w.title}</h3>
                  <p className="mt-1 text-[15px] text-ink-2">{w.subtitle}</p>
                  <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5" aria-hidden />
                      {w.durationMin >= 60 ? `${(w.durationMin / 60).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Std.` : `${w.durationMin} Min.`}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" aria-hidden />
                      max. {w.capacity}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden />
                      {place}
                    </span>
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                    <p className="tabular font-display text-2xl font-semibold text-ink">
                      {price(w.price)}
                      <span className="ml-1 font-sans text-xs font-normal text-ink-3">p. P.</span>
                    </p>
                    <Link
                      to="/workshops"
                      className={cn(
                        'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors after:absolute after:inset-0',
                        left > 0 ? 'bg-ink text-canvas group-hover:bg-accent-solid group-hover:text-on-accent' : 'bg-surface-2 text-ink-2',
                      )}
                    >
                      {left > 0 ? 'Platz sichern' : 'Andere Termine'}
                      <span className="sr-only">: {w.title} am {formatDe(date, 'd. MMMM')}</span>
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 9 · Herkunft
// ---------------------------------------------------------------------------

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Sprout, title: 'Die Farm', text: 'Hier entsteht die Qualität: bei Menschen, die Kaffee mit viel Handarbeit anbauen, ernten und aufbereiten.' },
  { icon: Ship, title: 'Kleiner Importeur', text: 'Wir kaufen bei kleinen Importeuren, die direkt bei den Farmen einkaufen und fair bezahlen.' },
  { icon: Flame, title: 'Rösterei Weimar', text: 'In der Richard-Wagner-Straße wird aus Rohkaffee dein Kaffee: geröstet, verkostet, verpackt.' },
]

function OriginTeaser() {
  return (
    <section aria-labelledby="origin-title" className="grain relative overflow-hidden bg-sidebar py-20 text-sidebar-ink md:py-28">
      <div aria-hidden className="pointer-events-none absolute -right-40 -bottom-40 size-[560px] rounded-full bg-[radial-gradient(closest-side,rgb(196_112_47/0.28),transparent)]" />
      <Container className="relative">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-accent uppercase">Herkunft</p>
            <h2 id="origin-title" className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-white md:text-5xl">
              Direkt gehandelt. Fair bezahlt. <em className="font-medium text-accent italic">In Weimar geröstet.</em>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-sidebar-ink/80 md:text-lg">
              Kurze Wege, klare Verhältnisse: So wissen wir, woher jede Bohne kommt – und du auch.
            </p>
          </div>
          <Link to="/herkunft" className={siteButtonClass('light')}>
            Mehr zur Herkunft
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          <span aria-hidden className="absolute top-8 right-[16%] left-[16%] hidden border-t-2 border-dashed border-white/20 md:block" />
          <span aria-hidden className="absolute top-8 bottom-8 left-8 border-l-2 border-dashed border-white/20 md:hidden" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="rb-reveal relative flex gap-5 md:flex-col md:items-center md:text-center">
              <span className="relative flex size-16 shrink-0 items-center justify-center rounded-full bg-sidebar ring-1 ring-white/15">
                <span className="absolute inset-1 rounded-full bg-white/[0.06]" />
                <s.icon className="relative size-7 text-accent" aria-hidden />
                <span className="tabular absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-accent-solid text-[11px] font-bold text-on-accent">{i + 1}</span>
              </span>
              <div>
                <h3 className="font-display text-2xl font-semibold text-white">{s.title}</h3>
                <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-sidebar-ink/75">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 10 · Frisch aus der Rösterei (Posts aus dem Studio-Redaktionsplan)
// ---------------------------------------------------------------------------

function SocialStrip() {
  const posts = useStore((s) => s.posts)
  const latest = useMemo(
    () =>
      posts
        .filter((p) => p.status === 'published')
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
        .slice(0, 6),
    [posts],
  )
  if (!latest.length) return null
  return (
    <section aria-labelledby="social-title" className="py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="@roestbrueder"
          title={<span id="social-title">Frisch aus der Rösterei</span>}
          text={
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="inline-flex size-1.5 rounded-full bg-success" aria-hidden />
              Direkt aus unserem Redaktionsplan
            </span>
          }
          action={
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={siteButtonClass('secondary')}>
              <PlatformIcon platform="instagram" className="size-4" />
              Auf Instagram folgen
              <span className="sr-only">(neues Fenster)</span>
            </a>
          }
        />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
          {latest.map((p) => {
            const platform = p.platforms[0] ?? 'instagram'
            return (
              <li key={p.id} className="rb-reveal">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-3xl focus-visible:outline-offset-4"
                  aria-label={`${p.title} – ${PLATFORM[platform]?.label ?? 'Social Media'} (neues Fenster)`}
                >
                  <MediaThumb url={p.mediaUrl} tone={p.mediaTone} label={p.title} className="aspect-square transition-transform duration-500 group-hover:scale-105">
                    <span className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur">
                      <PlatformIcon platform={platform} className="size-4" />
                    </span>
                    <span className="absolute top-3.5 left-3.5 text-[11px] font-semibold tracking-wide opacity-80">{formatDe(p.scheduledAt, 'd. MMM')}</span>
                    <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
                    <span className="absolute inset-x-0 bottom-0 p-3.5">
                      <span className="line-clamp-3 font-display text-[15px] leading-snug font-semibold text-white drop-shadow-sm">{p.title}</span>
                    </span>
                  </MediaThumb>
                </a>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
