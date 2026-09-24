import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigation, useNavigationType } from 'react-router'
import { Toaster } from '../components/Toaster'
import { useCart } from '../lib/cart'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { CartDrawer } from './shell/CartDrawer'
import { Footer } from './shell/Footer'
import { Header, PromoBar } from './shell/Header'
import { captureUtm, SITE_TITLE, useSessionFlag } from './shell/hooks'

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
.rb-marquee:hover .rb-marquee-track, .rb-marquee:focus-within .rb-marquee-track { animation-play-state: paused; }
.rb-no-scrollbar { scrollbar-width: none; }
.rb-no-scrollbar::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: reduce) {
  .rb-loop { animation: none !important; }
}
`

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
      className={cn('fixed bottom-3 left-3 z-30 animate-fade-in sm:bottom-4 sm:left-4', pathname.startsWith('/shop/') && 'max-lg:bottom-[88px]')}
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

  // Warenkorb schließt bei Seitenwechsel
  useEffect(() => {
    if (useCart.getState().open) useCart.getState().setOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-canvas text-base text-ink">
      <style>{SITE_CSS}</style>
      <a
        href="#inhalt"
        className="sr-only z-[80] rounded-full bg-accent-solid px-4 py-2 text-sm font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Zum Inhalt springen
      </a>
      <PromoBar />
      <Header />
      <main id="inhalt" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <PrototypeNotice />
      <Toaster />
      <RouteProgress />
    </div>
  )
}
