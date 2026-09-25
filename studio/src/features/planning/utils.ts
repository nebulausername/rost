import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { flushSync } from 'react-dom'

/** Ansichts-Vorlieben im Browser merken (fehlertolerant – privater Modus, gesperrter Speicher …) */
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw != null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Speicher nicht verfügbar – dann eben nur für diese Sitzung
    }
  }, [key, value])
  return [value, setValue] as const
}

/** Immer der aktuelle Wert – für Event-Handler, ohne sie neu zu erzeugen */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/** Seiten-Kürzel nur, wenn niemand tippt und kein Dialog/Menü offen ist */
export function shortcutsBlocked(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (t?.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return true
  if (document.querySelector('[role="dialog"]')) return true
  if (document.querySelector('[data-planning-floating]')) return true
  return false
}

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

type VtDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }

const vtName = (id: string) => `pl-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`

/**
 * Sanftes Umplatzieren: Die betroffenen Karten fliegen per View-Transition an ihren neuen Platz.
 * Fällt ohne API-Unterstützung oder bei „weniger Bewegung“ auf ein direktes Update zurück.
 */
export function withViewTransition(ids: string[], update: () => void, after?: () => void) {
  const doc = document as VtDocument
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || reduce || ids.length === 0 || ids.length > 24) {
    update()
    after?.()
    return
  }
  const tag = (on: boolean) => {
    for (const id of ids) {
      const el = document.querySelector<HTMLElement>(`[data-vt-id="${CSS.escape(id)}"]`)
      if (el) el.style.viewTransitionName = on ? vtName(id) : ''
    }
  }
  tag(true)
  try {
    const t = doc.startViewTransition(() => {
      flushSync(update)
      tag(true)
      after?.()
    })
    t.finished.finally(() => tag(false)).catch(() => {})
  } catch {
    tag(false)
    update()
    after?.()
  }
}

/** Nach einem Re-Render den Fokus auf eine (neu gerenderte) Karte zurücksetzen – sofort, sonst im nächsten Frame */
export function focusPost(id: string) {
  const go = () => {
    const el = document.querySelector<HTMLElement>(`[data-focus-id="${CSS.escape(id)}"]`)
    if (!el) return false
    if (document.activeElement !== el) el.focus({ preventScroll: true })
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    return true
  }
  if (!go()) requestAnimationFrame(go)
}

/** Pfeiltasten-Navigation für role="menuitem" innerhalb eines Containers */
export function menuKeyNav(e: ReactKeyboardEvent<HTMLElement>, onBack?: () => void) {
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled]),[role="menuitemradio"]:not([disabled])'))
  const i = items.indexOf(document.activeElement as HTMLElement)
  const go = (n: number) => {
    e.preventDefault()
    items[(n + items.length) % items.length]?.focus()
  }
  if (e.key === 'ArrowDown') go(i + 1)
  else if (e.key === 'ArrowUp') go(i < 0 ? items.length - 1 : i - 1)
  else if (e.key === 'Home') go(0)
  else if (e.key === 'End') go(items.length - 1)
  else if (e.key === 'ArrowRight' && document.activeElement?.getAttribute('aria-haspopup')) {
    e.preventDefault()
    ;(document.activeElement as HTMLElement).click()
  } else if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && onBack && !(e.target as HTMLElement).closest('input')) {
    e.preventDefault()
    onBack()
  } else if (e.key === 'Tab') {
    // Menü ist eine Einheit – Tab schließt nicht, sondern bleibt drin
    const focusables = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input, select'))
    const j = focusables.indexOf(document.activeElement as HTMLElement)
    e.preventDefault()
    focusables[(j + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length]?.focus()
  }
}
