import { History } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { CoffeeBag, Container } from '../components'
import { price } from '../lib'
import { stageTint } from './hooks'
import { recentlyViewed } from './storage'

// ---------------------------------------------------------------------------
// „Zuletzt angesehen“ – Produkt-Slugs im localStorage, Reihe auf Produktseite & im Shop
// ---------------------------------------------------------------------------

export function RecentlyViewed({ exclude, className }: { exclude?: string; className?: string }) {
  const slugs = recentlyViewed.useList()
  const products = useStore((s) => s.products)
  const list = useMemo(
    () =>
      slugs
        .filter((s) => s !== exclude)
        .map((s) => products.find((p) => p.slug === s))
        .filter((p) => p !== undefined),
    [slugs, products, exclude],
  )
  if (!list.length) return null
  return (
    <section aria-labelledby="recent-title" className={cn('border-t border-line py-14 md:py-20', className)}>
      <Container>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-accent-text uppercase">
              <History className="size-3.5" aria-hidden />
              Dein Verlauf
            </p>
            <h2 id="recent-title" className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Zuletzt angesehen
            </h2>
          </div>
          <button
            type="button"
            onClick={() => recentlyViewed.clear()}
            className="inline-flex h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Verlauf löschen
          </button>
        </div>
        <ul className="rb-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:px-0" aria-label="Zuletzt angesehene Produkte">
          {list.map((p) => (
            <li key={p.id} className="w-[168px] shrink-0 snap-start sm:w-[200px]">
              <Link to={`/shop/${p.slug}`} className="group block rounded-3xl focus-visible:outline-offset-4">
                <span className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl transition-shadow duration-300 group-hover:shadow-lift" style={{ background: stageTint(p.color, 24) }}>
                  <span className="w-[46%] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-1 group-hover:-rotate-3" aria-hidden>
                    <CoffeeBag product={p} className="drop-shadow-[0_10px_14px_rgba(40,22,10,0.25)]" />
                  </span>
                  {!p.available ? <span className="absolute top-3 left-3 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-canvas">ausverkauft</span> : null}
                </span>
                <span className="mt-3 flex items-baseline justify-between gap-2 px-1">
                  <span className="truncate font-display text-lg font-semibold text-ink group-hover:text-accent-text">{p.name}</span>
                  <span className="tabular shrink-0 text-sm font-medium text-ink-2">{price(p.price)}</span>
                </span>
                <span className="block truncate px-1 text-xs text-ink-3">{p.subtitle}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
