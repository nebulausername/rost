import { BarChart3, Check, Lock, Megaphone, ShieldCheck, X, type LucideIcon } from 'lucide-react'
import { useCallback, useId, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router'
import { cn } from '../../lib/utils'
import { useConsent, useConsentUi, type Prefs } from './consent'
import { useDialog, usePresence } from './hooks'

// ---------------------------------------------------------------------------
// Cookie-Banner beim ersten Besuch + Einstellungs-Dialog (Footer-Link „Cookie-Einstellungen“)
// ---------------------------------------------------------------------------

const CATEGORIES: { id: 'necessary' | keyof Prefs; title: string; icon: LucideIcon; text: string; examples: string }[] = [
  {
    id: 'necessary',
    title: 'Notwendig',
    icon: ShieldCheck,
    text: 'Damit Warenkorb, Kasse und diese Auswahl funktionieren. Ohne geht’s nicht – deshalb immer an.',
    examples: 'Warenkorb, Einwilligung, Sitzung',
  },
  {
    id: 'statistics',
    title: 'Statistik',
    icon: BarChart3,
    text: 'Zeigt uns zusammengefasst und ohne Namen, welche Seiten gelesen und welche Kaffees angeschaut werden. So wissen wir, was wir verbessern sollten.',
    examples: 'Seitenaufrufe, Klickwege (anonymisiert)',
  },
  {
    id: 'marketing',
    title: 'Marketing',
    icon: Megaphone,
    text: 'Erlaubt Werbepartnern wie Instagram/Meta zu messen, ob unsere Anzeigen dich erreicht haben – und dir passendere zu zeigen.',
    examples: 'Werbe-Pixel, Kampagnen-Messung',
  },
]

const choiceButton =
  'inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-[15px] font-semibold whitespace-nowrap transition-[background-color,color,border-color,transform] duration-200 active:scale-[0.98]'
/** Beide Entscheidungen sehen exakt gleich aus – keine Lenkung */
const decisionClass = cn(choiceButton, 'bg-ink text-canvas hover:bg-accent-solid hover:text-on-accent')
const secondaryClass = cn(choiceButton, 'border border-line-strong bg-surface text-ink hover:border-ink/40')

function PrototypeHint({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 rounded-2xl bg-surface-2/70 px-3.5 py-2.5 text-xs leading-relaxed text-ink-2', className)}>
      <Lock className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden />
      <span>
        <strong className="font-semibold text-ink">Prototyp:</strong> Es werden keine Tracking-Cookies gesetzt. Deine Wahl wird nur lokal in deinem Browser gespeichert.
      </span>
    </p>
  )
}

export function ConsentManager() {
  const record = useConsentUi((s) => s.record)
  const settingsOpen = useConsentUi((s) => s.settingsOpen)
  return (
    <>
      {record === null && !settingsOpen ? <ConsentBanner /> : null}
      <ConsentSettings open={settingsOpen} />
    </>
  )
}

function ConsentBanner() {
  const { acceptAll, acceptNecessary, openSettings } = useConsent()
  const titleId = useId()
  return (
    <section
      aria-labelledby={titleId}
      className="fixed inset-x-3 bottom-3 z-[60] animate-[rb-rise_520ms_cubic-bezier(0.2,0.8,0.2,1)_both] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[440px]"
    >
      <div className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-[28px] border border-line bg-surface p-5 shadow-float sm:p-6">
        <div className="flex items-start gap-3.5">
          <CookieBean className="size-11 shrink-0" />
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-xl leading-tight font-semibold tracking-tight text-ink sm:text-2xl">
              Ein Keks zum Kaffee?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Für Warenkorb & Kasse brauchen wir nur das Nötigste. Mit deinem Okay würden wir außerdem anonym messen, was gut ankommt, und Werbung passender machen. Du kannst das jederzeit unter
              „Cookie-Einstellungen“ im Footer ändern.{' '}
              <Link to="/datenschutz#cookies" className="font-medium text-ink underline decoration-ink/30 underline-offset-2 hover:decoration-ink">
                Mehr erfahren
              </Link>
            </p>
          </div>
        </div>
        <PrototypeHint className="mt-4" />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={acceptNecessary} className={decisionClass}>
            Nur notwendige
          </button>
          <button type="button" onClick={acceptAll} className={decisionClass}>
            Alle akzeptieren
          </button>
          <button type="button" onClick={openSettings} className={cn(secondaryClass, 'col-span-2')}>
            Einstellungen
          </button>
        </div>
      </div>
    </section>
  )
}

function ConsentSettings({ open }: { open: boolean }) {
  const setSettingsOpen = useConsentUi((s) => s.setSettingsOpen)
  const close = useCallback(() => setSettingsOpen(false), [setSettingsOpen])
  const { mounted, closing } = usePresence(open, 220)
  const ref = useRef<HTMLDivElement>(null)
  useDialog(open, close, ref)
  if (!mounted) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden
        onClick={close}
        className={cn('absolute inset-0 bg-[#140c07]/50 backdrop-blur-[3px]', closing ? 'animate-[rb-fade-out_220ms_ease_both]' : 'animate-fade-in')}
      />
      {/* Formular erst beim Öffnen mounten → startet immer mit dem gespeicherten Stand */}
      <SettingsPanel panelRef={ref} closing={closing} onClose={close} />
    </div>
  )
}

