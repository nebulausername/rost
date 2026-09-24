import { ArrowRight, ChevronDown, Gift, Repeat, RotateCcw, SlidersHorizontal, Sparkles, Truck } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ABO_PRICES, FREE_SHIPPING_FROM, useCart } from '../../lib/cart'
import { useStore } from '../../lib/store'
import type { BrewMethod, Product } from '../../lib/types'
import { cn } from '../../lib/utils'
import { CoffeeBag, Container, Eyebrow, siteButtonClass } from '../components'
import { BREW_LABELS, price } from '../lib'
import { AddToCartButton, ProductCard } from '../shell/commerce'
import { usePageTitle } from '../shell/hooks'
import { BeanMark } from '../shell/Logo'

// ---------------------------------------------------------------------------
// Shop – Sortiment aus dem Studio, Filter im URL-Query (teilbar & zurück-fähig)
// ---------------------------------------------------------------------------

type Cat = 'alle' | 'espresso' | 'filter' | 'omni' | 'geschenke'
type Roast = 'hell' | 'mittel' | 'dunkel'
type Sort = 'empfohlen' | 'preis-auf' | 'preis-ab' | 'roestgrad'

const CATS: { id: Cat; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'espresso', label: 'Espresso' },
  { id: 'filter', label: 'Filter' },
  { id: 'omni', label: 'Für alles' },
  { id: 'geschenke', label: 'Geschenke' },
]

const ROASTS: { id: Roast; label: string; test: (r: number) => boolean }[] = [
  { id: 'hell', label: 'Hell', test: (r) => r <= 2 },
  { id: 'mittel', label: 'Mittel', test: (r) => r === 3 },
  { id: 'dunkel', label: 'Dunkel', test: (r) => r >= 4 },
]

const SORTS: { id: Sort; label: string }[] = [
  { id: 'empfohlen', label: 'Empfohlen' },
  { id: 'preis-auf', label: 'Preis ↑' },
  { id: 'preis-ab', label: 'Preis ↓' },
  { id: 'roestgrad', label: 'Röstgrad (hell → dunkel)' },
]

const BREWS = Object.keys(BREW_LABELS) as BrewMethod[]
const VOUCHER_VALUES = [25, 50, 75] as const

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function matchesCat(p: Product, cat: Cat) {
  switch (cat) {
    case 'alle':
      return p.kind !== 'voucher'
    case 'espresso':
      return p.kind === 'espresso' || p.kind === 'omni'
    case 'filter':
      return p.kind === 'filter' || p.kind === 'omni'
    case 'omni':
      return p.kind === 'omni'
    case 'geschenke':
      return p.kind === 'gift' || p.kind === 'voucher'
  }
}

