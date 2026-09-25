import { addDays, addHours, addMinutes, parseISO } from 'date-fns'
import { STATUS } from '../../lib/constants'
import { useStore, useUi, type Toast } from '../../lib/store'
import type { Post, PostStatus } from '../../lib/types'
import { formatDe } from '../../lib/utils'

// Gemeinsame Post-Aktionen für Kalender & Pipeline – immer mit Toast und „Rückgängig“.

const data = () => useStore.getState()
const byId = (id: string) => data().posts.find((p) => p.id === id)

export const whenLabel = (d: Date | string) => formatDe(d, "EEE d. MMM, HH:mm 'Uhr'")
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Wiederholte Tastatur-Aktionen (Alt+→ → → …) erzeugen nur einen Toast,
 * dessen „Rückgängig“ zum Ausgangszustand vor der ganzen Serie zurückführt.
 */
let streak: { key: string; toastId: string | null; undo: () => void; at: number } | null = null

function notify(t: Omit<Toast, 'id' | 'action'>, undo: () => void, coalesceKey?: string) {
  const ui = useUi.getState()
  let finalUndo = undo
  if (coalesceKey && streak && streak.key === coalesceKey && Date.now() - streak.at < 4000) {
    finalUndo = streak.undo
    if (streak.toastId) ui.dismissToast(streak.toastId)
  }
  const before = new Set(ui.toasts.map((x) => x.id))
  ui.toast({ ...t, action: { label: 'Rückgängig', run: finalUndo } })
  const created = useUi.getState().toasts.find((x) => !before.has(x.id))
  streak = coalesceKey ? { key: coalesceKey, toastId: created?.id ?? null, undo: finalUndo, at: Date.now() } : null
}

/** Einen Post auf einen festen Zeitpunkt legen */
export function reschedule(id: string, target: Date, opts: { coalesce?: boolean } = {}) {
  const post = byId(id)
  if (!post) return
  if (parseISO(post.scheduledAt).getTime() === target.getTime()) return
  data().movePost(id, target.toISOString())
  notify(
    { title: 'Post verschoben', description: `${post.title} → ${whenLabel(target)}` },
    () => useStore.getState().movePost(id, post.scheduledAt),
    opts.coalesce ? `move:${id}` : undefined,
  )
}

type Delta = { days?: number; hours?: number; minutes?: number }
const applyDelta = (iso: string, d: Delta) => addMinutes(addHours(addDays(parseISO(iso), d.days ?? 0), d.hours ?? 0), d.minutes ?? 0)
const signed = (n: number, one: string, many: string) => `${n > 0 ? '+' : '−'}${plural(Math.abs(n), one, many)}`

/** Mehrere Posts um Tage/Stunden/Minuten verschieben */
export function shiftPosts(ids: string[], delta: Delta, opts: { coalesce?: boolean } = {}) {
  const posts = ids.map(byId).filter((p): p is Post => !!p)
  if (!posts.length || (!delta.days && !delta.hours && !delta.minutes)) return
  const prev = posts.map((p) => [p.id, p.scheduledAt] as const)
  for (const p of posts) data().movePost(p.id, applyDelta(p.scheduledAt, delta).toISOString())
  const parts = [
    delta.days ? signed(delta.days, 'Tag', 'Tage') : '',
    delta.hours ? signed(delta.hours, 'Stunde', 'Stunden') : '',
    delta.minutes ? signed(delta.minutes, 'Minute', 'Minuten') : '',
  ].filter(Boolean)
  const single = posts.length === 1 ? posts[0] : null
  notify(
    {
      title: single ? 'Post verschoben' : `${posts.length} Posts verschoben`,
      description: single ? `${single.title} → ${whenLabel(applyDelta(single.scheduledAt, delta))}` : parts.join(', '),
    },
    () => prev.forEach(([id, at]) => useStore.getState().movePost(id, at)),
    opts.coalesce ? `shift:${[...ids].sort().join(',')}` : undefined,
  )
}

