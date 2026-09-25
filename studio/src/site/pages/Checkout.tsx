import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Coffee, CreditCard, FileText, Flame, Loader2, Lock, ShoppingBag, Sparkles, Store, Truck, Wallet, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cartTotals, describeItem, FREE_SHIPPING_FROM, unitPrice, useCart } from '../../lib/cart'
import { useStore } from '../../lib/store'
import type { Order } from '../../lib/types'
import { cn, uid } from '../../lib/utils'
import { Container, siteButtonClass } from '../components'
import { fold } from '../shell/searchIndex'
import { orderNumber, price } from '../lib'
import { CartThumb, FreeShippingBar } from '../shell/commerce'
import { currentUtmSource, isEmail, readSession, usePageTitle, writeSession } from '../shell/hooks'

// ---------------------------------------------------------------------------
// Kasse – einseitig, Validierung inline, Bestellung landet im Studio
// ---------------------------------------------------------------------------

type Delivery = 'versand' | 'abholung'
type Payment = 'paypal' | 'karte' | 'rechnung'
type FieldKey = 'name' | 'email' | 'street' | 'zip' | 'city'

interface FormState {
  name: string
  email: string
  street: string
  zip: string
  city: string
  delivery: Delivery
  payment: Payment
  newsletter: boolean
}

const FIELD_ORDER: FieldKey[] = ['name', 'email', 'street', 'zip', 'city']

const FIELD_LABELS: Record<FieldKey, string> = { name: 'Name', email: 'E-Mail', street: 'Straße & Hausnummer', zip: 'PLZ', city: 'Ort' }

/** Kontakt für die laufende Sitzung merken (nur Name & E-Mail, nur sessionStorage) */
const CONTACT_KEY = 'rb-checkout-contact'

function readContact(): { name: string; email: string } | null {
  try {
    const raw = readSession(CONTACT_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as { name?: unknown; email?: unknown }
    const name = typeof v.name === 'string' ? v.name : ''
    const email = typeof v.email === 'string' ? v.email : ''
    return name || email ? { name, email } : null
  } catch {
    return null
  }
}

/**
 * Kleine PLZ-Tabelle (Thüringen & große Städte) – nur als Vorschlag für den Ort.
 * Bereiche sind bewusst grob; das Feld bleibt immer frei editierbar.
 */
const ZIP_RANGES: [number, number, string][] = [
  [99423, 99427, 'Weimar'],
  [99084, 99099, 'Erfurt'],
  [7743, 7751, 'Jena'],
  [4103, 4357, 'Leipzig'],
  [10115, 14199, 'Berlin'],
  [99510, 99510, 'Apolda'],
  [99867, 99867, 'Gotha'],
  [99817, 99817, 'Eisenach'],
  [7545, 7557, 'Gera'],
  [6108, 6132, 'Halle (Saale)'],
  [1067, 1328, 'Dresden'],
  [20095, 22769, 'Hamburg'],
  [80331, 81929, 'München'],
  [50667, 51149, 'Köln'],
  [60306, 60599, 'Frankfurt am Main'],
]

function cityForZip(zip: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null
  const n = Number(zip)
  return ZIP_RANGES.find(([a, b]) => n >= a && n <= b)?.[2] ?? null
}

const PAYMENTS: { id: Payment; label: string; hint: string; icon: LucideIcon }[] = [
  { id: 'paypal', label: 'PayPal', hint: 'Weiterleitung zu PayPal', icon: Wallet },
  { id: 'karte', label: 'Kreditkarte', hint: 'Visa & Mastercard', icon: CreditCard },
  { id: 'rechnung', label: 'Rechnung', hint: 'Zahlung nach Erhalt', icon: FileText },
]

function validate(f: FormState): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (f.name.trim().length < 2) e.name = 'Bitte gib deinen Namen an.'
  if (!isEmail(f.email)) e.email = 'Bitte gib eine gültige E-Mail-Adresse an.'
  if (f.delivery === 'versand') {
    if (f.street.trim().length < 3) e.street = 'Bitte gib Straße und Hausnummer an.'
    if (!/^\d{5}$/.test(f.zip.trim())) e.zip = 'Die PLZ hat fünf Ziffern.'
    if (f.city.trim().length < 2) e.city = 'Bitte gib deinen Ort an.'
  }
  return e
}

