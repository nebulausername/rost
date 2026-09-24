import { Megaphone, Menu, Monitor, Moon, Plus, Search, Sun, X } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useNavigation } from 'react-router'
import { useStore, useUi } from '../../lib/store'
import { cn } from '../../lib/utils'
import { CampaignEditor } from '../../features/CampaignEditor'
import { PostEditor } from '../../features/PostEditor'
import { CommandPalette } from '../CommandPalette'
import { Toaster } from '../Toaster'
import { Avatar, Button, Kbd } from '../ui/primitives'
import { NAV } from './nav'


function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-accent shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)]">
        <svg viewBox="0 0 64 64" className="size-6" aria-hidden>
          <g transform="rotate(-30 32 32)">
            <ellipse cx="32" cy="32" rx="15" ry="21" fill="#1C130E" />
            <path d="M32 12c-5 7 5 13 0 20s5 13 0 20" fill="none" stroke="#C4702F" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </svg>
      </div>
      <div className="leading-tight">
        <p className="font-display text-[17px] font-semibold tracking-tight text-sidebar-ink">Röstbrüder</p>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-sidebar-muted uppercase">Studio</p>
      </div>
    </div>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const team = useStore((s) => s.team)
  const posts = useStore((s) => s.posts)
  const openPost = useUi((s) => s.openPost)
  const reviewCount = posts.filter((p) => p.status === 'review').length
  const groups = Array.from(new Set(NAV.map((n) => n.group)))
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-ink">
      <div className="px-5 pt-5 pb-4">
        <Logo />
      </div>
      <div className="px-3 pb-3">
        <Button
          variant="primary"
          className="w-full justify-between"
          onClick={() => {
            openPost(null)
            onNavigate?.()
          }}
        >
          <span className="flex items-center gap-2">
            <Plus className="size-4" /> Neuer Post
          </span>
          <span className="rounded bg-black/15 px-1.5 text-[10px] font-semibold">N</span>
        </Button>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2 scrollbar-thin" aria-label="Hauptnavigation">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1.5 px-2.5 text-[10px] font-semibold tracking-[0.16em] text-sidebar-muted uppercase">{g}</p>
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === g).map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    end={n.to === '/studio'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
                        isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-ink/75 hover:bg-sidebar-active/60 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <n.icon className={cn('size-4', isActive ? 'text-accent' : 'text-sidebar-muted group-hover:text-sidebar-ink')} />
                        <span className="flex-1 truncate">{n.label}</span>
                        {n.to === '/studio/pipeline' && reviewCount > 0 ? (
                          <span className="rounded-full bg-accent-solid px-1.5 text-[10px] leading-4 font-bold text-on-accent" title="Wartet auf Freigabe">
                            {reviewCount}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {team.slice(0, 4).map((m) => (
              <span key={m.id} className="rounded-full ring-2 ring-sidebar">
                <Avatar name={`${m.name} – ${m.role}`} color={m.color} initials={m.initials} size={26} />
              </span>
            ))}
          </div>
          <ThemeSwitch />
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="mt-3 flex items-center justify-between rounded-lg border border-white/10 px-2.5 py-2 text-[12px] font-medium text-sidebar-ink/85 transition-colors hover:bg-sidebar-active hover:text-white"
        >
          roestbrueder.com ansehen
          <span aria-hidden>↗</span>
        </a>
        <p className="mt-3 text-[11px] leading-snug text-sidebar-muted">
          Rösterei · Richard-Wagner-Str. 17
          <br />
          Espressobar · Kaufstraße 19
        </p>
      </div>
    </div>
  )
}

function ThemeSwitch() {
  const theme = useStore((s) => s.settings.theme)
  const update = useStore((s) => s.updateSettings)
  const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
  const Icon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon
  const label = { system: 'System', light: 'Hell', dark: 'Dunkel' }[theme]
  return (
    <button
      onClick={() => update({ theme: next })}
      className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-ink"
      title={`Darstellung: ${label} (klicken zum Wechseln)`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

function useThemeSync() {
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

function useGlobalShortcuts() {
  const navigate = useNavigate()
  useEffect(() => {
    let gPressed = 0
    const routes: Record<string, string> = { c: '/studio', k: '/studio/kalender', p: '/studio/pipeline', i: '/studio/ideen', w: '/studio/kampagnen', b: '/studio/budget', a: '/studio/analytics', l: '/studio/bibliothek', s: '/studio/website', r: '/studio/report' }
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t.closest('input, textarea, select, [contenteditable="true"]')
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        useUi.getState().setPalette(!useUi.getState().paletteOpen)
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      const s = useUi.getState()
      if (s.postEditor.open || s.campaignEditor.open || s.paletteOpen || document.querySelector('[role="dialog"]')) return
      const key = e.key.toLowerCase()
      if (Date.now() - gPressed < 900 && routes[key]) {
        e.preventDefault()
        gPressed = 0
        navigate(routes[key])
        return
      }
      if (key === 'g') {
        gPressed = Date.now()
        return
      }
      if (key === 'n') {
        e.preventDefault()
        s.openPost(null)
      } else if (key === 'w') {
        e.preventDefault()
        s.openCampaign(null)
      } else if (key === '/') {
        e.preventDefault()
        s.setPalette(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}

export function AppShell() {
  useThemeSync()
  useGlobalShortcuts()
  const navOpen = useUi((s) => s.navOpen)
  const setNav = useUi((s) => s.setNav)
  const setPalette = useUi((s) => s.setPalette)
  const openPost = useUi((s) => s.openPost)
  const openCampaign = useUi((s) => s.openCampaign)
  const demo = useStore((s) => s.settings.demoData)
  const location = useLocation()
  const navigation = useNavigation()
  const current = NAV.find((n) => (n.to === '/studio' ? location.pathname === '/studio' || location.pathname === '/studio/' : location.pathname.startsWith(n.to)))

  useEffect(() => {
    document.title = current ? `${current.label} · Röstbrüder Studio` : 'Röstbrüder Studio'
  }, [current])

  // Beim Seitenwechsel nach oben – oder zum Anker (#kanaele), sobald die Seite geladen ist
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0 })
      return
    }
    const t = setTimeout(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250)
    return () => clearTimeout(t)
  }, [location.pathname, location.hash])

  return (
    <div className="min-h-dvh">
      {/* Desktop-Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block print:hidden">
        <Sidebar />
      </aside>

      {/* Mobile-Navigation */}
      {navOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={() => setNav(false)} />
          <aside className="relative h-full w-72 max-w-[85vw] animate-slide-in shadow-float">
            <Sidebar onNavigate={() => setNav(false)} />
            <button
              onClick={() => setNav(false)}
              className="absolute top-5 right-3 rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-active hover:text-white"
              aria-label="Navigation schließen"
            >
              <X className="size-5" />
            </button>
          </aside>
        </div>
      ) : null}

      {navigation.state === 'loading' ? (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-accent-soft" role="progressbar" aria-label="Seite wird geladen">
          <div className="h-full w-1/3 animate-[loading_900ms_ease-in-out_infinite] bg-accent" />
        </div>
      ) : null}

      <div className="lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 backdrop-blur-md print:hidden">
          <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-2 px-4 md:px-6 xl:px-8">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setNav(true)} aria-label="Navigation öffnen">
              <Menu className="size-5" />
            </Button>
            <button
              onClick={() => setPalette(true)}
              className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-left text-sm text-ink-3 shadow-soft transition-colors hover:border-line-strong md:max-w-sm"
            >
              <Search className="size-4 shrink-0" />
              <span className="flex-1 truncate">Suchen, springen, erstellen …</span>
              <span className="hidden items-center gap-0.5 sm:flex">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
            <div className="ml-auto flex items-center gap-2">
              {demo ? (
                <span className="hidden rounded-full border border-dashed border-line-strong px-2.5 py-1 text-[11px] font-medium text-ink-3 xl:inline" title="Beispieldaten – unter Einstellungen durch echte Daten ersetzen">
                  Demo-Daten
                </span>
              ) : null}
              <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => openCampaign(null)}>
                <Megaphone className="size-4" /> Kampagne
              </Button>
              <Button variant="primary" onClick={() => openPost(null)}>
                <Plus className="size-4" /> <span className="hidden sm:inline">Post planen</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 md:py-8 xl:px-8 print:p-0">
          <Outlet />
        </main>
      </div>

      <PostEditor />
      <CampaignEditor />
      <CommandPalette />
      <Toaster />
    </div>
  )
}
