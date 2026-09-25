import { Keyboard, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Kbd } from '../../components/ui/primitives'
import { cn } from '../../lib/utils'
import { Floating } from './Floating'
import { shortcutsBlocked } from './utils'

/** Mehrfachauswahl (Shift/⌘/Strg-Klick oder X) – Esc hebt sie auf */
export function useSelection(validIds: Set<string>) {
  const [raw, setRaw] = useState<Set<string>>(() => new Set())
  // Gelöschte oder weggefilterte Posts fallen automatisch aus der Auswahl
  const selected = useMemo(() => {
    let changed = false
    const next = new Set<string>()
    for (const id of raw) {
      if (validIds.has(id)) next.add(id)
      else changed = true
    }
    return changed ? next : raw
  }, [raw, validIds])

  const toggle = useCallback((id: string) => {
    setRaw((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const clear = useCallback(() => setRaw(new Set()), [])

  const has = selected.size > 0
  useEffect(() => {
    if (!has) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || shortcutsBlocked(e)) return
      clear()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [has, clear])

  return { selected, toggle, clear, ids: useMemo(() => Array.from(selected), [selected]) }
}

export const isMultiClick = (e: React.MouseEvent) => e.shiftKey || e.metaKey || e.ctrlKey

/** Schwebende Aktionsleiste unten mittig */
export function SelectionBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  if (!count) return null
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[58] flex justify-center px-3 sm:bottom-6">
      <div
        role="toolbar"
        aria-label={`${count} Posts ausgewählt`}
        className="pointer-events-auto flex max-w-full animate-pop-in flex-wrap items-center gap-1.5 rounded-2xl border border-line-strong bg-surface p-1.5 shadow-float sm:flex-nowrap"
      >
        <span className="flex h-8 items-center gap-2 rounded-xl bg-ink pr-1.5 pl-3 text-xs font-semibold text-canvas">
          <span className="tabular">{count}</span> ausgewählt
          <button type="button" onClick={onClear} className="flex size-5 items-center justify-center rounded-md hover:bg-canvas/15" aria-label="Auswahl aufheben (Esc)">
            <X className="size-3.5" />
          </button>
        </span>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function BarDivider() {
  return <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" aria-hidden />
}

export const barSelect =
  'h-8 appearance-none rounded-lg border border-line bg-surface-2/60 px-2.5 text-xs font-medium text-ink outline-none hover:border-line-strong focus-visible:border-accent'

/** „?“-Knopf mit Kürzel-Übersicht; „?“ auf der Tastatur öffnet sie ebenfalls */
export function ShortcutHelp({ items, className }: { items: { keys: string[]; label: string }[]; className?: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open = !!anchor
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey) return
      if (!open && shortcutsBlocked(e)) return
      e.preventDefault()
      setAnchor((a) => (a ? null : btn.current))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={(e) => {
          const el = e.currentTarget
          setAnchor((a) => (a ? null : el))
        }}
        aria-expanded={open}
        aria-label="Tastenkürzel anzeigen (?)"
        title="Tastenkürzel (?)"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-3 shadow-soft transition-colors hover:border-line-strong hover:text-ink',
          open && 'border-line-strong text-ink',
          className,
        )}
      >
        <Keyboard className="size-4" />
      </button>
      {anchor ? (
        <Floating anchor={anchor} onClose={() => setAnchor(null)} placement="bottom-end" role="dialog" label="Tastenkürzel" className="w-72 p-3">
          <p className="mb-2 text-xs font-semibold text-ink">Tastenkürzel</p>
          <ul className="space-y-1.5">
            {items.map((i) => (
              <li key={i.label} className="flex items-center justify-between gap-3 text-xs text-ink-2">
                <span>{i.label}</span>
                <span className="flex shrink-0 items-center gap-0.5">
                  {i.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Floating>
      ) : null}
    </>
  )
}
