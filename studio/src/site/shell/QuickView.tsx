import { ArrowRight, Check, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router'
import { GRINDS } from '../../lib/cart'
import { useStore } from '../../lib/store'
import type { Grind, Product } from '../../lib/types'
import { cn } from '../../lib/utils'
import { CoffeeBag, NoteChips, RoastMeter } from '../components'
import { price } from '../lib'
import { addToCartWithFeedback } from './cartFx'
import { AddToCartButton, QtyStepper } from './commerce'
import { stageTint, useDialog, usePresence } from './hooks'
import { useQuickView } from './quickViewStore'

// ---------------------------------------------------------------------------
// Schnellansicht: Produkt im Dialog – Größe, Mahlgrad, Menge, direkt in den Warenkorb.
// ---------------------------------------------------------------------------

const KIND_LABEL: Record<Product['kind'], string> = { espresso: 'Espresso', filter: 'Filterkaffee', omni: 'Espresso & Filter', gift: 'Geschenk', voucher: 'Gutschein' }

export function QuickViewDialog() {
  const slug = useQuickView((s) => s.slug)
  const set = useQuickView((s) => s.set)
  const products = useStore((s) => s.products)
  // letztes Produkt merken, damit die Ausblend-Animation Inhalt hat
  const [shown, setShown] = useState<string | null>(slug)
  if (slug && slug !== shown) setShown(slug)
  const product = products.find((p) => p.slug === shown) ?? null
  const open = !!slug && !!product
  const close = useCallback(() => set(null), [set])
  const { mounted, closing } = usePresence(open, 220)
  const ref = useRef<HTMLDivElement>(null)
  useDialog(open, close, ref)
  if (!mounted || !product) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden
        onClick={close}
        className={cn('absolute inset-0 bg-[#140c07]/50 backdrop-blur-[3px]', closing ? 'animate-[rb-fade-out_220ms_ease_both]' : 'animate-fade-in')}
      />
      <QuickViewPanel key={product.id} panelRef={ref} product={product} closing={closing} onClose={close} />
    </div>
  )
}

