import { ArrowLeft, ArrowRight, Check, CornerDownLeft, Link2, Mail, Repeat, RotateCcw, ShoppingBag, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { GRINDS, useCart } from '../../lib/cart'
import { toast, useStore } from '../../lib/store'
import type { Product } from '../../lib/types'
import { cn } from '../../lib/utils'
import { CoffeeBag, Container, Eyebrow, NoteChips, SiteButton, siteButtonClass, TasteBars } from '../components'
import { useDocumentTitle, useEnterAnimation } from '../content/hooks'
import { BrewIcon, type BrewIconName } from '../content/icons'
import { BREW_TO_GRIND, optionLabel, parseAnswers, QUESTIONS, rankProducts, reasonsFor, toAnswers, type Answers, type Match } from '../content/taste'
import { price } from '../lib'

const INTRO = -1

export function TasteFinderPage() {
  const [params, setParams] = useSearchParams()
  const fromUrl = useMemo(() => toAnswers(parseAnswers(params.get('a'))), [params])
  useDocumentTitle(fromUrl ? 'Dein Kaffee-Match' : 'Geschmacksfinder')

  // Entwurf des Quiz – das fertige Ergebnis lebt in der URL (?a=…), damit es teilbar ist.
  const [answers, setAnswers] = useState<string[]>(() => parseAnswers(params.get('a')))
  const [step, setStep] = useState(INTRO)
  const [dir, setDir] = useState<1 | -1>(1)
  const [picked, setPicked] = useState<string | null>(null)
  const lock = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)

  const scrollStageIntoView = () => {
    const el = stageRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top
    if (top < 0) window.scrollTo({ top: window.scrollY + top - 88 })
  }

  const go = (next: number, direction: 1 | -1) => {
    setDir(direction)
    setStep(next)
    setPicked(null)
    requestAnimationFrame(scrollStageIntoView)
  }

  const choose = (qIndex: number, id: string) => {
    if (lock.current) return
    lock.current = true
    const next = [...answers]
    next[qIndex] = id
    setAnswers(next)
    setPicked(id)
    window.setTimeout(() => {
      lock.current = false
      if (qIndex === QUESTIONS.length - 1) {
        setPicked(null)
        setDir(1)
        // Zurück aus dem Ergebnis landet auf dem Intro („Weiter geht’s“) – die Antworten bleiben vorausgewählt
        setStep(INTRO)
        setParams({ a: next.slice(0, QUESTIONS.length).join('-') })
        requestAnimationFrame(() => window.scrollTo({ top: 0 }))
      } else go(qIndex + 1, 1)
    }, 260)
  }

  const restart = () => {
    setAnswers([])
    setParams({})
    go(INTRO, -1)
  }

  const edit = () => {
    if (fromUrl) setAnswers([fromUrl.brew, fromUrl.milk, fromUrl.flavor, fromUrl.strength, fromUrl.acid])
    setParams({})
    go(0, -1)
  }

  // Tastatur: 1–5 wählt, Enter startet/weiter, ← zurück
  useEffect(() => {
    if (fromUrl) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (step === INTRO) {
        if (e.key === 'Enter' && !(t && t.tagName === 'BUTTON')) {
          e.preventDefault()
          go(0, 1)
        }
        return
      }
      const q = QUESTIONS[step]
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= q.options.length) {
        e.preventDefault()
        choose(step, q.options[n - 1].id)
      } else if ((e.key === 'Enter' || e.key === 'ArrowRight') && answers[step] && !(t && t.tagName === 'BUTTON' && e.key === 'Enter')) {
        e.preventDefault()
        choose(step, answers[step])
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault()
        go(step - 1 < 0 ? INTRO : step - 1, -1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(60%_60%_at_70%_0%,var(--accent-soft),transparent_70%)]"
      />
      <Container className="py-10 md:py-16">
        <div ref={stageRef} className="scroll-mt-24">
          {fromUrl ? (
            <Result answers={fromUrl} onRestart={restart} onEdit={edit} />
          ) : step === INTRO ? (
            <Intro onStart={() => go(0, 1)} hasDraft={answers.length > 0} />
          ) : (
            <Question step={step} dir={dir} answer={answers[step]} picked={picked} onChoose={(id) => choose(step, id)} onBack={() => go(step - 1 < 0 ? INTRO : step - 1, -1)} onRestart={restart} />
          )}
        </div>
      </Container>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Intro
// ---------------------------------------------------------------------------

function Intro({ onStart, hasDraft }: { onStart: () => void; hasDraft: boolean }) {
  const products = useStore((s) => s.products)
  const coffees = useMemo(() => products.filter((p) => p.available && p.kind !== 'gift' && p.kind !== 'voucher').slice(0, 4), [products])
  const ref = useRef<HTMLDivElement>(null)
  useEnterAnimation(ref, 'intro', -1)
  return (
    <div ref={ref} className="grid min-h-[62vh] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        <Eyebrow className="mb-5">Geschmacksfinder</Eyebrow>
        <h1 className="font-display text-[2.75rem] leading-[0.98] font-semibold tracking-tight text-ink sm:text-6xl lg:text-7xl">
          Welcher Kaffee <span className="text-accent-text italic">passt</span> zu dir?
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2 md:text-xl">
          Fünf Fragen, eine Minute, ein Kaffee mit Namen. Wir gleichen deine Antworten mit dem Geschmacksprofil jeder Sorte ab – ganz ohne Fachchinesisch.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <SiteButton onClick={onStart} className="h-14 px-8 text-base">
            {hasDraft ? 'Weiter geht’s' : 'Los geht’s'}
            <ArrowRight className="size-5" aria-hidden />
          </SiteButton>
          <span className="hidden items-center gap-2 text-sm text-ink-3 sm:inline-flex">
            oder
            <kbd className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-surface px-2 text-xs font-semibold text-ink-2">
              Enter <CornerDownLeft className="size-3" aria-hidden />
            </kbd>
          </span>
        </div>
        <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-3">
          {['5 Fragen', 'Ergebnis teilbar', 'Direkt bestellen oder als Abo'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="size-4 text-accent-text" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative mx-auto flex w-full max-w-lg items-end justify-center pt-6" aria-hidden>
        <div className="absolute inset-x-6 bottom-2 h-10 rounded-[50%] bg-roast/15 blur-xl" />
        {coffees.map((p, i) => {
          const mid = (coffees.length - 1) / 2
          const off = i - mid
          return (
            <div
              key={p.id}
              className="relative -mx-3 w-[30%] max-w-[190px] sm:w-[36%] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:z-10 hover:-translate-y-4 sm:-mx-5"
              style={{ transform: `translateY(${Math.abs(off) * 18}px) rotate(${off * 9}deg)`, zIndex: 10 - Math.round(Math.abs(off) * 2) }}
            >
              <CoffeeBag product={p} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Frage
// ---------------------------------------------------------------------------

function Question({
  step,
  dir,
  answer,
  picked,
  onChoose,
  onBack,
  onRestart,
}: {
  step: number
  dir: 1 | -1
  answer: string | undefined
  picked: string | null
  onChoose: (id: string) => void
  onBack: () => void
  onRestart: () => void
}) {
  const q = QUESTIONS[step]
  const ref = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEnterAnimation(ref, step, dir)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  const cols =
    q.options.length === 5 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' : q.options.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="sr-only">Geschmacksfinder</h1>
      {/* Kopfzeile: zurück · Fortschritt · neu */}
      <div className="flex items-center gap-3 sm:gap-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Zurück</span>
          <span className="sr-only sm:hidden">Zurück</span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-baseline justify-between text-xs font-semibold text-ink-3">
            <span className="tabular">
              Frage {step + 1} von {QUESTIONS.length}
            </span>
            <span className="hidden sm:inline">{q.short}</span>
          </div>
          <div
            className="flex gap-1.5"
            role="progressbar"
            aria-label="Fortschritt"
            aria-valuemin={0}
            aria-valuemax={QUESTIONS.length}
            aria-valuenow={step}
            aria-valuetext={`Frage ${step + 1} von ${QUESTIONS.length}`}
          >
            {QUESTIONS.map((qq, i) => (
              <span key={qq.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                  style={{ width: i < step ? '100%' : i === step ? (picked ? '100%' : '35%') : '0%' }}
                />
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          title="Neu starten"
        >
          <RotateCcw className="size-4" aria-hidden />
          <span className="sr-only">Neu starten</span>
        </button>
      </div>

      <div ref={ref} className="pt-10 md:pt-14">
        <p className="text-sm font-medium text-accent-text">{q.kicker}</p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-2 font-display text-4xl leading-[1.02] font-semibold tracking-tight text-ink outline-none sm:text-5xl md:text-6xl">
          {q.title}
        </h2>

        <div role="group" aria-label={q.title} className={cn('mt-8 grid gap-3 md:mt-12 md:gap-4', cols)}>
          {q.options.map((o, i) => {
            const selected = (picked ?? answer) === o.id
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onChoose(o.id)}
                aria-pressed={selected}
                aria-keyshortcuts={String(i + 1)}
                className={cn(
                  'group relative flex min-h-40 flex-col items-start rounded-3xl border p-4 text-left transition-[transform,box-shadow,border-color,background-color] duration-200 active:scale-[0.98] sm:p-5 md:min-h-52',
                  selected
                    ? 'border-accent bg-accent-soft shadow-lift'
                    : 'border-line bg-surface shadow-soft hover:-translate-y-1 hover:border-line-strong hover:shadow-lift',
                  q.options.length === 5 && i === 4 && 'col-span-2 md:col-span-1',
                )}
              >
                <span
                  className={cn(
                    'absolute top-3.5 right-3.5 flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular transition-colors',
                    selected ? 'bg-accent-solid text-on-accent' : 'border border-line text-ink-3 group-hover:border-line-strong',
                  )}
                  aria-hidden
                >
                  {selected ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn('text-ink transition-transform duration-300', selected ? 'scale-110' : 'group-hover:-rotate-3')}>
                  <OptionArt id={o.id} />
                </span>
                <span className="mt-auto pt-4 text-base leading-snug font-semibold text-ink sm:text-lg">{o.label}</span>
                <span className="mt-1 text-[13px] leading-snug text-ink-3 sm:text-sm">{o.hint}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-6 hidden text-center text-xs text-ink-3 md:block">
          Tipp: Tasten <kbd className="font-semibold text-ink-2">1–{q.options.length}</kbd> wählen, <kbd className="font-semibold text-ink-2">←</kbd> geht zurück.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ergebnis
// ---------------------------------------------------------------------------

function Result({ answers, onRestart, onEdit }: { answers: Answers; onRestart: () => void; onEdit: () => void }) {
  const products = useStore((s) => s.products)
  const subscribe = useStore((s) => s.subscribe)
  const add = useCart((s) => s.add)
  const ranking = useMemo(() => rankProducts(products, answers), [products, answers])
  const grind = BREW_TO_GRIND[answers.brew]
  const ref = useRef<HTMLDivElement>(null)
  useEnterAnimation(ref, 'result', 1)

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  if (!ranking.length) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="font-display text-4xl font-semibold text-ink">Gerade ist alles ausgetrunken.</h1>
        <p className="mt-3 text-ink-2">Im Moment ist kein Kaffee verfügbar. Schau bald wieder vorbei – oder stöber im Shop.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/shop" className={siteButtonClass('primary')}>
            Zum Shop
          </Link>
          <SiteButton variant="secondary" onClick={onRestart}>
            Neu starten
          </SiteButton>
        </div>
      </div>
    )
  }

  const top = ranking[0]
  const p = top.product
  const reasons = reasonsFor(p, answers, top.brewFit)
  const runners = ranking.slice(1, 3)

  const addToCart = (prod: Product) => add({ kind: 'product', productId: prod.id, size: '250', grind, qty: 1 })

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: `Mein Röstbrüder-Match: ${p.name}`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast({ title: 'Link kopiert', description: 'Schick ihn rum – dein Ergebnis steckt im Link.', tone: 'success' })
    } catch {
      toast({ title: 'Link konnte nicht kopiert werden', description: url })
    }
  }

  const onMail = (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      toast({ title: 'Bitte prüf deine E-Mail-Adresse', tone: 'danger' })
      return
    }
    const fresh = subscribe(email, 'Geschmacksfinder')
    setSent(true)
    toast(
      fresh
        ? { title: 'Ist unterwegs!', description: `Dein Match „${p.name}“ kommt per Mail (im Prototyp landet die Adresse im Studio).`, tone: 'success' }
        : { title: 'Du bist schon dabei', description: 'Diese Adresse steht bereits auf unserer Liste.' },
    )
  }

  return (
    <div ref={ref} className="mx-auto max-w-6xl">
      {/* Top-Match */}
      <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <div
          className="grain relative overflow-hidden rounded-[2rem] px-8 pt-16 pb-10 sm:px-14"
          style={{ backgroundColor: `color-mix(in oklab, ${p.color} 26%, var(--surface-2))` }}
        >
          <div className="absolute top-5 left-5">
            <MatchRing value={top.score} />
          </div>
          <div className="mx-auto max-w-[300px] -rotate-3 transition-transform duration-500 hover:rotate-0">
            <CoffeeBag product={p} />
          </div>
        </div>

        <div>
          <Eyebrow>Dein Match</Eyebrow>
          <h1 className="mt-3 font-display text-5xl leading-[0.95] font-semibold tracking-tight text-ink sm:text-6xl md:text-7xl">{p.name}</h1>
          <p className="mt-2 text-lg font-medium text-ink-2">{p.subtitle}</p>
          <p className="mt-4 max-w-xl leading-relaxed text-ink-2">{p.description}</p>

          <h2 className="mt-8 text-xs font-semibold tracking-[0.18em] text-ink-3 uppercase">Warum er zu dir passt</h2>
          <ol className="mt-3 space-y-3">
            {reasons.map((r, i) => (
              <li key={r} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                <span className="tabular mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-text">{i + 1}</span>
                {r}
              </li>
            ))}
          </ol>

          <NoteChips notes={p.notes} className="mt-6" />

          <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p className="tabular font-display text-4xl font-semibold text-ink">{price(p.price)}</p>
            <p className="pb-1 text-sm text-ink-3">
              250 g · gemahlen für <span className="font-medium text-ink-2">{GRINDS[grind]}</span>
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <SiteButton onClick={() => addToCart(p)}>
              <ShoppingBag className="size-4" aria-hidden />
              In den Warenkorb
            </SiteButton>
            <Link to={`/abo?kaffee=${p.slug}`} className={siteButtonClass('secondary')}>
              <Repeat className="size-4" aria-hidden />
              Als Abo erhalten
            </Link>
            <Link to={`/shop/${p.slug}`} className={cn(siteButtonClass('ghost'), 'px-3')}>
              Mehr über {p.name}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      {/* Zweite & dritte Wahl */}
      {runners.length ? (
        <section aria-labelledby="runners" className="mt-20">
          <h2 id="runners" className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Auch spannend für dich
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {runners.map((m) => (
              <RunnerUp key={m.product.id} match={m} onAdd={() => addToCart(m.product)} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Profil, Teilen, Mail */}
      <div className="mt-16 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section aria-labelledby="profil" className="rounded-3xl border border-line bg-surface p-6 md:p-8">
          <h2 id="profil" className="font-display text-2xl font-semibold text-ink">
            Dein Profil
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {QUESTIONS.map((q, i) => (
              <li key={q.key} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm">
                <span className="text-ink-3">{q.short}: </span>
                <span className="font-medium text-ink">{optionLabel(i, answers[q.key])}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-ink-3 uppercase">Geschmacksprofil {p.name}</p>
              <TasteBars taste={p.taste} />
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            <SiteButton variant="secondary" onClick={onEdit} className="h-10 px-4 text-sm">
              <SlidersHorizontal className="size-4" aria-hidden />
              Antworten ändern
            </SiteButton>
            <SiteButton variant="secondary" onClick={share} className="h-10 px-4 text-sm">
              <Link2 className="size-4" aria-hidden />
              Ergebnis teilen
            </SiteButton>
            <SiteButton variant="ghost" onClick={onRestart} className="h-10 px-4 text-sm">
              <RotateCcw className="size-4" aria-hidden />
              Neu starten
            </SiteButton>
          </div>
        </section>

        <section aria-labelledby="mail" className="grain relative overflow-hidden rounded-3xl bg-sidebar p-6 text-sidebar-ink md:p-8">
          <Mail className="size-7 text-accent" aria-hidden />
          <h2 id="mail" className="mt-4 font-display text-2xl font-semibold">
            Ergebnis per Mail
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-sidebar-muted">
            Wir schicken dir dein Match mit Brühtipps – und ab und zu Neues aus der Rösterei. Abmelden geht jederzeit.
          </p>
          {sent ? (
            <p className="mt-6 flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium" role="status">
              <Check className="size-4 text-accent" aria-hidden />
              Eingetragen – danke!
            </p>
          ) : (
            <form onSubmit={onMail} className="mt-6 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="tf-mail" className="sr-only">
                E-Mail-Adresse
              </label>
              <input
                id="tf-mail"
                type="email"
                required
                autoComplete="email"
                placeholder="deine@mail.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-5 text-[15px] text-white placeholder:text-white/45 focus:border-accent focus:ring-2 focus:ring-accent/40 focus:outline-none"
              />
              <button type="submit" className={siteButtonClass('primary')}>
                Schicken
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}

function RunnerUp({ match, onAdd }: { match: Match; onAdd: () => void }) {
  const p = match.product
  return (
    <article className="group relative flex items-center gap-5 rounded-3xl border border-line bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift sm:gap-6 sm:p-6">
      <div className="w-24 shrink-0 transition-transform duration-500 group-hover:-rotate-3 sm:w-28">
        <CoffeeBag product={p} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="tabular text-xs font-semibold text-accent-text">{match.score} % Match</p>
        <h3 className="mt-1 font-display text-2xl font-semibold text-ink">
          <Link to={`/shop/${p.slug}`} className="after:absolute after:inset-0 after:rounded-3xl hover:text-accent-text">
            {p.name}
          </Link>
        </h3>
        <p className="text-sm text-ink-3">{p.subtitle}</p>
        <NoteChips notes={p.notes} className="mt-3" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="tabular font-semibold text-ink">{price(p.price)}</span>
          <button
            type="button"
            onClick={onAdd}
            className="relative z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-2 whitespace-nowrap px-3.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-solid hover:text-on-accent"
          >
            <ShoppingBag className="size-4" aria-hidden />
            <span>
              In den Warenkorb<span className="sr-only">: {p.name}</span>
            </span>
          </button>
        </div>
      </div>
    </article>
  )
}

function MatchRing({ value }: { value: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const t = requestAnimationFrame(() => setV(value))
    return () => cancelAnimationFrame(t)
  }, [value])
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-24 rounded-full bg-surface/90 shadow-lift backdrop-blur" role="img" aria-label={`${value} Prozent Übereinstimmung`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.2,0.8,0.2,1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="tabular font-display text-2xl leading-none font-semibold text-ink">{value}%</span>
        <span className="mt-0.5 text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">Match</span>
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Illustrationen für die Antwortkarten
// ---------------------------------------------------------------------------

const BREW_ICON: Record<string, BrewIconName> = { espresso: 'espresso', filter: 'v60', french: 'french', moka: 'moka', vollautomat: 'vollautomat' }
const CREAM = '#f6ecdf'
const DARK = '#2b1b12'

function Art({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-16 md:size-20" aria-hidden>
      {children}
    </svg>
  )
}

function Bean({ x, y, filled }: { x: number; y: number; filled: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-24)`}>
      <ellipse cx="0" cy="0" rx="7" ry="10.5" fill={filled ? 'var(--roast)' : 'none'} />
      <path d="M0-9c-3 4 3 7 0 9s3 6 0 9" stroke={filled ? 'var(--canvas)' : 'currentColor'} strokeWidth={1.6} />
    </g>
  )
}

function wave(amp: number, freq: number) {
  let d = ''
  for (let x = 6; x <= 58; x += 1) {
    const y = 34 + amp * Math.sin(((x - 6) / 52) * Math.PI * 2 * freq)
    d += `${x === 6 ? 'M' : 'L'}${x} ${y.toFixed(2)}`
  }
  return d
}

function OptionArt({ id }: { id: string }) {
  if (BREW_ICON[id]) return <BrewIcon name={BREW_ICON[id]} className="size-16 md:size-20" />
  switch (id) {
    case 'milch':
    case 'beides':
    case 'schwarz':
      return (
        <Art>
          <circle cx="30" cy="34" r="24" strokeOpacity={0.35} />
          <path d="M46 29h6a3.5 3.5 0 0 1 0 9h-6" />
          <circle cx="30" cy="34" r="16" />
          <circle cx="30" cy="34" r="13" fill={id === 'schwarz' ? DARK : 'var(--accent)'} fillOpacity={id === 'schwarz' ? 0.9 : 0.45} stroke="none" />
          {id === 'milch' ? (
            <path d="M30 42.5c-7-4.5-9-8.5-7-11.5 1.8-2.6 5.4-2.2 7 .8 1.6-3 5.2-3.4 7-.8 2 3 0 7-7 11.5Z" fill={CREAM} stroke="none" />
          ) : null}
          {id === 'beides' ? <path d="M30 21a13 13 0 0 0 0 26Z" fill={CREAM} stroke="none" /> : null}
          {id === 'schwarz' ? <path d="M23 29a9 9 0 0 1 6-4" stroke={CREAM} strokeOpacity={0.6} /> : null}
        </Art>
      )
    case 'schoko':
      return (
        <Art>
          <g transform="rotate(-12 28 32)">
            <rect x="12" y="10" width="30" height="42" rx="3" fill="#5b3a29" fillOpacity={0.9} />
            <path d="M22 10v42M32 10v42M12 24h30M12 38h30" stroke={CREAM} strokeOpacity={0.35} />
            <rect x="12" y="10" width="30" height="42" rx="3" />
          </g>
          <path d="M49 36c5 0 8 4.5 8 9.5S53 55 49 55s-8-4.5-8-9.5 3-9.5 8-9.5Z" fill="var(--accent)" fillOpacity={0.5} />
          <path d="M41.5 43c2.5-3 12.5-3 15 0" />
        </Art>
      )
    case 'frucht':
      return (
        <Art>
          <circle cx="24" cy="38" r="16" fill="#f0c94f" fillOpacity={0.55} />
          <circle cx="24" cy="38" r="11.5" strokeOpacity={0.5} />
          <path d="M24 38V26.5M24 38l10 5.8M24 38l-10 5.8M24 38l10-5.8M24 38l-10-5.8M24 38v11.5" strokeOpacity={0.5} strokeWidth={1.5} />
          <circle cx="24" cy="38" r="16" />
          <circle cx="46" cy="18" r="6.5" fill="#b23a48" fillOpacity={0.8} />
          <circle cx="53" cy="27" r="5.5" fill="#b23a48" fillOpacity={0.8} />
          <circle cx="43" cy="28.5" r="5.5" fill="#b23a48" fillOpacity={0.8} />
          <path d="M46 11.5c1-3 4-5 7.5-5" />
        </Art>
      )
    case 'karamell':
      return (
        <Art>
          <path d="M8 8 26 26" strokeWidth={3.2} />
          <g transform="rotate(45 38 38)">
            <rect x="27" y="28" width="22" height="20" rx="7" fill="#d9a441" fillOpacity={0.6} />
            <rect x="27" y="28" width="22" height="20" rx="7" />
            <path d="M27 34.5h22M27 41.5h22" strokeOpacity={0.55} />
          </g>
          <path d="M46 50c0 3-2 5-2 7a2 2 0 0 0 4 0c0-2-2-4-2-7Z" fill="#d9a441" />
        </Art>
      )
    case 'egal':
      return (
        <Art>
          <g transform="rotate(-10 27 37)">
            <rect x="11" y="21" width="32" height="32" rx="7" fill="var(--surface-2)" />
            <circle cx="20" cy="30" r="2.6" fill="currentColor" stroke="none" />
            <circle cx="27" cy="37" r="2.6" fill="currentColor" stroke="none" />
            <circle cx="34" cy="44" r="2.6" fill="currentColor" stroke="none" />
          </g>
          <path d="M48 6l2.6 6.4L57 15l-6.4 2.6L48 24l-2.6-6.4L39 15l6.4-2.6Z" fill="var(--accent)" stroke="none" />
          <path d="M55 30l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2Z" fill="var(--accent)" stroke="none" />
        </Art>
      )
    case 'sanft':
    case 'ausgewogen':
    case 'kraeftig': {
      const n = { sanft: 1, ausgewogen: 2, kraeftig: 3 }[id]
      return (
        <Art>
          <Bean x={13} y={34} filled={n >= 1} />
          <Bean x={32} y={30} filled={n >= 2} />
          <Bean x={51} y={34} filled={n >= 3} />
        </Art>
      )
    }
    case 'wenig':
    case 'etwas':
    case 'lebendig': {
      const [amp, freq] = { wenig: [2.5, 1], etwas: [7, 1.5], lebendig: [13, 2.5] }[id] as [number, number]
      return (
        <Art>
          <path d="M6 34h52" strokeOpacity={0.25} strokeDasharray="2 3" />
          <path d={wave(amp, freq)} stroke="var(--accent)" strokeWidth={3} />
          {id === 'lebendig' ? <path d="M52 8l1.5 3.5L57 13l-3.5 1.5L52 18l-1.5-3.5L47 13l3.5-1.5Z" fill="var(--accent)" stroke="none" /> : null}
        </Art>
      )
    }
    default:
      return null
  }
}
