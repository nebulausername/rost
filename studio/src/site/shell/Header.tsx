import { ArrowRight, ArrowUpRight, Menu, ShoppingBag, Sparkles, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { PlatformIcon } from '../../components/domain'
import { useCart } from '../../lib/cart'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { Container, OpenBadge, siteButtonClass } from '../components'
import { FACEBOOK_URL, INSTAGRAM_URL, readSession, useDialog, usePresence, useScrolled, writeSession } from './hooks'
import { Logo } from './Logo'

const NAV_ITEMS = [
  { to: '/shop', label: 'Shop' },
  { to: '/abo', label: 'Kaffee-Abo' },
  { to: '/workshops', label: 'Workshops' },
  { to: '/cafes', label: 'Cafés' },
  { to: '/herkunft', label: 'Herkunft' },
  { to: '/anleitungen', label: 'Anleitungen' },
]

const MOBILE_ITEMS = [
  { to: '/shop', label: 'Shop' },
  { to: '/abo', label: 'Kaffee-Abo' },
  { to: '/geschmacksfinder', label: 'Geschmacksfinder' },
  { to: '/workshops', label: 'Workshops' },
  { to: '/cafes', label: 'Cafés' },
  { to: '/herkunft', label: 'Herkunft' },
  { to: '/anleitungen', label: 'Anleitungen' },
  { to: '/ueber-uns', label: 'Über uns' },
]

const PROMO_KEY = 'rb-promo-dismissed'

// ---------------------------------------------------------------------------
// Aktionsleiste (im Studio unter Website gepflegt)
// ---------------------------------------------------------------------------

export function PromoBar() {
  const promo = useStore((s) => s.site.promo)
  const [dismissed, setDismissed] = useState(() => readSession(PROMO_KEY))
  if (!promo.enabled || !promo.text.trim() || dismissed === promo.text) return null
  const internal = promo.link.startsWith('/')
  const linkClass = 'inline-flex items-center gap-1 font-semibold underline decoration-current/40 underline-offset-4 transition hover:decoration-current'
  return (
    <div className="relative z-50 bg-accent-solid text-on-accent">
      <Container className="flex min-h-10 items-center justify-center gap-x-3 py-2 pr-12 text-center text-[13px] leading-snug sm:pr-12">
        <p>
          <Sparkles className="mr-1.5 -mt-0.5 inline size-3.5 opacity-80" aria-hidden />
          {promo.text}
          {promo.link && promo.linkLabel ? (
            <>
              {' '}
              <span aria-hidden className="mx-1 opacity-50">
                ·
              </span>
              {internal ? (
                <Link to={promo.link} className={linkClass}>
                  {promo.linkLabel}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              ) : (
                <a href={promo.link} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {promo.linkLabel}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              )}
            </>
          ) : null}
        </p>
      </Container>
      <button
        type="button"
        onClick={() => {
          writeSession(PROMO_KEY, promo.text)
          setDismissed(promo.text)
        }}
        className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full opacity-80 transition hover:bg-black/10 hover:opacity-100 sm:right-4"
        aria-label="Hinweis ausblenden"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kopfzeile
// ---------------------------------------------------------------------------

export function Header() {
  const { pathname } = useLocation()
  const scrolled = useScrolled(24)
  // Menü merkt sich, auf welcher Seite es geöffnet wurde → schließt bei Routenwechsel von selbst
  const [menuAt, setMenuAt] = useState<string | null>(null)
  const menuOpen = menuAt === pathname
  const closeMenu = useCallback(() => setMenuAt(null), [])
  const items = useCart((s) => s.items)
  const setCartOpen = useCart((s) => s.setOpen)
  const count = useMemo(() => items.reduce((a, i) => a + i.qty, 0), [items])
  const overHero = pathname === '/' && !scrolled

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300',
          overHero
            ? 'border-transparent bg-transparent'
            : 'border-line/70 bg-canvas/85 shadow-[0_1px_0_rgb(var(--shadow-color)/0.02),0_8px_24px_-16px_rgb(var(--shadow-color)/0.25)] backdrop-blur-xl backdrop-saturate-150',
        )}
      >
        <Container className="flex h-16 items-center gap-4 lg:h-20">
          <Logo onDark={overHero} />
          <nav aria-label="Hauptnavigation" className="mx-auto hidden lg:block">
            <ul className="flex items-center gap-0.5">
              {NAV_ITEMS.map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    className={({ isActive }) =>
                      cn(
                        'relative inline-flex h-10 items-center rounded-full px-3.5 text-[15px] font-medium transition-colors',
                        overHero
                          ? isActive
                            ? 'text-white'
                            : 'text-sidebar-ink/75 hover:bg-white/10 hover:text-white'
                          : isActive
                            ? 'text-ink'
                            : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {n.label}
                        <span
                          aria-hidden
                          className={cn(
                            'absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent transition-[opacity,transform] duration-300',
                            isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
                          )}
                        />
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            <NavLink
              to="/geschmacksfinder"
              className={({ isActive }) =>
                cn(
                  'hidden h-10 min-w-10 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors lg:inline-flex xl:px-4',
                  overHero
                    ? 'border-white/25 text-white hover:bg-white/10'
                    : isActive
                      ? 'border-accent bg-accent-soft text-accent-text'
                      : 'border-line-strong text-ink hover:border-accent hover:text-accent-text',
                )
              }
            >
              <Sparkles className="size-4" aria-hidden />
              <span className="sr-only xl:not-sr-only">Geschmacksfinder</span>
            </NavLink>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={count ? `Warenkorb öffnen, ${count} Artikel` : 'Warenkorb öffnen (leer)'}
              className={cn(
                'relative inline-flex size-11 items-center justify-center rounded-full transition-colors',
                overHero ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-surface-2',
              )}
            >
              <ShoppingBag className="size-[22px]" aria-hidden />
              {count > 0 ? (
                <span
                  key={count}
                  className={cn(
                    'tabular absolute top-0.5 right-0 inline-flex h-5 min-w-5 animate-pop-in items-center justify-center rounded-full bg-accent-solid px-1 text-[11px] font-bold text-on-accent ring-2',
                    overHero ? 'ring-sidebar' : 'ring-canvas',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setMenuAt(pathname)}
              aria-label="Menü öffnen"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              className={cn(
                'inline-flex size-11 items-center justify-center rounded-full transition-colors lg:hidden',
                overHero ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-surface-2',
              )}
            >
              <Menu className="size-6" aria-hidden />
            </button>
          </div>
        </Container>
      </header>
      <MobileMenu open={menuOpen} onClose={closeMenu} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Mobiles Vollbild-Menü
// ---------------------------------------------------------------------------

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mounted, closing } = usePresence(open, 220)
  const ref = useRef<HTMLDivElement>(null)
  const cafes = useStore((s) => s.cafes)
  useDialog(open, onClose, ref)
  if (!mounted) return null
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Menü"
      className={cn(
        'grain fixed inset-0 z-50 flex flex-col overflow-y-auto bg-sidebar text-sidebar-ink lg:hidden',
        closing ? 'animate-[rb-fade-out_220ms_ease_both]' : 'animate-[rb-menu-in_320ms_cubic-bezier(0.2,0.8,0.2,1)_both]',
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(196_112_47/0.35),transparent)]" />
      <Container className="relative flex h-16 shrink-0 items-center justify-between">
        <Logo onDark />
        <button
          type="button"
          onClick={onClose}
          data-autofocus
          aria-label="Menü schließen"
          className="inline-flex size-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <X className="size-6" aria-hidden />
        </button>
      </Container>
      <Container className="relative flex flex-1 flex-col pt-6 pb-10">
        <nav aria-label="Mobile Navigation">
          <ul>
            {MOBILE_ITEMS.map((n, i) => (
              <li key={n.to} className="animate-[rb-rise_480ms_cubic-bezier(0.2,0.8,0.2,1)_both]" style={{ animationDelay: `${60 + i * 35}ms` }}>
                <NavLink
                  to={n.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-baseline gap-4 border-b border-white/10 py-3 font-display text-[32px] leading-tight font-semibold tracking-tight transition-colors sm:text-5xl',
                      isActive ? 'text-accent' : 'text-sidebar-ink hover:text-white',
                    )
                  }
                >
                  <span className="tabular w-6 shrink-0 font-sans text-xs font-semibold tracking-widest text-sidebar-muted">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1">{n.label}</span>
                  <ArrowRight className="hidden size-5 shrink-0 -translate-x-2 self-center opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 sm:block" aria-hidden />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-10 space-y-8">
          <section aria-label="Unsere Cafés heute">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-sidebar-muted uppercase">Heute in Weimar</p>
            <ul className="space-y-3">
              {cafes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/5 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{c.name}</p>
                    <p className="truncate text-xs text-sidebar-muted">{c.address}</p>
                  </div>
                  <OpenBadge cafe={c} tone="onDark" />
                </li>
              ))}
            </ul>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/geschmacksfinder" onClick={onClose} className={siteButtonClass('primary')}>
              <Sparkles className="size-4" aria-hidden />
              Welcher Kaffee passt zu mir?
            </Link>
            <div className="flex gap-2">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10" aria-label="Röstbrüder auf Instagram (neues Fenster)">
                <PlatformIcon platform="instagram" className="size-5" />
              </a>
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10" aria-label="Röstbrüder auf Facebook (neues Fenster)">
                <PlatformIcon platform="facebook" className="size-5" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
