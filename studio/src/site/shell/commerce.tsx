import { Check, Gift, Minus, Plus, Repeat, ShoppingBag } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useCart } from '../../lib/cart'
import type { CartItem, Product } from '../../lib/types'
import { cn } from '../../lib/utils'
import { CoffeeBag, NoteChips, RoastMeter } from '../components'
import { price } from '../lib'
import { stageTint, useAddedFeedback } from './hooks'

// ---------------------------------------------------------------------------
// Commerce-Bausteine, die Startseite, Shop, Produktseite & Warenkorb teilen
// ---------------------------------------------------------------------------

const KIND_BADGE: Partial<Record<Product['kind'], string>> = {
  omni: 'Espresso & Filter',
  gift: 'Geschenk',
}

export function AddToCartButton({
  onAdd,
  disabled,
  className,
  children = 'In den Warenkorb',
  compact,
  label,
}: {
  onAdd: () => void
  disabled?: boolean
  className?: string
  children?: ReactNode
  compact?: boolean
  /** zugänglicher Name, wenn der sichtbare Text knapp ist */
  label?: string
}) {
  const [added, flash] = useAddedFeedback()
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={() => {
        onAdd()
        flash()
      }}
      className={cn(
        'relative z-10 inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,color,transform,box-shadow] duration-200 active:scale-[0.97] disabled:pointer-events-none',
        compact ? 'h-10 px-4 text-sm' : 'h-12 px-6 text-[15px]',
        disabled
          ? 'bg-surface-2 text-ink-3'
          : added
            ? 'bg-success text-white'
            : 'bg-ink text-canvas hover:bg-accent-solid hover:text-on-accent hover:shadow-[0_8px_24px_-8px_rgb(165_90_34/0.6)]',
        className,
      )}
    >
      {disabled ? null : added ? <Check className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
      <span>{disabled ? 'Ausverkauft' : added ? 'Hinzugefügt' : children}</span>
    </button>
  )
}

/** Runder Schnell-Kauf-Button (Tüte + Plus) */
export function IconAddButton({ onAdd, disabled, label }: { onAdd: () => void; disabled?: boolean; label: string }) {
  const [added, flash] = useAddedFeedback()
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={disabled ? 'Ausverkauft' : 'In den Warenkorb'}
      onClick={() => {
        onAdd()
        flash()
      }}
      className={cn(
        'relative z-10 inline-flex size-12 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform,box-shadow] duration-200 active:scale-95 disabled:pointer-events-none',
        disabled ? 'bg-surface-2 text-ink-3' : added ? 'bg-success text-white' : 'bg-ink text-canvas hover:scale-105 hover:bg-accent-solid hover:text-on-accent hover:shadow-[0_8px_24px_-8px_rgb(165_90_34/0.6)]',
      )}
    >
      {added ? <Check className="size-5" aria-hidden /> : <ShoppingBag className="size-5" aria-hidden />}
      {!added && !disabled ? (
        <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-accent-solid text-on-accent ring-2 ring-canvas" aria-hidden>
          <Plus className="size-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  )
}

/** Produktkarte mit Tüte auf getönter Bühne, Noten, Röstgrad, Preis & Schnell-Kauf */
export function ProductCard({
  product,
  className,
  pricePrefix,
  headingLevel = 'h3',
  priority,
  addVariant = 'full',
}: {
  product: Product
  className?: string
  /** z. B. „ab“ auf der Startseite */
  pricePrefix?: string
  headingLevel?: 'h2' | 'h3'
  /** große Variante (Startseite) */
  priority?: boolean
  /** „icon“ = runder Warenkorb-Button für enge Raster */
  addVariant?: 'full' | 'icon'
}) {
  const add = useCart((s) => s.add)
  const Heading = headingLevel
  const isGift = product.kind === 'gift' || product.kind === 'voucher'
  const badge = KIND_BADGE[product.kind]
  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div
        className={cn(
          'relative aspect-[4/5] overflow-hidden rounded-[28px] transition-shadow duration-500 group-hover:shadow-lift',
          !product.available && 'saturate-[0.35]',
        )}
        style={{ background: stageTint(product.color) }}
      >
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_38%,rgb(255_255_255/0.4),transparent_72%)] dark:bg-[radial-gradient(60%_45%_at_50%_38%,rgb(255_255_255/0.07),transparent_72%)]" />
        <div aria-hidden className="absolute bottom-[8%] left-1/2 h-5 w-[46%] -translate-x-1/2 rounded-[50%] bg-[#1c130e]/25 blur-md transition-transform duration-500 group-hover:scale-x-90" />
        <div
          className={cn(
            'absolute inset-x-0 top-[9%] mx-auto transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-2 group-hover:-rotate-3 group-hover:scale-[1.03]',
            priority ? 'w-[60%]' : 'w-[56%]',
          )}
        >
          <CoffeeBag product={product} />
        </div>
        <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
          {!product.available ? <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-canvas">Gerade ausverkauft</span> : null}
          {badge ? <span className="rounded-full bg-surface/85 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur">{badge}</span> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1 pt-5">
        <div className="flex items-start justify-between gap-3">
          <Heading className={cn('font-display leading-tight font-semibold tracking-tight text-ink', priority ? 'text-[28px]' : 'text-2xl')}>
            <Link
              to={`/shop/${product.slug}`}
              className="rounded-sm after:absolute after:inset-0 after:rounded-[28px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-[var(--ring)]"
            >
              {product.name}
            </Link>
          </Heading>
          <p className="shrink-0 pt-1 text-right">
            <span className="tabular text-lg font-semibold text-ink">
              {pricePrefix ? <span className="mr-1 text-sm font-medium text-ink-3">{pricePrefix}</span> : null}
              {price(product.price)}
            </span>
            <span className="tabular block text-[11px] text-ink-3">{isGift ? 'pro Box' : `250 g · ${price(product.price * 4)}/kg`}</span>
          </p>
        </div>
        <p className="mt-0.5 text-sm text-ink-3">{product.subtitle}</p>
        <NoteChips notes={product.notes} className="mt-3" />
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          {isGift ? <span className="text-xs text-ink-3">mit Brühkarte</span> : <RoastMeter roast={product.roast} />}
          {addVariant === 'icon' ? (
            <IconAddButton
              disabled={!product.available}
              label={product.available ? `${product.name} (250 g, ganze Bohne) in den Warenkorb` : `${product.name} ist ausverkauft`}
              onAdd={() => add({ kind: 'product', productId: product.id, size: '250', grind: 'bohne', qty: 1 })}
            />
          ) : (
            <AddToCartButton
              compact
              disabled={!product.available}
              label={product.available ? `${product.name} (250 g, ganze Bohne) in den Warenkorb` : `${product.name} ist ausverkauft`}
              onAdd={() => add({ kind: 'product', productId: product.id, size: '250', grind: 'bohne', qty: 1 })}
            />
          )}
        </div>
      </div>
    </article>
  )
}

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  size = 'md',
  label = 'Menge',
  className,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
  label?: string
  className?: string
}) {
  const btn = cn(
    'inline-flex items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent',
    size === 'sm' ? 'size-8' : 'size-11',
  )
  return (
    <div role="group" aria-label={label} className={cn('inline-flex items-center rounded-full border border-line bg-surface', size === 'sm' ? 'p-0.5' : 'p-0.5', className)}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Menge verringern">
        <Minus className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
      </button>
      <span className={cn('tabular text-center font-semibold text-ink', size === 'sm' ? 'w-6 text-sm' : 'w-8 text-base')} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Menge erhöhen">
        <Plus className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
      </button>
    </div>
  )
}

