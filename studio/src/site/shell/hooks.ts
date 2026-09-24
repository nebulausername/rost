import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Product } from '../../lib/types'

// ---------------------------------------------------------------------------
// Website-Helfer für Rahmen & Commerce (Seitentitel, Session-Flags, Dialoge …)
// ---------------------------------------------------------------------------

export const SITE_TITLE = 'Röstbrüder – Kaffeerösterei & Cafés in Weimar'
export const INSTAGRAM_URL = 'https://www.instagram.com/roestbrueder/'
export const FACEBOOK_URL = 'https://www.facebook.com/roestbrueder/'
export const UTM_KEY = 'rb-utm-source'

/**
 * Setzt `document.title` als „<Seite> · Röstbrüder – Kaffeerösterei & Cafés in Weimar“.
 * Ohne Titel (Startseite) nur der Markentitel. Überschreibt den Standardtitel der Shell.
 */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_TITLE}` : SITE_TITLE
  }, [title])
}

// --- Session-Speicher (kann in privaten Fenstern werfen) --------------------

export function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSession(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Kein Session-Speicher – dann gilt es eben nur bis zum Reload.
  }
}

/** Boolean, der für die laufende Browser-Sitzung gemerkt wird (z. B. „Banner ausgeblendet“). */
export function useSessionFlag(key: string): [boolean, () => void] {
  const [flag, setFlag] = useState(() => readSession(key) === '1')
  const raise = () => {
    writeSession(key, '1')
    setFlag(true)
  }
  return [flag, raise]
}

/** utm_source aus der URL in der Session merken (erste Quelle gewinnt nicht – letzte Kampagne zählt). */
export function captureUtm(search: string) {
  const source = new URLSearchParams(search).get('utm_source')
  if (source) writeSession(UTM_KEY, source.trim().slice(0, 64))
}

export function currentUtmSource(): string | null {
  const stored = readSession(UTM_KEY)
  if (stored) return stored
  try {
    return new URLSearchParams(window.location.search).get('utm_source')
  } catch {
    return null
  }
}

// --- Scroll & Präsenz --------------------------------------------------------

/** true, sobald die Seite um mehr als `offset` px gescrollt ist */
export function useScrolled(offset = 16) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [offset])
  return scrolled
}

/** Hält ein Element nach dem Schließen noch `ms` lang gemountet (für Ausblend-Animationen). */
export function usePresence(open: boolean, ms = 260) {
  const [mounted, setMounted] = useState(open)
  const [prev, setPrev] = useState(open)
  if (open !== prev) {
    setPrev(open)
    if (open) setMounted(true)
  }
  useEffect(() => {
    if (open || !mounted) return
    const t = window.setTimeout(() => setMounted(false), ms)
    return () => window.clearTimeout(t)
  }, [open, mounted, ms])
  return { mounted: open || mounted, closing: !open && mounted }
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modales Verhalten für Menü & Warenkorb: Escape schließt, Scroll-Sperre,
 * Fokus hinein (Element mit data-autofocus zuerst), Fokusfalle, Fokus zurück.
 */
export function useDialog(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const node = ref.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const { body, documentElement } = document
    const scrollbar = window.innerWidth - documentElement.clientWidth
    const prevOverflow = body.style.overflow
    const prevPadding = body.style.paddingRight
    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`

    const list = () => Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => el.getClientRects().length > 0)
    const initial = node?.querySelector<HTMLElement>('[data-autofocus]') ?? list()[0]
    initial?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !node) return
      const items = list()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPadding
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true })
    }
  }, [open, ref])
}

/** Bevorzugt reduzierte Bewegung? (live) */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

// --- Produkt-Logik -----------------------------------------------------------

/** Kaffees im engeren Sinn (keine Geschenkboxen/Gutscheine) */
export const isCoffee = (p: Product) => p.kind === 'espresso' || p.kind === 'filter' || p.kind === 'omni'

type Taste = Product['taste']

/** Quadratischer Abstand zweier Geschmacksprofile (0 = identisch) */
export function tasteDistance(a: Taste, b: Taste) {
  return (
    (a.acidity - b.acidity) ** 2 +
    (a.body - b.body) ** 2 +
    (a.sweetness - b.sweetness) ** 2 +
    (a.chocolate - b.chocolate) ** 2 +
    (a.fruit - b.fruit) ** 2
  )
}

/** Bestes Produkt zu einem Wunschprofil */
export function bestMatch(products: Product[], target: Taste) {
  let best: Product | null = null
  let bestScore = Infinity
  for (const p of products) {
    if (!p.available || !isCoffee(p)) continue
    const d = tasteDistance(p.taste, target)
    if (d < bestScore) {
      bestScore = d
      best = p
    }
  }
  return best
}

/** Ähnliche Kaffees nach Geschmacksprofil (ohne das Produkt selbst) */
export function similarProducts(products: Product[], product: Product, count = 3) {
  return products
    .filter((p) => p.id !== product.id && p.available && p.kind !== 'voucher')
    .map((p) => ({ p, d: tasteDistance(p.taste, product.taste) + (isCoffee(p) ? 0 : 3) + Math.abs(p.roast - product.roast) * 0.5 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((x) => x.p)
}

export const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

/** Hintergrund einer „Bühne“ in Produktfarbe – funktioniert hell & dunkel */
export const stageTint = (color: string, amount = 22) => `color-mix(in oklab, ${color} ${amount}%, var(--surface-2))`
