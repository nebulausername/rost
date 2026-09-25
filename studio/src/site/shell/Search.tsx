import {
  ArrowRight,
  BookOpen,
  Clock,
  Cookie,
  CornerDownLeft,
  Gift,
  GraduationCap,
  Info,
  Mail,
  MapPin,
  Repeat,
  Scale,
  Search,
  ShoppingBag,
  Sparkles,
  Sprout,
  Store,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { CoffeeBag } from '../components'
import { GUIDES } from '../content/guides'
import { BrewIcon } from '../content/icons'
import { openConsentSettings } from './consent'
import { isMac, useSearchUi } from './searchUi'
import { stageTint, useDialog, usePresence } from './hooks'
import { buildIndex, GROUP_LABELS, highlightRanges, searchDocs, type PageIcon, type SearchDoc, type SearchGroup, type SearchHit } from './searchIndex'
import { recentSearches } from './storage'

// ---------------------------------------------------------------------------
// Website-Suche: Overlay im Stil einer Befehlspalette.
// Öffnen per Lupe in der Kopfzeile, „/“ oder ⌘K / Strg+K.
// ---------------------------------------------------------------------------

const POPULAR = ['schokoladig', 'fruchtig', 'Siebträger', 'V60', 'mild', 'Latte Art', 'Geschenk', 'Öffnungszeiten']

const QUICK_LINKS: { title: string; to: string; icon: PageIcon; hint: string }[] = [
  { title: 'Alle Kaffees', to: '/shop', icon: 'shop', hint: 'Shop' },
  { title: 'Geschmacksfinder', to: '/geschmacksfinder', icon: 'finder', hint: '1 Minute' },
  { title: 'Kaffee-Abo', to: '/abo', icon: 'abo', hint: 'ab 2 Wochen' },
  { title: 'Cafés & Öffnungszeiten', to: '/cafes', icon: 'cafe', hint: 'Weimar' },
]

const PAGE_ICONS: Record<PageIcon, LucideIcon> = {
  shop: ShoppingBag,
  abo: Repeat,
  finder: Sparkles,
  workshops: GraduationCap,
  cafe: Store,
  origin: Sprout,
  guides: BookOpen,
  about: Info,
  gift: Gift,
  legal: Scale,
  cookie: Cookie,
  cart: ShoppingBag,
  mail: Mail,
}

const GROUP_ORDER: SearchGroup[] = ['coffee', 'guide', 'workshop', 'page']
const GROUP_LIMIT: Record<SearchGroup, number> = { coffee: 6, guide: 4, workshop: 4, page: 4 }
const GROUP_BIAS: Record<SearchGroup, number> = { coffee: 3, guide: 0, workshop: 0, page: -2 }
const groupRank = (g: SearchGroup, score: number) => score + GROUP_BIAS[g]

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

export function SiteSearch() {
  const open = useSearchUi((s) => s.open)
  const setOpen = useSearchUi((s) => s.setOpen)
  const close = useCallback(() => setOpen(false), [setOpen])
  const { mounted, closing } = usePresence(open, 200)
  const ref = useRef<HTMLDivElement>(null)
  useDialog(open, close, ref)
  if (!mounted) return null
  return (
    <div className="fixed inset-0 z-[65] flex justify-center sm:items-start sm:px-6 sm:pt-[9vh]">
      <div
        aria-hidden
        onClick={close}
        className={cn('absolute inset-0 bg-[#140c07]/55 backdrop-blur-[4px]', closing ? 'animate-[rb-fade-out_200ms_ease_both]' : 'animate-fade-in')}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Website durchsuchen"
        className={cn(
          'relative flex h-dvh w-full flex-col overflow-hidden bg-canvas shadow-float sm:h-auto sm:max-h-[min(720px,82vh)] sm:max-w-2xl sm:rounded-[28px] sm:border sm:border-line',
          closing ? 'animate-[rb-fade-out_200ms_ease_both]' : 'animate-[rb-menu-in_280ms_cubic-bezier(0.2,0.8,0.2,1)_both]',
        )}
      >
        <SearchPanel onClose={close} />
      </div>
    </div>
  )
}

type Entry =
  | { id: string; type: 'hit'; hit: SearchHit }
  | { id: string; type: 'query'; q: string; recent: boolean }
  | { id: string; type: 'link'; title: string; to: string; icon: PageIcon; hint: string }

function SearchPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const query = useSearchUi((s) => s.query)
  const setQuery = useSearchUi((s) => s.setQuery)
  const products = useStore((s) => s.products)
  const workshops = useStore((s) => s.workshops)
  const cafes = useStore((s) => s.cafes)
  const recent = recentSearches.useList()
  const index = useMemo(() => buildIndex({ products, guides: GUIDES, workshops, cafes }), [products, workshops, cafes])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const optId = (i: number) => `${listId}-o${i}`
  const trimmed = query.trim()

  const hits = useMemo(() => searchDocs(index, trimmed), [index, trimmed])
  const grouped = useMemo(() => {
    const g = new Map<SearchGroup, SearchHit[]>()
    for (const h of hits) {
      const list = g.get(h.doc.group) ?? []
      if (list.length < GROUP_LIMIT[h.doc.group]) list.push(h)
      g.set(h.doc.group, list)
    }
    // Gruppen nach bestem Treffer sortieren, bei Gleichstand feste Reihenfolge
    return GROUP_ORDER.filter((k) => g.has(k))
      .map((k) => ({ key: k, hits: g.get(k) ?? [] }))
      // Kaffees leicht bevorzugen, Seiten leicht nach hinten
      .sort((a, b) => groupRank(b.key, b.hits[0].score) - groupRank(a.key, a.hits[0].score) || GROUP_ORDER.indexOf(a.key) - GROUP_ORDER.indexOf(b.key))
  }, [hits])

  const sections: { key: string; label: ReactNode; entries: Entry[]; action?: ReactNode }[] = useMemo(() => {
    if (trimmed) return grouped.map((g) => ({ key: g.key, label: GROUP_LABELS[g.key], entries: g.hits.map((hit) => ({ id: hit.doc.id, type: 'hit' as const, hit })) }))
    const out: { key: string; label: ReactNode; entries: Entry[] }[] = []
    if (recent.length) out.push({ key: 'recent', label: 'Zuletzt gesucht', entries: recent.map((q) => ({ id: `r-${q}`, type: 'query' as const, q, recent: true })) })
    out.push({ key: 'popular', label: 'Beliebte Suchen', entries: POPULAR.filter((q) => !recent.some((r) => r.toLowerCase() === q.toLowerCase())).map((q) => ({ id: `p-${q}`, type: 'query' as const, q, recent: false })) })
    out.push({ key: 'quick', label: 'Schnell zu', entries: QUICK_LINKS.map((l) => ({ id: `l-${l.to}`, type: 'link' as const, ...l })) })
    return out
  }, [trimmed, grouped, recent])

  const flat = useMemo(() => sections.flatMap((s) => s.entries), [sections])
  const indexed = useMemo(() => {
    let i = 0
    return sections.map((s) => ({ ...s, rows: s.entries.map((entry) => ({ entry, i: i++ })) }))
  }, [sections])
  const activeIndex = Math.min(active, Math.max(0, flat.length - 1))

  // Auswahl bei neuer Eingabe zurücksetzen (Render-Phase statt Effekt)
  const [lastQuery, setLastQuery] = useState(trimmed)
  if (lastQuery !== trimmed) {
    setLastQuery(trimmed)
    setActive(0)
  }

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // aktive Option sichtbar halten
  useEffect(() => {
    document.getElementById(`${listId}-o${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, listId])

  const choose = (entry: Entry | undefined) => {
    if (!entry) return
    if (entry.type === 'query') {
      setQuery(entry.q)
      inputRef.current?.focus()
      return
    }
    if (trimmed) recentSearches.push(trimmed)
    onClose()
    if (entry.type === 'link') {
      navigate(entry.to)
      return
    }
    const { doc } = entry.hit
    if (doc.action === 'consent') {
      // nach dem Schließen öffnen, damit die Fokus-Rückgabe sauber bleibt
      window.setTimeout(openConsentSettings, 0)
      return
    }
    if (doc.to) navigate(doc.to)
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
      e.preventDefault()
      setActive(flat.length ? (activeIndex + 1) % flat.length : 0)
    } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault()
      setActive(flat.length ? (activeIndex - 1 + flat.length) % flat.length : 0)
    } else if (e.key === 'Home' && e.ctrlKey) {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End' && e.ctrlKey) {
      e.preventDefault()
      setActive(Math.max(0, flat.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat.length) choose(flat[activeIndex])
      else if (trimmed) recentSearches.push(trimmed)
    }
  }

  const resultCount = hits.length

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5 sm:px-5 sm:py-3">
        <Search className="ml-1 size-5 shrink-0 text-ink-3" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={flat.length > 0}
          aria-controls={listId}
          aria-activedescendant={flat.length ? optId(activeIndex) : undefined}
          aria-autocomplete="list"
          aria-label="Suchbegriff"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Kaffee, Aroma, Anleitung, Workshop …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-12 min-w-0 flex-1 bg-transparent text-lg text-ink placeholder:text-ink-3 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Eingabe löschen"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="Suche schließen"
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <span className="sm:hidden" aria-hidden>
            Abbrechen
          </span>
          <kbd className="hidden rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-3 sm:inline" aria-hidden>
            Esc
          </kbd>
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {trimmed ? (resultCount ? `${resultCount} Treffer für „${trimmed}“` : `Keine Treffer für „${trimmed}“`) : ''}
      </p>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pt-2 pb-4 sm:px-3">
        {trimmed && !flat.length ? (
          <EmptyState query={trimmed} onPick={(q) => setQuery(q)} />
        ) : (
          <div role="listbox" id={listId} aria-label={trimmed ? 'Suchergebnisse' : 'Vorschläge'}>
            {indexed.map((s) => {
              const headingId = `${listId}-${s.key}`
              const chips = !trimmed && s.entries.every((e) => e.type === 'query')
              return (
                <div key={s.key} role="group" aria-labelledby={headingId} className="pt-3 first:pt-1">
                  <div className="flex items-center justify-between gap-3 px-3 pb-1.5">
                    <p id={headingId} className="text-[11px] font-semibold tracking-[0.18em] text-ink-3 uppercase">
                      {s.label}
                    </p>
                    {s.key === 'recent' ? (
                      <button
                        type="button"
                        onClick={() => {
                          recentSearches.clear()
                          inputRef.current?.focus()
                        }}
                        className="-my-2 inline-flex h-9 items-center rounded-full px-2 text-xs font-semibold text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        Verlauf löschen
                      </button>
                    ) : null}
                  </div>
                  <div className={cn(chips ? 'flex flex-wrap gap-2 px-2 pb-1' : 'space-y-0.5')}>
                    {s.rows.map(({ entry, i }) => {
                      const isActive = i === activeIndex
                      const common = {
                        id: optId(i),
                        role: 'option' as const,
                        'aria-selected': isActive,
                        onMouseMove: () => {
                          if (!isActive) setActive(i)
                        },
                        onClick: () => choose(entry),
                      }
                      if (entry.type === 'query') {
                        return (
                          <div
                            key={entry.id}
                            {...common}
                            className={cn(
                              'inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors select-none',
                              isActive ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-surface text-ink-2',
                            )}
                          >
                            {entry.recent ? <Clock className="size-3.5" aria-hidden /> : <TrendingUp className="size-3.5" aria-hidden />}
                            {entry.q}
                          </div>
                        )
                      }
                      if (entry.type === 'link') {
                        const Icon = PAGE_ICONS[entry.icon]
                        return (
                          <Row key={entry.id} common={common} active={isActive} visual={<IconTile icon={Icon} />} title={entry.title} subtitle={entry.hint} />
                        )
                      }
                      const { doc, terms, reason } = entry.hit
                      return (
                        <Row
                          key={entry.id}
                          common={common}
                          active={isActive}
                          visual={<HitVisual doc={doc} />}
                          title={<Highlight text={doc.title} terms={terms} />}
                          subtitle={<Highlight text={doc.subtitle} terms={terms} />}
                          extra={
                            doc.visual.kind === 'product' ? (
                              <span className="mt-1 block truncate text-xs text-ink-3">
                                {reason ? <span className="font-medium text-accent-text">{reason}</span> : <Highlight text={doc.visual.product.notes.join(' · ')} terms={terms} />}
                              </span>
                            ) : reason ? (
                              <span className="mt-1 block truncate text-xs font-medium text-accent-text">{reason}</span>
                            ) : null
                          }
                          meta={doc.meta}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <footer className="hidden shrink-0 items-center justify-between gap-4 border-t border-line bg-surface px-5 py-2.5 text-xs text-ink-3 sm:flex">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> auswählen
          </span>
          <span className="flex items-center gap-1">
            <Kbd>
              <CornerDownLeft className="size-3" aria-hidden />
              <span className="sr-only">Enter</span>
            </Kbd>{' '}
            öffnen
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd> schließen
          </span>
        </span>
        <span>
          Tipp: <Kbd>/</Kbd> oder <Kbd>{isMac() ? '⌘' : 'Strg'} K</Kbd> öffnet die Suche
        </span>
      </footer>
    </>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-canvas px-1 font-sans text-[11px] font-semibold text-ink-2">{children}</kbd>
}

function Row({
  common,
  active,
  visual,
  title,
  subtitle,
  extra,
  meta,
}: {
  common: Record<string, unknown>
  active: boolean
  visual: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  extra?: ReactNode
  meta?: string
}) {
  return (
    <div
      {...common}
      className={cn(
        'group flex min-h-14 cursor-pointer items-center gap-3.5 rounded-2xl px-3 py-2.5 transition-colors select-none',
        active ? 'bg-accent-soft' : 'hover:bg-surface-2',
      )}
    >
      {visual}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{title}</span>
        {subtitle ? <span className="block truncate text-sm text-ink-2">{subtitle}</span> : null}
        {extra}
      </span>
      {meta ? <span className="tabular hidden shrink-0 text-sm font-medium text-ink-2 sm:block">{meta}</span> : null}
      <ArrowRight className={cn('size-4 shrink-0 transition-[opacity,transform]', active ? 'translate-x-0 text-accent-text opacity-100' : '-translate-x-1 text-ink-3 opacity-0')} aria-hidden />
    </div>
  )
}

function IconTile({ icon: Icon, color }: { icon: LucideIcon; color?: string }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-ink-2" style={color ? { background: stageTint(color, 28) } : undefined} aria-hidden>
      <Icon className="size-5" />
    </span>
  )
}

function HitVisual({ doc }: { doc: SearchDoc }) {
  const v = doc.visual
  if (v.kind === 'product') {
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: stageTint(v.product.color, 26) }} aria-hidden>
        <CoffeeBag product={v.product} className="w-[58%] drop-shadow-[0_4px_6px_rgba(40,22,10,0.25)]" />
      </span>
    )
  }
  if (v.kind === 'guide') {
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-ink" style={{ background: stageTint(v.color, 28) }} aria-hidden>
        <BrewIcon name={v.icon} className="size-8" />
      </span>
    )
  }
  if (v.kind === 'workshop') return <IconTile icon={GraduationCap} color={v.color} />
  return <IconTile icon={v.icon === 'cafe' && doc.id.startsWith('c-') ? MapPin : PAGE_ICONS[v.icon]} />
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const ranges = useMemo(() => highlightRanges(text, terms), [text, terms])
  if (!ranges.length) return <>{text}</>
  const parts: ReactNode[] = []
  let at = 0
  ranges.forEach(([a, b], i) => {
    if (a > at) parts.push(<Fragment key={`t${i}`}>{text.slice(at, a)}</Fragment>)
    parts.push(
      <mark key={`m${i}`} className="rounded-[4px] bg-accent/25 px-px text-inherit">
        {text.slice(a, b)}
      </mark>,
    )
    at = b
  })
  if (at < text.length) parts.push(<Fragment key="end">{text.slice(at)}</Fragment>)
  return <>{parts}</>
}

function EmptyState({ query, onPick }: { query: string; onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center sm:py-14">
      <div className="relative flex size-20 items-center justify-center rounded-full bg-accent-soft" aria-hidden>
        <Search className="size-8 text-accent-text" />
      </div>
      <p className="mt-5 font-display text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] text-ink">„{query}“ haben wir nicht im Regal.</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-2">
        Nichts gefunden – probier{' '}
        <button type="button" onClick={() => onPick('schokoladig')} className="font-semibold text-accent-text underline decoration-accent/40 underline-offset-2 hover:decoration-current">
          „schokoladig“
        </button>{' '}
        oder{' '}
        <button type="button" onClick={() => onPick('V60')} className="font-semibold text-accent-text underline decoration-accent/40 underline-offset-2 hover:decoration-current">
          „V60“
        </button>
        . Oder lass dir im Geschmacksfinder einen Kaffee empfehlen.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {['Hausbrüh', 'Espresso', 'mild', 'Workshops'].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="inline-flex h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent-text"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
