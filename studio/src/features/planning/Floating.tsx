import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'
import { useLatest } from './utils'

export type Anchor = HTMLElement | { x: number; y: number }
export type Placement = 'bottom-start' | 'bottom-end' | 'right-start' | 'top-start'

const MARGIN = 8

/** Stapel offener Ebenen: Esc & Klick-daneben betreffen nur die oberste */
const stack: HTMLElement[] = []

function anchorRect(a: Anchor): DOMRect {
  if (a instanceof HTMLElement) return a.getBoundingClientRect()
  return new DOMRect(a.x, a.y, 0, 0)
}

/** Position im Viewport berechnen: bevorzugte Seite, sonst gespiegelt, immer eingeklemmt */
function place(a: DOMRect, w: number, h: number, placement: Placement, gap = 6) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left: number
  let top: number
  if (placement === 'right-start') {
    left = a.right + gap
    if (left + w > vw - MARGIN) left = a.left - gap - w
    top = a.top
  } else {
    left = placement === 'bottom-end' ? a.right - w : a.left
    top = placement === 'top-start' ? a.top - gap - h : a.bottom + gap
    if (placement !== 'top-start' && top + h > vh - MARGIN && a.top - gap - h > MARGIN) top = a.top - gap - h
    if (placement === 'top-start' && top < MARGIN) top = a.bottom + gap
  }
  left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - w - MARGIN))
  top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, vh - h - MARGIN))
  return { left, top }
}

/**
 * Schwebende Ebene (Menü, Popover, Vorschau) – per Portal, im Viewport gehalten,
 * schließt bei Klick daneben und Esc, gibt den Fokus an den Auslöser zurück.
 */
export function Floating({
  anchor,
  onClose,
  placement = 'bottom-start',
  children,
  className,
  role,
  label,
  interactive = true,
  returnFocus,
  style,
  id,
}: {
  anchor: Anchor
  onClose?: () => void
  placement?: Placement
  children: ReactNode
  className?: string
  role?: 'menu' | 'dialog' | 'tooltip'
  label?: string
  interactive?: boolean
  returnFocus?: HTMLElement | null
  style?: CSSProperties
  id?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const closeRef = useLatest(onClose)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    if (anchor instanceof HTMLElement && !anchor.isConnected) {
      closeRef.current?.()
      return
    }
    setPos(place(anchorRect(anchor), el.offsetWidth, el.offsetHeight, placement))
  }, [anchor, placement, closeRef])

  useLayoutEffect(() => {
    update()
    const el = ref.current
    const ro = el ? new ResizeObserver(update) : null
    if (el) ro?.observe(el)
    return () => ro?.disconnect()
  }, [update])

  useEffect(() => {
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [update])

  useEffect(() => {
    if (!interactive) return
    const self = ref.current
    if (self) stack.push(self)
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!self || self.contains(t)) return
      if (anchor instanceof HTMLElement && anchor.contains(t)) return
      // Klick in eine darüberliegende Ebene (z. B. Menü aus dem Tages-Popover) schließt diese nicht
      if (stack.slice(stack.indexOf(self) + 1).some((el) => el.contains(t))) return
      closeRef.current?.()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || stack[stack.length - 1] !== self) return
      e.stopPropagation()
      e.preventDefault()
      closeRef.current?.()
    }
    // Capture: vor Drawer/Seiten-Kürzeln, damit Esc nur diese Ebene schließt
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      if (self) stack.splice(stack.indexOf(self), 1)
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [anchor, interactive, closeRef])

  // Fokus zurück an den Auslöser
  useEffect(() => {
    if (!interactive) return
    const back = returnFocus ?? (anchor instanceof HTMLElement ? anchor : null)
    return () => {
      const active = document.activeElement
      if (back?.isConnected && (!active || active === document.body || !active.isConnected)) {
        back.focus({ preventScroll: true })
      }
    }
  }, [anchor, interactive, returnFocus])

  return createPortal(
    <div
      ref={ref}
      id={id}
      role={role}
      aria-label={label}
      data-planning-floating={interactive ? '' : undefined}
      className={cn(
        'fixed z-[59] animate-pop-in rounded-xl border border-line bg-surface shadow-float',
        !interactive && 'pointer-events-none',
        className,
      )}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, opacity: pos ? undefined : 0, ...style }}
    >
      {children}
    </div>,
    document.body,
  )
}
