import { parseISO } from 'date-fns'
import { ListChecks } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MediaThumb, PillarBadge, PlatformStack, StatusBadge } from '../../components/domain'
import { FORMATS } from '../../lib/constants'
import { useStore } from '../../lib/store'
import { cn, formatDe } from '../../lib/utils'
import { Floating } from './Floating'
import { useLatest } from './utils'
import { PreviewCtx as Ctx, type PreviewBind as Bind } from './previewContext'

const DELAY = 350

/**
 * Hover-/Fokus-Vorschau für Post-Chips. Ein Provider pro Seite, eine Karte gleichzeitig.
 * Die Karte ist nicht interaktiv (pointer-events: none) und blockiert so weder Klick noch Drag.
 */
export function PreviewProvider({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  const [state, setState] = useState<{ id: string; el: HTMLElement } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const suppressed = useRef(false)
  const disabledRef = useLatest(disabled)

  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setState(null)
  }, [])

  const schedule = useCallback((id: string, el: HTMLElement) => {
    window.clearTimeout(timer.current)
    if (suppressed.current || disabledRef.current) return
    timer.current = window.setTimeout(() => {
      if (!suppressed.current && el.isConnected) setState({ id, el })
    }, DELAY)
  }, [disabledRef])

  useEffect(() => {
    // Während eines Drags keine Vorschau; Esc blendet sie aus
    const onDragStart = () => {
      suppressed.current = true
      hide()
    }
    const onDragEnd = () => {
      suppressed.current = false
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }
    window.addEventListener('dragstart', onDragStart, true)
    window.addEventListener('dragend', onDragEnd, true)
    window.addEventListener('drop', onDragEnd, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', hide, true)
    return () => {
      window.removeEventListener('dragstart', onDragStart, true)
      window.removeEventListener('dragend', onDragEnd, true)
      window.removeEventListener('drop', onDragEnd, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', hide, true)
      window.clearTimeout(timer.current)
    }
  }, [hide])

  const bind = useCallback(
    (id: string): Bind => ({
      onPointerEnter: (e) => {
        if (e.pointerType === 'mouse') schedule(id, e.currentTarget)
      },
      onPointerLeave: hide,
      onFocus: (e) => {
        if (e.currentTarget.matches(':focus-visible')) schedule(id, e.currentTarget)
      },
      onBlur: hide,
      onPointerDown: hide,
    }),
    [hide, schedule],
  )

  const value = useMemo(() => ({ bind, hide }), [bind, hide])

  return (
    <Ctx.Provider value={value}>
      {children}
      {state && !disabled ? <PreviewCard id={state.id} anchor={state.el} /> : null}
    </Ctx.Provider>
  )
}

function PreviewCard({ id, anchor }: { id: string; anchor: HTMLElement }) {
  const post = useStore((s) => s.posts.find((p) => p.id === id))
  const member = useStore((s) => s.team.find((m) => m.id === post?.assigneeId))
  if (!post) return null
  const done = post.checklist.filter((c) => c.done).length
  const total = post.checklist.length
  const caption = post.caption.trim()
  return (
    <Floating anchor={anchor} placement="right-start" interactive={false} role="tooltip" className="w-72 overflow-hidden rounded-2xl">
      <MediaThumb url={post.mediaUrl} tone={post.mediaTone} className="h-28 w-full">
        <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2">
          <PlatformStack platforms={post.platforms} size={20} />
          <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">{FORMATS[post.format].label}</span>
        </div>
      </MediaThumb>
      <div className="space-y-2.5 p-3.5">
        <div>
          <p className="text-[11px] font-semibold text-ink-3 tabular">{formatDe(parseISO(post.scheduledAt), "EEEE, d. MMMM · HH:mm 'Uhr'")}</p>
          <p className="mt-0.5 text-sm leading-snug font-semibold text-ink">{post.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={post.status} />
          <PillarBadge pillar={post.pillar} />
        </div>
        {caption ? (
          <p className="text-xs leading-relaxed text-ink-2">
            {caption.length > 120 ? `${caption.slice(0, 120).trimEnd()} …` : caption}
          </p>
        ) : (
          <p className="text-xs text-ink-3 italic">Noch keine Caption.</p>
        )}
        <div className="flex items-center gap-2 border-t border-line pt-2.5 text-[11px] text-ink-3">
          <ListChecks className="size-3.5 shrink-0" />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className={cn('h-full rounded-full', done === total && total ? 'bg-success' : 'bg-accent')} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <span className="font-semibold tabular">
            {done}/{total}
          </span>
          {member ? <span className="ml-1 truncate">· {member.name}</span> : null}
        </div>
      </div>
    </Floating>
  )
}
