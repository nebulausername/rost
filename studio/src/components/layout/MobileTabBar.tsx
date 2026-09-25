import { CalendarDays, LayoutDashboard, Megaphone, Menu, Plus } from 'lucide-react'
import { NavLink } from 'react-router'
import { useUi } from '../../lib/store'
import { cn } from '../../lib/utils'

const TABS = [
  { to: '/studio', label: 'Cockpit', icon: LayoutDashboard, end: true },
  { to: '/studio/kalender', label: 'Kalender', icon: CalendarDays, end: false },
  { to: '/studio/kampagnen', label: 'Werbung', icon: Megaphone, end: false },
]

/** Daumenfreundliche Navigation auf dem Handy – mit zentralem „Neuer Post“ */
export function MobileTabBar() {
  const openPost = useUi((s) => s.openPost)
  const setNav = useUi((s) => s.setNav)
  const item = 'flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium'
  return (
    <nav
      aria-label="Schnellnavigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden print:hidden"
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch px-2">
        {TABS.slice(0, 2).map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cn(item, isActive ? 'text-accent-text' : 'text-ink-3')}>
            <t.icon className="size-5" />
            {t.label}
          </NavLink>
        ))}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => openPost(null)}
            aria-label="Neuen Post planen"
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-accent-solid text-on-accent shadow-lift ring-4 ring-canvas transition-transform active:scale-95"
          >
            <Plus className="size-6" />
          </button>
        </div>
        {TABS.slice(2).map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cn(item, isActive ? 'text-accent-text' : 'text-ink-3')}>
            <t.icon className="size-5" />
            {t.label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setNav(true)} className={cn(item, 'text-ink-3')}>
          <Menu className="size-5" />
          Mehr
        </button>
      </div>
    </nav>
  )
}