/** Status setzen – warnt, wenn freigegeben/geplant wird, obwohl die Checkliste offen ist */
export function setStatus(ids: string[], status: PostStatus, opts: { coalesce?: boolean; assigneeId?: string | null } = {}) {
  const posts = ids.map(byId).filter((p): p is Post => !!p)
  const changing = posts.filter((p) => p.status !== status || (opts.assigneeId !== undefined && p.assigneeId !== opts.assigneeId))
  if (!changing.length) return
  const prev = changing.map((p) => ({ id: p.id, status: p.status, assigneeId: p.assigneeId }))
  for (const p of changing) {
    if (opts.assigneeId !== undefined && p.assigneeId !== opts.assigneeId) data().upsertPost({ ...p, status, assigneeId: opts.assigneeId })
    else data().setPostStatus(p.id, status)
  }
  const risky = status === 'approved' || status === 'scheduled'
  const open = risky ? changing.reduce((n, p) => n + p.checklist.filter((c) => !c.done).length, 0) : 0
  const single = changing.length === 1 ? changing[0] : null
  const who = opts.assigneeId !== undefined ? data().team.find((m) => m.id === opts.assigneeId)?.name : undefined
  notify(
    {
      tone: open ? 'danger' : 'default',
      title: single ? `→ ${STATUS[status].label}${who ? ` · ${who}` : ''}` : `${changing.length} Posts → ${STATUS[status].label}`,
      description: open
        ? `${single ? single.title + ': ' : ''}noch ${plural(open, 'offener Punkt', 'offene Punkte')} auf der Checkliste.`
        : (single?.title ?? undefined),
    },
    () => {
      const s = useStore.getState()
      for (const x of prev) {
        const cur = s.posts.find((p) => p.id === x.id)
        if (cur) s.upsertPost({ ...cur, status: x.status, assigneeId: x.assigneeId })
      }
    },
    opts.coalesce ? `status:${ids.join(',')}` : undefined,
  )
}

export function setAssignee(ids: string[], assigneeId: string | null) {
  const posts = ids.map(byId).filter((p): p is Post => !!p && p.assigneeId !== assigneeId)
  if (!posts.length) return
  const prev = posts.map((p) => [p.id, p.assigneeId] as const)
  for (const p of posts) data().upsertPost({ ...p, assigneeId })
  const name = assigneeId ? (data().team.find((m) => m.id === assigneeId)?.name ?? 'jemand') : 'niemand'
  notify({ title: posts.length === 1 ? `Verantwortlich: ${name}` : `${posts.length} Posts → ${name}`, description: posts.length === 1 ? posts[0].title : undefined }, () => {
    const s = useStore.getState()
    for (const [id, a] of prev) {
      const cur = s.posts.find((p) => p.id === id)
      if (cur) s.upsertPost({ ...cur, assigneeId: a })
    }
  })
}

export function removePosts(ids: string[]) {
  const posts = ids.map(byId).filter((p): p is Post => !!p)
  if (!posts.length) return
  for (const p of posts) data().deletePost(p.id)
  notify(
    {
      tone: 'danger',
      title: posts.length === 1 ? 'Post gelöscht' : `${posts.length} Posts gelöscht`,
      description: posts.length === 1 ? posts[0].title : 'Du kannst das noch rückgängig machen.',
    },
    () => {
      const s = useStore.getState()
      for (const p of posts) if (!s.posts.some((x) => x.id === p.id)) s.upsertPost(p)
    },
  )
}

export function duplicate(id: string) {
  const copy = data().duplicatePost(id)
  if (!copy) return undefined
  useUi.getState().toast({
    tone: 'success',
    title: 'Kopie angelegt',
    description: `${copy.title} · als Entwurf, ${whenLabel(copy.scheduledAt)}`,
    action: { label: 'Öffnen', run: () => useUi.getState().openPost(copy.id) },
  })
  return copy
}
