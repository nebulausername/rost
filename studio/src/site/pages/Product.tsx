import { ArrowRight, BookOpen, ChevronDown, Leaf, MapPin, Repeat, Sparkles, Store, Truck } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ABO_PRICES, FREE_SHIPPING_FROM, GRINDS, useCart } from '../../lib/cart'
import { useStore } from '../../lib/store'
import type { BrewMethod, Grind, Product } from '../../lib/types'
import { cn } from '../../lib/utils'
import { CoffeeBag, Container, NoteChips, RoastMeter, siteButtonClass, TasteBars } from '../components'
import { BREW_LABELS, price, ROAST_LABELS } from '../lib'
import { AddToCartButton, ProductCard, QtyStepper } from '../shell/commerce'
import { similarProducts, stageTint, usePageTitle } from '../shell/hooks'

// ---------------------------------------------------------------------------
// Produktseite
// ---------------------------------------------------------------------------

const KIND_LABEL: Record<Product['kind'], string> = {
  espresso: 'Espresso',
  filter: 'Filterkaffee',
  omni: 'Espresso & Filter',
  gift: 'Geschenk',
  voucher: 'Gutschein',
}

const KIND_CAT: Record<Product['kind'], string> = { espresso: 'espresso', filter: 'filter', omni: 'omni', gift: 'geschenke', voucher: 'geschenke' }

const GRIND_HINTS: Record<Grind, string> = {
  bohne: 'Für deine Mühle – bleibt am längsten frisch',
  espresso: 'Siebträger',
  moka: 'Herdkanne',
  filter: 'Handfilter & Maschine',
  french: 'French Press & Cold Brew',
}

const RECIPES: Record<BrewMethod, string> = {
  espresso: '18 g Kaffee → ca. 36 g Espresso in 25–30 Sekunden',
  filter: '15 g auf 250 ml Wasser, 92–94 °C, ca. 3 Minuten',
  french: '30 g grob gemahlen auf 500 ml, 4 Minuten ziehen lassen',
  moka: 'Sieb locker füllen, heißes Wasser einfüllen, mittlere Hitze',
  vollautomat: 'Mahlgrad eher fein, Aroma-Stufe mittel bis stark',
  aeropress: '15 g auf 230 ml, 1:30 Minuten ziehen lassen, sanft pressen',
}

export function ProductPage() {
  const { slug } = useParams()
  const products = useStore((s) => s.products)
  const product = products.find((p) => p.slug === slug)
  usePageTitle(product ? `${product.name} – ${product.subtitle}` : 'Kaffee nicht gefunden')
  if (!product) return <ProductNotFound />
  return <ProductView key={product.id} product={product} products={products} />
}

function ProductNotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <div className="w-32 -rotate-6 opacity-80" aria-hidden>
        <CoffeeBag product={{ name: '???', subtitle: 'unbekannt', color: '#8a7666', roast: 0 }} />
      </div>
      <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">Diesen Kaffee kennen wir (noch) nicht.</h1>
      <p className="mt-3 max-w-md text-ink-2">Vielleicht ist er ausgetrunken, vielleicht hat er einen neuen Namen bekommen. Im Shop wartet aber jede Menge frisch Geröstetes.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/shop" className={siteButtonClass('primary')}>
          Zum Shop
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

