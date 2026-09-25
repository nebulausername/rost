import { useCallback, useEffect, useMemo, useState } from 'react'
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

export const isMultiClick = (e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => e.shiftKey || e.metaKey || e.ctrlKey


/** Betroffene Posts einer Aktion: die ganze Auswahl, wenn der Post dazugehört – sonst nur er selbst */
export function affectedIds(sel: { selected: Set<string>; ids: string[] }, id: string) {
  return sel.selected.has(id) && sel.selected.size > 1 ? sel.ids : [id]
}
