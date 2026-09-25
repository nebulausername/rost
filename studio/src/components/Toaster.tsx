import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useUi } from '../lib/store'
import { cn } from '../lib/utils'

export function Toaster() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-24 z-[60] lg:bottom-4 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'danger' ? TriangleAlert : Info
        return (
          <div key={t.id} className="pointer-events-auto flex animate-pop-in items-start gap-3 rounded-xl border border-line bg-surface p-3 shadow-lift">
            <Icon className={cn('mt-0.5 size-4 shrink-0', t.tone === 'success' ? 'text-success' : t.tone === 'danger' ? 'text-danger' : 'text-accent')} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              {t.description ? <p className="mt-0.5 text-xs text-ink-3">{t.description}</p> : null}
            </div>
            {t.action ? (
              <button
                onClick={() => {
                  t.action?.run()
                  dismiss(t.id)
                }}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-accent-text hover:bg-accent-soft"
              >
                {t.action.label}
              </button>
            ) : null}
            <button onClick={() => dismiss(t.id)} className="shrink-0 rounded p-0.5 text-ink-3 hover:text-ink" aria-label="Hinweis schließen">
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
