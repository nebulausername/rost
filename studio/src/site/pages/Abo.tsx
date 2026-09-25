import { addBusinessDays } from 'date-fns'
import { ArrowDown, CalendarClock, Check, Coffee, Flame, Gift, Minus, PauseCircle, Plus, ShoppingBag, Sparkles, Truck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { ABO_PRICES, GRINDS, useCart } from '../../lib/cart'
import { useStore } from '../../lib/store'
import type { Grind } from '../../lib/types'
import { cn, formatDe } from '../../lib/utils'
import { CoffeeBag, Container, Eyebrow, SectionHeading, SiteButton } from '../components'
import { deNum } from '../content/guides'
import { prefersReducedMotion, useDocumentTitle } from '../content/hooks'
import { ExampleNote, FaqList, PageHero, Reveal, StepTitle } from '../content/ui'
import { price } from '../lib'

type Amount = 250 | 500 | 1000
type Rhythm = 2 | 4

const AMOUNTS: Amount[] = [250, 500, 1000]
const RHYTHMS: Rhythm[] = [2, 4]
const MIX_BAG = { name: 'Auswahl', subtitle: 'Röster-Auswahl · wechselnd', color: '#8a5634', roast: 3 }

/** Gramm pro Tasse: Espresso ≈ 18 g, sonst (Filter & Co.) ≈ 15 g */
const gramsPerCup = (grind: Grind) => (grind === 'espresso' ? 18 : 15)
const cupsPerDay = (amount: Amount, weeks: Rhythm, grind: Grind) => amount / (weeks * 7) / gramsPerCup(grind)
const fmtCups = (v: number) => deNum(Math.round(v * 10) / 10)

export function AboPage() {
  useDocumentTitle('Kaffee-Abo')
  return (
    <>
      <Hero />
      <Benefits />
      <Configurator />
      <GiftAbo />
      <section aria-labelledby="faq" className="py-20 md:py-28">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>Fragen & Antworten</Eyebrow>
            <h2 id="faq" className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink md:text-5xl">
              Alles, was du übers Abo wissen willst.
            </h2>
            <p className="mt-4 max-w-sm text-ink-2">Noch etwas offen? Schreib uns – über das Kontaktformular auf „Über uns“.</p>
          </div>
          <FaqList items={FAQ} />
        </Container>
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// Hero & Vorteile
// ---------------------------------------------------------------------------

function Hero() {
  const products = useStore((s) => s.products)
  const coffees = useMemo(() => products.filter((p) => p.available && p.kind !== 'gift' && p.kind !== 'voucher').slice(0, 3), [products])
  const labels = ['1. Lieferung', '+ 2 Wochen', '+ 4 Wochen']
  return (
    <PageHero
      eyebrow="Kaffee-Abo"
      title={
        <>
          Frischer Kaffee, der <span className="text-accent-text italic">von selbst</span> kommt.
        </>
      }
      text="Wir rösten, du trinkst. Alle zwei oder vier Wochen landet frisch gerösteter Kaffee aus Weimar in deinem Briefkasten – pausieren oder kündigen kannst du jederzeit."
      aside={
        <div className="grain relative overflow-hidden rounded-[2.5rem] bg-accent-soft px-6 pt-12 pb-8 sm:px-10" aria-hidden>
          <div className="absolute inset-x-10 top-[46%] border-t-2 border-dashed border-accent/40" />
          <div className="relative grid grid-cols-3 items-end gap-4 sm:gap-6">
            {coffees.map((p, i) => (
              <div key={p.id} className="flex flex-col items-center" style={{ transform: `translateY(${(1 - i) * 10}px)` }}>
                <div className="w-full max-w-[140px] transition-transform duration-500 hover:-translate-y-2" style={{ rotate: `${(i - 1) * 5}deg` }}>
                  <CoffeeBag product={p} />
                </div>
                <span className="mt-5 rounded-full bg-surface px-3 py-1 text-xs font-semibold whitespace-nowrap text-ink-2 shadow-soft">{labels[i]}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <a href="#konfigurator" className="inline-flex h-12 items-center gap-2 rounded-full bg-accent-solid px-6 text-[15px] font-semibold text-on-accent shadow-[0_8px_24px_-8px_rgb(165_90_34/0.6)] transition-colors hover:bg-accent-solid-hover">
          Abo zusammenstellen
          <ArrowDown className="size-4" aria-hidden />
        </a>
        <a href="#verschenken" className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-surface px-6 text-[15px] font-semibold text-ink transition-colors hover:border-ink/40">
          <Gift className="size-4" aria-hidden />
          Abo verschenken
        </a>
      </div>
      <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
        {AMOUNTS.map((a) => (
          <div key={a}>
            <dt className="text-xs font-semibold tracking-[0.12em] text-ink-3 uppercase">{a === 1000 ? '1 kg' : `${a} g`}</dt>
            <dd className="tabular font-display text-2xl font-semibold text-ink">
              {price(ABO_PRICES[a])}
              <span className="ml-1 font-sans text-xs font-normal text-ink-3">/ Lieferung</span>
            </dd>
          </div>
        ))}
      </dl>
      <ExampleNote className="mt-3">Beispielpreise · Versand im Abo kostenlos</ExampleNote>
    </PageHero>
  )
}

function Benefits() {
  const items: { icon: ReactNode; title: string; text: string }[] = [
    { icon: <Flame className="size-5" />, title: 'Frisch geröstet', text: 'Wir rösten in kleinen Chargen in Weimar und schicken deinen Kaffee frisch los.' },
    { icon: <PauseCircle className="size-5" />, title: 'Jederzeit pausierbar', text: 'Urlaub, Vorrat, Teepause? Pausieren oder kündigen geht jederzeit.' },
    { icon: <Truck className="size-5" />, title: 'Versandkostenfrei', text: 'Jede Abo-Lieferung kommt ohne Versandkosten zu dir.' },
    { icon: <Sparkles className="size-5" />, title: 'Saisonale Überraschungen', text: 'In der Röster-Auswahl landen auch limitierte Saisonkaffees.' },
  ]
  return (
    <section aria-labelledby="abo-benefits" className="pb-20 md:pb-28">
      <Container>
        <h2 id="abo-benefits" className="sr-only">
          Deine Vorteile im Abo
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <li key={it.title} className="rounded-3xl border border-line bg-surface p-6">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-text" aria-hidden>
                {it.icon}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{it.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{it.text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Konfigurator
// ---------------------------------------------------------------------------

function Configurator() {
  const products = useStore((s) => s.products)
  const add = useCart((s) => s.add)
  const [params] = useSearchParams()
  const coffees = useMemo(() => products.filter((p) => p.available && p.kind !== 'gift' && p.kind !== 'voucher'), [products])

  const [productId, setProductId] = useState<string | null>(() => coffees.find((p) => p.slug === params.get('kaffee'))?.id ?? null)
  const [amount, setAmount] = useState<Amount>(500)
  const [rhythm, setRhythm] = useState<Rhythm>(2)
  const [grind, setGrind] = useState<Grind>('bohne')
  const [wantCups, setWantCups] = useState(2)

  const product = coffees.find((p) => p.id === productId) ?? null
  const perDelivery = ABO_PRICES[amount]
  const deliveriesPerYear = 52 / rhythm
  const cups = cupsPerDay(amount, rhythm, grind)
  const firstDelivery = addBusinessDays(new Date(), 3)

  // Empfehlung aus „Tassen pro Tag“
  const suggestion = useMemo(() => {
    let best: { amount: Amount; rhythm: Rhythm; cups: number } | null = null
    for (const a of AMOUNTS)
      for (const r of RHYTHMS) {
        const c = cupsPerDay(a, r, grind)
        const cand = { amount: a, rhythm: r, cups: c }
        // lieber knapp zu viel als zu wenig
        const score = (x: number) => Math.abs(x - wantCups) + (x < wantCups ? 0.35 : 0)
        if (!best || score(c) < score(best.cups)) best = cand
      }
    return best!
  }, [wantCups, grind])
  const suggestionActive = suggestion.amount === amount && suggestion.rhythm === rhythm

  const submit = () => add({ kind: 'abo', productId, amount, rhythmWeeks: rhythm, grind, qty: 1 })

  // Vom Geschmacksfinder/Produkt kommend (?kaffee=…): direkt zum Konfigurator
  const sectionRef = useRef<HTMLElement>(null)
  const preselected = Boolean(params.get('kaffee'))
  useEffect(() => {
    if (!preselected) return
    const t = window.setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' }), 120)
    return () => window.clearTimeout(t)
  }, [preselected])

  return (
    <section ref={sectionRef} id="konfigurator" aria-labelledby="konfig-title" className="scroll-mt-24 border-y border-line bg-surface-2/60 py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="In vier Schritten"
          title={<span id="konfig-title">Stell dir dein Abo zusammen.</span>}
          text="Kaffee, Menge, Rhythmus, Mahlgrad – fertig. Alles lässt sich später ändern."
        />
        <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-12">
          <div className="space-y-14">
            {/* 1 Kaffee */}
            <fieldset>
              <legend className="contents">
                <StepTitle n={1} title="Welcher Kaffee?" hint="Lass uns wählen – oder bleib bei deinem Liebling." />
              </legend>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <ChoiceCard name="kaffee" checked={productId === null} onSelect={() => setProductId(null)} className="sm:col-span-2 xl:col-span-3">
                  <div className="flex items-center gap-5">
                    <div className="relative flex w-24 shrink-0 justify-center" aria-hidden>
                      <div className="w-14 -rotate-12 opacity-80">
                        <CoffeeBag product={coffees[1] ?? MIX_BAG} />
                      </div>
                      <div className="absolute w-16 rotate-3">
                        <CoffeeBag product={MIX_BAG} />
                      </div>
                    </div>
                    <div>
                      <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">
                        Röster-Auswahl <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-text">wechselnd</span>
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-2">Wir schicken dir, was uns gerade am meisten begeistert – Klassiker und limitierte Saisonkaffees im Wechsel.</p>
                    </div>
                  </div>
                </ChoiceCard>
                {coffees.map((p) => (
                  <ChoiceCard key={p.id} name="kaffee" checked={productId === p.id} onSelect={() => setProductId(p.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 shrink-0" aria-hidden>
                        <CoffeeBag product={p} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-xl font-semibold text-ink">{p.name}</p>
                        <p className="text-sm text-ink-3">{p.subtitle}</p>
                        <p className="mt-1 truncate text-xs text-ink-2">{p.notes.slice(0, 2).join(' · ')}</p>
                      </div>
                    </div>
                  </ChoiceCard>
                ))}
              </div>
            </fieldset>

            {/* 2 Menge */}
            <fieldset>
              <legend className="contents">
                <StepTitle n={2} title="Wie viel pro Lieferung?" />
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {AMOUNTS.map((a) => (
                  <ChoiceCard key={a} name="menge" checked={amount === a} onSelect={() => setAmount(a)}>
                    <p className="font-display text-3xl font-semibold text-ink">{a === 1000 ? '1 kg' : `${a} g`}</p>
                    <p className="tabular mt-3 text-lg font-semibold text-ink">{price(ABO_PRICES[a])}</p>
                    <p className="tabular text-xs text-ink-3">
                      {price((ABO_PRICES[a] / a) * 100)} / 100 g · ≈ {Math.round(a / gramsPerCup(grind))} Tassen
                    </p>
                  </ChoiceCard>
                ))}
              </div>
            </fieldset>

            {/* 3 Rhythmus */}
            <fieldset>
              <legend className="contents">
                <StepTitle n={3} title="Wie oft?" hint={`1 Tasse ≈ ${gramsPerCup(grind)} g ${grind === 'espresso' ? '(Espresso)' : '(Filter & Co.)'}`} />
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {RHYTHMS.map((r) => (
                  <ChoiceCard key={r} name="rhythmus" checked={rhythm === r} onSelect={() => setRhythm(r)}>
                    <p className="font-display text-2xl font-semibold text-ink">alle {r} Wochen</p>
                    <p className="mt-1 text-sm text-ink-3">{r === 2 ? 'Für Viel- & Zu-zweit-Trinker' : 'Für den gemütlichen Morgenkaffee'}</p>
                    <p className="tabular mt-4 text-sm text-ink-2">
                      ≈ <span className="font-semibold text-ink">{fmtCups(cupsPerDay(amount, r, grind))} Tassen</span> pro Tag
                    </p>
                  </ChoiceCard>
                ))}
              </div>
              {/* Tassen-Rechner */}
              <div className="mt-4 flex flex-col gap-4 rounded-3xl border border-dashed border-line-strong p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Coffee className="size-5 shrink-0 text-accent-text" aria-hidden />
                  <p className="text-sm text-ink-2">
                    Unsicher? Du trinkst etwa
                    <span className="mx-2 inline-flex items-center gap-1 align-middle">
                      <button type="button" onClick={() => setWantCups(Math.max(1, wantCups - 1))} className="flex size-11 items-center justify-center rounded-full border border-line bg-surface hover:border-line-strong sm:size-8" aria-label="Weniger Tassen">
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <span className="tabular w-6 text-center font-semibold text-ink" aria-live="polite">
                        {wantCups}
                      </span>
                      <button type="button" onClick={() => setWantCups(Math.min(8, wantCups + 1))} className="flex size-11 items-center justify-center rounded-full border border-line bg-surface hover:border-line-strong sm:size-8" aria-label="Mehr Tassen">
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </span>
                    {wantCups === 1 ? 'Tasse' : 'Tassen'} am Tag.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={suggestionActive}
                  onClick={() => {
                    setAmount(suggestion.amount)
                    setRhythm(suggestion.rhythm)
                  }}
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold text-ink shadow-soft ring-1 ring-line transition-colors hover:ring-line-strong disabled:bg-success-soft disabled:text-success disabled:ring-0"
                >
                  {suggestionActive ? <Check className="size-4" aria-hidden /> : null}
                  {suggestion.amount === 1000 ? '1 kg' : `${suggestion.amount} g`} alle {suggestion.rhythm} Wochen
                  {suggestionActive ? ' passt' : ' übernehmen'}
                </button>
              </div>
            </fieldset>

            {/* 4 Mahlgrad */}
            <fieldset>
              <legend className="contents">
                <StepTitle n={4} title="Bohne oder gemahlen?" hint="Ganze Bohne bleibt am längsten frisch – wenn du eine Mühle hast." />
              </legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GRINDS) as Grind[]).map((g) => (
                  <label
                    key={g}
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-2 transition-colors hover:border-line-strong has-checked:border-accent has-checked:bg-accent-soft has-checked:text-ink has-focus-visible:ring-2 has-focus-visible:ring-accent"
                  >
                    <input type="radio" name="mahlgrad" className="sr-only" checked={grind === g} onChange={() => setGrind(g)} />
                    {grind === g ? <Check className="size-4 text-accent-text" aria-hidden /> : null}
                    {GRINDS[g]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Zusammenfassung */}
          <aside aria-labelledby="summary-title" className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-lift">
              <div className="grain relative flex items-center gap-5 bg-sidebar p-6 text-sidebar-ink">
                <div className="w-20 shrink-0 -rotate-6" aria-hidden>
                  <CoffeeBag product={product ?? MIX_BAG} size={amount === 1000 ? '1 kg' : `${amount} g`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-sidebar-muted uppercase">Dein Abo</p>
                  <h3 id="summary-title" className="mt-1 font-display text-2xl leading-tight font-semibold">
                    {product ? product.name : 'Röster-Auswahl'}
                  </h3>
                  <p className="text-sm text-sidebar-muted">{product ? product.subtitle : 'wechselnd'}</p>
                </div>
              </div>
              <div className="p-6">
                <dl className="space-y-2.5 text-sm">
                  <SummaryRow label="Menge" value={amount === 1000 ? '1 kg' : `${amount} g`} />
                  <SummaryRow label="Rhythmus" value={`alle ${rhythm} Wochen`} />
                  <SummaryRow label="Mahlgrad" value={GRINDS[grind]} />
                  <SummaryRow label="Reicht für" value={`≈ ${fmtCups(cups)} Tassen/Tag`} />
                  <SummaryRow label="Versand" value={<span className="font-semibold text-success">kostenlos</span>} />
                </dl>
                <div className="mt-5 flex items-end justify-between border-t border-line pt-5">
                  <div>
                    <p className="text-xs text-ink-3">pro Lieferung</p>
                    <p className="tabular font-display text-4xl font-semibold text-ink">{price(perDelivery)}</p>
                  </div>
                  <p className="tabular pb-1 text-right text-xs leading-relaxed text-ink-3">
                    {price((perDelivery / amount) * 100)} / 100 g
                    <br />≈ {price(perDelivery * deliveriesPerYear)} im Jahr
                  </p>
                </div>
                <p className="mt-4 flex items-start gap-2 rounded-2xl bg-surface-2 px-3.5 py-3 text-xs leading-relaxed text-ink-2">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
                  <span>
                    Erste Lieferung voraussichtlich <span className="font-semibold text-ink">{formatDe(firstDelivery, 'EEEE, d. MMMM')}</span>, danach alle {rhythm} Wochen · {deliveriesPerYear} Lieferungen bzw. {deNum((amount * deliveriesPerYear) / 1000)} kg im Jahr.
                  </span>
                </p>
                <SiteButton onClick={submit} className="mt-5 w-full">
                  <ShoppingBag className="size-4" aria-hidden />
                  Abo in den Warenkorb
                </SiteButton>
                <p className="mt-3 text-center text-xs text-ink-3">Jederzeit pausierbar & kündbar · Beispielpreise</p>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  )
}

function ChoiceCard({ name, checked, onSelect, children, className }: { name: string; checked: boolean; onSelect: () => void; children: ReactNode; className?: string }) {
  return (
    <label
      className={cn(
        'relative block cursor-pointer rounded-3xl border bg-surface p-5 transition-[border-color,box-shadow,transform] duration-200 has-focus-visible:ring-2 has-focus-visible:ring-accent has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-canvas',
        checked ? 'border-accent shadow-lift ring-1 ring-accent' : 'border-line shadow-soft hover:-translate-y-0.5 hover:border-line-strong',
        className,
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      <span
        className={cn('absolute top-4 right-4 flex size-6 items-center justify-center rounded-full border transition-colors', checked ? 'border-accent bg-accent-solid text-on-accent' : 'border-line-strong')}
        aria-hidden
      >
        {checked ? <Check className="size-3.5" /> : null}
      </span>
      {children}
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Abo verschenken
// ---------------------------------------------------------------------------

function GiftAbo() {
  const add = useCart((s) => s.add)
  const [amount, setAmount] = useState<250 | 500>(250)
  const [perMonth, setPerMonth] = useState<1 | 2>(1)
  const plans = [
    { months: 3, title: 'Reinschnuppern', text: 'Drei Monate lang frischer Kaffee – perfekt zum Kennenlernen.' },
    { months: 6, title: 'Ein halbes Jahr', text: 'Von Herbst bis Frühling (oder umgekehrt) versorgt.' },
    { months: 12, title: 'Das große Geschenk', text: 'Ein ganzes Jahr Röstbrüder. Mehr Liebe geht kaum.' },
  ]
  const value = (months: number) => Math.round(months * perMonth * ABO_PRICES[amount] * 100) / 100

  return (
    <section id="verschenken" aria-labelledby="gift-title" className="scroll-mt-24 py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Abo verschenken"
          title={<span id="gift-title">Kaffee, der immer wieder Danke sagt.</span>}
          text="Du verschenkst einen Gutschein im Wert des Abos. Die beschenkte Person wählt Kaffee & Mahlgrad selbst – du musst nicht raten."
        />
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Toggle label="Menge pro Lieferung" value={amount} options={[{ v: 250, l: '250 g' }, { v: 500, l: '500 g' }]} onChange={(v) => setAmount(v as 250 | 500)} />
          <Toggle label="Lieferungen pro Monat" value={perMonth} options={[{ v: 1, l: '1× im Monat' }, { v: 2, l: '2× im Monat' }]} onChange={(v) => setPerMonth(v as 1 | 2)} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.months}>
              <article
                className={cn(
                  'relative flex h-full flex-col overflow-hidden rounded-[2rem] p-7',
                  i === 2 ? 'grain bg-sidebar text-sidebar-ink' : 'border border-line bg-surface text-ink',
                )}
              >
                <Gift className={cn('size-6', i === 2 ? 'text-accent' : 'text-accent-text')} aria-hidden />
                <p className={cn('mt-6 text-xs font-semibold tracking-[0.16em] uppercase', i === 2 ? 'text-sidebar-muted' : 'text-ink-3')}>{p.title}</p>
                <h3 className="mt-1 font-display text-4xl font-semibold">{p.months} Monate</h3>
                <p className={cn('mt-3 text-[15px] leading-relaxed', i === 2 ? 'text-sidebar-muted' : 'text-ink-2')}>{p.text}</p>
                <div className={cn('mt-6 border-t pt-5', i === 2 ? 'border-white/10' : 'border-line')}>
                  <p className="tabular font-display text-3xl font-semibold">{price(value(p.months))}</p>
                  <p className={cn('tabular mt-1 text-xs', i === 2 ? 'text-sidebar-muted' : 'text-ink-3')}>
                    {p.months * perMonth} Lieferungen à {amount} g · {price(ABO_PRICES[amount])} pro Lieferung
                  </p>
                </div>
                <SiteButton
                  variant={i === 2 ? 'primary' : 'secondary'}
                  className="mt-6 w-full"
                  onClick={() => add({ kind: 'voucher', value: value(p.months), qty: 1 })}
                >
                  Als Gutschein in den Warenkorb
                </SiteButton>
              </article>
            </Reveal>
          ))}
        </div>
        <ExampleNote className="mt-5">Gutschein per E-Mail, 3 Jahre gültig. Beispielpreise.</ExampleNote>
      </Container>
    </section>
  )
}

function Toggle({ label, value, options, onChange }: { label: string; value: number; options: { v: number; l: string }[]; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn('h-11 rounded-full px-4 text-sm font-semibold transition-colors sm:h-9', value === o.v ? 'bg-sidebar text-sidebar-ink' : 'text-ink-3 hover:text-ink')}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

const FAQ = [
  {
    q: 'Kann ich mein Abo pausieren?',
    a: 'Ja, jederzeit und so oft du willst. Urlaub, noch Vorrat im Schrank oder einfach Lust auf eine Pause – kurze Nachricht genügt, und wir setzen aus, bis du wieder Kaffee willst.',
  },
  {
    q: 'Wie kündige ich?',
    a: 'Jederzeit, ohne Mindestlaufzeit und ohne Begründung. Lieferungen, die schon geröstet und unterwegs sind, kommen noch bei dir an – danach ist Schluss.',
  },
  {
    q: 'Was kostet der Versand?',
    a: 'Nichts. Jede Abo-Lieferung ist bei uns versandkostenfrei – egal ob 250 g oder 1 kg.',
  },
  {
    q: 'Kann ich Mahlgrad, Menge oder Kaffee ändern?',
    a: 'Klar. Neue Mühle, neue Zubereitung, neuer Lieblingskaffee: Sag uns vor der nächsten Röstung Bescheid, dann passen wir alles an.',
  },
  {
    q: 'Was bekomme ich bei der Röster-Auswahl?',
    a: 'Das, was uns gerade am meisten begeistert: mal einer unserer Klassiker, mal ein limitierter Saisonkaffee. Wenn du etwas gar nicht magst (z. B. sehr fruchtige Kaffees), sag es uns einfach.',
  },
  {
    q: 'Wie lagere ich den Kaffee am besten?',
    a: 'Luftdicht, dunkel und bei Zimmertemperatur – also nicht im Kühlschrank. In der verschlossenen Tüte mit Aroma-Ventil ist er gut aufgehoben. Gemahlener Kaffee verliert schneller Aroma als ganze Bohnen.',
  },
]
