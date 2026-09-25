import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigation, useNavigationType } from 'react-router'
import { Toaster } from '../components/Toaster'
import { useCart } from '../lib/cart'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { CartDrawer } from './shell/CartDrawer'
import { ConsentManager } from './shell/ConsentManager'
import { Footer } from './shell/Footer'
import { Header, PromoBar } from './shell/Header'
import { captureUtm, SITE_TITLE, useSessionFlag } from './shell/hooks'
import { QuickViewDialog } from './shell/QuickView'
import { closeQuickView } from './shell/quickViewStore'
import { SiteSearch } from './shell/Search'
import { useSearchShortcuts, useSearchUi } from './shell/searchUi'

// ---------------------------------------------------------------------------
// Rahmen der öffentlichen Website: Aktionsleiste, Kopfzeile, Warenkorb, Fußzeile.
// Seitentitel: Standard je Route hier, Seiten können mit usePageTitle() (shell/hooks) präzisieren.
// ---------------------------------------------------------------------------

const TITLES: Record<string, string> = {
  shop: 'Shop',
  kasse: 'Kasse',
  geschmacksfinder: 'Geschmacksfinder',
  abo: 'Kaffee-Abo',
  workshops: 'Workshops',
  cafes: 'Cafés',
  herkunft: 'Herkunft',
  anleitungen: 'Brühanleitungen',
  'ueber-uns': 'Über uns',
  impressum: 'Impressum',
  datenschutz: 'Datenschutz',
}

/** Keyframes & Hilfsklassen der Website (Endlos-Animationen stoppen bei reduzierter Bewegung) */
const SITE_CSS = `
@keyframes rb-drawer-in { from { transform: translateX(100%); } }
@keyframes rb-drawer-out { to { transform: translateX(100%); } }
@keyframes rb-fade-out { to { opacity: 0; } }
@keyframes rb-menu-in { from { opacity: 0; transform: translateY(-10px); } }
@keyframes rb-rise { from { opacity: 0; transform: translateY(18px); } }
@keyframes rb-marquee { to { transform: translateX(-50%); } }
@keyframes rb-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
@keyframes rb-steam { 0% { stroke-dashoffset: 70; opacity: 0; } 35% { opacity: 0.85; } 100% { stroke-dashoffset: -70; opacity: 0; } }
@keyframes rb-progress { from { transform: translateX(-100%); } to { transform: translateX(320%); } }
@keyframes rb-spin-slow { to { transform: rotate(360deg); } }
@keyframes rb-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes rb-bump { 0% { transform: scale(1); } 30% { transform: scale(1.28) rotate(-9deg); } 60% { transform: scale(0.94) rotate(4deg); } 100% { transform: scale(1) rotate(0); } }
@keyframes rb-count { from { transform: translateY(90%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.rb-marquee:hover .rb-marquee-track, .rb-marquee:focus-within .rb-marquee-track { animation-play-state: paused; }
.rb-no-scrollbar { scrollbar-width: none; }
/* Abschnitte weit unten erst rendern, wenn sie in die Nähe kommen (Platz bleibt reserviert) */
.rb-cv { content-visibility: auto; contain-intrinsic-size: auto 900px; }
.rb-no-scrollbar::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: reduce) {
  /* globale Regel kürzt nur die Dauer – Endlos-Loops würden dann flackern */
  .rb-loop, .animate-ping, .animate-spin, .animate-pulse { animation: none !important; }
}
/* Einblenden beim Scrollen – nur wenn JS läuft (html.rb-js), sonst ist alles sofort sichtbar */
@media (prefers-reduced-motion: no-preference) {
  html.rb-js .rb-reveal { transition: opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1); }
  html.rb-js .rb-reveal:not([data-shown]) { opacity: 0; transform: translateY(18px); }
}
`

/** Blendet .rb-reveal-Elemente ein, sobald sie sichtbar werden (auch nach Seitenwechseln) */
function useRevealOnScroll() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const root = document.documentElement
    root.classList.add('rb-js')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const el = e.target as HTMLElement
          // leichter Versatz für Geschwister in Listen
          const idx = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0
          el.style.transitionDelay = `${Math.min(idx, 5) * 70}ms`
          el.setAttribute('data-shown', '')
          io.unobserve(el)
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.01 },
    )
    const scan = () => document.querySelectorAll('.rb-reveal:not([data-shown])').forEach((el) => io.observe(el))
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
      root.classList.remove('rb-js')
    }
  }, [])
}

