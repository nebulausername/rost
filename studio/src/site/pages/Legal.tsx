import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { Container, Eyebrow } from '../components'
import { useDocumentTitle } from '../content/hooks'

// Rechtstexte: bewusst nur Struktur + klar markierte Platzhalter.
// Keine Firmennamen, Inhaber, Registernummern, Telefonnummern o. Ä. erfinden –
// die Angaben kommen aus dem bestehenden Impressum von roestbrueder.com.

const TODO = '[Angaben aus dem bestehenden Impressum von roestbrueder.com übernehmen]'

function Placeholder({ children = TODO }: { children?: ReactNode }) {
  return <mark className="rounded-md bg-warning-soft px-1.5 py-0.5 font-medium text-warning [box-decoration-break:clone]">{children}</mark>
}

interface Section {
  id: string
  title: string
  body: ReactNode
}

export function LegalPage() {
  const { pathname } = useLocation()
  const isPrivacy = pathname.startsWith('/datenschutz')
  useDocumentTitle(isPrivacy ? 'Datenschutz' : 'Impressum')
  const cafes = useStore((s) => s.cafes)

  const sections: Section[] = isPrivacy ? privacySections() : imprintSections(cafes.map((c) => ({ name: c.name, address: c.address })))

  return (
    <Container className="py-14 md:py-20">
      <nav aria-label="Rechtliches" className="mb-10 inline-flex rounded-full border border-line bg-surface p-1">
        {[
          { to: '/impressum', label: 'Impressum', active: !isPrivacy },
          { to: '/datenschutz', label: 'Datenschutz', active: isPrivacy },
        ].map((t) => (
          <Link
            key={t.to}
            to={t.to}
            aria-current={t.active ? 'page' : undefined}
            className={cn('h-9 rounded-full px-4 text-sm leading-9 font-semibold transition-colors', t.active ? 'bg-sidebar text-sidebar-ink' : 'text-ink-3 hover:text-ink')}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-12 lg:grid-cols-[240px_1fr] lg:gap-16">
        <aside className="hidden lg:block">
          <div className="sticky top-32">
            <p className="text-xs font-semibold tracking-[0.18em] text-ink-3 uppercase">Inhalt</p>
            <ol className="mt-4 space-y-1 border-l border-line">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-ink-2 transition-colors hover:border-accent hover:text-ink">
                    <span className="tabular mr-2 text-ink-3">{i + 1}.</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <article className="max-w-3xl">
          <Eyebrow>Rechtliches</Eyebrow>
          <h1 className="mt-3 font-display text-5xl leading-[1] font-semibold tracking-tight text-ink md:text-6xl">{isPrivacy ? 'Datenschutzerklärung' : 'Impressum'}</h1>

          <div className="mt-8 flex gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm leading-relaxed text-ink" role="note">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <p>
              <span className="font-semibold">Entwurf für den Prototyp.</span> Gelb markierte Stellen sind Platzhalter und müssen mit den Angaben aus dem bestehenden {isPrivacy ? 'Datenschutztext' : 'Impressum'} von roestbrueder.com
              ersetzt werden. {isPrivacy ? 'Der finale Text muss vor Veröffentlichung rechtlich geprüft werden.' : 'Vor Veröffentlichung rechtlich prüfen lassen.'}
            </p>
          </div>

          <div className="mt-12 space-y-12">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28">
                <h2 id={`${s.id}-h`} className="flex items-baseline gap-3 font-display text-2xl font-semibold text-ink md:text-3xl">
                  <span className="tabular text-base text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                <div className="mt-4 space-y-4 text-[16px] leading-relaxed text-ink-2 [&_a]:font-medium [&_a]:text-accent-text [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-16 border-t border-line pt-6 text-sm text-ink-3">
            Stand: <Placeholder>[Datum der finalen Fassung]</Placeholder>
          </p>
        </article>
      </div>
    </Container>
  )
}

// ---------------------------------------------------------------------------
// Impressum
// ---------------------------------------------------------------------------

function imprintSections(cafes: { name: string; address: string }[]): Section[] {
  return [
    {
      id: 'anbieter',
      title: 'Angaben gemäß § 5 DDG',
      body: (
        <>
          <p>
            <Placeholder>[Firmenname und Rechtsform]</Placeholder>
            <br />
            <Placeholder>[Anschrift laut bestehendem Impressum]</Placeholder>
          </p>
          <p>
            Vertreten durch: <Placeholder>[Vertretungsberechtigte Person(en)]</Placeholder>
          </p>
          <p className="text-sm text-ink-3">Hinweis: {TODO}</p>
        </>
      ),
    },
    {
      id: 'kontakt',
      title: 'Kontakt',
      body: (
        <>
          <p>
            Telefon: <Placeholder>[Telefonnummer]</Placeholder>
            <br />
            E-Mail: <Placeholder>[E-Mail-Adresse]</Placeholder>
          </p>
          <p>
            Oder direkt über unser <Link to="/ueber-uns#kontakt">Kontaktformular</Link>.
          </p>
        </>
      ),
    },
    {
      id: 'standorte',
      title: 'Unsere Standorte',
      body: (
        <>
          <ul>
            {cafes.map((c) => (
              <li key={c.name}>
                <span className="font-medium text-ink">{c.name}:</span> {c.address}
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-3">Die Standorte der Cafés ersetzen nicht die ladungsfähige Anschrift oben.</p>
        </>
      ),
    },
    {
      id: 'register',
      title: 'Registereintrag & Umsatzsteuer',
      body: (
        <>
          <p>
            Registergericht & Registernummer: <Placeholder>[falls vorhanden, laut bestehendem Impressum]</Placeholder>
          </p>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: <Placeholder>[USt-IdNr., falls vorhanden]</Placeholder>
          </p>
        </>
      ),
    },
    {
      id: 'verantwortlich',
      title: 'Verantwortlich für den Inhalt',
      body: (
        <p>
          Verantwortlich nach § 18 Abs. 2 MStV: <Placeholder>[Name und Anschrift laut bestehendem Impressum]</Placeholder>
        </p>
      ),
    },
    {
      id: 'streitbeilegung',
      title: 'Verbraucherstreitbeilegung',
      body: (
        <p>
          <Placeholder>[Hinweis zur Teilnahme bzw. Nicht-Teilnahme an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle – aus dem bestehenden Impressum übernehmen und rechtlich prüfen lassen]</Placeholder>
        </p>
      ),
    },
    {
      id: 'haftung',
      title: 'Haftung für Inhalte & Links',
      body: (
        <p>
          <Placeholder>[Haftungshinweise aus dem bestehenden Impressum übernehmen]</Placeholder>
        </p>
      ),
    },
    {
      id: 'bildnachweise',
      title: 'Bildnachweise',
      body: <p>Illustrationen und Grafiken in diesem Prototyp sind selbst erstellt. Für echte Fotos: <Placeholder>[Bildnachweise ergänzen]</Placeholder></p>,
    },
  ]
}

// ---------------------------------------------------------------------------
// Datenschutz
// ---------------------------------------------------------------------------

function privacySections(): Section[] {
  return [
    {
      id: 'verantwortlicher',
      title: 'Verantwortlicher',
      body: (
        <>
          <p>Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne der DSGVO ist:</p>
          <p>
            <Placeholder>{TODO}</Placeholder>
          </p>
          <p>
            Kontakt in Datenschutzfragen: <Placeholder>[E-Mail-Adresse bzw. Kontaktweg]</Placeholder>
          </p>
        </>
      ),
    },
    {
      id: 'hosting',
      title: 'Hosting',
      body: (
        <>
          <p>
            Diese Website wird bei <Placeholder>[Name und Sitz des Hosting-Anbieters]</Placeholder> gehostet. Beim Aufruf werden technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt, aufgerufene Seite, Browser) in Server-Logfiles verarbeitet.
          </p>
          <p>
            Rechtsgrundlage, Speicherdauer und ggf. Auftragsverarbeitungsvertrag: <Placeholder>[ergänzen und prüfen lassen]</Placeholder>
          </p>
        </>
      ),
    },
    {
      id: 'cookies',
      title: 'Cookies & Consent',
      body: (
        <>
          <p>
            Dieser Prototyp setzt keine Tracking-Cookies. Warenkorb und Demo-Daten werden ausschließlich lokal in deinem Browser gespeichert (Local bzw. Session Storage), damit sie einen Seitenwechsel überstehen. Du kannst sie jederzeit über die Browser-Einstellungen löschen.
          </p>
          <p>
            Für die Live-Website: <Placeholder>[Eingesetzte Cookies, Consent-Tool, Kategorien und Rechtsgrundlagen beschreiben]</Placeholder>
          </p>
        </>
      ),
    },
    {
      id: 'newsletter',
      title: 'Newsletter',
      body: (
        <>
          <p>
            Wenn du dich für unseren Newsletter anmeldest (z. B. im Footer oder über den Geschmacksfinder), verarbeiten wir deine E-Mail-Adresse, um dir Neuigkeiten zu schicken. Eine Abmeldung ist jederzeit möglich.
          </p>
          <p>
            Versanddienstleister, Double-Opt-in-Verfahren, Auswertung & Rechtsgrundlage: <Placeholder>[ergänzen]</Placeholder>
          </p>
        </>
      ),
    },
    {
      id: 'shop',
      title: 'Shop & Zahlungsanbieter',
      body: (
        <>
          <p>Für Bestellungen, Abos und Workshop-Buchungen verarbeiten wir die Angaben, die für die Vertragsabwicklung nötig sind – etwa Name, Anschrift, E-Mail-Adresse und Bestelldetails.</p>
          <p>
            Eingesetzte Shop-Software, Zahlungsanbieter und Versanddienstleister: <Placeholder>[Anbieter, Zweck, Rechtsgrundlage und Speicherdauer ergänzen]</Placeholder>
          </p>
        </>
      ),
    },
    {
      id: 'kontaktformular',
      title: 'Kontaktformular',
      body: (
        <p>
          Wenn du uns über das Kontaktformular schreibst, verwenden wir deine Angaben, um deine Anfrage zu beantworten. <Placeholder>[Speicherdauer und Rechtsgrundlage ergänzen]</Placeholder>
        </p>
      ),
    },
    {
      id: 'rechte',
      title: 'Rechte der Betroffenen',
      body: (
        <>
          <p>Du hast nach der DSGVO insbesondere folgende Rechte:</p>
          <ul>
            <li>Auskunft über die zu deiner Person gespeicherten Daten (Art. 15 DSGVO)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li>Löschung (Art. 17 DSGVO) und Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO) und Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)</li>
            <li>Beschwerde bei einer Datenschutz-Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
          <p>
            Zuständige Aufsichtsbehörde & Kontakt für Anfragen: <Placeholder>[ergänzen]</Placeholder>
          </p>
        </>
      ),
    },
  ]
}
