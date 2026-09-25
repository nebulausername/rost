import { useEffect } from 'react'
import { create } from 'zustand'

// Zustand & Tastenkürzel der Website-Suche (Oberfläche: Search.tsx)

interface SearchUi {
  open: boolean
  query: string
  setOpen: (open: boolean, query?: string) => void
  setQuery: (q: string) => void
}

export const useSearchUi = create<SearchUi>()((set) => ({
  open: false,
  query: '',
  setOpen: (open, query) => set((s) => ({ open, query: query ?? s.query })),
  setQuery: (query) => set({ query }),
}))

export const openSearch = (query?: string) => useSearchUi.getState().setOpen(true, query)

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

function isTypingTarget(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'
}

/** Tastenkürzel der Website: „/“ (außer beim Tippen) und ⌘K / Strg+K */
export function useSearchShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const ui = useSearchUi.getState()
      // nicht über einen anderen offenen Dialog (Warenkorb, Menü, Schnellansicht, Cookies) legen
      const otherDialog = !ui.open && document.querySelector('[aria-modal="true"]:not([data-closing])') !== null
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        if (otherDialog) return
        e.preventDefault()
        ui.setOpen(!ui.open)
        return
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !ui.open && !otherDialog && !isTypingTarget(e.target)) {
        e.preventDefault()
        ui.setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}
