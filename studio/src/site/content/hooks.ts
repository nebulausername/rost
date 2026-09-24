import { useEffect, useState, type RefObject } from 'react'
import { useLocation } from 'react-router'

const TITLE_SUFFIX = 'Röstbrüder – Kaffeerösterei & Cafés in Weimar'

/** Setzt den Dokumenttitel, z. B. „Kaffee-Abo · Röstbrüder – Kaffeerösterei & Cafés in Weimar“ */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} · ${TITLE_SUFFIX}` : TITLE_SUFFIX
    return () => {
      document.title = prev
    }
  }, [title])
}

/** true, sobald das Element (einmalig) in den sichtbaren Bereich kommt */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = '0px 0px -10% 0px') {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin, seen])
  return seen
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Scrollt beim Laden zu #anker (react-router macht das nicht von selbst) */
export function useHashScroll() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const t = setTimeout(() => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    }, 60)
    return () => clearTimeout(t)
  }, [hash])
}

/** Web-Animations-API: sanftes Einblenden, wenn sich `key` ändert (respektiert reduced motion) */
export function useEnterAnimation<T extends HTMLElement>(ref: RefObject<T | null>, key: unknown, direction: 1 | -1 = 1) {
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return
    el.animate(
      [
        { opacity: 0, transform: `translateX(${direction * 28}px)` },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    )
  }, [ref, key, direction])
}

/** Hash aus einem String (deterministische Muster, z. B. QR-Deko) */
export function hashString(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