export function ShopPage() {
  usePageTitle('Shop')
  const products = useStore((s) => s.products)
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const sortId = useId()

  const cat = pick(params.get('kat'), CATS.map((c) => c.id), 'alle')
  const brew = pick<BrewMethod | ''>(params.get('brew'), BREWS, '')
  const roast = pick<Roast | ''>(params.get('roest'), ROASTS.map((r) => r.id), '')
  const sort = pick(params.get('sort'), SORTS.map((s) => s.id), 'empfohlen')

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const list = useMemo(() => {
    const roastTest = ROASTS.find((r) => r.id === roast)?.test
    const out = products
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => matchesCat(p, cat) && (!brew || p.brew.includes(brew)) && (!roastTest || (p.kind !== 'gift' && roastTest(p.roast))))
    out.sort((a, b) => {
      if (sort === 'preis-auf') return a.p.price - b.p.price
      if (sort === 'preis-ab') return b.p.price - a.p.price
      if (sort === 'roestgrad') return a.p.roast - b.p.roast || a.i - b.i
      // empfohlen: verfügbar vor ausverkauft, Highlights zuerst, sonst Studio-Reihenfolge
      return Number(b.p.available) - Number(a.p.available) || Number(b.p.featured) - Number(a.p.featured) || a.i - b.i
    })
    return out.map((x) => x.p)
  }, [products, cat, brew, roast, sort])

  const extraFilters = (brew ? 1 : 0) + (roast ? 1 : 0)
  const anyFilter = cat !== 'alle' || extraFilters > 0 || sort !== 'empfohlen'
  const showVoucher = (cat === 'alle' || cat === 'geschenke') && extraFilters === 0
  const showAbo = cat !== 'geschenke' && list.length > 0

  const tiles: { key: string; node: ReactNode }[] = list.map((p) => ({ key: p.id, node: <ProductCard product={p} className="w-full" /> }))
  if (showAbo) tiles.splice(Math.min(3, tiles.length), 0, { key: 'abo', node: <AboCard products={products} /> })
  if (showVoucher) tiles.push({ key: 'voucher', node: <VoucherCard /> })
  const count = list.length + (showVoucher ? 1 : 0)

  return (
    <>
      <header className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] size-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(196_112_47/0.16),transparent)]" />
        <Container className="relative grid gap-8 pt-12 pb-10 md:pt-16 md:pb-14 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <nav aria-label="Brotkrümel" className="mb-5 text-sm text-ink-3">
              <Link to="/" className="hover:text-ink">
                Start
              </Link>
              <span className="mx-2" aria-hidden>
                /
              </span>
              <span aria-current="page" className="text-ink-2">
                Shop
              </span>
            </nav>
            <h1 className="font-display text-[42px] leading-[1.02] font-semibold tracking-[-0.025em] text-ink sm:text-6xl lg:text-7xl">
              Kaffee, <em className="font-medium text-accent-text italic">frisch geröstet</em> in Weimar
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2 md:text-lg">
              Alle Kaffees rösten wir selbst in der Richard-Wagner-Straße. Ganze Bohne oder passend gemahlen – du entscheidest, wir rösten.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <p className="inline-flex items-center gap-2.5 rounded-full bg-success-soft px-4 py-2 text-sm font-medium text-success">
              <Truck className="size-4" aria-hidden />
              Versandkostenfrei ab {price(FREE_SHIPPING_FROM)} · im Abo immer
            </p>
            <Link to="/geschmacksfinder" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent-text">
              <Sparkles className="size-4 text-accent" aria-hidden />
              Unsicher? Geschmacksfinder in 1 Minute
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </Container>
      </header>

      {/* Filterleiste */}
      <div className="sticky top-16 z-30 border-b border-line/70 bg-canvas/90 backdrop-blur-xl lg:top-20">
        <Container className="flex items-center gap-3 py-3">
          <div role="radiogroup" aria-label="Kategorie" className="rb-no-scrollbar -mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 py-0.5 [mask-image:linear-gradient(to_right,black_82%,transparent)] md:[mask-image:none]">
            {CATS.map((c) => {
              const active = c.id === cat
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update('kat', c.id === 'alle' ? null : c.id)}
                  className={cn(
                    'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors',
                    active ? 'bg-ink text-canvas' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                  )}
                >
                  {c.id === 'geschenke' ? <Gift className="size-3.5" aria-hidden /> : null}
                  {c.label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="shop-filter"
            className="relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-ink md:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filter
            {extraFilters ? <span className="tabular flex size-5 items-center justify-center rounded-full bg-accent-solid text-[11px] text-on-accent">{extraFilters}</span> : null}
          </button>
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <label htmlFor={sortId} className="text-sm text-ink-3">
              Sortieren
            </label>
            <SortSelect id={sortId} value={sort} onChange={(v) => update('sort', v === 'empfohlen' ? null : v)} />
          </div>
        </Container>
        <div id="shop-filter" className={cn('border-t border-line/70 md:block', filtersOpen ? 'block' : 'hidden')}>
          <Container className="flex flex-col gap-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-x-6">
            <ChipGroup label="Zubereitung">
              {BREWS.map((b) => (
                <Chip key={b} active={brew === b} onClick={() => update('brew', brew === b ? null : b)}>
                  {BREW_LABELS[b]}
                </Chip>
              ))}
            </ChipGroup>
            <ChipGroup label="Röstgrad">
              {ROASTS.map((r) => (
                <Chip key={r.id} active={roast === r.id} onClick={() => update('roest', roast === r.id ? null : r.id)}>
                  <span className="flex gap-0.5" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={cn('size-1.5 rounded-full', i <= ROASTS.indexOf(r) ? 'bg-current' : 'bg-current/25')} />
                    ))}
                  </span>
                  {r.label}
                </Chip>
              ))}
            </ChipGroup>
            <div className="flex items-center gap-2 md:hidden">
              <label htmlFor={`${sortId}-m`} className="text-sm text-ink-3">
                Sortieren
              </label>
              <SortSelect id={`${sortId}-m`} value={sort} onChange={(v) => update('sort', v === 'empfohlen' ? null : v)} />
            </div>
          </Container>
        </div>
      </div>

      <section aria-labelledby="shop-products" className="pt-8 pb-20 md:pt-10 md:pb-28">
        <Container>
          <h2 id="shop-products" className="sr-only">
            Produkte
          </h2>
          <div className="mb-8 flex items-center justify-between gap-4">
            <p className="text-sm text-ink-2" aria-live="polite">
              <span className="tabular font-semibold text-ink">{count}</span> {count === 1 ? 'Produkt' : 'Produkte'}
              {cat !== 'alle' ? <> in „{CATS.find((c) => c.id === cat)?.label}“</> : null}
            </p>
            {anyFilter ? (
              <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true, preventScrollReset: true })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text hover:underline">
                <RotateCcw className="size-3.5" aria-hidden />
                Zurücksetzen
              </button>
            ) : null}
          </div>

          {count === 0 ? (
            <div className="flex flex-col items-center rounded-[32px] border-2 border-dashed border-line-strong px-6 py-20 text-center">
              <BeanMark className="size-14" />
              <p className="mt-6 font-display text-3xl font-semibold text-ink">Hier ist gerade nichts im Sieb.</p>
              <p className="mt-2 max-w-md text-ink-2">Für diese Kombination haben wir aktuell keinen Kaffee. Lockere die Filter – oder lass dich vom Geschmacksfinder überraschen.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true, preventScrollReset: true })} className={siteButtonClass('primary')}>
                  <RotateCcw className="size-4" aria-hidden />
                  Filter zurücksetzen
                </button>
                <Link to="/geschmacksfinder" className={siteButtonClass('secondary')}>
                  Geschmacksfinder
                </Link>
              </div>
            </div>
          ) : (
            <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((t) => (
                <li key={t.key} className="flex min-w-0 animate-fade-in">
                  {t.node}
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

function SortSelect({ id, value, onChange }: { id: string; value: Sort; onChange: (v: Sort) => void }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as Sort)}
        className="h-10 cursor-pointer appearance-none rounded-full border border-line bg-surface pr-9 pl-4 text-sm font-medium text-ink transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
    </div>
  )
}

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="rb-no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      <span className="mr-1 shrink-0 text-xs font-semibold tracking-[0.14em] text-ink-3 uppercase">{label}</span>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
        active ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function VoucherCard() {
  const add = useCart((s) => s.add)
  const [value, setValue] = useState<(typeof VOUCHER_VALUES)[number]>(50)
  const groupId = useId()
  return (
    <article className="group flex w-full flex-col">
      <div className="grain relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[28px] bg-sidebar p-8 transition-shadow duration-500 group-hover:shadow-lift">
        <div aria-hidden className="absolute -top-20 -right-20 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(196_112_47/0.4),transparent)]" />
        <div
          aria-hidden
          className="relative aspect-[1.58] w-full max-w-[300px] -rotate-6 rounded-2xl bg-[linear-gradient(135deg,#e0924f,#9c4f1c)] p-5 text-[#fff5ea] shadow-[0_30px_50px_-20px_rgba(0,0,0,0.7)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:-rotate-3"
        >
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold tracking-[0.3em]">RÖSTBRÜDER</span>
            <BeanMark className="size-8 bg-[#fff5ea]/20" />
          </div>
          <p className="absolute bottom-4 left-5 font-display text-5xl leading-none font-semibold">
            <span key={value} className="inline-block animate-pop-in">
              {value} €
            </span>
          </p>
          <p className="absolute right-5 bottom-5 text-[10px] font-semibold tracking-[0.2em] uppercase opacity-80">Gutschein</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1 pt-5">
        <div className="flex items-start justify-between gap-3">
          <h3 id={groupId} className="font-display text-2xl leading-tight font-semibold tracking-tight text-ink">
            Gutschein
          </h3>
          <p className="tabular pt-1 text-lg font-semibold text-ink">{price(value)}</p>
        </div>
        <p className="mt-0.5 text-sm text-ink-3">Per E-Mail · 3 Jahre gültig</p>
        <div role="radiogroup" aria-labelledby={groupId} className="mt-3 inline-flex self-start rounded-full bg-surface-2 p-1">
          {VOUCHER_VALUES.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={v === value}
              onClick={() => setValue(v)}
              className={cn('tabular h-8 rounded-full px-4 text-sm font-semibold transition-colors', v === value ? 'bg-surface text-ink shadow-soft' : 'text-ink-3 hover:text-ink')}
            >
              {v} €
            </button>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="text-xs text-ink-3">Der Klassiker unter Geschenken</span>
          <AddToCartButton compact label={`Gutschein über ${value} € in den Warenkorb`} onAdd={() => add({ kind: 'voucher', value, qty: 1 })} />
        </div>
      </div>
    </article>
  )
}

function AboCard({ products }: { products: Product[] }) {
  const bags = useMemo(() => products.filter((p) => p.featured && p.available).slice(0, 3), [products])
  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-[28px] bg-accent-soft p-7 transition-shadow duration-500 hover:shadow-lift">
      <div aria-hidden className="relative mx-auto mt-2 mb-6 flex h-44 w-full max-w-[260px] items-end justify-center">
        {bags.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              'absolute bottom-0 w-[38%] transition-transform duration-500',
              i === 0 && 'z-10 group-hover:-translate-y-2',
              i === 1 && 'left-[4%] -rotate-12 group-hover:-translate-x-1 group-hover:-rotate-[16deg]',
              i === 2 && 'right-[4%] rotate-12 group-hover:translate-x-1 group-hover:rotate-[16deg]',
            )}
          >
            <CoffeeBag product={p} />
          </div>
        ))}
        <span className="absolute -top-1 right-2 z-20 flex size-14 items-center justify-center rounded-full bg-accent-solid text-on-accent shadow-lift">
          <Repeat className="size-6" />
        </span>
      </div>
      <Eyebrow>Kaffee-Abo</Eyebrow>
      <h3 className="mt-2 font-display text-3xl leading-tight font-semibold tracking-tight text-ink">
        Immer frisch. <em className="font-medium italic">Nie leer.</em>
      </h3>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">Alle 2 oder 4 Wochen frisch geröstet zu dir – jederzeit pausierbar und immer versandkostenfrei.</p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-6">
        <p>
          <span className="block text-xs text-ink-3">ab</span>
          <span className="tabular font-display text-3xl leading-none font-semibold text-ink">{price(ABO_PRICES[250])}</span>
          <span className="block text-xs text-ink-3">pro Lieferung</span>
        </p>
        <Link to="/abo" className={cn(siteButtonClass('primary'), 'h-11 px-5 after:absolute after:inset-0')}>
          Zum Abo
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  )
}
