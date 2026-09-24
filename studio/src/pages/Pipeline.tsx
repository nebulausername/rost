import { addDays, differenceInCalendarDays, parseISO, setHours, setMinutes, startOfDay, subDays } from 'date-fns'
import { CalendarClock, ListChecks, Megaphone, Plus, Search } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { MediaThumb, PillarBadge, PlatformStack } from '../components/domain'
import { Avatar, Card, Input, PageHeader, Toggle } from '../components/ui/primitives'
import { DEFAULT_CHECKLIST, STATUS, STATUSES } from '../lib/constants'
import { toast, useStore, useUi } from '../lib/store'
import type { Post, PostStatus } from '../lib/types'
import { cn, formatDe, uid } from '../lib/utils'

function relative(iso: string) {
  const d = differenceInCalendarDays(parseISO(iso), new Date())
  if (d === 0) return 'heute'
  if (d === 1) return 'morgen'
  if (d === -1) return 'gestern'
  if (d > 1 && d < 7) return `in ${d} Tagen`
  if (d < 0 && d > -7) return `vor ${-d} Tagen`
  return formatDe(iso, 'd. MMM')
}

export function PipelinePage() {
  const posts = useStore((s) => s.posts)
  const team = useStore((s) => s.team)
  const campaigns = useStore((s) => s.campaigns)
  const setPostStatus = useStore((s) => s.setPostStatus)
  const upsertPost = useStore((s) => s.upsertPost)
  const openPost = useUi((s) => s.openPost)
  const [q, setQ] = useState('')
  const [assignee, setAssignee] = useState<string | null>(null)
  const [showOld, setShowOld] = useState(false)
  const [over, setOver] = useState<PostStatus | null>(null)
  const [quick, setQuick] = useState('')

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    const cutoff = subDays(new Date(), 14)
    return posts
      .filter((p) => (showOld ? true : p.status !== 'published' || parseISO(p.scheduledAt) >= cutoff))
      .filter((p) => !assignee || p.assigneeId === assignee)
      .filter((p) => !term || `${p.title} ${p.caption} ${p.hashtags.join(' ')}`.toLowerCase().includes(term))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  }, [posts, q, assignee, showOld])

  const move = (id: string, status: PostStatus) => {
    const post = posts.find((p) => p.id === id)
    if (!post || post.status === status) return
    setPostStatus(id, status)
    const open = post.checklist.filter((c) => !c.done).length
    toast({
      tone: (status === 'scheduled' || status === 'approved') && open ? 'danger' : 'default',
      title: `→ ${STATUS[status].label}`,
      description:
        (status === 'scheduled' || status === 'approved') && open
          ? `${post.title}: noch ${open} offene Punkte auf der Checkliste.`
          : post.title,
      action: { label: 'Rückgängig', run: () => useStore.getState().setPostStatus(id, post.status) },
    })
  }

  const addQuickIdea = () => {
    const title = quick.trim()
    if (!title) return
    const now = new Date().toISOString()
    const post: Post = {
      id: uid('post'),
      title,
      caption: '',
      platforms: ['instagram'],
      format: 'feed',
      status: 'idea',
      pillar: 'cafe',
      scheduledAt: setMinutes(setHours(addDays(startOfDay(new Date()), 7), 9), 0).toISOString(),
      location: 'online',
      assigneeId: assignee,
      hashtags: [],
      mediaTone: 'crema',
      campaignId: null,
      notes: '',
      checklist: DEFAULT_CHECKLIST.map((label) => ({ id: uid('chk'), label, done: false })),
      createdAt: now,
      updatedAt: now,
    }
    upsertPost(post)
    setQuick('')
    toast({ title: 'Idee angelegt', description: 'Vorläufig in 7 Tagen eingeplant – Termin im Editor anpassen.', action: { label: 'Öffnen', run: () => openPost(post.id) } })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Social Media"
        title="Content-Pipeline"
        description="Vom Geistesblitz bis live: Ziehe Karten in die nächste Spalte. Review heißt: Collin oder Vincent schauen drüber, bevor es rausgeht."
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Posts durchsuchen …" className="pl-9" aria-label="Posts durchsuchen" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs text-ink-3">Wer:</span>
            <button
              type="button"
              onClick={() => setAssignee(null)}
              className={cn('h-8 rounded-lg px-2.5 text-xs font-medium', !assignee ? 'bg-ink text-canvas' : 'text-ink-2 hover:bg-surface-2')}
            >
              Alle
            </button>
            {team.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setAssignee(assignee === m.id ? null : m.id)}
                className={cn('rounded-full ring-offset-2 ring-offset-canvas transition-shadow', assignee === m.id && 'ring-2 ring-accent')}
                aria-pressed={assignee === m.id}
                aria-label={`Nur ${m.name}`}
              >
                <Avatar name={m.name} color={m.color} initials={m.initials} size={28} />
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-2 md:ml-auto">
            <Toggle checked={showOld} onChange={setShowOld} label="Ältere Veröffentlichungen zeigen" />
            Ältere Veröffentlichungen
          </label>
        </div>
      </PageHeader>

      <div className="-mx-4 overflow-x-auto px-4 pb-4 scrollbar-thin md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
        <div className="grid min-w-[1080px] snap-x grid-cols-6 gap-2.5">
          {STATUSES.map((s) => {
            const items = visible.filter((p) => p.status === s.id)
            return (
              <section
                key={s.id}
                aria-label={s.label}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOver(s.id)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setOver(null)
                  move(e.dataTransfer.getData('text/post-id'), s.id)
                }}
                className={cn(
                  'flex snap-start flex-col rounded-2xl border border-transparent bg-surface-2/60 p-2 transition-colors',
                  over === s.id && 'border-accent/50 bg-accent-soft/60',
                )}
              >
                <header className="flex items-center gap-2 px-1.5 pt-1 pb-2.5" title={s.hint}>
                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                  <h2 className="text-[13px] font-semibold text-ink">{s.label}</h2>
                  <span className="rounded-full bg-surface px-1.5 text-[11px] font-semibold text-ink-3 tabular">{items.length}</span>
                </header>
                {s.id === 'idea' ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      addQuickIdea()
                    }}
                    className="mb-2 flex items-center gap-1 rounded-xl border border-dashed border-line-strong bg-surface/70 px-2"
                  >
                    <Plus className="size-3.5 text-ink-3" />
                    <input
                      value={quick}
                      onChange={(e) => setQuick(e.target.value)}
                      placeholder="Schnelle Idee + Enter"
                      className="h-9 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-3"
                      aria-label="Schnelle Idee"
                    />
                  </form>
                ) : null}
                <ul className="flex min-h-24 flex-col gap-2">
                  {items.map((p) => (
                    <li key={p.id}>
                      <KanbanCard post={p} onOpen={() => openPost(p.id)} team={team} campaignName={campaigns.find((c) => c.id === p.campaignId)?.name} />
                    </li>
                  ))}
                  {!items.length ? <li className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[11px] text-ink-3">Hierher ziehen</li> : null}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function KanbanCard({
  post,
  onOpen,
  team,
  campaignName,
}: {
  post: Post
  onOpen: () => void
  team: { id: string; name: string; color: string; initials: string }[]
  campaignName?: string
}) {
  const member = team.find((m) => m.id === post.assigneeId)
  const done = post.checklist.filter((c) => c.done).length
  const total = post.checklist.length
  const days = differenceInCalendarDays(parseISO(post.scheduledAt), new Date())
  const urgent = post.status !== 'published' && post.status !== 'scheduled' && days >= 0 && days <= 2
  return (
    <Card
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/post-id', post.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group cursor-grab overflow-hidden rounded-xl transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lift active:cursor-grabbing"
    >
      <MediaThumb url={post.mediaUrl} tone={post.mediaTone} className="h-16 w-full">
        <div className="absolute inset-x-2 bottom-2 flex items-end justify-between">
          <PlatformStack platforms={post.platforms} size={18} />
          {post.metrics ? (
            <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular">
              {post.metrics.reach.toLocaleString('de-DE')} erreicht
            </span>
          ) : null}
        </div>
      </MediaThumb>
      <div className="space-y-2 p-2.5">
        <p className="line-clamp-2 text-[13px] leading-snug font-semibold text-ink">{post.title}</p>
        <PillarBadge pillar={post.pillar} />
        <div className="flex items-center gap-1.5 text-[11px] whitespace-nowrap text-ink-3">
          <span className={cn('flex min-w-0 items-center gap-1 overflow-hidden', urgent && 'font-semibold text-danger')}>
            <CalendarClock className="size-3 shrink-0" />
            {relative(post.scheduledAt)}
          </span>
          {campaignName ? <Megaphone className="size-3 shrink-0 text-accent-text" aria-label={`Kampagne: ${campaignName}`} /> : null}
          <span className="ml-auto flex items-center gap-1 tabular" title="Checkliste">
            <ListChecks className="size-3 shrink-0" />
            <span className={cn(done === total && total > 0 && 'text-success')}>
              {done}/{total}
            </span>
          </span>
          {member ? <Avatar name={member.name} color={member.color} initials={member.initials} size={18} /> : null}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full"
            style={{ width: `${total ? (done / total) * 100 : 0}%`, background: 'var(--c)', '--c': STATUS[post.status].color } as CSSProperties}
          />
        </div>
      </div>
    </Card>
  )
}
