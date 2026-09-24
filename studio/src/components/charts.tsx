import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { cn, fmt } from '../lib/utils'

// Diagramm-Bausteine nach den Dataviz-Regeln: dünne Marken, eine Achse,
// Text in Text-Tokens (nie in Serienfarbe), Legende ab zwei Serien, Hover-Layer.

export const CHART = {
  grid: 'var(--grid)',
  axis: 'var(--ink-3)',
  accent: 'var(--accent)',
  tick: { fill: 'var(--ink-3)', fontSize: 11 },
}

/** Sparkline mit Hover-Wert (12+ Punkte, aktuelle Periode im Akzent) */
export function Sparkline({
  values,
  labels,
  height = 36,
  className,
  format = fmt.compact,
}: {
  values: number[]
  labels?: string[]
  height?: number
  className?: string
  format?: (v: number) => string
}) {
  const id = useId()
  const [hover, setHover] = useState<number | null>(null)
  const w = 120
  const h = height
  const { pts, min, max } = useMemo(() => {
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)] as const)
    return { pts, min, max }
  }, [values, h])
  if (values.length < 2) return null
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const hv = hover != null ? pts[hover] : null
  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="block h-full w-full overflow-visible"
        style={{ height: h }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const i = Math.round(((e.clientX - r.left) / r.width) * (values.length - 1))
          setHover(Math.max(0, Math.min(values.length - 1, i)))
        }}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Verlauf von ${format(min)} bis ${format(max)}`}
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.14" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
        <path d={d} fill="none" stroke="var(--ink-3)" strokeOpacity="0.55" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="3" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {hv ? <line x1={hv[0]} x2={hv[0]} y1={0} y2={h} stroke="var(--line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      {hover != null ? (
        <div className="pointer-events-none absolute -top-7 right-0 rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-canvas tabular">
          {labels?.[hover] ? `${labels[hover]} · ` : ''}
          {format(values[hover])}
        </div>
      ) : null}
    </div>
  )
}

export function Delta({ value, goodWhenUp = true, suffix = '', format }: { value: number; goodWhenUp?: boolean; suffix?: string; format?: (v: number) => string }) {
  const up = value > 0.0001
  const down = value < -0.0001
  const good = (up && goodWhenUp) || (down && !goodWhenUp)
  const bad = (down && goodWhenUp) || (up && !goodWhenUp)
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1 py-px text-[11px] font-semibold tabular',
        good && 'bg-success-soft text-success',
        bad && 'bg-danger-soft text-danger',
        !good && !bad && 'bg-surface-2 text-ink-3',
      )}
    >
      <Icon className="size-3" aria-hidden />
      {format ? format(Math.abs(value)) : `${Math.abs(value).toLocaleString('de-DE', { maximumFractionDigits: 1 })}${suffix}`}
    </span>
  )
}

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  trend,
  trendLabels,
  icon,
  footnote,
  className,
}: {
  label: string
  value: ReactNode
  delta?: ReactNode
  deltaLabel?: string
  trend?: number[]
  trendLabels?: string[]
  icon?: ReactNode
  footnote?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-2">{label}</p>
        {icon ? <span className="text-ink-3">{icon}</span> : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="min-w-0 truncate text-2xl leading-none font-semibold tracking-tight text-ink tabular">{value}</p>
        {trend && trend.length > 1 ? <Sparkline values={trend} labels={trendLabels} className="w-20 shrink-0" height={30} /> : null}
      </div>
      {delta != null ? (
        <p className="-mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-ink-3">
          {delta}
          {deltaLabel ? <span>{deltaLabel}</span> : null}
        </p>
      ) : null}
      {footnote ? <div className="-mt-1 text-[11px] text-ink-3">{footnote}</div> : null}
    </div>
  )
}

/** Fortschritts-/Budget-Meter: Füllung trägt den Zustand, Spur = hellere Stufe */
export function Meter({
  value,
  max,
  marker,
  tone = 'accent',
  height = 8,
  label,
}: {
  value: number
  max: number
  /** Soll-Markierung (z. B. erwartete Ausgaben bis heute) */
  marker?: number
  tone?: 'accent' | 'success' | 'warning' | 'danger'
  height?: number
  label?: string
}) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  const mk = marker != null && max ? Math.min(100, (marker / max) * 100) : null
  const fills = { accent: 'var(--accent)', success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)' }
  return (
    <div
      className="relative w-full overflow-visible rounded-full"
      style={{ height, background: `color-mix(in oklab, ${fills[tone]} 16%, var(--surface-2))` }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: fills[tone] }} />
      {mk != null ? (
        <div className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink/70" style={{ left: `calc(${mk}% - 1px)` }} title="Soll bis heute" />
      ) : null}
    </div>
  )
}

/** Tooltip für Recharts – Text in Text-Tokens, Farbe nur als Marke daneben */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormat = fmt.num,
  labelFormat,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string | number; payload?: Record<string, unknown> }[]
  label?: string | number
  valueFormat?: (v: number, key?: string) => string
  labelFormat?: (l: string | number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-36 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      {label != null ? <p className="mb-1.5 font-semibold text-ink">{labelFormat ? labelFormat(label) : label}</p> : null}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-2">
              <span className="size-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-semibold text-ink tabular">{valueFormat(Number(p.value ?? 0), String(p.dataKey ?? ''))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Legend({ items, className }: { items: { label: string; color: string; dashed?: boolean }[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2', className)}>
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.dashed ? (
            <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} />
          ) : (
            <span className="h-2 w-3 rounded-sm" style={{ background: i.color }} />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  )
}

/** Horizontale Balkenliste (eine Serie, direkt beschriftet) */
export function BarList({
  items,
  format = (v: number) => fmt.num(v),
  color = 'var(--accent)',
  max,
}: {
  items: { label: ReactNode; value: number; hint?: ReactNode; key: string }[]
  format?: (v: number) => string
  color?: string
  max?: number
}) {
  const m = max ?? Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.key} className="group">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-ink-2">{i.label}</span>
            <span className="shrink-0 font-semibold text-ink tabular">
              {format(i.value)}
              {i.hint ? <span className="ml-1.5 font-normal text-ink-3">{i.hint}</span> : null}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(i.value / m) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
