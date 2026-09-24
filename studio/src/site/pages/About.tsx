import { ArrowRight, Hammer, Handshake, Heart, MapPin, Send, Sparkles } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Field, Input, Select, Textarea } from '../../components/ui/primitives'
import { toast, useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { CoffeeBag, Container, Eyebrow, OpenBadge, SectionHeading, SiteButton, siteButtonClass } from '../components'
import { useDocumentTitle } from '../content/hooks'
import { BeanGlyph } from '../content/icons'
import { PageHero, Reveal } from '../content/ui'
import { compactHours } from '../lib'

export function AboutPage() {
  useDocumentTitle('Über uns')
  return (
    <>
      <PageHero
        eyebrow="Über uns"
        title={
          <>
            Zwei Brüder. <br className="hidden sm:block" />
            Eine <span className="text-accent-text italic">Rösterei.</span>
          </>
        }
        text="Im März 2020 haben Collin und Vincent in Weimar die Röstbrüder gegründet. Seitdem rösten sie in der Richard-Wagner-Straße Kaffee mit Charakter – und stehen bis heute selbst hinter der Bar."
        aside={<BrothersArt />}
      >
        <div className="flex flex-wrap gap-3">
          <a href="#geschichte" className={siteButtonClass('primary')}>
            Unsere Geschichte
            <ArrowRight className="size-4" aria-hidden />
          </a>
          <a href="#kontakt" className={siteButtonClass('secondary')}>
            Kontakt
          </a>
        </div>
      </PageHero>
      <Story />
      <Timeline />
      <Values />
      <Names />
      <Team />
      <Contact />
    </>
  )
}

// ---------------------------------------------------------------------------

function Portrait({ initial, color, className, label }: { initial: string; color: string; className?: string; label: string }) {
  return (
    <div className={cn('grain relative flex aspect-[4/5] items-end justify-center overflow-hidden rounded-[2rem]', className)} style={{ background: color }} role="img" aria-label={label}>
      <svg viewBox="0 0 200 250" className="absolute inset-x-0 bottom-0 w-full text-black/25" aria-hidden>
        <circle cx="100" cy="92" r="44" fill="currentColor" />
        <path d="M22 250c4-60 38-92 78-92s74 32 78 92Z" fill="currentColor" />
      </svg>
      <span className="absolute top-5 left-6 font-display text-7xl leading-none font-semibold text-white/90">{initial}</span>
    </div>
  )
}

function BrothersArt() {
  return (
    <div className="relative mx-auto grid max-w-md grid-cols-2 gap-4" aria-hidden>
      <Portrait initial="C" color="#8a5634" label="" className="translate-y-6 -rotate-2" />
      <Portrait initial="V" color="#4f7049" label="" className="-translate-y-2 rotate-2" />
      <span className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink shadow-lift">
        <BeanGlyph className="size-4 text-accent" />
        seit März 2020 in Weimar
      </span>
    </div>
  )
}

function Story() {
  return (
    <section id="geschichte" aria-labelledby="geschichte-title" className="scroll-mt-20 py-20 md:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Eyebrow>Wie alles anfing</Eyebrow>
          <h2 id="geschichte-title" className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink md:text-6xl">
            Angefangen hat es mit einem Nebenjob.
          </h2>
        </div>
        <Reveal className="space-y-6 text-lg leading-relaxed text-ink-2">
          <p>
            Vincents Leidenschaft für Kaffee begann während des Studiums – bei der Arbeit in einer Rösterei. Aus dem Nebenjob wurde Neugier, aus der Neugier ein Plan: eine eigene Rösterei, zusammen mit seinem Bruder Collin.
          </p>
          <p>
            Im März 2020 war es so weit. Mitten in Weimar, in der Richard-Wagner-Straße, steht seitdem unser Röster – und direkt daneben die Tische, an denen du deinen Kaffee trinkst, während die nächste Charge läuft.
          </p>
          <p>
            2022 kam die Espressobar in der Kaufstraße am Herderplatz dazu. Und bis heute stehen wir beide selbst hinter der Bar. Weil wir es lieben. Und weil man dort am meisten darüber lernt, was guter Kaffee für Menschen bedeutet.
          </p>
          <p className="border-l-2 border-accent pl-5 font-display text-2xl leading-snug text-ink italic">Wir rösten den Kaffee, den wir selbst trinken wollen – und schenken ihn aus, als wär’s für Freunde.</p>
        </Reveal>
      </Container>
    </section>
  )
}

function Timeline() {
  const items = [
    { year: '2020', title: 'Gründung & Rösterei', text: 'Im März gründen Collin & Vincent die Röstbrüder – mit eigener Rösterei in der Richard-Wagner-Straße.' },
    { year: '2022', title: 'Die Espressobar', text: 'Unsere zweite Bar – mitten in der Altstadt, in der Kaufstraße am Herderplatz, mit Sommerterrasse.' },
    { year: 'Heute', title: 'Shop, Abo & Workshops', text: 'Unsere Kaffees gibt’s online und im Abo – und in den Workshops zeigen wir, wie man sie zu Hause perfekt zubereitet.' },
  ]
  return (
    <section aria-labelledby="timeline-title" className="grain bg-sidebar py-20 text-sidebar-ink md:py-28">
      <Container>
        <Eyebrow className="text-accent">Meilensteine</Eyebrow>
        <h2 id="timeline-title" className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl">
          Von einer Maschine zu zwei Bars.
        </h2>
        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
          <span className="absolute top-[3.1rem] right-0 left-0 hidden h-px bg-white/15 md:block" aria-hidden />
          {items.map((it, i) => (
            <li key={it.year} className="relative">
              <Reveal>
                <p className="tabular font-display text-6xl leading-none font-semibold text-accent md:text-7xl">{it.year}</p>
                <span className={cn('relative mt-5 hidden size-4 rounded-full border-4 border-sidebar md:block', i === 2 ? 'bg-accent' : 'bg-sidebar-ink')} aria-hidden />
                <h3 className="mt-5 text-xl font-semibold">{it.title}</h3>
                <p className="mt-2 max-w-sm leading-relaxed text-sidebar-muted">{it.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}

function Values() {
  const values: { icon: ReactNode; title: string; text: string }[] = [
    { icon: <Hammer className="size-5" />, title: 'Handwerk', text: 'Wir rösten selbst, in kleinen Chargen, mit viel Probieren und noch mehr Nachjustieren.' },
    { icon: <Handshake className="size-5" />, title: 'Direkt & fair', text: 'Unser Rohkaffee kommt von kleinen Importeuren, die direkt einkaufen und fair zahlen.' },
    { icon: <Heart className="size-5" />, title: 'Nähe', text: 'Wir stehen selbst hinter der Bar und hören zu – die beste Marktforschung, die es gibt.' },
    { icon: <Sparkles className="size-5" />, title: 'Neugier', text: 'Neue Herkünfte, neue Methoden, neue Ideen: Stillstand schmeckt uns nicht.' },
  ]
  return (
    <section aria-labelledby="werte" className="py-20 md:py-28">
      <Container>
        <SectionHeading eyebrow="Was uns wichtig ist" title={<span id="werte">Vier Dinge, die wir nicht verhandeln.</span>} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <li key={v.title}>
              <Reveal className="h-full">
                <div className="h-full rounded-3xl border border-line bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-text" aria-hidden>
                      {v.icon}
                    </span>
                    <span className="tabular font-display text-3xl font-semibold text-ink-3/40" aria-hidden>
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-semibold text-ink">{v.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{v.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

function Names() {
  const products = useStore((s) => s.products)
  const coffees = useMemo(() => products.filter((p) => p.available && p.kind !== 'gift' && p.kind !== 'voucher' && p.story), [products])
  return (
    <section aria-labelledby="namen" className="border-y border-line bg-surface-2/60 py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Jede Bohne hat einen Namen"
          title={<span id="namen">{coffees.length >= 3 ? `${coffees.slice(0, 3).map((p) => p.name).join(', ')} & Co.` : 'Kaffees mit Charakter.'}</span>}
          text={`Unsere Kaffees heißen wie Menschen, weil sie Charakter haben. Und weil man sich „Einmal ${coffees[0]?.name ?? 'Hausbrüh'}, bitte“ einfach besser merkt als eine Farmbezeichnung.`}
          action={
            <Link to="/herkunft#bohnen-pass" className={siteButtonClass('secondary')}>
              Zum Bohnen-Pass
            </Link>
          }
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {coffees.slice(0, 4).map((p) => (
            <li key={p.id}>
              <Reveal className="h-full">
                <Link to={`/shop/${p.slug}`} className="group flex h-full flex-col rounded-3xl border border-line bg-surface p-6 transition-shadow hover:shadow-lift">
                  <div className="mx-auto w-28 transition-transform duration-500 group-hover:-translate-y-1 group-hover:-rotate-3">
                    <CoffeeBag product={p} />
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-semibold text-ink">{p.name}</h3>
                  <p className="text-sm text-ink-3">{p.subtitle}</p>
                  <p className="mt-3 font-display text-[17px] leading-snug text-ink-2 italic">„{p.story}“</p>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

function Team() {
  const people = [
    { initial: 'C', name: 'Collin', role: 'Mitgründer · hinter der Bar', color: '#8a5634' },
    { initial: 'V', name: 'Vincent', role: 'Mitgründer · seit dem Studium im Kaffee', color: '#4f7049' },
    { initial: 'T', name: 'Das Team', role: 'in Rösterei & Espressobar', color: '#2c3448' },
  ]
  return (
    <section aria-labelledby="team" className="py-20 md:py-28">
      <Container>
        <SectionHeading eyebrow="Die Menschen" title={<span id="team">Wer hinter dem Tresen steht.</span>} text="Echte Fotos folgen – bis dahin: die Initialen." />
        <ul className="grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
          {people.map((p) => (
            <li key={p.name}>
              <Reveal>
                <Portrait initial={p.initial} color={p.color} label={`Platzhalter-Porträt: ${p.name}`} />
                <h3 className="mt-4 font-display text-2xl font-semibold text-ink">{p.name}</h3>
                <p className="text-sm text-ink-3">{p.role}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Kontakt
// ---------------------------------------------------------------------------

function Contact() {
  const cafes = useStore((s) => s.cafes)
  const [form, setForm] = useState({ name: '', email: '', topic: 'Allgemein', message: '' })
  const [sent, setSent] = useState(false)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()) || form.message.trim().length < 5) {
      toast({ title: 'Fast geschafft', description: 'Bitte Name, gültige E-Mail und eine kurze Nachricht angeben.', tone: 'danger' })
      return
    }
    setSent(true)
    toast({ title: 'Nachricht gesendet (Demo)', description: 'Im Prototyp wird nichts verschickt – im echten Shop landet sie bei uns.', tone: 'success' })
  }

  return (
    <section id="kontakt" aria-labelledby="kontakt-title" className="scroll-mt-20 pb-20 md:pb-28">
      <Container>
        <div className="grid overflow-hidden rounded-[2.5rem] border border-line bg-surface lg:grid-cols-[0.85fr_1.15fr]">
          <div className="grain bg-sidebar p-7 text-sidebar-ink md:p-10">
            <Eyebrow className="text-accent">Kontakt</Eyebrow>
            <h2 id="kontakt-title" className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl">
              Schreib uns. Oder komm vorbei.
            </h2>
            <p className="mt-4 leading-relaxed text-sidebar-muted">Fragen zu Kaffee, Abo, Workshops für Teams oder einfach Hallo sagen – am schnellsten geht’s am Tresen.</p>
            <ul className="mt-8 space-y-4">
              {cafes.map((c) => (
                <li key={c.id} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{c.name}</p>
                    <OpenBadge cafe={c} tone="onDark" />
                  </div>
                  <p className="mt-1.5 flex items-start gap-2 text-sm text-sidebar-muted">
                    <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {c.address}
                  </p>
                  <p className="mt-1 pl-6 text-xs text-sidebar-muted">{compactHours(c.hours).map((h) => `${h.days} ${h.time}`).join(' · ')}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-sidebar-muted">
              E-Mail & Telefon: siehe{' '}
              <Link to="/impressum" className="font-semibold text-sidebar-ink underline underline-offset-4">
                Impressum
              </Link>
              .
            </p>
          </div>

          <div className="p-7 md:p-10">
            {sent ? (
              <div className="flex h-full min-h-72 flex-col items-center justify-center text-center" role="status">
                <span className="flex size-14 animate-pop-in items-center justify-center rounded-full bg-success-soft text-success">
                  <Send className="size-6" aria-hidden />
                </span>
                <p className="mt-5 font-display text-3xl font-semibold text-ink">Danke, {form.name.split(' ')[0]}!</p>
                <p className="mt-2 max-w-sm text-ink-2">Deine Nachricht ist angekommen (Demo – im Prototyp wird nichts verschickt).</p>
                <SiteButton
                  variant="secondary"
                  className="mt-6"
                  onClick={() => {
                    setSent(false)
                    setForm({ name: '', email: '', topic: 'Allgemein', message: '' })
                  }}
                >
                  Noch eine Nachricht
                </SiteButton>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" htmlFor="ct-name">
                    <Input id="ct-name" autoComplete="name" value={form.name} onChange={set('name')} className="h-11 text-[15px]" required />
                  </Field>
                  <Field label="E-Mail" htmlFor="ct-mail">
                    <Input id="ct-mail" type="email" autoComplete="email" value={form.email} onChange={set('email')} className="h-11 text-[15px]" required />
                  </Field>
                </div>
                <Field label="Worum geht’s?" htmlFor="ct-topic">
                  <Select id="ct-topic" value={form.topic} onChange={set('topic')} className="h-11 text-[15px]">
                    {['Allgemein', 'Kaffee & Abo', 'Workshop für Teams & Firmen', 'Café & Gastronomie', 'Presse'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Nachricht" htmlFor="ct-msg">
                  <Textarea id="ct-msg" value={form.message} onChange={set('message')} className="min-h-40 text-[15px]" required placeholder="Hallo Röstbrüder, …" />
                </Field>
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-ink-3">
                    Mit dem Absenden stimmst du der Verarbeitung gemäß{' '}
                    <Link to="/datenschutz" className="underline underline-offset-2 hover:text-ink">
                      Datenschutzerklärung
                    </Link>{' '}
                    zu.
                  </p>
                  <SiteButton type="submit">
                    <Send className="size-4" aria-hidden />
                    Nachricht senden
                  </SiteButton>
                </div>
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
