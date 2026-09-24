import { CornerDownLeft, FileText, Lightbulb, Megaphone, Moon, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { STATUS } from '../lib/constants'
import { useStore, useUi } from '../lib/store'
import { cn, fmt } from '../lib/utils'
import { NAV } from './layout/nav'
import { PlatformStack } from './domain'
import { Kbd } from './ui/primitives'

interface Item {
  id: string
  group: string
  label: string
  hint?: ReactNode
  icon: ReactNode
  keywords?: string
  run: () => void
}

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen)
  return open ? <PaletteBody /> : null
}

function PaletteBody() {
  const setOpen = useUi((s) => s.setPalette)
  const openPost = useUi((s) => s.openPost)
  const openCampaign = useUi((s) => s.openCampaign)
  const posts = useStore((s) => s.posts)
  const campaigns = useStore((s) => s.campaigns)
  const theme = useStore((s) => s.settings.theme)
  const updateSettings = useStore((s) => s.updateSettings)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const items = useMemo<Item[]>(() => {
    const close = (fn: () => void) => () => {
      setOpen(false)
      fn()
    }
    const actions: Item[] = [
      { id: 'a-post', group: 'Aktionen', label: 'Neuen Post planen', icon: <Plus className="size-4" />, hint: <Kbd>N</Kbd>, keywords: 'erstellen social', run: close(() => openPost(null)) },
      { id: 'a-cmp', group: 'Aktionen', label: 'Neue Kampagne anlegen', icon: <Megaphone className="size-4" />, hint: <Kbd>W</Kbd>, keywords: 'werbung ads anzeige', run: close(() => openCampaign(null)) },
      { id: 'a-idea', group: 'Aktionen', label: 'Idee festhalten', icon: <Lightbulb className="size-4" />, keywords: 'backlog', run: close(() => navigate('/ideen?neu=1')) },
      {
        id: 'a-theme',
        group: 'Aktionen',
        label: `Darstellung wechseln (aktuell: ${{ system: 'System', light: 'Hell', dark: 'Dunkel' }[theme]})`,
        icon: <Moon className="size-4" />,
        keywords: 'dark light modus theme',
        run: () => updateSettings({ theme: theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system' }),
      },
    ]
    const nav: Item[] = NAV.map((n) => ({
      id: `n-${n.to}`,
      group: 'Springen zu',
      label: n.label,
      icon: <n.icon className="size-4" />,
      hint: n.shortcut ? <span className="flex gap-0.5">{n.shortcut.split(' ').map((k) => <Kbd key={k}>{k}</Kbd>)}</span> : undefined,
      run: close(() => navigate(n.to)),
    }))
    const postItems: Item[] = [...posts]
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      .map((p) => ({
        id: `p-${p.id}`,
        group: 'Posts',
        label: p.title,
        icon: <FileText className="size-4" />,
        hint: (
          <span className="flex items-center gap-2 text-[11px] text-ink-3">
            {STATUS[p.status].label} · {fmt.date(p.scheduledAt, 'd. MMM')}
            <PlatformStack platforms={p.platforms} size={16} />
          </span>
        ),
        keywords: `${p.caption} ${p.hashtags.join(' ')}`,
        run: close(() => openPost(p.id)),
      }))
    const cmpItems: Item[] = campaigns.map((c) => ({
      id: `c-${c.id}`,
      group: 'Kampagnen',
      label: c.name,
      icon: <Megaphone className="size-4" />,
      hint: <span className="text-[11px] text-ink-3">{fmt.eur(c.budget)}</span>,
      keywords: `${c.audience} ${c.offer}`,
      run: close(() => navigate(`/kampagnen/${c.id}`)),
    }))
    return [...actions, ...nav, ...cmpItems, ...postItems]
  }, [posts, campaigns, theme, navigate, openPost, openCampaign, setOpen, updateSettings])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return items.filter((i) => i.group !== 'Posts').concat(items.filter((i) => i.group === 'Posts').slice(0, 5))
    return items
      .filter((i) => `${i.label} ${i.keywords ?? ''} ${i.group}`.toLowerCase().includes(term))
      .slice(0, 40)
  }, [items, q])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const groups = Array.from(new Set(filtered.map((i) => i.group)))
  let index = -1

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-[#140c07]/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" aria-label="Befehlspalette" className="relative w-full max-w-xl animate-pop-in overflow-hidden rounded-2xl border border-line bg-surface shadow-float">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 text-ink-3" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(filtered.length - 1, a + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(0, a - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                filtered[active]?.run()
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            placeholder="Posts, Kampagnen, Seiten oder Aktionen suchen …"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3"
            aria-controls="palette-list"
            aria-activedescendant={filtered[active] ? `pal-${filtered[active].id}` : undefined}
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul id="palette-list" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto p-2 scrollbar-thin">
          {filtered.length === 0 ? <li className="px-3 py-8 text-center text-sm text-ink-3">Nichts gefunden für „{q}“.</li> : null}
          {groups.map((g) => (
            <li key={g} role="presentation">
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">{g}</p>
              <ul role="group">
                {filtered
                  .filter((i) => i.group === g)
                  .map((i) => {
                    index++
                    const idx = index
                    return (
                      <li
                        key={i.id}
                        id={`pal-${i.id}`}
                        data-index={idx}
                        role="option"
                        aria-selected={idx === active}
                        onMouseMove={() => setActive(idx)}
                        onClick={() => i.run()}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm',
                          idx === active ? 'bg-accent-soft text-ink' : 'text-ink-2',
                        )}
                      >
                        <span className={cn(idx === active ? 'text-accent-text' : 'text-ink-3')}>{i.icon}</span>
                        <span className="min-w-0 flex-1 truncate">{i.label}</span>
                        {i.hint}
                        {idx === active ? <CornerDownLeft className="size-3.5 text-ink-3" /> : null}
                      </li>
                    )
                  })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