function SettingsPanel({ panelRef, closing, onClose }: { panelRef: RefObject<HTMLDivElement | null>; closing: boolean; onClose: () => void }) {
  const { save, date, statistics, marketing, decided } = useConsent()
  const [prefs, setPrefs] = useState<Prefs>({ statistics, marketing })
  const titleId = useId()
  const descId = useId()
  const saved = date ? new Date(date) : null
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={cn(
        'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-canvas shadow-float sm:max-w-xl sm:rounded-[28px]',
        closing ? 'animate-[rb-fade-out_220ms_ease_both]' : 'animate-[rb-rise_380ms_cubic-bezier(0.2,0.8,0.2,1)_both]',
      )}
    >
      <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-7">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-accent-text uppercase">Datenschutz</p>
          <h2 id={titleId} className="mt-1.5 font-display text-3xl leading-tight font-semibold tracking-tight text-ink">
            Cookie-Einstellungen
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-autofocus
          aria-label="Einstellungen schließen"
          className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-5 sm:px-7">
        <p id={descId} className="text-sm leading-relaxed text-ink-2">
          Du entscheidest, was wir außer dem Nötigsten nutzen dürfen. Optionale Kategorien sind aus, bis du sie einschaltest.
        </p>
        <ul className="mt-5 space-y-3">
          {CATEGORIES.map((c) => {
            const locked = c.id === 'necessary'
            const checked = locked ? true : prefs[c.id as keyof Prefs]
            return (
              <li key={c.id} className={cn('rounded-3xl border p-4 transition-colors sm:p-5', checked && !locked ? 'border-accent/60 bg-accent-soft/60' : 'border-line bg-surface')}>
                <div className="flex items-start gap-3.5">
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', checked ? 'bg-accent-solid text-on-accent' : 'bg-surface-2 text-ink-2')}>
                    <c.icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 id={`${titleId}-${c.id}`} className="font-semibold text-ink">
                        {c.title}
                      </h3>
                      {locked ? (
                        <span className="inline-flex h-8 items-center gap-1 rounded-full bg-success-soft px-3 text-xs font-semibold text-success">
                          <Check className="size-3.5" aria-hidden /> Immer aktiv
                        </span>
                      ) : (
                        <Switch
                          checked={checked}
                          labelledBy={`${titleId}-${c.id}`}
                          onChange={(v) => setPrefs((p) => ({ ...p, [c.id]: v }))}
                        />
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{c.text}</p>
                    <p className="mt-1.5 text-xs text-ink-3">Zum Beispiel: {c.examples}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <PrototypeHint className="mt-4" />
        <p className="mt-3 text-xs text-ink-3">
          {decided && saved ? (
            <>
              Zuletzt gespeichert am <span className="tabular">{saved.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span> ·{' '}
            </>
          ) : null}
          Details in der{' '}
          <Link to="/datenschutz#cookies" onClick={onClose} className="underline underline-offset-2 hover:text-ink">
            Datenschutzerklärung
          </Link>
          .
        </p>
      </div>
      <footer className="grid gap-2.5 border-t border-line bg-surface px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:grid-cols-3 sm:px-7 sm:pb-5">
        <button type="button" onClick={() => save({ statistics: false, marketing: false })} className={decisionClass}>
          Nur notwendige
        </button>
        <button type="button" onClick={() => save(prefs)} className={secondaryClass}>
          Auswahl speichern
        </button>
        <button type="button" onClick={() => save({ statistics: true, marketing: true })} className={decisionClass}>
          Alle akzeptieren
        </button>
      </footer>
    </div>
  )
}

function Switch({ checked, onChange, labelledBy }: { checked: boolean; onChange: (v: boolean) => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors after:absolute after:-inset-2 after:content-[""]',
        checked ? 'bg-accent-solid' : 'bg-line-strong',
      )}
    >
      <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-6' : 'translate-x-1')} />
      <span className="sr-only">{checked ? 'an' : 'aus'}</span>
    </button>
  )
}

/** Kaffeebohne mit Biss – Keks & Kaffee in einem */
function CookieBean({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="22" className="fill-accent-soft" />
      <path d="M40 13a7 7 0 0 1-7-6 22 22 0 0 0-4-.9A22 22 0 1 0 45.8 21a6 6 0 0 1-5.8-8Z" className="fill-accent" opacity="0.28" />
      <g transform="rotate(-28 24 25)">
        <ellipse cx="24" cy="25" rx="8.5" ry="12" className="fill-roast" />
        <path d="M24 13.5c-3 4-3 7.5 0 11.5s3 7.5 0 11.5" fill="none" stroke="var(--canvas)" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      </g>
      <circle cx="12" cy="17" r="1.6" className="fill-roast" opacity="0.5" />
      <circle cx="36" cy="33" r="1.8" className="fill-roast" opacity="0.5" />
      <circle cx="14" cy="34" r="1.2" className="fill-roast" opacity="0.5" />
    </svg>
  )
}
