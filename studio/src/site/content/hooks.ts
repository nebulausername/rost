import { useEffect, type RefObject } from 'react'

/** Seitentitel „<Seite> · Röstbrüder – Kaffeerösterei & Cafés in Weimar“ – nutzt den Hook der Shell */
export { usePageTitle as useDocumentTitle } from '../shell/hooks'

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
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
