import { ArrowLeft, ArrowRight, Check, ChevronRight, Lightbulb, Minus, Pause, Play, Plus, RotateCcw, Smartphone, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router'
import { GRINDS } from '../../lib/cart'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { CoffeeBag, Container, Eyebrow, siteButtonClass } from '../components'
import { deNum, durationLabel, findGuide, GUIDES, mmss, type BrewGuide } from '../content/guides'
import { useDocumentTitle } from '../content/hooks'
import { BrewIcon } from '../content/icons'
import { Reveal } from '../content/ui'
import { price } from '../lib'

export function GuidePage() {
  const { slug } = useParams()
  const guide = findGuide(slug)
  useDocumentTitle(guide ? `${guide.title} – Anleitung` : 'Anleitung nicht gefunden')
  if (!guide) return <NotFound />
  // key: Timer & Dosis beim Wechsel zwischen Anleitungen zurücksetzen
  return <GuideView key={guide.slug} guide={guide} />
}

function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <BrewIcon name="v60" className="size-24 text-ink-3" />
      <h1 className="mt-6 font-display text-4xl font-semibold text-ink md:text-5xl">Diese Anleitung ist durchgelaufen.</h1>
      <p className="mt-3 max-w-md text-ink-2">Die Seite gibt es nicht (mehr). Aber keine Sorge – hier sind alle Methoden auf einen Blick.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {GUIDES.map((g) => (
          <Link key={g.slug} to={`/anleitungen/${g.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface pr-4 pl-2 text-sm font-medium text-ink-2 hover:border-accent hover:text-ink">
            <BrewIcon name={g.icon} className="size-7" />
            {g.title}
          </Link>
        ))}
      </div>
      <Link to="/anleitungen" className={cn(siteButtonClass('primary'), 'mt-8')}>
        Alle Anleitungen
      </Link>
    </Container>
  )
}

function GuideView({ guide: g }: { guide: BrewGuide }) {
  const [dose, setDose] = useState(g.dose)
  const factor = dose / g.dose
  const water = Math.round(g.water * factor)
  const [prepDone, setPrepDone] = useState<number[]>([])

  const products = useStore((s) => s.products)
  const recommended = useMemo(
    () => g.recommended.map((s) => products.find((p) => p.slug === s && p.available)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [products, g.recommended],
  )
  const idx = GUIDES.findIndex((x) => x.slug === g.slug)
  const next = GUIDES[(idx + 1) % GUIDES.length]

  return (
    <div style={{ '--c': g.color } as CSSProperties}>
      {/* Kopf */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(55%_65%_at_80%_0%,color-mix(in_oklab,var(--c)_22%,transparent),transparent_70%)]" />
        <Container className="pt-8 pb-14 md:pt-10 md:pb-20">
          <nav aria-label="Brotkrumen" className="mb-10 flex items-center gap-1.5 text-sm text-ink-3">
            <Link to="/anleitungen" className="inline-flex items-center gap-1.5 hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden />
              Anleitungen
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <span className="text-ink-2" aria-current="page">
              {g.title}
            </span>
          </nav>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
            <div className="animate-pop-in">
              <div className="grain mb-6 inline-flex size-24 items-center justify-center rounded-3xl bg-[color-mix(in_oklab,var(--c)_18%,var(--surface-2))] text-ink">
                <BrewIcon name={g.icon} className="size-16" />
              </div>
              <Eyebrow>Brühanleitung · {g.difficulty}</Eyebrow>
              <h1 className="mt-3 font-display text-5xl leading-[0.98] font-semibold tracking-tight text-ink md:text-7xl">{g.title}</h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-2 md:text-xl">{g.subtitle}</p>
              <a href="#timer" className={cn(siteButtonClass('primary'), 'mt-8')}>
                <Play className="size-4" aria-hidden />
                Zum Brüh-Timer
              </a>
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KeyFact label="Kaffee" value={`${deNum(dose)} g`} />
              <KeyFact label={g.waterLabel} value={`${water} ${g.waterUnit}`} />
              <KeyFact label="Verhältnis" value={g.ratio} />
              <KeyFact label="Temperatur" value={g.temp} />
              <KeyFact label="Mahlgrad" value={GRINDS[g.grind].replace(/ \(.*\)/, '')} hint={g.grindHint} />
              <KeyFact label="Zeit" value={durationLabel(g.totalSec)} />
            </dl>
          </div>
        </Container>
      </section>

      {/* Ausrüstung & Vorbereitung */}
      <section aria-label="Ausrüstung und Vorbereitung" className="pb-16 md:pb-24">
        <Container className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <h2 className="font-display text-2xl font-semibold text-ink">Das brauchst du</h2>
            <ul className="mt-5 space-y-3">
              {g.equipment.map((e) => (
                <li key={e} className="flex gap-3 text-[15px] text-ink-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  {e}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-2xl font-semibold text-ink">Vorbereitung</h2>
              <span className="tabular text-sm text-ink-3">
                {prepDone.length}/{g.prep.length} erledigt
              </span>
            </div>
            <ol className="mt-5 space-y-2">
              {g.prep.map((p, i) => {
                const done = prepDone.includes(i)
                return (
                  <li key={p}>
                    <label className={cn('flex cursor-pointer gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-surface-2', done && 'text-ink-3')}>
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => setPrepDone((d) => (done ? d.filter((x) => x !== i) : [...d, i]))}
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent',
                          done ? 'border-accent bg-accent-solid text-on-accent' : 'border-line-strong text-ink-3',
                        )}
                        aria-hidden
                      >
                        {done ? <Check className="size-3.5" /> : i + 1}
                      </span>
                      <span className={cn('text-[15px] leading-relaxed', done ? 'line-through decoration-ink-3/50' : 'text-ink-2')}>{p}</span>
                    </label>
                  </li>
                )
              })}
            </ol>
          </Reveal>
        </Container>
      </section>

      {/* Timer */}
      <section id="timer" aria-labelledby="timer-title" className="scroll-mt-24 pb-16 md:pb-24">
        <Container>
          <BrewTimer guide={g} dose={dose} setDose={setDose} />
        </Container>
      </section>

      {/* Tipps & Kaffees */}
      <section aria-label="Tipps und passende Kaffees" className="pb-20 md:pb-28">
        <Container className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal className="rounded-3xl bg-accent-soft p-6 md:p-8">
            <Lightbulb className="size-7 text-accent-text" aria-hidden />
            <h2 className="mt-4 font-display text-2xl font-semibold text-ink">Tipps aus der Rösterei</h2>
            <ul className="mt-5 space-y-4">
              {g.tips.map((t) => (
                <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                  <Check className="mt-1 size-4 shrink-0 text-accent-text" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <h2 className="font-display text-2xl font-semibold text-ink">Passt perfekt dazu</h2>
            <p className="mt-1 text-sm text-ink-3">Unsere Empfehlungen für {g.title.replace(' (V60)', '')}.</p>
            {recommended.length ? (
              <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {recommended.map((p) => (
                  <li key={p.id}>
                    <Link to={`/shop/${p.slug}`} className="group block rounded-2xl p-2 text-center transition-colors hover:bg-surface-2">
                      <div className="mx-auto w-24 transition-transform duration-500 group-hover:-translate-y-1 group-hover:-rotate-3 sm:w-28">
                        <CoffeeBag product={p} />
                      </div>
                      <p className="mt-3 font-display text-lg font-semibold text-ink">{p.name}</p>
                      <p className="text-xs text-ink-3">{p.subtitle}</p>
                      <p className="tabular mt-1 text-sm font-semibold text-ink-2">{price(p.price)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-ink-2">
                Gerade nichts Passendes vorrätig –{' '}
                <Link to="/shop" className="font-semibold text-accent-text underline underline-offset-4">
                  schau im Shop
                </Link>
                .
              </p>
            )}
          </Reveal>
        </Container>
        <Container className="mt-10">
          <Link
            to={`/anleitungen/${next.slug}`}
            className="group flex items-center justify-between gap-4 rounded-3xl border border-line bg-surface p-5 transition-shadow hover:shadow-lift md:p-7"
          >
            <span className="flex items-center gap-4">
              <BrewIcon name={next.icon} className="size-12 text-ink" />
              <span>
                <span className="block text-xs font-semibold tracking-[0.14em] text-ink-3 uppercase">Nächste Methode</span>
                <span className="font-display text-2xl font-semibold text-ink">{next.title}</span>
              </span>
            </span>
            <ArrowRight className="size-5 text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-ink" aria-hidden />
          </Link>
        </Container>
      </section>
    </div>
  )
}

function KeyFact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur" title={hint}>
      <dt className="text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">{label}</dt>
      <dd className="tabular mt-1.5 font-display text-xl leading-tight font-semibold text-ink md:text-2xl">{value}</dd>
      {hint ? <dd className="mt-1 text-xs leading-snug text-ink-3">{hint}</dd> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Interaktiver Brüh-Timer
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | null = null
function beep(high = false) {
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = high ? 1046 : 784
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.4)
  } catch {
    // Kein WebAudio – dann eben leise.
  }
}

function BrewTimer({ guide: g, dose, setDose }: { guide: BrewGuide; dose: number; setDose: (v: number) => void }) {
  const factor = dose / g.dose
  const total = g.totalSec
  const [running, setRunning] = useState(false)
  const [acc, setAcc] = useState(0) // ms vor dem aktuellen Lauf
  const [startedAt, setStartedAt] = useState(0)
  const [now, setNow] = useState(0)
  const [sound, setSound] = useState(false)
  const [wake, setWake] = useState<'on' | 'unsupported' | 'idle'>('idle')

  const elapsed = Math.min(total, (acc + (running ? now - startedAt : 0)) / 1000)
  const done = elapsed >= total
  const started = elapsed > 0 || running

  // Takt
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => {
      const n = performance.now()
      if ((acc + n - startedAt) / 1000 >= total) {
        setAcc(total * 1000)
        setRunning(false)
      } else setNow(n)
    }, 100)
    return () => window.clearInterval(t)
  }, [running, acc, startedAt, total])

  const start = () => {
    if (done) return
    const n = performance.now()
    setStartedAt(n)
    setNow(n)
    setRunning(true)
    if (sound) beep(true)
  }
  const pause = () => {
    setAcc((a) => a + performance.now() - startedAt)
    setRunning(false)
  }
  const reset = () => {
    setRunning(false)
    setAcc(0)
    setNow(0)
    setStartedAt(0)
  }
  const toggle = () => (running ? pause() : done ? reset() : start())

  // aktueller Schritt
  let si = 0
  for (let i = 0; i < g.steps.length; i++) if (elapsed >= g.steps[i].atSec) si = i
  const step = g.steps[si]
  const stepEnd = g.steps[si + 1]?.atSec ?? total
  const stepProgress = done ? 1 : Math.min(1, Math.max(0, (elapsed - step.atSec) / Math.max(1, stepEnd - step.atSec)))
  const upcoming = g.steps[si + 1]
  const target = (s: { pourTo?: number }) => (s.pourTo ? Math.round(s.pourTo * factor) : null)

  // Ton bei Schrittwechsel
  const lastStep = useRef(si)
  useEffect(() => {
    if (lastStep.current !== si) {
      if (running && sound) beep(si === g.steps.length - 1)
      lastStep.current = si
    }
  }, [si, running, sound, g.steps.length])
  const prevDone = useRef(done)
  useEffect(() => {
    if (done && !prevDone.current && sound) beep(true)
    prevDone.current = done
  }, [done, sound])

  // Bildschirm anlassen, solange der Timer läuft
  useEffect(() => {
    if (!running) return
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    if (!nav.wakeLock) {
      const t = window.setTimeout(() => setWake('unsupported'), 0)
      return () => window.clearTimeout(t)
    }
    let sentinel: { release: () => Promise<void> } | null = null
    let cancelled = false
    nav.wakeLock
      .request('screen')
      .then((s) => {
        if (cancelled) void s.release()
        else {
          sentinel = s
          setWake('on')
        }
      })
      .catch(() => setWake('unsupported'))
    return () => {
      cancelled = true
      void sentinel?.release()
      setWake('idle')
    }
  }, [running])

  // Leertaste = Start/Pause (wenn nicht gerade in einem Feld oder auf einem Button)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const t = e.target as HTMLElement | null
      if (t && (t.closest('input, textarea, select, button, a, [contenteditable="true"]') || t.isContentEditable)) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const R = 118
  const C = 2 * Math.PI * R
  const R2 = 132
  const C2 = 2 * Math.PI * R2
  const stepTarget = target(step)

  return (
    <div className="grain relative overflow-hidden rounded-[2rem] bg-sidebar text-sidebar-ink">
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-20 size-[28rem] rounded-full bg-[color-mix(in_oklab,var(--c)_45%,transparent)] opacity-40 blur-3xl" />
      <div className="relative p-5 sm:p-8 lg:p-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow className="text-accent">Brüh-Timer</Eyebrow>
            <h2 id="timer-title" className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Schritt für Schritt
            </h2>
          </div>
          {/* Dosis-Regler */}
          <div className="w-full rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 md:w-[26rem]">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="dose" className="text-sm font-semibold">
                Menge anpassen
              </label>
              <span className="tabular text-sm text-sidebar-muted">
                <span className="font-semibold text-sidebar-ink">{deNum(dose)} g</span> Kaffee → <span className="font-semibold text-sidebar-ink">{Math.round(g.water * factor)} {g.waterUnit}</span> {g.waterLabel}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button type="button" disabled={running || dose <= g.doseRange[0]} onClick={() => setDose(Math.max(g.doseRange[0], dose - 1))} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40" aria-label="Weniger Kaffee">
                <Minus className="size-4" aria-hidden />
              </button>
              <input
                id="dose"
                type="range"
                min={g.doseRange[0]}
                max={g.doseRange[1]}
                step={1}
                value={dose}
                disabled={running}
                onChange={(e) => setDose(Number(e.target.value))}
                aria-valuetext={`${dose} Gramm Kaffee`}
                className="w-full accent-[var(--accent)] disabled:opacity-50"
              />
              <button type="button" disabled={running || dose >= g.doseRange[1]} onClick={() => setDose(Math.min(g.doseRange[1], dose + 1))} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40" aria-label="Mehr Kaffee">
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-16">
          {/* Uhr */}
          <div className="flex flex-col items-center">
            <div className="relative size-[272px] sm:size-[300px]">
              <svg viewBox="0 0 300 300" className="size-full -rotate-90" aria-hidden>
                <circle cx="150" cy="150" r={R2} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="3" />
                <circle cx="150" cy="150" r={R2} fill="none" stroke="var(--sidebar-muted)" strokeWidth="3" strokeLinecap="round" strokeDasharray={C2} strokeDashoffset={C2 * (1 - elapsed / total)} style={{ transition: 'stroke-dashoffset 120ms linear' }} />
                <circle cx="150" cy="150" r={R} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="12" />
                <circle
                  cx="150"
                  cy="150"
                  r={R}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - stepProgress)}
                  style={{ transition: 'stroke-dashoffset 120ms linear' }}
                />
                {g.steps.map((s) => {
                  const a = (s.atSec / total) * Math.PI * 2
                  return <circle key={s.atSec} cx={150 + R2 * Math.cos(a)} cy={150 + R2 * Math.sin(a)} r="4" fill={elapsed >= s.atSec && started ? 'var(--accent)' : 'var(--sidebar-muted)'} />
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-semibold tracking-[0.16em] text-sidebar-muted uppercase">
                  {done ? 'Fertig' : `Schritt ${si + 1}/${g.steps.length}`}
                </span>
                <span className="tabular mt-1 font-display text-7xl leading-none font-semibold" role="timer" aria-label={`Verstrichene Zeit ${mmss(elapsed)}`}>
                  {mmss(Math.floor(elapsed))}
                </span>
                <span className="tabular mt-2 text-sm text-sidebar-muted">von {mmss(total)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={reset}
                disabled={!started}
                className="flex size-12 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-40"
                aria-label="Zurücksetzen"
                title="Zurücksetzen"
              >
                <RotateCcw className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={toggle}
                className="flex h-16 min-w-40 items-center justify-center gap-2 rounded-full bg-accent-solid px-8 text-lg font-semibold text-on-accent shadow-[0_12px_32px_-10px_rgb(196_112_47/0.8)] transition-transform hover:bg-accent-solid-hover active:scale-[0.97]"
              >
                {running ? <Pause className="size-5" aria-hidden /> : done ? <RotateCcw className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
                {running ? 'Pause' : done ? 'Nochmal' : started ? 'Weiter' : 'Start'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!sound) beep()
                  setSound(!sound)
                }}
                aria-pressed={sound}
                className={cn('flex size-12 items-center justify-center rounded-full transition-colors', sound ? 'bg-white text-sidebar' : 'bg-white/10 hover:bg-white/20')}
                aria-label={sound ? 'Signalton ausschalten' : 'Signalton einschalten'}
                title={sound ? 'Signalton an' : 'Signalton aus'}
              >
                {sound ? <Volume2 className="size-5" aria-hidden /> : <VolumeX className="size-5" aria-hidden />}
              </button>
            </div>
            <p className="mt-4 flex max-w-xs items-center gap-2 text-center text-xs text-sidebar-muted">
              <Smartphone className="size-4 shrink-0" aria-hidden />
              {wake === 'on' ? 'Dein Bildschirm bleibt an, solange der Timer läuft.' : 'Tipp: Bildschirmsperre kurz deaktivieren. Leertaste = Start/Pause.'}
            </p>
          </div>

          {/* Schritte */}
          <div>
            <div className="rounded-3xl bg-white/[0.07] p-6 ring-1 ring-white/10 md:p-8" aria-live="polite" aria-atomic="true">
              {done ? (
                <>
                  <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Geschafft</p>
                  <p className="mt-2 font-display text-3xl font-semibold md:text-4xl">Genieß deinen Kaffee.</p>
                  <p className="mt-2 text-sidebar-muted">Wie schmeckt’s? Sauer → feiner mahlen. Bitter → gröber. So findest du dein Rezept.</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">{started ? 'Jetzt' : 'Als Erstes'}</p>
                  <p className="mt-2 font-display text-3xl font-semibold md:text-4xl">{step.label}</p>
                  {stepTarget ? (
                    <p className="tabular mt-3 inline-flex items-baseline gap-2 rounded-2xl bg-accent-solid px-4 py-2 text-on-accent">
                      <span className="text-sm font-medium">{g.pourVerb}</span>
                      <span className="font-display text-3xl font-semibold">{stepTarget} g</span>
                    </p>
                  ) : null}
                  <p className="mt-4 max-w-xl leading-relaxed text-sidebar-ink/85">{step.detail}</p>
                </>
              )}
            </div>
            {upcoming && !done ? (
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-sm text-sidebar-muted">
                <span className="font-semibold text-sidebar-ink">Als Nächstes</span>
                <span className="tabular">in {mmss(Math.ceil(upcoming.atSec - elapsed))}:</span>
                <span>
                  {upcoming.label}
                  {target(upcoming) ? ` – ${g.pourVerb.toLowerCase()} ${target(upcoming)} g` : ''}
                </span>
              </p>
            ) : null}

            <ol className="mt-6 space-y-1.5">
              {g.steps.map((s, i) => {
                const state = done || (started && i < si) ? 'done' : i === si && started ? 'now' : 'next'
                return (
                  <li
                    key={s.atSec}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors',
                      state === 'now' && 'bg-white/10',
                      state === 'done' && 'text-sidebar-muted',
                    )}
                    aria-current={state === 'now' ? 'step' : undefined}
                  >
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        state === 'done' ? 'bg-white/10 text-sidebar-muted' : state === 'now' ? 'bg-accent-solid text-on-accent' : 'ring-1 ring-white/20',
                      )}
                    >
                      {state === 'done' ? <Check className="size-3.5" aria-hidden /> : i + 1}
                    </span>
                    <span className="tabular w-10 shrink-0 text-sidebar-muted">{mmss(s.atSec)}</span>
                    <span className={cn('min-w-0 flex-1 font-medium', state === 'done' && 'line-through decoration-white/30')}>{s.label}</span>
                    {target(s) ? <span className="tabular shrink-0 text-sidebar-muted">{target(s)} g</span> : null}
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