interface Done {
  order: Order
  firstName: string
  pickup: boolean
}

export function CheckoutPage() {
  const [done, setDone] = useState<Done | null>(null)
  usePageTitle(done ? 'Bestellung bestätigt' : 'Kasse')
  const items = useCart((s) => s.items)
  if (done) return <Confirmation done={done} />
  if (!items.length) return <EmptyCheckout />
  return <CheckoutForm onDone={setDone} />
}

// ---------------------------------------------------------------------------
// Formular
// ---------------------------------------------------------------------------

function CheckoutForm({ onDone }: { onDone: (d: Done) => void }) {
  const items = useCart((s) => s.items)
  const clear = useCart((s) => s.clear)
  const setCartOpen = useCart((s) => s.setOpen)
  const products = useStore((s) => s.products)
  const placeOrder = useStore((s) => s.placeOrder)
  const subscribe = useStore((s) => s.subscribe)
  const totals = useMemo(() => cartTotals(items, products), [items, products])

  const [restored, setRestored] = useState(() => readContact() !== null)
  const [form, setForm] = useState<FormState>(() => {
    const c = readContact()
    return { name: c?.name ?? '', email: c?.email ?? '', street: '', zip: '', city: '', delivery: 'versand', payment: 'paypal', newsletter: false }
  })
  const [autoCity, setAutoCity] = useState<string | null>(null)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const summaryRef = useRef<HTMLDivElement>(null)

  // Name & E-Mail für diese Sitzung merken (z. B. wenn man noch mal in den Shop springt)
  useEffect(() => {
    if (form.name || form.email) writeSession(CONTACT_KEY, JSON.stringify({ name: form.name, email: form.email }))
  }, [form.name, form.email])

  // Nach einem Absendeversuch mit Fehlern: Fokus auf die Fehlerübersicht
  useEffect(() => {
    if (attempt) summaryRef.current?.focus()
  }, [attempt])
  const [pending, setPending] = useState(false)
  const [showItems, setShowItems] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const errors = validate(form)
  const show = (k: FieldKey) => (submitted || touched[k] ? errors[k] : undefined)
  const pickup = form.delivery === 'abholung'
  const shipping = pickup ? 0 : totals.shipping
  const total = Math.round((totals.subtotal + shipping) * 100) / 100
  const contactOk = !errors.name && !errors.email
  const deliveryOk = !errors.street && !errors.zip && !errors.city

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))
  const blur = (k: FieldKey) => () => setTouched((t) => ({ ...t, [k]: true }))
  const errorKeys = FIELD_ORDER.filter((k) => errors[k])
  const zipCity = cityForZip(form.zip)
  const cityIsAuto = autoCity !== null && form.city === autoCity

  const onZip = (raw: string) => {
    const zip = raw.replace(/[^\d]/g, '').slice(0, 5)
    const suggestion = cityForZip(zip)
    setForm((f) => {
      // Ort nur vorschlagen, wenn er leer ist oder selbst schon ein Vorschlag war
      const fill = suggestion && (!f.city.trim() || f.city === autoCity)
      return { ...f, zip, city: fill ? suggestion : f.city }
    })
    if (suggestion && (!form.city.trim() || form.city === autoCity)) setAutoCity(suggestion)
  }

  const forgetContact = () => {
    writeSession(CONTACT_KEY, '')
    setForm((f) => ({ ...f, name: '', email: '' }))
    setRestored(false)
    document.getElementById('co-name')?.focus()
  }

  const focusField = (k: FieldKey) => {
    const el = document.getElementById(`co-${k}`)
    el?.focus({ preventScroll: true })
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    setSubmitted(true)
    if (errorKeys.length) {
      setAttempt((n) => n + 1)
      return
    }
    setPending(true)
    timer.current = window.setTimeout(() => {
      const order: Order = {
        id: uid('ord'),
        number: orderNumber(),
        createdAt: new Date().toISOString(),
        customer: { name: form.name.trim(), email: form.email.trim().toLowerCase(), city: pickup ? 'Weimar' : form.city.trim() },
        items: items.map((i) => {
          const d = describeItem(i, products)
          return { label: d.title, detail: d.detail, qty: i.qty, unit: unitPrice(i, products) }
        }),
        shipping,
        total,
        hasAbo: totals.hasAbo,
        utmSource: currentUtmSource(),
      }
      placeOrder(order)
      if (form.newsletter) subscribe(form.email, 'Kasse')
      clear()
      window.scrollTo(0, 0)
      onDone({ order, firstName: form.name.trim().split(/\s+/)[0] ?? '', pickup })
    }, 700)
  }

  return (
    <Container className="pt-8 pb-20 md:pt-12 md:pb-28">
      <Link to="/shop" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-ink-3 transition-colors hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Weiter einkaufen
      </Link>
      <div className="mt-2 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h1 className="font-display text-5xl leading-none font-semibold tracking-[-0.03em] text-ink md:text-6xl">Kasse</h1>
        <CheckoutSteps current={2} onCart={() => setCartOpen(true)} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
        {/* Zusammenfassung */}
        <aside aria-labelledby="co-summary" className="lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:self-start">
          <div className="rounded-[28px] border border-line bg-surface p-5 shadow-soft sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 id="co-summary" className="font-display text-2xl font-semibold text-ink">
                Deine Bestellung
              </h2>
              <button type="button" onClick={() => setCartOpen(true)} className="text-sm font-semibold text-accent-text hover:underline">
                Bearbeiten
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowItems((v) => !v)}
              aria-expanded={showItems}
              aria-controls="co-items"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 lg:hidden"
            >
              {showItems ? 'Artikel ausblenden' : `${totals.count} Artikel anzeigen`}
              <ChevronDown className={cn('size-4 transition-transform', showItems && 'rotate-180')} aria-hidden />
            </button>
            <ul id="co-items" className={cn('mt-5 divide-y divide-line lg:block', showItems ? 'block' : 'hidden')}>
              {items.map((i) => {
                const d = describeItem(i, products)
                const unit = unitPrice(i, products)
                return (
                  <li key={i.key} className="flex items-center gap-4 py-3.5">
                    <div className="relative">
                      <CartThumb item={i} products={products} className="size-14" />
                      <span className="tabular absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-canvas">{i.qty}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{d.title}</p>
                      <p className="truncate text-xs text-ink-3">{d.detail}</p>
                      <p className="tabular text-xs text-ink-3">
                        {i.qty} × {price(unit)}
                      </p>
                    </div>
                    <p className="tabular text-sm font-semibold text-ink">{price(unit * i.qty)}</p>
                  </li>
                )
              })}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-ink-2">
                <dt>Zwischensumme</dt>
                <dd className="tabular">{price(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-2">
                <dt>{pickup ? 'Abholung' : 'Versand'}</dt>
                <dd className="tabular">{shipping === 0 ? <span className="font-medium text-success">kostenlos</span> : price(shipping)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3 text-ink">
                <dt className="font-semibold">
                  Gesamt <span className="text-xs font-normal text-ink-3">inkl. MwSt.</span>
                </dt>
                <dd className="tabular font-display text-2xl font-semibold">{price(total)}</dd>
              </div>
            </dl>
            {!pickup ? <FreeShippingBar subtotal={totals.subtotal} freeFrom={FREE_SHIPPING_FROM} free={totals.shipping === 0} className="mt-5 rounded-2xl bg-surface-2/60 p-4" /> : null}
          </div>
          <ul className="mt-5 hidden space-y-2 px-2 text-sm text-ink-2 lg:block">
            <li className="flex items-center gap-2.5">
              <Flame className="size-4 text-accent-text" aria-hidden /> Frisch geröstet in Weimar
            </li>
            <li className="flex items-center gap-2.5">
              <Truck className="size-4 text-accent-text" aria-hidden />
              <span>
                Röstung & Versand in 1–3 Werktagen <span className="text-ink-3">(Beispiel)</span>
              </span>
            </li>
          </ul>
        </aside>

        <form onSubmit={onSubmit} noValidate className="space-y-6 lg:col-start-1 lg:row-start-1" aria-describedby="co-demo">
          {submitted && errorKeys.length ? (
            <div ref={summaryRef} tabIndex={-1} role="alert" aria-labelledby="co-errors-title" className="animate-fade-in rounded-[28px] border-2 border-danger/40 bg-danger-soft p-5 focus:outline-none focus-visible:ring-4 focus-visible:ring-danger/20 sm:p-6">
              <h2 id="co-errors-title" className="font-display text-xl font-semibold text-danger">
                Fast geschafft – {errorKeys.length === 1 ? 'eine Angabe fehlt noch' : `${errorKeys.length} Angaben fehlen noch`}:
              </h2>
              <ul className="mt-3 space-y-1">
                {errorKeys.map((k) => (
                  <li key={k}>
                    <a
                      href={`#co-${k}`}
                      onClick={(e) => {
                        e.preventDefault()
                        focusField(k)
                      }}
                      className="inline-block py-1 text-[15px] leading-snug text-danger underline decoration-danger/40 underline-offset-2 hover:decoration-danger"
                    >
                      <strong className="font-semibold">{FIELD_LABELS[k]}:</strong> {errors[k]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Section n={1} title="Kontakt" done={contactOk}>
            {restored && (form.name || form.email) ? (
              <p className="-mt-1 mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
                <Check className="size-4 text-success" aria-hidden />
                Aus dieser Sitzung übernommen.
                <button type="button" onClick={forgetContact} className="inline-flex min-h-9 items-center font-semibold text-accent-text underline-offset-2 hover:underline">
                  Nicht du? Felder leeren
                </button>
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="co-name" label="Vor- und Nachname" value={form.name} onChange={(v) => set('name', v)} onBlur={blur('name')} error={show('name')} autoComplete="name" />
              <TextField
                id="co-email"
                label="E-Mail"
                type="email"
                inputMode="email"
                value={form.email}
                onChange={(v) => set('email', v)}
                onBlur={blur('email')}
                error={show('email')}
                autoComplete="email"
                hint="Für Bestellbestätigung & Versandinfo"
              />
            </div>
          </Section>

          <Section n={2} title="Lieferung" done={contactOk && deliveryOk}>
            <div role="radiogroup" aria-label="Lieferart" className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                checked={!pickup}
                onSelect={() => set('delivery', 'versand')}
                icon={Truck}
                title="Versand"
                hint={totals.shipping === 0 ? 'kostenlos' : `${price(totals.shipping)} · frei ab ${price(FREE_SHIPPING_FROM)}`}
              />
              <ChoiceCard
                checked={pickup}
                onSelect={() => set('delivery', 'abholung')}
                icon={Store}
                title="Abholung in der Rösterei"
                hint={totals.hasAbo ? 'Mit Abo nur Versand möglich' : 'kostenlos · Richard-Wagner-Str. 17'}
                disabled={totals.hasAbo}
              />
            </div>
            {pickup ? (
              <p className="mt-4 animate-fade-in rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">
                Wir melden uns per E-Mail, sobald deine Bestellung in der Rösterei bereitliegt.
              </p>
            ) : (
              <div className="mt-5 grid animate-fade-in gap-4 sm:grid-cols-[1fr_140px_1fr]">
                <TextField
                  id="co-street"
                  label="Straße & Hausnummer"
                  value={form.street}
                  onChange={(v) => set('street', v)}
                  onBlur={blur('street')}
                  error={show('street')}
                  autoComplete="street-address"
                  className="sm:col-span-3"
                />
                <TextField
                  id="co-zip"
                  label="PLZ"
                  value={form.zip}
                  onChange={onZip}
                  onBlur={blur('zip')}
                  error={show('zip')}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  className="sm:col-span-1"
                />
                <TextField
                  id="co-city"
                  label="Ort"
                  value={form.city}
                  onChange={(v) => set('city', v)}
                  onBlur={blur('city')}
                  error={show('city')}
                  autoComplete="address-level2"
                  className="sm:col-span-2"
                  hint={
                    cityIsAuto ? (
                      <>Aus der PLZ ergänzt – bitte kurz prüfen.</>
                    ) : zipCity && form.city.trim() && fold(form.city) !== fold(zipCity) ? (
                      <>
                        Zur PLZ passt eher{' '}
                        <button
                          type="button"
                          onClick={() => {
                            set('city', zipCity)
                            setAutoCity(zipCity)
                          }}
                          className="font-semibold text-accent-text underline underline-offset-2"
                        >
                          {zipCity} übernehmen
                        </button>
                      </>
                    ) : undefined
                  }
                />
              </div>
            )}
          </Section>

          <Section n={3} title="Zahlung" done={contactOk && deliveryOk}>
            <p id="co-demo" className="mb-4 flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <strong className="font-semibold">Demo – es wird nichts belastet.</strong> Im Prototyp wird keine Zahlung ausgelöst und nichts verschickt.
              </span>
            </p>
            <div role="radiogroup" aria-label="Zahlungsart" className="grid gap-3 sm:grid-cols-3">
              {PAYMENTS.map((p) => (
                <ChoiceCard key={p.id} checked={form.payment === p.id} onSelect={() => set('payment', p.id)} icon={p.icon} title={p.label} hint={p.hint} />
              ))}
            </div>
          </Section>

          <label className="flex cursor-pointer items-start gap-3 rounded-3xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
            <input type="checkbox" checked={form.newsletter} onChange={(e) => set('newsletter', e.target.checked)} className="peer sr-only" />
            <span
              aria-hidden
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]',
                form.newsletter ? 'border-accent bg-accent-solid text-on-accent' : 'border-line-strong bg-surface',
              )}
            >
              {form.newsletter ? <Check className="size-3.5" strokeWidth={3} /> : null}
            </span>
            <span className="text-sm">
              <span className="font-semibold text-ink">Ja, ich will die Röstbrüder Post.</span>
              <span className="block text-ink-2">Eine Mail pro Monat: neue Kaffees, Termine, Brüh-Tipps. Abmeldung jederzeit.</span>
            </span>
          </label>

          <div className="rounded-3xl bg-surface-2/60 p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-ink-2">Gesamt inkl. MwSt.</span>
              <span className="tabular font-display text-3xl font-semibold text-ink">{price(total)}</span>
            </div>
            <button type="submit" disabled={pending} className={cn(siteButtonClass('primary'), 'mt-4 h-14 w-full text-base disabled:opacity-80')}>
              {pending ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  Bestellung wird übermittelt …
                </>
              ) : (
                <>
                  Zahlungspflichtig bestellen
                  <ArrowRight className="size-4" aria-hidden />
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-ink-3">
              Mit deiner Bestellung bestätigst du, die{' '}
              <Link to="/datenschutz" className="underline underline-offset-2 hover:text-ink">
                Datenschutzerklärung
              </Link>{' '}
              gelesen zu haben. Demo: Es wird nichts belastet.
            </p>
            {submitted && errorKeys.length ? (
              <p className="mt-3 text-center text-sm font-medium text-danger">
                Fast geschafft – oben siehst du, was noch fehlt.{' '}
                <button type="button" onClick={() => summaryRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })} className="font-semibold underline underline-offset-2">
                  Zur Übersicht
                </button>
              </p>
            ) : null}
          </div>
        </form>

      </div>
    </Container>
  )
}

function CheckoutSteps({ current, onCart, className }: { current: 1 | 2 | 3; onCart?: () => void; className?: string }) {
  const steps = ['Warenkorb', 'Daten', 'Bestätigung']
  return (
    <nav aria-label="Bestellfortschritt" className={cn('w-full md:w-auto', className)}>
      <ol className="flex items-center text-[13px] sm:text-sm">
        {steps.map((label, i) => {
          const n = i + 1
          const done = n < current || (current === 3 && n === 3)
          const isCurrent = n === current
          return (
            <li key={label} className={cn('flex items-center', i < steps.length - 1 && 'flex-1 md:flex-none')} aria-current={isCurrent ? 'step' : undefined}>
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'tabular flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    done ? 'bg-success text-canvas' : isCurrent ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink-3',
                  )}
                  aria-hidden
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
                </span>
                {n === 1 && onCart ? (
                  <button type="button" onClick={onCart} className="-mx-1.5 inline-flex min-h-11 items-center rounded-full px-1.5 font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                    {label}
                  </button>
                ) : (
                  <span className={cn('font-medium whitespace-nowrap', isCurrent || done ? 'text-ink' : 'text-ink-3')}>{label}</span>
                )}
                <span className="sr-only">{done ? ' (erledigt)' : isCurrent ? ' (aktueller Schritt)' : ''}</span>
              </span>
              {i < steps.length - 1 ? (
                <span aria-hidden className={cn('mx-2 h-0.5 min-w-3 flex-1 rounded-full sm:mx-3 md:w-10 md:flex-none', n < current ? 'bg-success' : 'bg-line-strong')} />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function Section({ n, title, done, children }: { n: number; title: string; done: boolean; children: ReactNode }) {
  return (
    <fieldset className="rounded-[28px] border border-line bg-surface p-5 shadow-soft sm:p-7">
      <legend className="sr-only">
        Schritt {n}: {title}
      </legend>
      <div className="mb-5 flex items-center gap-3" aria-hidden>
        <span className={cn('tabular flex size-8 items-center justify-center rounded-full text-sm font-bold transition-colors', done ? 'bg-success text-canvas' : 'bg-ink text-canvas')}>
          {done ? <Check className="size-4" /> : n}
        </span>
        <span className="font-display text-2xl font-semibold text-ink">{title}</span>
      </div>
      {children}
    </fieldset>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  className,
  ...rest
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: ReactNode
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id' | 'className'>) {
  const msgId = `${id}-msg`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error || hint ? msgId : undefined}
        className={cn(
          'h-12 w-full rounded-2xl border bg-canvas px-4 text-base text-ink transition-[border-color,box-shadow] placeholder:text-ink-3 focus:outline-none focus:ring-4',
          error ? 'border-danger focus:ring-danger/15' : 'border-line hover:border-line-strong focus:border-accent focus:ring-accent/15',
        )}
        {...rest}
      />
      {error ? (
        <p id={msgId} className="mt-1.5 animate-fade-in text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="mt-1.5 animate-fade-in text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function ChoiceCard({
  checked,
  onSelect,
  icon: Icon,
  title,
  hint,
  disabled,
}: {
  checked: boolean
  onSelect: () => void
  icon: LucideIcon
  title: string
  hint: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-[border-color,background-color] duration-200 disabled:cursor-not-allowed disabled:opacity-55',
        checked ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:border-line-strong',
      )}
    >
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors', checked ? 'bg-accent-solid text-on-accent' : 'bg-surface-2 text-ink-2')}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 pr-5">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs leading-snug text-ink-3">{hint}</span>
      </span>
      <span
        aria-hidden
        className={cn('absolute top-3 right-3 size-4 rounded-full border-2 transition-colors', checked ? 'border-accent bg-accent shadow-[inset_0_0_0_2px_var(--accent-soft)]' : 'border-line-strong')}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Leerer Warenkorb & Bestätigung
// ---------------------------------------------------------------------------

function EmptyCheckout() {
  return (
    <Container className="flex min-h-[64vh] flex-col items-center justify-center py-24 text-center">
      <div className="relative flex size-32 items-center justify-center rounded-full bg-accent-soft">
        <ShoppingBag className="size-12 text-accent-text" aria-hidden />
      </div>
      <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">Dein Warenkorb ist leer.</h1>
      <p className="mt-3 max-w-md text-ink-2">Die Kasse ist bereit, der Röster auch – es fehlt nur noch dein Kaffee.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/shop" className={siteButtonClass('primary')}>
          Kaffee aussuchen
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link to="/geschmacksfinder" className={siteButtonClass('secondary')}>
          <Sparkles className="size-4" aria-hidden />
          Geschmacksfinder
        </Link>
      </div>
    </Container>
  )
}

function Confirmation({ done }: { done: Done }) {
  const { order, firstName, pickup } = done
  const headingRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  const timeline: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: Flame, title: 'Röstung', text: 'Wir rösten deinen Kaffee frisch in der Richard-Wagner-Straße.' },
    pickup
      ? { icon: Store, title: 'Abholbereit', text: 'Wir schreiben dir, sobald alles in der Rösterei für dich bereitliegt.' }
      : { icon: Truck, title: 'Versand', text: 'Gut verpackt geht er auf die Reise – du bekommst eine Versandinfo.' },
    { icon: Coffee, title: 'Genuss', text: 'Mahlen, brühen, genießen. Und uns gern erzählen, wie er dir schmeckt.' },
  ]
  return (
    <section aria-labelledby={titleId} className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(196_112_47/0.18),transparent)]" />
      <Container className="relative flex flex-col items-center pt-10 pb-24 text-center md:pt-14">
        <CheckoutSteps current={3} className="mb-12 md:mb-16" />
        <div className="relative flex size-24 animate-pop-in items-center justify-center rounded-full bg-success text-canvas shadow-[0_20px_40px_-16px_rgb(79_112_73/0.8)]">
          <Check className="size-11" strokeWidth={2.5} aria-hidden />
          <span className="rb-loop absolute inset-0 animate-[ping_1.2s_cubic-bezier(0,0,0.2,1)_2] rounded-full bg-success/30" aria-hidden />
        </div>
        <h1 ref={headingRef} id={titleId} tabIndex={-1} className="mt-8 font-display text-5xl leading-[1] font-semibold tracking-[-0.03em] text-ink focus:outline-none md:text-7xl">
          Danke{firstName ? `, ${firstName}` : ''}! <em className="font-medium text-accent-text italic">Wir rösten los.</em>
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-2 md:text-lg">
          Deine Bestellung ist bei uns angekommen. Eine Bestätigung geht an <strong className="font-semibold text-ink">{order.customer.email}</strong>
          <span className="text-ink-3"> (im Prototyp wird keine E-Mail verschickt)</span>.
        </p>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm shadow-soft">
          <span className="text-ink-3">Bestellnummer</span>
          <span className="tabular font-semibold tracking-wide text-ink">{order.number}</span>
        </p>

        <ol className="mt-14 grid w-full max-w-4xl gap-4 text-left md:grid-cols-3">
          {timeline.map((t, i) => (
            <li
              key={t.title}
              className="relative animate-[rb-rise_600ms_cubic-bezier(0.2,0.8,0.2,1)_both] rounded-[28px] border border-line bg-surface p-6 shadow-soft"
              style={{ animationDelay: `${200 + i * 120}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className={cn('flex size-11 items-center justify-center rounded-2xl', i === 0 ? 'bg-accent-solid text-on-accent' : 'bg-surface-2 text-ink-2')}>
                  <t.icon className="size-5" aria-hidden />
                </span>
                <span className="tabular text-xs font-semibold tracking-[0.2em] text-ink-3 uppercase">Schritt {i + 1}</span>
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold text-ink">{t.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{t.text}</p>
              {i === 0 ? <span className="absolute top-6 right-6 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-text">jetzt</span> : null}
            </li>
          ))}
        </ol>

        <div className="mt-10 w-full max-w-md rounded-[28px] border border-line bg-surface p-6 text-left shadow-soft">
          <ul className="space-y-2 text-sm">
            {order.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="min-w-0">
                  <span className="font-medium text-ink">
                    {it.qty} × {it.label}
                  </span>
                  <span className="block truncate text-xs text-ink-3">{it.detail}</span>
                </span>
                <span className="tabular shrink-0 text-ink">{price(it.unit * it.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-ink-2">{pickup ? 'Abholung' : 'Versand'}</span>
            <span className="tabular">{order.shipping === 0 ? 'kostenlos' : price(order.shipping)}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-semibold text-ink">Gesamt</span>
            <span className="tabular font-display text-2xl font-semibold text-ink">{price(order.total)}</span>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className={siteButtonClass('primary')}>
            Weiter stöbern
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link to="/anleitungen" className={siteButtonClass('secondary')}>
            <BookOpen className="size-4" aria-hidden />
            Brühanleitungen
          </Link>
        </div>

        <p className="mt-14 text-xs text-ink-3">
          Fürs Team: Diese Bestellung erscheint jetzt live im Studio.{' '}
          <Link to="/studio/website" className="font-semibold text-accent-text underline-offset-2 hover:underline">
            Im Studio ansehen
          </Link>
        </p>
      </Container>
    </section>
  )
}