/** Kleines Vorschaubild für Warenkorb & Kasse */
export function CartThumb({ item, products, className }: { item: CartItem; products: Product[]; className?: string }) {
  const product = item.kind !== 'voucher' && item.productId ? products.find((p) => p.id === item.productId) : undefined
  const color = product?.color ?? (item.kind === 'voucher' ? '#c4702f' : '#5b3a29')
  return (
    <div
      className={cn('relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl', className)}
      style={{ background: stageTint(color, 26) }}
      aria-hidden
    >
      {product ? (
        <CoffeeBag product={product} className="w-[58%] drop-shadow-[0_6px_8px_rgba(40,22,10,0.25)]" size={item.kind === 'product' && item.size === '1000' ? '1 kg' : '250 g'} />
      ) : item.kind === 'voucher' ? (
        <Gift className="size-6 text-accent-text" />
      ) : (
        <Repeat className="size-6 text-accent-text" />
      )}
      {item.kind === 'abo' ? (
        <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-accent-solid text-on-accent">
          <Repeat className="size-3" />
        </span>
      ) : null}
    </div>
  )
}

/** Fortschritt bis zum kostenlosen Versand */
export function FreeShippingBar({ subtotal, freeFrom, free, className }: { subtotal: number; freeFrom: number; free: boolean; className?: string }) {
  const pct = free ? 100 : Math.min(100, Math.round((subtotal / freeFrom) * 100))
  const missing = Math.max(0, freeFrom - subtotal)
  return (
    <div className={className}>
      <p className="text-sm text-ink-2" aria-live="polite">
        {free ? (
          <span className="font-semibold text-success">Versandkostenfrei 🎉</span>
        ) : (
          <>
            Noch <strong className="tabular font-semibold text-ink">{price(missing)}</strong> bis zum kostenlosen Versand
          </>
        )}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-label="Fortschritt bis zum kostenlosen Versand"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', free ? 'bg-success' : 'bg-accent')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