function QuickViewPanel({ panelRef, product, closing, onClose }: { panelRef: RefObject<HTMLDivElement | null>; product: Product; closing: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [size, setSize] = useState<'250' | '1000'>('250')
  const [grind, setGrind] = useState<Grind>('bohne')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState<string | null>(null)
  const titleId = useId()
  const checkoutRef = useRef<HTMLButtonElement>(null)
  // Fokus nach dem Hinzufügen auf „Zur Kasse“ (der Warenkorb-Button verschwindet)
  useEffect(() => {
    if (added) checkoutRef.current?.focus({ preventScroll: true })
  }, [added])
  const grindId = useId()
  const sizeId = useId()
  const hasKg = product.priceKg !== null && product.kind !== 'gift' && product.kind !== 'voucher'
  const isGift = product.kind === 'gift' || product.kind === 'voucher'
  const unit = size === '1000' && product.priceKg ? product.priceKg : product.price
  const bagLabel = size === '1000' ? '1 kg' : '250 g'

  const onAdd = (el: HTMLButtonElement) => {
    const label = `${qty} × ${product.name}${isGift ? '' : ` (${bagLabel})`}`
    addToCartWithFeedback({ kind: 'product', productId: product.id, size, grind, qty }, { from: el, label })
    setAdded(label)
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      data-closing={closing || undefined}
      aria-labelledby={titleId}
      data-fly-root
      className={cn(
        'relative grid max-h-[94dvh] w-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-t-[28px] bg-canvas shadow-float sm:max-w-4xl sm:rounded-[32px] md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:grid-rows-1',
        closing ? 'animate-[rb-fade-out_220ms_ease_both]' : 'animate-[rb-rise_420ms_cubic-bezier(0.2,0.8,0.2,1)_both]',
      )}
    >
      {/* Bühne */}
      <div className="relative h-52 overflow-hidden sm:h-64 md:h-auto md:min-h-[520px]" style={{ background: stageTint(product.color, 26) }}>
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_45%,rgb(255_255_255/0.45),transparent_72%)] dark:bg-[radial-gradient(55%_45%_at_50%_45%,rgb(255_255_255/0.08),transparent_72%)]" />
        <div aria-hidden className="absolute bottom-[8%] left-1/2 h-5 w-[36%] -translate-x-1/2 rounded-[50%] bg-[#1c130e]/25 blur-md" />
        <div key={size} data-fly-src className={cn('absolute left-1/2 -translate-x-1/2 animate-pop-in', size === '1000' ? 'top-[6%] h-[82%]' : 'top-[12%] h-[72%]')}>
          <CoffeeBag product={product} size={bagLabel} className="h-full w-auto" />
        </div>
        {!product.available ? <p className="absolute top-4 left-4 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-canvas">Gerade ausverkauft</p> : null}
      </div>

      {/* Details */}
      <div className="flex min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-5 sm:px-8 sm:pt-7">
          <div className="flex items-start justify-between gap-4">
            <p className="pt-1 text-xs font-semibold tracking-[0.2em] text-accent-text uppercase">
              {KIND_LABEL[product.kind]}
              {product.origin && !isGift ? ` · ${product.origin}` : ''}
            </p>
            <button
              type="button"
              onClick={onClose}
              data-autofocus
              aria-label="Schnellansicht schließen"
              className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <h2 id={titleId} className="-mt-1 font-display text-5xl leading-[0.95] font-semibold tracking-[-0.03em] [overflow-wrap:anywhere] text-ink">
            {product.name}
          </h2>
          <p className="mt-2 text-lg text-ink-2">{product.subtitle}</p>
          <NoteChips notes={product.notes} className="mt-4" />
          <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-ink-2">{product.description}</p>
          {!isGift ? <RoastMeter roast={product.roast} className="mt-4" /> : null}

          {hasKg ? (
            <fieldset className="mt-6">
              <legend id={sizeId} className="mb-2 text-sm font-semibold text-ink">
                Größe
              </legend>
              <div role="radiogroup" aria-labelledby={sizeId} className="grid grid-cols-2 gap-2">
                {(['250', '1000'] as const).map((s) => (
                  <Choice key={s} checked={size === s} onSelect={() => setSize(s)}>
                    <span>{s === '1000' ? '1 kg' : '250 g'}</span>
                    <span className="tabular text-ink-3">{price(s === '1000' ? (product.priceKg ?? 0) : product.price)}</span>
                  </Choice>
                ))}
              </div>
            </fieldset>
          ) : null}

          <fieldset className="mt-5">
            <legend id={grindId} className="mb-2 text-sm font-semibold text-ink">
              Mahlgrad
            </legend>
            <div role="radiogroup" aria-labelledby={grindId} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(GRINDS) as Grind[]).map((g) => (
                <Choice key={g} checked={grind === g} onSelect={() => setGrind(g)}>
                  {GRINDS[g]}
                </Choice>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="border-t border-line bg-surface px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-6">
          {added ? (
            <div className="flex animate-fade-in flex-wrap items-center gap-x-4 gap-y-3" role="status">
              <p className="flex min-w-0 flex-1 items-center gap-2.5 text-[15px] font-semibold text-ink">
                <span className="flex size-8 shrink-0 animate-pop-in items-center justify-center rounded-full bg-success text-canvas">
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                </span>
                <span className="min-w-0">
                  Im Warenkorb
                  <span className="block truncate text-xs font-normal text-ink-3">{added}</span>
                </span>
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAdded(null)} className="inline-flex h-11 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-ink/40">
                  Noch einen
                </button>
                <button
                  ref={checkoutRef}
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate('/kasse')
                  }}
                  className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent-solid px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-solid-hover"
                >
                  Zur Kasse
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <QtyStepper value={qty} onChange={setQty} label="Anzahl" />
              <AddToCartButton
                disabled={!product.available}
                onAdd={onAdd}
                className="min-w-0 flex-1"
                label={product.available ? `${product.name} in den Warenkorb, ${qty} × ${bagLabel}, ${GRINDS[grind]}` : `${product.name} ist ausverkauft`}
              >
                <span className="tabular">In den Korb · {price(unit * qty)}</span>
              </AddToCartButton>
            </div>
          )}
          <Link
            to={`/shop/${product.slug}`}
            onClick={onClose}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-text underline-offset-4 hover:underline"
          >
            Alle Details, Herkunft & Brühtipps
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  )
}

function Choice({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'flex min-h-11 items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-2 text-left text-sm font-semibold transition-colors',
        checked ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