function useSiteThemeSync() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

/** Scrollt bei neuen Seiten nach oben, springt zu #Ankern und stellt bei Zurück/Vor die Position wieder her. */
function useScrollManagement() {
  const { key, pathname, hash } = useLocation()
  const navType = useNavigationType()
  const positions = useRef(new Map<string, number>())
  const lastPath = useRef(pathname)
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    try {
      window.history.scrollRestoration = 'manual'
    } catch {
      // egal – dann übernimmt der Browser
    }
    return () => {
      try {
        window.history.scrollRestoration = 'auto'
      } catch {
        // s. o.
      }
    }
  }, [])

  useLayoutEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => positions.current.set(key, window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [key])

  useLayoutEffect(() => {
    // nur bei neuem History-Eintrag reagieren
    if (lastKey.current === key) return
    lastKey.current = key
    const pathChanged = lastPath.current !== pathname
    lastPath.current = pathname
    if (navType === 'POP') {
      const saved = positions.current.get(key)
      if (saved !== undefined) {
        window.scrollTo(0, saved)
        return
      }
    }
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) {
        el.scrollIntoView()
        return
      }
    }
    if (pathChanged) window.scrollTo(0, 0)
  }, [key, pathname, hash, navType])
}

function PrototypeNotice() {
  const enabled = useStore((s) => s.site.prototypeNotice)
  const [hidden, hide] = useSessionFlag('rb-prototype-hidden')
  const { pathname } = useLocation()
  if (!enabled || hidden) return null
  return (
    <aside
      aria-label="Hinweis zum Prototyp"
      className={cn('fixed bottom-3 left-3 z-30 animate-fade-in sm:bottom-4 sm:left-4', pathname.startsWith('/shop/') && 'max-lg:bottom-[88px]', pathname === '/shop' && 'max-md:bottom-[84px]')}
    >
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface/90 py-1 pr-1 pl-3 text-xs shadow-lift backdrop-blur-md">
        <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
        <span className="text-ink-2">
          <span className="sm:hidden">Prototyp</span>
          <span className="hidden sm:inline">Prototyp · Beispielpreise & -inhalte</span>
        </span>
        <Link to="/studio/website" className="rounded-full px-1.5 py-0.5 font-semibold whitespace-nowrap text-accent-text hover:bg-accent-soft">
          Im Studio bearbeiten
        </Link>
        <button type="button" onClick={hide} className="inline-flex size-6 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Prototyp-Hinweis ausblenden">
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </aside>
  )
}

function RouteProgress() {
  const navigation = useNavigation()
  if (navigation.state !== 'loading') return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden" role="progressbar" aria-label="Seite lädt">
      <div className="rb-loop h-full w-1/3 animate-[rb-progress_900ms_ease-in-out_infinite] rounded-full bg-accent" />
    </div>
  )
}

export function SiteShell() {
  useSiteThemeSync()
  useRevealOnScroll()
  useScrollManagement()
  const { pathname, search } = useLocation()

  // Standard-Seitentitel (Layout-Effekt → Seiten mit usePageTitle überschreiben ihn danach)
  useLayoutEffect(() => {
    const segment = pathname.split('/')[1] ?? ''
    const label = segment ? TITLES[segment] : null
    document.title = label ? `${label} · ${SITE_TITLE}` : segment ? `Seite nicht gefunden · ${SITE_TITLE}` : SITE_TITLE
  }, [pathname])

  // Kampagnen-Quelle merken (landet später in der Bestellung → Studio-Analytics)
  useEffect(() => {
    captureUtm(search)
  }, [search])

  // Warenkorb, Suche & Schnellansicht schließen bei Seitenwechsel
  useEffect(() => {
    if (useCart.getState().open) useCart.getState().setOpen(false)
    if (useSearchUi.getState().open) useSearchUi.getState().setOpen(false)
    closeQuickView()
  }, [pathname])

  useSearchShortcuts()

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-canvas text-base text-ink">
      <style>{SITE_CSS}</style>
      <a
        href="#inhalt"
        className="sr-only z-[80] rounded-full bg-accent-solid px-4 py-2 text-sm font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Zum Inhalt springen
      </a>
      <ConsentManager />
      <PromoBar />
      <Header />
      <main id="inhalt" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <QuickViewDialog />
      <SiteSearch />
      <PrototypeNotice />
      <Toaster />
      <RouteProgress />
    </div>
  )
}
