import { useCart } from '../../lib/cart'

// ---------------------------------------------------------------------------
// Warenkorb-Feedback: „Tüte fliegt in den Korb“, Korb-Symbol hüpft, Ansage für Screenreader.
// Quelle: Elemente mit data-fly-src innerhalb des nächsten [data-fly-root];
// Ziel: sichtbares Element mit data-cart-target (Kopfzeile, mobile Leiste).
// ---------------------------------------------------------------------------

export type NewCartItem = Parameters<ReturnType<typeof useCart.getState>['add']>[0]

export const CART_ADDED_EVENT = 'rb:cart-added'

export interface CartAddedDetail {
  /** z. B. „Hausbrüh (250 g)“ – für Ansage & Hinweis */
  label: string
  /** kleinen Hinweis unter dem Korb-Symbol zeigen (Karten, Schnellansicht) */
  peek: boolean
}

function reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}

function inViewport(r: DOMRect) {
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth
}

function visibleTarget(): HTMLElement | null {
  const list = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]'))
  return list.find((el) => !el.closest('[inert]') && inViewport(el.getBoundingClientRect())) ?? null
}

function flySource(from: Element | null | undefined): HTMLElement | null {
  if (!from) return null
  if (from instanceof HTMLElement && from.hasAttribute('data-fly-src')) return from
  const root = from.closest('[data-fly-root]')
  if (!root) return null
  const anchor = from.getBoundingClientRect()
  let best: HTMLElement | null = null
  let bestD = Infinity
  root.querySelectorAll<HTMLElement>('[data-fly-src]').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (!inViewport(r) || el.closest('[inert]')) return
    const d = Math.hypot(r.left + r.width / 2 - (anchor.left + anchor.width / 2), r.top + r.height / 2 - (anchor.top + anchor.height / 2))
    if (d < bestD) {
      bestD = d
      best = el
    }
  })
  return best
}

/** Animiert eine Kopie der Tüte zum Warenkorb. Gibt false zurück, wenn nicht animiert wird. */
function flyToCart(from: Element | null | undefined, onLand: () => void): boolean {
  if (reducedMotion()) return false
  const src = flySource(from)
  const target = visibleTarget()
  if (!src || !target || typeof document.body.animate !== 'function') return false
  const s = src.getBoundingClientRect()
  const t = target.getBoundingClientRect()
  // große Bühnen-Tüten nicht in voller Größe losschicken
  const startW = Math.min(s.width, 180)
  const startH = (s.height / s.width) * startW
  const startX = s.left + (s.width - startW) / 2
  const startY = s.top + (s.height - startH) / 2
  const dx = t.left + t.width / 2 - (startX + startW / 2)
  const dy = t.top + t.height / 2 - (startY + startH / 2)
  const end = Math.max(0.1, 26 / startW)

  const ghost = document.createElement('div')
  ghost.setAttribute('aria-hidden', 'true')
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${startW}px`,
    height: `${startH}px`,
    zIndex: '90',
    pointerEvents: 'none',
    willChange: 'transform, opacity',
  })
  const clone = src.cloneNode(true) as HTMLElement
  clone.removeAttribute('data-fly-src')
  clone.removeAttribute('role')
  clone.removeAttribute('aria-label')
  Object.assign(clone.style, { width: '100%', height: '100%' })
  ghost.appendChild(clone)
  document.body.appendChild(ghost)

  let landed = false
  const finish = () => {
    if (landed) return
    landed = true
    ghost.remove()
    onLand()
  }
  const anim = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { offset: 0.4, transform: `translate(${dx * 0.3}px, ${dy * 0.3 - 70}px) scale(${(1 + end) / 1.7}) rotate(-10deg)`, opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${end}) rotate(-18deg)`, opacity: 0.35 },
    ],
    { duration: 700, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
  )
  anim.onfinish = finish
  anim.oncancel = finish
  window.setTimeout(finish, 1200)
  return true
}

/**
 * Legt einen Artikel in den Warenkorb – ohne dass sich die Seitenleiste öffnet
 * (Standard in useCart.add). Stattdessen: Flug-Animation, Symbol-Hüpfer, Ansage.
 */
export function addToCartWithFeedback(item: NewCartItem, opts: { from?: Element | null; label: string; peek?: boolean }) {
  const { add, setOpen, open } = useCart.getState()
  add(item)
  if (!open) setOpen(false)
  const detail: CartAddedDetail = { label: opts.label, peek: opts.peek ?? false }
  const land = () => window.dispatchEvent(new CustomEvent<CartAddedDetail>(CART_ADDED_EVENT, { detail }))
  if (!flyToCart(opts.from, land)) land()
}