function ProductView({ product, products }: { product: Product; products: Product[] }) {
  const add = useCart((s) => s.add)
  const [size, setSize] = useState<'250' | '1000'>('250')
  const [grind, setGrind] = useState<Grind>('bohne')
  const [qty, setQty] = useState(1)
  const [ctaVisible, setCtaVisible] = useState(true)
  const ctaRef = useRef<HTMLDivElement>(null)
  const sizeId = useId()
  const grindId = useId()
  const related = useMemo(() => similarProducts(products, product, 3), [products, product])

  const hasKg = product.priceKg !== null && product.kind !== 'gift' && product.kind !== 'voucher'
  const isGift = product.kind === 'gift' || product.kind === 'voucher'
  const unit = size === '1000' && product.priceKg ? product.priceKg : product.price
  const perKg = size === '1000' ? unit : unit * 4
  const kgSaving = product.priceKg ? Math.round((1 - product.priceKg / (product.price * 4)) * 100) : 0
  const bagLabel = size === '1000' ? '1 kg' : '250 g'

  useEffect(() => {
    const el = ctaRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const addToCart = () => add({ kind: 'product', productId: product.id, size, grind, qty })

  return (
    <>
      <Container className="pt-6 pb-20 md:pt-10 md:pb-28">
        <nav aria-label="Brotkrümel" className="mb-6 text-sm text-ink-3 lg:hidden">
          <Breadcrumb product={product} />
        </nav>
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 xl:gap-20">
          {/* Bühne */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="relative aspect-square overflow-hidden rounded-[36px] sm:aspect-[5/4] lg:aspect-auto lg:h-[min(660px,calc(100svh-15rem))] lg:min-h-[440px]" style={{ background: stageTint(product.color, 26) }}>
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_42%,rgb(255_255_255/0.45),transparent_72%)] dark:bg-[radial-gradient(55%_45%_at_50%_42%,rgb(255_255_255/0.08),transparent_72%)]" />
              <svg aria-hidden viewBox="0 0 400 400" className="absolute inset-0 size-full text-ink/[0.05]">
                <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 8" />
              </svg>
              <div aria-hidden className="absolute bottom-[9%] left-1/2 h-6 w-[40%] -translate-x-1/2 rounded-[50%] bg-[#1c130e]/25 blur-lg" />
              <div
                key={size}
                className={cn(
                  'absolute inset-x-0 mx-auto animate-pop-in lg:right-auto lg:left-1/2 lg:-translate-x-1/2',
                  size === '1000' ? 'top-[8%] w-[50%] sm:w-[40%] lg:w-auto lg:h-[76%]' : 'top-[13%] w-[44%] sm:w-[34%] lg:w-auto lg:h-[66%]',
                )}
              >
                <CoffeeBag product={product} size={bagLabel} className="lg:h-full lg:w-auto" />
              </div>
              <p className="absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-full bg-surface/85 px-3 py-1.5 text-xs font-semibold text-ink backdrop-blur">
                <Leaf className="size-3.5 text-success" aria-hidden />
                Frisch geröstet in Weimar
              </p>
              {!product.available ? (
                <p className="absolute top-5 right-5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-canvas">Gerade ausverkauft</p>
              ) : null}
            </div>
            {hasKg ? (
              <div className="mt-4 grid grid-cols-2 gap-3" role="group" aria-label="Packungsgröße wählen">
                {(['250', '1000'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={size === s}
                    onClick={() => setSize(s)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border-2 p-2.5 text-left transition-colors',
                      size === s ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong',
                    )}
                  >
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-xl" style={{ background: stageTint(product.color, 26) }} aria-hidden>
                      <CoffeeBag product={product} size={s === '1000' ? '1 kg' : '250 g'} className={cn('drop-shadow-[0_4px_6px_rgba(40,22,10,0.25)]', s === '1000' ? 'w-[70%]' : 'w-[54%]')} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{s === '1000' ? '1 kg' : '250 g'}</span>
                      <span className="tabular block text-xs text-ink-3">{price(s === '1000' ? (product.priceKg ?? 0) : product.price)}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Kaufbereich */}
          <div>
            <nav aria-label="Brotkrümel" className="mb-6 hidden text-sm text-ink-3 lg:block">
              <Breadcrumb product={product} />
            </nav>
            <p className="text-xs font-semibold tracking-[0.2em] text-accent-text uppercase">
              {KIND_LABEL[product.kind]}
              {product.origin && !isGift ? ` · ${product.origin}` : ''}
            </p>
            <h1 className="mt-3 font-display text-6xl leading-[0.95] font-semibold tracking-[-0.035em] text-ink sm:text-7xl xl:text-8xl">{product.name}</h1>
            <p className="mt-3 text-xl text-ink-2">{product.subtitle}</p>
            <NoteChips notes={product.notes} className="mt-5" />
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-2 md:text-[17px]">{product.description}</p>

            <div className="mt-8 flex flex-wrap items-end gap-x-4 gap-y-1">
              <p className="tabular font-display text-5xl leading-none font-semibold text-ink" aria-live="polite">
                {price(unit)}
              </p>
              <p className="pb-1 text-sm text-ink-3">
                {isGift ? 'pro Box' : `${bagLabel} · ${price(perKg)}/kg`} · inkl. MwSt., zzgl. Versand
              </p>
            </div>

            {hasKg ? (
              <fieldset className="mt-8">
                <legend id={sizeId} className="mb-3 text-sm font-semibold text-ink">
                  Größe
                </legend>
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby={sizeId}>
                  {(['250', '1000'] as const).map((s) => (
                    <OptionCard key={s} checked={size === s} onSelect={() => setSize(s)} title={s === '1000' ? '1 kg' : '250 g'}>
                      <span className="tabular">{price(s === '1000' ? (product.priceKg ?? 0) : product.price)}</span>
                      {s === '1000' && kgSaving > 0 ? <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">spart {kgSaving} %</span> : null}
                    </OptionCard>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <fieldset className="mt-8">
              <legend id={grindId} className="mb-3 text-sm font-semibold text-ink">
                Mahlgrad <span className="font-normal text-ink-3">· {GRINDS[grind]}</span>
              </legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-labelledby={grindId}>
                {(Object.keys(GRINDS) as Grind[]).map((g) => (
                  <OptionCard key={g} checked={grind === g} onSelect={() => setGrind(g)} title={GRINDS[g]}>
                    {GRIND_HINTS[g]}
                  </OptionCard>
                ))}
              </div>
            </fieldset>

            <div ref={ctaRef} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <QtyStepper value={qty} onChange={setQty} label="Anzahl" className="self-start" />
              <AddToCartButton
                disabled={!product.available}
                onAdd={addToCart}
                className="h-14 w-full text-base sm:w-auto sm:flex-1"
                label={product.available ? `${product.name} in den Warenkorb, ${qty} × ${bagLabel}, ${GRINDS[grind]}` : `${product.name} ist ausverkauft`}
              >
                In den Warenkorb · {price(unit * qty)}
              </AddToCartButton>
            </div>
            {!isGift ? (
              <Link
                to={`/abo?kaffee=${encodeURIComponent(product.slug)}`}
                className="group mt-3 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm transition-colors hover:border-accent hover:bg-accent-soft"
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent-text group-hover:bg-accent-solid group-hover:text-on-accent">
                    <Repeat className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="font-semibold text-ink">Als Abo: ab {price(ABO_PRICES[250])} / Lieferung</span>
                    <span className="block text-xs text-ink-3">alle 2 oder 4 Wochen · jederzeit pausierbar</span>
                  </span>
                </span>
                <ArrowRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            ) : null}

            <ul className="mt-6 space-y-2.5 text-sm text-ink-2">
              <li className="flex items-center gap-2.5">
                <Truck className="size-4 shrink-0 text-ink-3" aria-hidden />
                <span>
                  Röstung & Versand in 1–3 Werktagen <span className="text-ink-3">(Beispiel)</span>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Sparkles className="size-4 shrink-0 text-ink-3" aria-hidden />
                Versandkostenfrei ab {price(FREE_SHIPPING_FROM)}
              </li>
              <li className="flex items-center gap-2.5">
                <Store className="size-4 shrink-0 text-ink-3" aria-hidden />
                <span>
                  Bohnen gibt’s auch zum Mitnehmen in unseren{' '}
                  <Link to="/cafes" className="font-medium text-ink underline decoration-ink/30 underline-offset-2 hover:decoration-ink">
                    Cafés
                  </Link>
                </span>
              </li>
            </ul>

            <div className="mt-10 divide-y divide-line border-y border-line">
              <Accordion title="Geschmack" defaultOpen>
                <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
                  <TasteBars taste={product.taste} />
                  <div>
                    <p className="mb-2 text-xs text-ink-2">Röstgrad</p>
                    <RoastMeter roast={product.roast} />
                  </div>
                </div>
                <p className="mt-5 text-sm text-ink-3">Aromen: {product.notes.join(', ')}.</p>
              </Accordion>
              <Accordion title="Herkunft">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <Fact label="Herkunft" value={product.origin} />
                  <Fact label="Region" value={product.region} />
                  <Fact label="Aufbereitung" value={product.process} />
                  <Fact label="Röstgrad" value={ROAST_LABELS[product.roast] ?? '–'} />
                </dl>
                <p className="mt-5 flex items-start gap-2 text-sm text-ink-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
                  <span>
                    Direkt gehandelt über kleine Importeure, geröstet in Weimar.{' '}
                    <Link to="/herkunft" className="font-medium text-ink underline decoration-ink/30 underline-offset-2 hover:decoration-ink">
                      Mehr zur Herkunft
                    </Link>
                  </span>
                </p>
              </Accordion>
              <Accordion title="Zubereitung">
                <ul className="space-y-3">
                  {product.brew.map((b) => (
                    <li key={b} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                      <span className="text-sm">
                        <span className="font-semibold text-ink">{BREW_LABELS[b]}</span>
                        <span className="block text-ink-2">{RECIPES[b]}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-ink-3">Richtwerte – am Ende entscheidet dein Geschmack.</p>
                <Link to="/anleitungen" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent-text hover:underline">
                  <BookOpen className="size-4" aria-hidden />
                  Zu den Brühanleitungen
                </Link>
              </Accordion>
              <Accordion title={`Warum „${product.name}“?`}>
                <blockquote className="font-display text-2xl leading-snug font-medium tracking-tight text-ink">{product.story}</blockquote>
              </Accordion>
            </div>
          </div>
        </div>
      </Container>

      {related.length ? (
        <section aria-labelledby="related-title" className="border-t border-line bg-surface-2/40 py-20 md:py-24">
          <Container>
            <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-accent-text uppercase">Ähnliches Geschmacksprofil</p>
                <h2 id="related-title" className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
                  Passt auch zu dir
                </h2>
              </div>
              <Link to="/shop" className={siteButtonClass('secondary')}>
                Alle Kaffees
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.id} className="flex min-w-0">
                  <ProductCard product={p} className="w-full" />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* Mobile: Kaufleiste, sobald der Haupt-Button aus dem Bild ist */}
      <div className="h-20 lg:hidden" aria-hidden />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(var(--shadow-color)/0.3)] backdrop-blur-xl transition-transform duration-300 lg:hidden',
          ctaVisible ? 'pointer-events-none translate-y-full' : 'translate-y-0',
        )}
        aria-hidden={ctaVisible}
        inert={ctaVisible}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl" style={{ background: stageTint(product.color, 26) }} aria-hidden>
            <CoffeeBag product={product} size={bagLabel} className="w-[56%] drop-shadow-[0_4px_6px_rgba(40,22,10,0.25)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight font-semibold text-ink">{product.name}</p>
            <p className="tabular truncate text-xs text-ink-3">
              {price(unit)} · {isGift ? 'Box' : bagLabel} · {GRINDS[grind]}
            </p>
          </div>
          <AddToCartButton compact disabled={!product.available} onAdd={addToCart} label={`${product.name} in den Warenkorb`}>
            In den Korb
          </AddToCartButton>
        </div>
      </div>
    </>
  )
}

function Breadcrumb({ product }: { product: Product }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <li>
        <Link to="/" className="hover:text-ink">
          Start
        </Link>
      </li>
      <li aria-hidden>/</li>
      <li>
        <Link to="/shop" className="hover:text-ink">
          Shop
        </Link>
      </li>
      <li aria-hidden>/</li>
      <li>
        <Link to={`/shop?kat=${KIND_CAT[product.kind]}`} className="hover:text-ink">
          {KIND_LABEL[product.kind]}
        </Link>
      </li>
      <li aria-hidden>/</li>
      <li aria-current="page" className="text-ink-2">
        {product.name}
      </li>
    </ol>
  )
}

function OptionCard({ checked, onSelect, title, children }: { checked: boolean; onSelect: () => void; title: string; children?: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'relative flex min-h-[72px] flex-col justify-center rounded-2xl border-2 py-3 pr-9 pl-4 text-left transition-[border-color,background-color,box-shadow] duration-200',
        checked ? 'border-accent bg-accent-soft shadow-soft' : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      <span className="text-sm font-semibold text-ink">{title}</span>
      {children ? <span className="mt-0.5 text-xs leading-snug text-ink-3">{children}</span> : null}
      <span
        aria-hidden
        className={cn('absolute top-3 right-3 size-4 rounded-full border-2 transition-colors', checked ? 'border-accent bg-accent shadow-[inset_0_0_0_2px_var(--accent-soft)]' : 'border-line-strong')}
      />
    </button>
  )
}

function Accordion({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  const id = useId()
  return (
    <div>
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-xl font-semibold text-ink transition-colors hover:text-accent-text"
        >
          {title}
          <ChevronDown className={cn('size-5 shrink-0 text-ink-3 transition-transform duration-300', open && 'rotate-180')} aria-hidden />
        </button>
      </h2>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        className={cn('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
        inert={!open}
      >
        <div className="overflow-hidden">
          <div className="pb-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  )
}
