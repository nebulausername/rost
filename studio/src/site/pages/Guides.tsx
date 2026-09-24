import { ArrowRight, Droplets, Minus, Plus, Scale, SlidersHorizontal } from 'lucide-react'
import { useId, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../../lib/utils'
import { Container, Eyebrow, SectionHeading } from '../components'
import { deNum, durationLabel, GUIDES, type BrewGuide } from '../content/guides'
import { useDocumentTitle } from '../content/hooks'
import { BrewIcon, Steam } from '../content/icons'
import { PageHero, Reveal } from '../content/ui'

export function GuidesPage() {
  useDocumentTitle('Brühanleitungen')
  return (
    <>
      <PageHero
        eyebrow="Brühanleitungen"
        title={
          <>
            Besser brühen.
            <br />
            <span className="text-accent-text italic">Ohne</span> Raketen&shy;wissenschaft.
          </>
        }
        text="Sechs Methoden, die wir selbst jeden Tag benutzen – mit Rezept, Schritt-für-Schritt-Timer und Mengenrechner. Stell die Tasse bereit, den Rest machen wir zusammen."
        aside={<HeroArt />}
      >
        <nav aria-label="Methoden" className="flex flex-wrap gap-2">
          {GUIDES.map((g) => (
            <Link
              key={g.slug}
              to={`/anleitungen/${g.slug}`}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface pr-4 pl-2 text-sm font-medium text-ink-2 transition-colors hover:border-accent hover:text-ink"
            >
              <BrewIcon name={g.icon} className="size-7" />
              {g.title.replace(' (V60)', '')}
            </Link>
          ))}
        </nav>
      </PageHero>

      <section aria-labelledby="alle-methoden" className="pb-20 md:pb-28">
        <Container>
          <h2 id="alle-methoden" className="sr-only">
            Alle Methoden
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((g) => (
              <Reveal key={g.slug}>
                <GuideCard guide={g} />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <BrewCalculator />
    </>
  )
}

function HeroArt() {
  return (
    <div className="grain relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[2.5rem] bg-sidebar text-sidebar-ink" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_40%,rgb(196_112_47/0.35),transparent_70%)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative -translate-y-8">
          <Steam className="absolute -top-20 left-1/2 h-24 w-24 -translate-x-1/2 text-sidebar-muted" />
          <BrewIcon name="v60" className="size-56 text-sidebar-ink md:size-64" />
        </div>
      </div>
      <div className="absolute bottom-6 left-6 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-sidebar-muted uppercase">Unser Morgen-Rezept</p>
        <p className="tabular mt-1 font-display text-2xl font-semibold">15 g · 250 g · 3:00</p>
      </div>
    </div>
  )
}

const DIFF_LEVEL: Record<BrewGuide['difficulty'], number> = { Einfach: 1, Mittel: 2, Anspruchsvoll: 3 }

function GuideCard({ guide: g }: { guide: BrewGuide }) {
  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift"
      style={{ '--c': g.color } as CSSProperties}
    >
      <div className="grain relative flex h-52 items-center justify-center overflow-hidden bg-[color-mix(in_oklab,var(--c)_16%,var(--surface-2))]">
        <BrewIcon name={g.icon} className="size-32 text-ink transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3" />
        <span className="absolute top-4 left-4 rounded-full bg-surface/85 px-2.5 py-1 text-xs font-semibold text-ink-2 backdrop-blur">{g.difficulty}</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-2xl font-semibold text-ink">
          <Link to={`/anleitungen/${g.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {g.title}
          </Link>
        </h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{g.subtitle}</p>
        <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-5 text-sm">
          <div>
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">Zeit</dt>
            <dd className="tabular mt-0.5 font-semibold text-ink">{durationLabel(g.totalSec).replace('ca. ', '')}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">Verhältnis</dt>
            <dd className="tabular mt-0.5 font-semibold text-ink">{g.ratio}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">Level</dt>
            <dd className="mt-1.5 flex gap-1" aria-label={g.difficulty}>
              {[1, 2, 3].map((i) => (
                <span key={i} className={cn('h-1.5 w-4 rounded-full', i <= DIFF_LEVEL[g.difficulty] ? 'bg-accent' : 'bg-surface-3')} />
              ))}
            </dd>
          </div>
        </dl>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text" aria-hidden>
          Zur Anleitung mit Timer
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Brüh-Rechner: Kaffee ↔ Wasser über ein Verhältnis 1:12 … 1:18
// ---------------------------------------------------------------------------

function BrewCalculator() {
  const [ratio, setRatio] = useState(16)
  const [dose, setDose] = useState(15)
  const [water, setWater] = useState(240)
  // Welcher Wert zuletzt bewegt wurde, bleibt beim Verstellen des Verhältnisses fix
  const [anchor, setAnchor] = useState<'dose' | 'water'>('dose')
  const ids = { dose: useId(), water: useId(), ratio: useId() }

  const round1 = (v: number) => Math.round(v * 10) / 10
  const changeDose = (v: number) => {
    const d = Math.max(1, Math.min(120, v || 0))
    setDose(d)
    setWater(Math.round(d * ratio))
    setAnchor('dose')
  }
  const changeWater = (v: number) => {
    const w = Math.max(10, Math.min(2000, v || 0))
    setWater(w)
    setDose(round1(w / ratio))
    setAnchor('water')
  }
  const changeRatio = (r: number) => {
    setRatio(r)
    if (anchor === 'dose') setWater(Math.round(dose * r))
    else setDose(round1(water / r))
  }

  // Kaffeemehl hält grob das Doppelte seines Gewichts an Wasser zurück
  const cup = Math.max(0, Math.round(water - dose * 2))
  const strength = ratio <= 13.5 ? 'sehr kräftig' : ratio <= 15 ? 'kräftig' : ratio <= 16.5 ? 'ausgewogen' : 'leicht & klar'

  return (
    <section aria-labelledby="rechner" className="pb-20 md:pb-28">
      <Container>
        <div className="grain relative overflow-hidden rounded-[2rem] bg-sidebar text-sidebar-ink">
          <div className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-accent/25 blur-3xl" aria-hidden />
          <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-14">
            <div>
              <Eyebrow className="text-accent">Brüh-Rechner</Eyebrow>
              <h2 id="rechner" className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl">
                Wie viel Kaffee für wie viel Wasser?
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-sidebar-muted">
                Gib eine Menge ein – die andere rechnet sich aus. Mit dem Verhältnis steuerst du, wie kräftig die Tasse wird. Unser Startpunkt für Filter: 1:16.
              </p>
              <div className="mt-8 rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10" aria-live="polite">
                <p className="text-sm text-sidebar-muted">Für dein Rezept brauchst du</p>
                <p className="tabular mt-2 font-display text-4xl font-semibold md:text-5xl">
                  {deNum(dose)} g <span className="text-sidebar-muted">→</span> {deNum(water, 0)} g
                </p>
                <p className="mt-2 text-sm text-sidebar-muted">
                  Kaffee zu Wasser · 1:{deNum(ratio)} · <span className="text-sidebar-ink">{strength}</span>
                </p>
                <p className="mt-4 border-t border-white/10 pt-4 text-sm text-sidebar-muted">
                  Ergibt ca. <span className="tabular font-semibold text-sidebar-ink">{cup} ml</span> in der Tasse – das Kaffeemehl hält etwa das Doppelte seines Gewichts an Wasser zurück.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-8">
              <NumberRow
                id={ids.dose}
                label="Kaffee"
                icon={<Scale className="size-4" aria-hidden />}
                unit="g"
                value={dose}
                step={1}
                onChange={changeDose}
              />
              <NumberRow
                id={ids.water}
                label="Wasser"
                icon={<Droplets className="size-4" aria-hidden />}
                unit="g"
                value={water}
                step={10}
                onChange={changeWater}
              />
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor={ids.ratio} className="flex items-center gap-2 text-sm font-semibold">
                    <SlidersHorizontal className="size-4" aria-hidden />
                    Verhältnis
                  </label>
                  <span className="tabular font-display text-2xl font-semibold">1:{deNum(ratio)}</span>
                </div>
                <input
                  id={ids.ratio}
                  type="range"
                  min={12}
                  max={18}
                  step={0.5}
                  value={ratio}
                  onChange={(e) => changeRatio(Number(e.target.value))}
                  aria-valuetext={`1 zu ${deNum(ratio)}, ${strength}`}
                  className="mt-3 w-full accent-[var(--accent)]"
                />
                <div className="mt-1 flex justify-between text-xs text-sidebar-muted">
                  <span>1:12 · kräftiger</span>
                  <span>leichter · 1:18</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Mokka-Stil 1:12', r: 12 },
                  { label: 'French Press 1:15', r: 15 },
                  { label: 'Handfilter 1:16', r: 16 },
                  { label: 'Leicht 1:17,5', r: 17.5 },
                ].map((p) => (
                  <button
                    key={p.r}
                    type="button"
                    onClick={() => changeRatio(p.r)}
                    aria-pressed={ratio === p.r}
                    className={cn(
                      'h-9 rounded-full px-3.5 text-sm font-medium transition-colors',
                      ratio === p.r ? 'bg-accent-solid text-on-accent' : 'bg-white/10 text-sidebar-ink hover:bg-white/20',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Reveal className="mt-16">
          <SectionHeading
            eyebrow="Noch Fragen?"
            title="Lieber live lernen?"
            text="In unseren Workshops in der Rösterei probierst du V60, AeroPress, French Press & Chemex direkt nebeneinander."
            action={
              <Link to="/workshops" className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-surface px-6 text-[15px] font-semibold text-ink transition-colors hover:border-ink/40">
                Workshops ansehen
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
            className="mb-0"
          />
        </Reveal>
      </Container>
    </section>
  )
}

function NumberRow({
  id,
  label,
  icon,
  unit,
  value,
  step,
  onChange,
}: {
  id: string
  label: string
  icon: ReactNode
  unit: string
  value: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(value - step)}
          className="flex size-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          aria-label={`${label} verringern`}
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <div className="relative">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            value={value}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="tabular h-12 w-28 rounded-2xl border border-white/15 bg-white/[0.06] pr-8 pl-4 text-right font-display text-xl font-semibold text-sidebar-ink focus:border-accent focus:ring-2 focus:ring-accent/40 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-sidebar-muted">{unit}</span>
        </div>
        <button
          type="button"
          onClick={() => onChange(value + step)}
          className="flex size-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          aria-label={`${label} erhöhen`}
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
