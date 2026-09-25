import { ArrowRight, Check, Mail, MapPin } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { PlatformIcon } from '../../components/domain'
import { toast, useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { Container, OpenBadge } from '../components'
import { compactHours } from '../lib'
import { FACEBOOK_URL, INSTAGRAM_URL, isEmail, mapsUrl } from './hooks'
import { openConsentSettings } from './consent'
import { BeanMark } from './Logo'

const COLUMNS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Shop',
    links: [
      { to: '/shop', label: 'Alle Kaffees' },
      { to: '/abo', label: 'Kaffee-Abo' },
      { to: '/shop?kat=geschenke', label: 'Geschenke & Gutscheine' },
      { to: '/geschmacksfinder', label: 'Geschmacksfinder' },
    ],
  },
  {
    title: 'Erleben',
    links: [
      { to: '/workshops', label: 'Workshops' },
      { to: '/cafes', label: 'Cafés' },
      { to: '/anleitungen', label: 'Anleitungen' },
    ],
  },
  {
    title: 'Röstbrüder',
    links: [
      { to: '/ueber-uns', label: 'Über uns' },
      { to: '/herkunft', label: 'Herkunft' },
      { to: '/studio', label: 'Studio-Login' },
    ],
  },
  {
    title: 'Rechtliches',
    links: [
      { to: '/impressum', label: 'Impressum' },
      { to: '/datenschutz', label: 'Datenschutz' },
    ],
  },
]

const footerLink = 'inline-flex min-h-11 min-w-11 items-center text-[15px] text-ink-2 transition-colors hover:text-accent-text md:min-h-8'

type NewsletterState = 'idle' | 'invalid' | 'success' | 'duplicate'

