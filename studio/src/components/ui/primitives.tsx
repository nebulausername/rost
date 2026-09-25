import { Loader2, X } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

const variants: Record<Variant, string> = {
  primary: 'bg-accent-solid text-on-accent shadow-soft hover:bg-accent-solid-hover active:translate-y-px',
  secondary: 'bg-surface text-ink border border-line shadow-soft hover:border-line-strong hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white',
  dark: 'bg-ink text-canvas hover:opacity-90',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
  icon: 'size-9 rounded-lg',
  'icon-sm': 'size-7 rounded-md',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[background-color,border-color,color,transform,opacity] duration-150 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  )
})

// ---------------------------------------------------------------------------
// Card & Überschriften
// ---------------------------------------------------------------------------

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface shadow-soft', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 pt-4 pb-3', className)}>
      <div className="flex min-w-[min(12rem,100%)] flex-1 items-start gap-2.5">
        {icon ? <div className="mt-0.5 text-ink-3">{icon}</div> : null}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="flex max-w-full shrink-0 flex-wrap items-center gap-1.5">{action}</div> : null}
    </div>
  )
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  children,
}: {
  title: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 text-xs font-semibold tracking-[0.14em] text-accent-text uppercase">{eyebrow}</p> : null}
          <h1 className="font-display text-3xl leading-tight font-semibold text-ink md:text-[34px]">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-sm text-ink-2">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  )
}

// ---------------------------------------------------------------------------
// Chips & Badges
// ---------------------------------------------------------------------------

export function Tint({
  color,
  children,
  className,
  title,
  as = 'span',
}: {
  color: string
  children: ReactNode
  className?: string
  title?: string
  as?: 'span' | 'div'
}) {
  const Tag = as
  return (
    <Tag
      title={title}
      className={cn('tint inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap', className)}
      style={{ '--c': color } as CSSProperties}
    >
      {children}
    </Tag>
  )
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'muted'
  children: ReactNode
  className?: string
  dot?: boolean
}) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-2',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    accent: 'bg-accent-soft text-accent-text',
    muted: 'bg-surface-2 text-ink-3',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', tones[tone], className)}>
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface-2 px-1 font-sans text-[10px] font-semibold text-ink-3">
      {children}
    </kbd>
  )
}

export function Avatar({ name, color, initials, size = 24 }: { name: string; color: string; initials: string; size?: number }) {
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface"
      style={{ width: size, height: size, background: color, fontSize: Math.max(9, size * 0.4) }}
    >
      {initials}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Formular-Felder
// ---------------------------------------------------------------------------

export function Field({
  label,
  hint,
  children,
  className,
  htmlFor,
  aside,
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
  htmlFor?: string
  aside?: ReactNode
}) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
        {aside ? <div className="mb-1.5 text-[11px] text-ink-3">{aside}</div> : null}
      </div>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-ink-3">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn('field h-9', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn('field min-h-24 resize-y leading-relaxed', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'field h-9 appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a7666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  )
})

/** Segmentierte Auswahl (Tabs / Umschalter) */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  size?: 'sm' | 'md'
  className?: string
  label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-lg border border-line bg-surface-2 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              active ? 'bg-surface text-ink shadow-soft' : 'text-ink-3 hover:text-ink',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-accent' : 'bg-line-strong')}
    >
      <span className={cn('inline-block size-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Drawer & Modal
// ---------------------------------------------------------------------------

// Stapel offener Dialoge: Escape & Fokusfalle gelten nur für den obersten.
const dialogStack: symbol[] = []
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

/** Barrierefreie Dialoge: Escape, Fokusfalle, Scroll-Sperre, Fokus zurückgeben */
function useDialog(ref: React.RefObject<HTMLElement | null>, onClose: () => void, active: boolean) {
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])
  useEffect(() => {
    if (!active) return
    const token = Symbol('dialog')
    dialogStack.push(token)
    const opener = document.activeElement as HTMLElement | null
    const isTop = () => dialogStack[dialogStack.length - 1] === token
    // Anfangsfokus: [autofocus] oder erstes Feld, sonst der Dialog selbst
    const t = setTimeout(() => {
      const el = ref.current
      if (!el || el.contains(document.activeElement)) return
      const auto = el.querySelector<HTMLElement>('[autofocus], [data-autofocus]')
      // Erstes Feld im Inhalt (nicht der Schließen-Knopf), sonst der Dialog selbst
      const first = el.querySelector<HTMLElement>('[data-dialog-body] input, [data-dialog-body] textarea, [data-dialog-body] select')
      ;(auto ?? first ?? el).focus({ preventScroll: true })
    }, 20)
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null || x === document.activeElement)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || !ref.current.contains(document.activeElement))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      dialogStack.splice(dialogStack.indexOf(token), 1)
      if (!dialogStack.length) document.body.style.overflow = prev
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [active, ref])
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-5xl',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  const id = useId()
  const ref = useRef<HTMLElement>(null)
  useDialog(ref, onClose, open)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-[#140c07]/45 backdrop-blur-[2px]" onClick={onClose} />
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={cn('relative flex h-full w-full animate-slide-in flex-col border-l border-line bg-canvas shadow-float outline-none', width)}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4 md:px-6">
          <div className="min-w-0">
            <h2 id={id} className="font-display text-xl font-semibold text-ink">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Schließen">
            <X className="size-4" />
          </Button>
        </header>
        <div data-dialog-body className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </div>
        {footer ? <footer className="border-t border-line bg-surface px-5 py-3 md:px-6">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const id = useId()
  const ref = useRef<HTMLElement>(null)
  useDialog(ref, onClose, open)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
      <div className="fixed inset-0 animate-fade-in bg-[#140c07]/45 backdrop-blur-[2px]" onClick={onClose} />
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={cn('relative w-full max-w-lg animate-pop-in rounded-2xl border border-line bg-surface shadow-float outline-none', className)}
      >
        <header className="flex items-center justify-between gap-4 px-5 pt-4 pb-2">
          <h2 id={id} className="font-display text-lg font-semibold">
            {title}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Schließen">
            <X className="size-4" />
          </Button>
        </header>
        <div data-dialog-body className="px-5 pb-5">
          {children}
        </div>
        {footer ? <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  )
}

/** Bestätigungsdialog statt window.confirm – gleich gewichtete, klare Aktionen */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  tone = 'primary',
  onConfirm,
  onCancel,
  extra,
}: {
  open: boolean
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
  extra?: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      className="max-w-md"
      footer={
        <>
          {extra}
          <Button onClick={onCancel} data-autofocus={tone === 'danger' ? true : undefined}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} data-autofocus={tone === 'danger' ? undefined : true}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description ? <p className="text-sm leading-relaxed text-ink-2">{description}</p> : null}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Leere Zustände
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-10 text-center', className)}>
      {icon ? <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent-text">{icon}</div> : null}
      <p className="font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-ink-3">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
