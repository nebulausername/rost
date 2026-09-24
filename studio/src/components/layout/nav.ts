import { BookOpen, CalendarDays, ChartLine, FileText, Globe, LayoutDashboard, Lightbulb, Megaphone, Settings, SquareKanban, Wallet } from 'lucide-react'
import type { ComponentType } from 'react'

export const NAV: { to: string; label: string; icon: ComponentType<{ className?: string }>; group: string; shortcut?: string }[] = [
  { to: '/studio', label: 'Cockpit', icon: LayoutDashboard, group: 'Überblick', shortcut: 'G C' },
  { to: '/studio/kalender', label: 'Redaktionskalender', icon: CalendarDays, group: 'Social Media', shortcut: 'G K' },
  { to: '/studio/pipeline', label: 'Content-Pipeline', icon: SquareKanban, group: 'Social Media', shortcut: 'G P' },
  { to: '/studio/ideen', label: 'Ideen & Jahresplan', icon: Lightbulb, group: 'Social Media', shortcut: 'G I' },
  { to: '/studio/kampagnen', label: 'Kampagnen & Werbung', icon: Megaphone, group: 'Werbung', shortcut: 'G W' },
  { to: '/studio/budget', label: 'Budget-Planer', icon: Wallet, group: 'Werbung', shortcut: 'G B' },
  { to: '/studio/website', label: 'Website & Shop', icon: Globe, group: 'Website', shortcut: 'G S' },
  { to: '/studio/analytics', label: 'Analytics', icon: ChartLine, group: 'Auswertung', shortcut: 'G A' },
  { to: '/studio/report', label: 'Monatsreport', icon: FileText, group: 'Auswertung', shortcut: 'G R' },
  { to: '/studio/bibliothek', label: 'Bibliothek', icon: BookOpen, group: 'Auswertung', shortcut: 'G L' },
  { to: '/studio/einstellungen', label: 'Einstellungen', icon: Settings, group: 'System' },
]
