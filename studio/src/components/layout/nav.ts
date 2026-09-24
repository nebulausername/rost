import { BookOpen, CalendarDays, ChartLine, LayoutDashboard, Lightbulb, Megaphone, Settings, SquareKanban, Wallet } from 'lucide-react'
import type { ComponentType } from 'react'

export const NAV: { to: string; label: string; icon: ComponentType<{ className?: string }>; group: string; shortcut?: string }[] = [
  { to: '/', label: 'Cockpit', icon: LayoutDashboard, group: 'Überblick', shortcut: 'G C' },
  { to: '/kalender', label: 'Redaktionskalender', icon: CalendarDays, group: 'Social Media', shortcut: 'G K' },
  { to: '/pipeline', label: 'Content-Pipeline', icon: SquareKanban, group: 'Social Media', shortcut: 'G P' },
  { to: '/ideen', label: 'Ideen & Jahresplan', icon: Lightbulb, group: 'Social Media', shortcut: 'G I' },
  { to: '/kampagnen', label: 'Kampagnen & Werbung', icon: Megaphone, group: 'Werbung', shortcut: 'G W' },
  { to: '/budget', label: 'Budget-Planer', icon: Wallet, group: 'Werbung', shortcut: 'G B' },
  { to: '/analytics', label: 'Analytics', icon: ChartLine, group: 'Auswertung', shortcut: 'G A' },
  { to: '/bibliothek', label: 'Bibliothek', icon: BookOpen, group: 'Auswertung', shortcut: 'G L' },
  { to: '/einstellungen', label: 'Einstellungen', icon: Settings, group: 'System' },
]
