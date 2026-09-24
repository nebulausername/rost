import { ChevronDown } from 'lucide-react'
import { useRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Container, Eyebrow } from '../components'
import { useInView } from './hooks'

// Gemeinsame Bausteine der Erlebnis-Seiten (Geschmacksfinder, Abo, Workshops, Cafés, Herkunft, Anleitungen, Über uns).

/** Blendet Inhalte beim Scrollen weich ein */
export function Reveal({
  children,
  className,
  delay = 0,
  style,
}: {
  children: ReactNode
  className?: string
  delay?: number
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref)
  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
        seen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
      style={{ transitionDelay: seen ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </div>
  )
}

/** Editorialer Seitenkopf – große Fraunces-Headline, optionaler Bildteil rechts */
export function PageHero({
  eyebrow,
  title,
  text,
  children,
  aside,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  text?: ReactNode
  children?: ReactNode
  aside?: ReactNode
  className?: string
}) {
  return (
    <section className={cn('relative overflow-hidden', className)}>
      <Container className={cn('grid items-center gap-12 pt-14 pb-16 md:pt-20 md:pb-24', aside && 'lg:grid-cols-[1.15fr_0.85fr]')}>
        <div className="animate-pop-in">
          {eyebrow ? <Eyebrow className="mb-5">{eyebrow}</Eyebrow> : null}
          <h1 className="font-display text-[2.75rem] leading-[0.98] font-semibold tracking-tight text-ink sm:text-6xl lg:text-7xl">{title}</h1>
          {text ? <div className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2 md:text-xl">{text}</div> : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
        {aside ? <div className="relative animate-fade-in">{aside}</div> : null}
      </Container>
    </section>
  )
}

/** FAQ-Akkordeon auf Basis von <details> – tastatur- & screenreaderfreundlich ohne JS */
export function FaqList({ items, className }: { items: { q: string; a: ReactNode }[]; className?: string }) {
  return (
    <div className={cn('divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface', className)}>
      {items.map((it) => (
        <details key={it.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left text-base font-semibold text-ink transition-colors hover:bg-surface-2 md:px-7 [&::-webkit-details-marker]:hidden">
            {it.q}
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-3 transition-transform duration-300 group-open:rotate-180 group-open:border-accent group-open:text-accent-text">
              <ChevronDown className="size-4" aria-hidden />
            </span>
          </summary>
          <div className="animate-fade-in px-5 pb-6 text-[15px] leading-relaxed text-ink-2 md:px-7">{it.a}</div>
        </details>
      ))}
    </div>
  )
}

/** Kleine Kennzahl mit Label */
export function Fact({ label, value, className, icon }: { label: ReactNode; value: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface px-4 py-3', className)}>
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
        {icon}
        {label}
      </dt>
      <dd className="tabular mt-1 text-lg font-semibold text-ink">{value}</dd>
    </div>
  )
}

/** Dezenter Hinweis „Beispielwert / schematisch“ */
export function ExampleNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-xs leading-relaxed text-ink-3', className)}>{children}</p>
}

/** Nummerierter Abschnittstitel im Konfigurator */
export function StepTitle({ n, title, hint, id }: { n: number; title: ReactNode; hint?: ReactNode; id?: string }) {
  return (
    <div className="mb-5 flex items-start gap-4">
      <span className="tabular flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar font-display text-base font-semibold text-sidebar-ink">
        {n}
      </span>
      <div>
        <h2 id={id} className="font-display text-2xl leading-tight font-semibold text-ink md:text-[28px]">
          {title}
        </h2>
        {hint ? <p className="mt-1 text-sm text-ink-3">{hint}</p> : null}
      </div>
    </div>
  )
}
