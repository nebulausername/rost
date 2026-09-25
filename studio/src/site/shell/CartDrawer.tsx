import { ArrowRight, Plus, ShoppingBag, Sparkles, Trash2, X } from 'lucide-react'
import { useCallback, useId, useMemo, useRef } from 'react'
import { Link } from 'react-router'
import { cartTotals, describeItem, FREE_SHIPPING_FROM, unitPrice, useCart } from '../../lib/cart'
import { toast, useStore } from '../../lib/store'
import type { CartItem } from '../../lib/types'
import { cn } from '../../lib/utils'
import { CoffeeBag, siteButtonClass } from '../components'
import { price } from '../lib'
import { CartThumb, FreeShippingBar, QtyStepper } from './commerce'
import { stageTint, useDialog, usePresence } from './hooks'

type NewItem = Parameters<ReturnType<typeof useCart.getState>['add']>[0]

function withoutKey(item: CartItem): NewItem {
  const { key: _key, ...rest } = item
  return rest as NewItem
}

export function CartDrawer() {
  const open = useCart((s) => s.open)
  const setOpen = useCart((s) => s.setOpen)
  const items = useCart((s) => s.items)
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)
  const add = useCart((s) => s.add)
  const products = useStore((s) => s.products)
  const totals = useMemo(() => cartTotals(items, products), [items, products])
  const { mounted, closing } = usePresence(open, 280)
  const ref = useRef<HTMLElement>(null)
  const titleId = useId()
  const close = useCallback(() => setOpen(false), [setOpen])
  useDialog(open, close, ref)

  const upsell = useMemo(() => {
    const inCart = new Set(items.map((i) => (i.kind === 'voucher' ? null : i.productId)))
    return products.find((p) => p.featured && p.available && !inCart.has(p.id)) ?? null
  }, [items, products])

  if (!mounted) return null

  const onRemove = (item: CartItem) => {
    const { title } = describeItem(item, products)
    remove(item.key)
    toast({ title: `${title} entfernt`, action: { label: 'Rückgängig', run: () => add(withoutKey(item)) } })
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        onClick={close}
        className={cn('absolute inset-0 bg-[#140c07]/50 backdrop-blur-[3px]', closing ? 'animate-[rb-fade-out_260ms_ease_both]' : 'animate-fade-in')}
      />
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        data-closing={closing || undefined}
        aria-labelledby={titleId}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-canvas shadow-float sm:rounded-l-[28px]',
          closing ? 'animate-[rb-drawer-out_260ms_cubic-bezier(0.4,0,1,1)_both]' : 'animate-[rb-drawer-in_420ms_cubic-bezier(0.2,0.8,0.2,1)_both]',
        )}
      >
        <header className="flex items-center justify-between gap-4 px-5 pt-5 pb-4 sm:px-6">
          <div className="flex items-baseline gap-2.5">
            <h2 id={titleId} className="font-display text-2xl font-semibold tracking-tight text-ink">
              Warenkorb
            </h2>
            {totals.count ? <span className="tabular text-sm text-ink-3">{totals.count} Artikel</span> : null}
          </div>
          <button
            type="button"
            onClick={close}
            data-autofocus
            className="inline-flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Warenkorb schließen"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {items.length === 0 ? (
          <EmptyCart onClose={close} />
        ) : (
          <>
            <div className="border-y border-line bg-surface/60 px-5 py-4 sm:px-6">
              <FreeShippingBar subtotal={totals.subtotal} freeFrom={FREE_SHIPPING_FROM} free={totals.shipping === 0} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin">
              <ul className="divide-y divide-line px-5 sm:px-6" aria-label="Artikel im Warenkorb">
                {items.map((item) => {
                  const { title, detail } = describeItem(item, products)
                  const unit = unitPrice(item, products)
                  const product = item.kind === 'product' ? products.find((p) => p.id === item.productId) : undefined
                  return (
                    <li key={item.key} className="flex animate-fade-in gap-4 py-4">
                      <CartThumb item={item} products={products} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {product ? (
                              <Link to={`/shop/${product.slug}`} className="font-semibold text-ink hover:text-accent-text">
                                {title}
                              </Link>
                            ) : (
                              <p className="font-semibold text-ink">{title}</p>
                            )}
                            <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{detail}</p>
                          </div>
                          <p className="tabular shrink-0 text-[15px] font-semibold text-ink">{price(unit * item.qty)}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <QtyStepper size="sm" value={item.qty} onChange={(v) => setQty(item.key, v)} label={`Menge ${title}`} />
                          <button
                            type="button"
                            onClick={() => onRemove(item)}
                            className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger md:h-8 md:px-2.5"
                            aria-label={`${title} entfernen`}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            Entfernen
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {upsell ? (
                <div className="px-5 pt-2 pb-6 sm:px-6">
                  <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-ink-3 uppercase">Passt dazu</p>
                  <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-xl" style={{ background: stageTint(upsell.color, 26) }} aria-hidden>
                      <CoffeeBag product={upsell} className="w-[56%] drop-shadow-[0_4px_6px_rgba(40,22,10,0.25)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{upsell.name}</p>
                      <p className="truncate text-xs text-ink-3">
                        {upsell.notes.slice(0, 2).join(' · ')} · <span className="tabular">{price(upsell.price)}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => add({ kind: 'product', productId: upsell.id, size: '250', grind: 'bohne', qty: 1 })}
                      className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-accent-soft px-3.5 text-xs font-semibold md:h-9 text-accent-text transition-colors hover:bg-accent-solid hover:text-on-accent"
                      aria-label={`${upsell.name} (250 g, ganze Bohne) hinzufügen`}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Dazu
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <footer className="border-t border-line bg-surface px-5 pt-4 pb-5 sm:px-6">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-2">
                  <dt>Zwischensumme</dt>
                  <dd className="tabular">{price(totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-ink-2">
                  <dt>Versand</dt>
                  <dd className="tabular">{totals.shipping === 0 ? <span className="font-medium text-success">kostenlos</span> : price(totals.shipping)}</dd>
                </div>
                <div className="flex items-baseline justify-between pt-2 text-ink">
                  <dt className="font-semibold">
                    Gesamt <span className="text-xs font-normal text-ink-3">inkl. MwSt.</span>
                  </dt>
                  <dd className="tabular font-display text-2xl font-semibold">{price(totals.total)}</dd>
                </div>
              </dl>
              <Link to="/kasse" onClick={close} className={cn(siteButtonClass('primary'), 'mt-4 w-full')}>
                Zur Kasse
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <button type="button" onClick={close} className="mt-1 h-11 w-full rounded-full text-sm font-medium text-ink-2 transition-colors hover:text-ink">
                Weiter einkaufen
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  )
}

function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
      <div className="relative mb-6 flex size-28 items-center justify-center rounded-full bg-accent-soft">
        <ShoppingBag className="size-10 text-accent-text" aria-hidden />
        <svg viewBox="0 0 40 40" className="absolute -top-2 right-1 size-10 text-accent" aria-hidden>
          <path d="M14 30c-4-6 4-9 0-16M22 30c-4-6 4-9 0-16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>
      <p className="font-display text-2xl font-semibold text-ink">Noch ganz leer hier.</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-2">Frisch geröstet wartet schon. Stöber durchs Sortiment – oder lass dir in einer Minute deinen Kaffee empfehlen.</p>
      <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
        <Link to="/shop" onClick={onClose} className={cn(siteButtonClass('primary'), 'w-full')}>
          Zum Shop
        </Link>
        <Link to="/geschmacksfinder" onClick={onClose} className={cn(siteButtonClass('secondary'), 'w-full')}>
          <Sparkles className="size-4" aria-hidden />
          Geschmacksfinder
        </Link>
      </div>
    </div>
  )
}