function Newsletter() {
  const subscribe = useStore((s) => s.subscribe)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<NewsletterState>('idle')
  const id = useId()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setState('invalid')
      return
    }
    const fresh = subscribe(email, 'Website-Footer')
    if (fresh) {
      setState('success')
      setEmail('')
      toast({ title: 'Willkommen bei der Röstbrüder Post!', description: 'Die nächste Ausgabe landet direkt in deinem Postfach.', tone: 'success' })
    } else {
      setState('duplicate')
      toast({ title: 'Du bist schon dabei', description: 'Diese Adresse steht bereits auf unserer Liste.' })
    }
  }

  return (
    <div className="grain relative overflow-hidden rounded-[32px] bg-sidebar px-6 py-10 text-sidebar-ink sm:px-10 md:py-14 lg:px-14">
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(196_112_47/0.45),transparent)]" />
      <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -bottom-16 -left-10 w-64 text-white/[0.04]">
        <g transform="rotate(-30 100 100)">
          <ellipse cx="100" cy="100" rx="52" ry="74" fill="currentColor" />
        </g>
      </svg>
      <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-16">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white">
            <Mail className="size-3.5" aria-hidden /> Newsletter
          </p>
          <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-white sm:text-5xl">
            Röstbrüder <em className="font-medium text-accent">Post</em>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-sidebar-ink/80 md:text-lg">
            Eine Mail pro Monat: neue Kaffees, Termine, Brüh-Tipps. Mehr nicht – versprochen.
          </p>
        </div>
        <form onSubmit={onSubmit} noValidate className="w-full">
          <label htmlFor={id} className="mb-2 block text-sm font-medium text-sidebar-ink">
            Deine E-Mail-Adresse
          </label>
          <div
            className={cn(
              'flex flex-col gap-2 rounded-[22px] border bg-white/[0.06] p-1.5 transition-colors focus-within:border-accent focus-within:bg-white/[0.09] sm:flex-row sm:rounded-full',
              state === 'invalid' ? 'border-[#ec7a72]' : 'border-white/15',
            )}
          >
            <input
              id={id}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="du@beispiel.de"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (state !== 'idle') setState('idle')
              }}
              aria-invalid={state === 'invalid'}
              aria-describedby={`${id}-msg`}
              className="h-12 min-w-0 flex-1 rounded-full bg-transparent px-4 text-base text-white placeholder:text-sidebar-muted focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-accent-solid px-6 text-[15px] font-semibold text-on-accent transition-colors hover:bg-accent-solid-hover"
            >
              Anmelden
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
          <p id={`${id}-msg`} className="mt-3 min-h-5 text-sm" aria-live="polite">
            {state === 'invalid' ? (
              <span className="text-[#f2a39c]">Hm, das sieht nicht nach einer E-Mail-Adresse aus.</span>
            ) : state === 'success' ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-[#a9c9a2]">
                <Check className="size-4" aria-hidden /> Danke! Du bist dabei.
              </span>
            ) : state === 'duplicate' ? (
              <span className="text-sidebar-ink">Du stehst schon auf der Liste – schön, dass du so begeistert bist.</span>
            ) : (
              <span className="text-sidebar-muted">
                Abmeldung jederzeit mit einem Klick. Mehr in der{' '}
                <Link to="/datenschutz" className="underline underline-offset-2 hover:text-sidebar-ink">
                  Datenschutzerklärung
                </Link>
                .
              </span>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}

export function Footer() {
  const cafes = useStore((s) => s.cafes)
  const year = new Date().getFullYear()
  return (
    <footer className="relative overflow-hidden border-t border-line bg-surface-2/50 pt-16 md:pt-24" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        Fußbereich
      </h2>
      <Container>
        <Newsletter />

        <div className="mt-16 grid gap-12 md:mt-20 lg:grid-cols-[1.25fr_2fr]">
          <div>
            <div className="flex items-center gap-3">
              <BeanMark className="size-11" />
              <p className="font-display text-3xl font-semibold tracking-tight text-ink">Röstbrüder</p>
            </div>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-2">
              Kaffeerösterei & zwei Cafés in Weimar. Von Collin & Vincent – seit 2020 mit Liebe zur Bohne und einem Faible für gute Namen.
            </p>
            <ul className="mt-8 space-y-4">
              {cafes.map((c) => (
                <li key={c.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{c.name}</p>
                    <OpenBadge cafe={c} />
                  </div>
                  <a
                    href={mapsUrl(c.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-accent-text"
                  >
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span>
                      {c.address}
                      <span className="sr-only"> (Karte in neuem Fenster)</span>
                    </span>
                  </a>
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-3">
                    {compactHours(c.hours).map((r) => (
                      <div key={r.days} className="flex gap-1.5">
                        <dt className="font-medium text-ink-2">{r.days}</dt>
                        <dd className="tabular">{r.time}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-ink-3 uppercase">{col.title}</p>
                <ul className="md:space-y-1">
                  {col.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className={footerLink}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                  {col.title === 'Rechtliches' ? (
                    <li>
                      <button type="button" onClick={openConsentSettings} className={cn(footerLink, 'text-left')}>
                        Cookie-Einstellungen
                      </button>
                    </li>
                  ) : null}
                </ul>
              </nav>
            ))}
            <div className="col-span-2 sm:col-span-4">
              <p className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-ink-3 uppercase">Folg uns</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent-text"
                >
                  <PlatformIcon platform="instagram" className="size-4" />
                  Instagram
                  <span className="sr-only"> (neues Fenster)</span>
                </a>
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent-text"
                >
                  <PlatformIcon platform="facebook" className="size-4" />
                  Facebook
                  <span className="sr-only"> (neues Fenster)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Riesige Wortmarke als typografischer Abschluss */}
      {/* als Pseudo-Element: rein dekorativ, bleibt aus dem Accessibility-Baum */}
      <div aria-hidden className="pointer-events-none mt-16 overflow-hidden select-none md:mt-20">
        <p className="-mb-[0.22em] text-center font-display text-[22vw] leading-none font-semibold tracking-[-0.04em] text-ink/[0.06] before:content-[attr(data-wordmark)] lg:text-[19vw]" data-wordmark="Röstbrüder" />
      </div>
      <div className="relative border-t border-line bg-canvas">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-3 sm:flex-row">
          <p className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            Handgeröstet in Weimar seit 2020
          </p>
          <p>© {year} Röstbrüder · Collin & Vincent</p>
        </Container>
      </div>
    </footer>
  )
}
