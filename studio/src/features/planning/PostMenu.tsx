import { format, parseISO } from 'date-fns'
import { ArrowLeft, CalendarClock, Check, ChevronRight, CircleDot, Copy, ExternalLink, SquareCheckBig, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Kbd } from '../../components/ui/primitives'
import { STATUSES } from '../../lib/constants'
import { useUi } from '../../lib/store'
import type { Post } from '../../lib/types'
import { cn } from '../../lib/utils'
import { duplicate, removePosts, reschedule, setStatus } from './actions'
import { Floating, menuKeyNav, type Anchor } from './Floating'

type View = 'main' | 'move' | 'status'

function Item({
  icon,
  children,
  onClick,
  hint,
  danger,
  submenu,
  checked,
  radio,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick: () => void
  hint?: ReactNode
  danger?: boolean
  submenu?: boolean
  checked?: boolean
  radio?: boolean
}) {
  return (
    <button
      type="button"
      role={radio ? 'menuitemradio' : 'menuitem'}
      aria-checked={radio ? !!checked : undefined}
      aria-haspopup={submenu ? 'menu' : undefined}
      onClick={onClick}
      className={cn(
        'flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] font-medium outline-none',
        danger ? 'text-danger hover:bg-danger-soft focus-visible:bg-danger-soft' : 'text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:bg-surface-2 focus-visible:text-ink',
        'focus-visible:outline-none',
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-ink-3 [&>svg]:size-4">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {hint ? <span className="text-[11px] text-ink-3">{hint}</span> : null}
      {submenu ? <ChevronRight className="size-3.5 text-ink-3" /> : null}
      {checked && radio ? <Check className="size-3.5 text-accent-text" /> : null}
    </button>
  )
}

/**
 * Aktionen-Menü für einen Post (Kalender-Chip, Pipeline-Karte, Kontextmenü).
 * Untermenüs laufen als Ansichtswechsel im selben Popover – funktioniert auch auf dem Handy.
 */
export function PostMenu({
  post,
  anchor,
  onClose,
  returnFocus,
  selected,
  onToggleSelect,
  initialView = 'main',
  onMoved,
}: {
  post: Post
  anchor: Anchor
  onClose: () => void
  returnFocus?: HTMLElement | null
  selected?: boolean
  onToggleSelect?: () => void
  initialView?: View
  onMoved?: (target: Date) => void
}) {
  const [view, setView] = useState<View>(initialView)
  const ref = useRef<HTMLDivElement>(null)
  const openPost = useUi((s) => s.openPost)
  const at = parseISO(post.scheduledAt)
  const [date, setDate] = useState(() => format(at, 'yyyy-MM-dd'))
  const [time, setTime] = useState(() => format(at, 'HH:mm'))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const first = el.querySelector<HTMLElement>('[data-autofocus], [role="menuitemradio"][aria-checked="true"], [role="menuitem"]')
    first?.focus({ preventScroll: true })
  }, [view])

  const run = (fn: () => void) => {
    onClose()
    fn()
  }

  const submitMove = () => {
    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = time.split(':').map(Number)
    if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return
    const target = new Date(y, m - 1, d, hh, mm)
    run(() => {
      reschedule(post.id, target)
      onMoved?.(target)
    })
  }

  return (
    <Floating anchor={anchor} onClose={onClose} role="menu" label={`Aktionen für ${post.title}`} returnFocus={returnFocus} className="w-60 p-1.5">
      <div ref={ref} onKeyDown={(e) => menuKeyNav(e, view !== 'main' ? () => setView('main') : undefined)}>
        {view === 'main' ? (
          <>
            <p className="truncate px-2 pt-1 pb-1.5 text-[11px] font-semibold text-ink-3">{post.title}</p>
            <Item icon={<ExternalLink />} hint={<Kbd>↵</Kbd>} onClick={() => run(() => openPost(post.id))}>
              Öffnen
            </Item>
            <Item icon={<Copy />} onClick={() => run(() => duplicate(post.id))}>
              Duplizieren
            </Item>
            <Item icon={<CalendarClock />} submenu onClick={() => setView('move')}>
              Verschieben nach …
            </Item>
            <Item icon={<CircleDot />} submenu onClick={() => setView('status')}>
              Status ändern
            </Item>
            {onToggleSelect ? (
              <Item icon={<SquareCheckBig />} hint={<Kbd>X</Kbd>} onClick={() => run(onToggleSelect)}>
                {selected ? 'Auswahl aufheben' : 'Auswählen'}
              </Item>
            ) : null}
            <div className="my-1 h-px bg-line" role="separator" />
            <Item icon={<Trash2 />} danger onClick={() => run(() => removePosts([post.id]))}>
              Löschen
            </Item>
          </>
        ) : view === 'status' ? (
          <>
            <SubHeader onBack={() => setView('main')}>Status ändern</SubHeader>
            {STATUSES.map((s) => (
              <Item
                key={s.id}
                radio
                checked={post.status === s.id}
                icon={<span className="size-2 rounded-full" style={{ background: s.color }} />}
                onClick={() => run(() => setStatus([post.id], s.id))}
              >
                {s.label}
              </Item>
            ))}
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitMove()
            }}
          >
            <SubHeader onBack={() => setView('main')}>Verschieben nach …</SubHeader>
            <div className="grid grid-cols-[1fr_88px] gap-1.5 px-1 pt-1">
              <label className="sr-only" htmlFor={`mv-d-${post.id}`}>
                Datum
              </label>
              <input
                id={`mv-d-${post.id}`}
                data-autofocus
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="field h-8 px-2 text-xs"
              />
              <label className="sr-only" htmlFor={`mv-t-${post.id}`}>
                Uhrzeit
              </label>
              <input
                id={`mv-t-${post.id}`}
                type="time"
                required
                step={900}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="field h-8 px-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-1.5 px-1 pt-2 pb-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setView('main')}>
                Zurück
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Verschieben
              </Button>
            </div>
          </form>
        )}
      </div>
    </Floating>
  )
}

function SubHeader({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  return (
    <div className="mb-1 flex items-center gap-1 border-b border-line px-0.5 pb-1.5">
      <button
        type="button"
        onClick={onBack}
        className="flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
        aria-label="Zurück zum Menü"
      >
        <ArrowLeft className="size-3.5" />
      </button>
      <span className="text-xs font-semibold text-ink">{children}</span>
    </div>
  )
}
