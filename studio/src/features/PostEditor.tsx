import { addDays, format, parseISO, setHours, setMinutes, startOfDay } from 'date-fns'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Copy,
  Hash,
  ImagePlus,
  Link2,
  ListChecks,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { PlatformChip, PlatformIcon } from '../components/domain'
import { Badge, Button, Drawer, Field, Input, Select, Textarea, Tint } from '../components/ui/primitives'
import { DEFAULT_CHECKLIST, FORMATS, KEYDATE_KINDS, LOCATIONS, MEDIA_TONES, PILLARS, PLATFORM, PLATFORMS, STATUSES } from '../lib/constants'
import { occurrencesBetween } from '../lib/keydates'
import { toast, useStore, useUi, type PostDraftPreset } from '../lib/store'
import type { MediaTone, Platform, Post, PostFormat, PostMetrics } from '../lib/types'
import { buildUtmUrl, cn, compressImage, extractHashtags, formatDe, slugify, uid } from '../lib/utils'
import { PostPreview } from './PostPreview'

const EMOJIS = ['☕', '🫘', '🔥', '📍', '👇', '✨', '🎉', '🙌', '🌿', '🥐']

function defaultTime(preset?: PostDraftPreset | null) {
  if (preset?.scheduledAt) return preset.scheduledAt
  const base = addDays(startOfDay(new Date()), 1)
  return setMinutes(setHours(base, 9), 0).toISOString()
}

function newDraft(preset: PostDraftPreset | null): Post {
  const now = new Date().toISOString()
  return {
    id: uid('post'),
    title: preset?.title ?? '',
    caption: preset?.caption ?? '',
    platforms: preset?.platforms ?? ['instagram'],
    format: preset?.format ?? 'feed',
    status: preset?.status ?? 'draft',
    pillar: preset?.pillar ?? 'bohne',
    scheduledAt: defaultTime(preset),
    location: 'online',
    assigneeId: null,
    hashtags: [],
    mediaTone: 'espresso',
    campaignId: preset?.campaignId ?? null,
    notes: preset?.notes ?? '',
    checklist: DEFAULT_CHECKLIST.map((label) => ({ id: uid('chk'), label, done: false })),
    createdAt: now,
    updatedAt: now,
  }
}

function Section({ title, icon, children, aside }: { title: string; icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-5 last:border-b-0 md:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          {icon ? <span className="text-ink-3">{icon}</span> : null}
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** Nächster Termin ab `from`, der zu einer Best-Time-Regel passt */
function nextSlot(from: Date, days: number[], time: string) {
  const [h, m] = time.split(':').map(Number)
  for (let i = 0; i < 14; i++) {
    const d = setMinutes(setHours(addDays(startOfDay(from), i), h), m)
    if (days.includes(d.getDay()) && d > new Date()) return d
  }
  return setMinutes(setHours(from, h), m)
}

export function PostEditor() {
  const { open, postId, preset } = useUi((s) => s.postEditor)
  const close = useUi((s) => s.closePost)
  const posts = useStore((s) => s.posts)
  const existing = useMemo(() => (postId ? posts.find((p) => p.id === postId) : undefined), [posts, postId])
  const [draft, setDraft] = useState<Post | null>(null)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; platforms?: string }>({})

  useEffect(() => {
    if (!open) {
      setDraft(null)
      return
    }
    setDraft(existing ? structuredClone(existing) : newDraft(preset))
    setDirty(false)
    setErrors({})
    // Nur beim Öffnen neu initialisieren
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId])

  if (!open || !draft) return null
  return (
    <EditorBody
      key={draft.id}
      draft={draft}
      isNew={!existing}
      preset={preset}
      errors={errors}
      setErrors={setErrors}
      onChange={(patch) => {
        setDraft((d) => (d ? { ...d, ...patch } : d))
        setDirty(true)
      }}
      onClose={() => {
        if (dirty && !window.confirm('Ungespeicherte Änderungen verwerfen?')) return
        close()
      }}
      onSaved={close}
    />
  )
}

function EditorBody({
  draft,
  isNew,
  preset,
  errors,
  setErrors,
  onChange,
  onClose,
  onSaved,
}: {
  draft: Post
  isNew: boolean
  preset: PostDraftPreset | null
  errors: { title?: string; platforms?: string }
  setErrors: (e: { title?: string; platforms?: string }) => void
  onChange: (patch: Partial<Post>) => void
  onClose: () => void
  onSaved: () => void
}) {
  const team = useStore((s) => s.team)
  const campaigns = useStore((s) => s.campaigns)
  const templates = useStore((s) => s.templates)
  const hashtagSets = useStore((s) => s.hashtagSets)
  const keyDates = useStore((s) => s.keyDates)
  const upsertPost = useStore((s) => s.upsertPost)
  const deletePost = useStore((s) => s.deletePost)
  const duplicatePost = useStore((s) => s.duplicatePost)
  const deleteIdea = useStore((s) => s.deleteIdea)
  const openPost = useUi((s) => s.openPost)
  const captionRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [tagInput, setTagInput] = useState('')
  const [checkInput, setCheckInput] = useState('')
  const [uploading, setUploading] = useState(false)

  const when = parseISO(draft.scheduledAt)
  const dayOcc = useMemo(() => {
    const d = startOfDay(parseISO(draft.scheduledAt))
    return occurrencesBetween(keyDates, d, d)
  }, [keyDates, draft.scheduledAt])
  const captionTags = extractHashtags(draft.caption)
  const allTags = Array.from(new Set([...captionTags, ...draft.hashtags]))
  const tagRule = draft.platforms
    .map((p) => ({ p, limit: PLATFORM[p].hashtagLimit }))
    .filter((x): x is { p: Platform; limit: number } => x.limit != null && x.limit > 0)
    .sort((a, b) => a.limit - b.limit)[0]
  const tagLimit = tagRule?.limit ?? null
  const tagLimitPlatform = tagRule ? PLATFORM[tagRule.p].label : ''
  const checklistDone = draft.checklist.filter((c) => c.done).length
  const showMetrics = draft.status === 'published' || when < new Date()
  const bestTimes = draft.platforms.flatMap((p) => PLATFORM[p].bestTimes.map((b) => ({ ...b, platform: p })))

  const togglePlatform = (p: Platform) => {
    const next = draft.platforms.includes(p) ? draft.platforms.filter((x) => x !== p) : [...draft.platforms, p]
    onChange({ platforms: PLATFORMS.map((x) => x.id).filter((id) => next.includes(id)) })
  }

  const insertAtCursor = (text: string) => {
    const el = captionRef.current
    const cur = draft.caption
    if (!el) return onChange({ caption: cur + text })
    const start = el.selectionStart ?? cur.length
    const end = el.selectionEnd ?? cur.length
    onChange({ caption: cur.slice(0, start) + text + cur.slice(end) })
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + text.length
    })
  }

  const addTags = (raw: string) => {
    const tags = raw
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`).toLowerCase())
    if (!tags.length) return
    onChange({ hashtags: Array.from(new Set([...draft.hashtags, ...tags])) })
  }

  const setDateTime = (date: string, time: string) => {
    const [y, m, d] = date.split('-').map(Number)
    const [h, min] = time.split(':').map(Number)
    if (!y || !m || !d || Number.isNaN(h) || Number.isNaN(min)) return
    onChange({ scheduledAt: new Date(y, m - 1, d, h, min).toISOString() })
  }

  const save = () => {
    const e: { title?: string; platforms?: string } = {}
    if (!draft.title.trim()) e.title = 'Gib dem Post einen Arbeitstitel.'
    if (!draft.platforms.length) e.platforms = 'Wähle mindestens einen Kanal.'
    setErrors(e)
    if (Object.keys(e).length) return
    upsertPost({ ...draft, title: draft.title.trim() })
    if (isNew && preset?.fromIdeaId) deleteIdea(preset.fromIdeaId)
    toast({
      tone: 'success',
      title: isNew ? 'Post angelegt' : 'Post gespeichert',
      description: `${draft.title.trim()} · ${formatDe(draft.scheduledAt, "EEE d. MMM, HH:mm 'Uhr'")}`,
    })
    onSaved()
  }

  const limitFor = draft.platforms
    .map((p) => ({ p, limit: PLATFORM[p].charLimit }))
    .filter((x): x is { p: Platform; limit: number } => x.limit != null)
  const captionLength = [draft.caption, draft.hashtags.join(' ')].filter(Boolean).join('\n\n').length

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        {!isNew ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const copy = duplicatePost(draft.id)
                if (copy) {
                  toast({ title: 'Post dupliziert', description: 'Die Kopie ist als Entwurf gespeichert.' })
                  openPost(copy.id)
                }
              }}
            >
              <Copy className="size-3.5" /> Duplizieren
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger-soft hover:text-danger"
              onClick={() => {
                const backup = draft
                deletePost(draft.id)
                onSaved()
                toast({ title: 'Post gelöscht', action: { label: 'Rückgängig', run: () => useStore.getState().upsertPost(backup) } })
              }}
            >
              <Trash2 className="size-3.5" /> Löschen
            </Button>
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-[11px] text-ink-3 sm:inline">
          Checkliste {checklistDone}/{draft.checklist.length}
        </span>
        <Button variant="secondary" onClick={onClose}>
          Abbrechen
        </Button>
        <Button variant="primary" onClick={save}>
          <Check className="size-4" /> {isNew ? 'Post anlegen' : 'Speichern'}
        </Button>
      </div>
    </div>
  )

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-6xl"
      title={isNew ? 'Neuen Post planen' : 'Post bearbeiten'}
      subtitle={isNew ? 'Idee → Entwurf → Review → Freigabe → Geplant → Live' : `Zuletzt geändert ${formatDe(draft.updatedAt, "d. MMM 'um' HH:mm")}`}
      footer={footer}
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 border-line lg:border-r">
          {/* Titel & Status */}
          <div className="border-b border-line bg-surface px-5 pt-5 pb-4 md:px-6">
            <label htmlFor="post-title" className="sr-only">
              Arbeitstitel
            </label>
            <input
              id="post-title"
              autoFocus={isNew}
              value={draft.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Arbeitstitel, z. B. „Bohne der Woche: Dörte“"
              className="w-full bg-transparent font-display text-xl font-semibold text-ink outline-none placeholder:text-ink-3/60 md:text-2xl"
            />
            {errors.title ? <p className="mt-1 text-xs text-danger">{errors.title}</p> : null}
            <ol className="mt-4 flex flex-wrap gap-1.5" aria-label="Status">
              {STATUSES.map((s, i) => {
                const idx = STATUSES.findIndex((x) => x.id === draft.status)
                const active = s.id === draft.status
                const passed = i < idx
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onChange({ status: s.id })}
                      title={s.hint}
                      className={cn(
                        'flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors',
                        active ? 'tint tint-border' : passed ? 'border-transparent bg-surface-2 text-ink-2' : 'border-line text-ink-3 hover:border-line-strong hover:text-ink',
                      )}
                      style={{ '--c': s.color } as CSSProperties}
                      aria-current={active ? 'step' : undefined}
                    >
                      {passed ? <Check className="size-3" /> : <span className="size-1.5 rounded-full" style={{ background: s.color }} />}
                      {s.label}
                    </button>
                  </li>
                )
              })}
            </ol>
            {draft.status === 'scheduled' && checklistDone < draft.checklist.length ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle className="size-3.5" /> Geplant, aber die Checkliste ist noch offen ({checklistDone}/{draft.checklist.length}).
              </p>
            ) : null}
          </div>

          <Section title="Kanäle & Format" icon={<Sparkles className="size-4" />}>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <PlatformChip key={p.id} platform={p.id} active={draft.platforms.includes(p.id)} onClick={() => togglePlatform(p.id)} />
              ))}
            </div>
            {errors.platforms ? <p className="mt-1.5 text-xs text-danger">{errors.platforms}</p> : null}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(Object.keys(FORMATS) as PostFormat[]).map((f) => {
                const supported = draft.platforms.some((p) => PLATFORM[p].formats.includes(f))
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onChange({ format: f })}
                    className={cn(
                      'h-8 rounded-lg border px-3 text-xs font-medium transition-colors',
                      draft.format === f ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-surface text-ink-2 hover:border-line-strong',
                      !supported && draft.format !== f && 'opacity-45',
                    )}
                    title={supported ? FORMATS[f].ratio : 'Von den gewählten Kanälen nicht unterstützt'}
                  >
                    {FORMATS[f].label}
                  </button>
                )
              })}
            </div>
          </Section>

          <Section
            title="Caption"
            icon={<Hash className="size-4" />}
            aside={
              <div className="flex flex-wrap justify-end gap-1">
                {limitFor.length ? (
                  limitFor.map(({ p, limit }) => {
                    const over = captionLength > limit
                    return (
                      <span
                        key={p}
                        className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular', over ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-ink-3')}
                        title={`${PLATFORM[p].label}: max. ${limit} Zeichen`}
                      >
                        <PlatformIcon platform={p} className="size-3" />
                        {captionLength}/{limit}
                      </span>
                    )
                  })
                ) : (
                  <span className="text-[11px] text-ink-3 tabular">{captionLength} Zeichen</span>
                )}
              </div>
            }
          >
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Select
                aria-label="Vorlage einfügen"
                className="h-8 w-auto text-xs"
                value=""
                onChange={(e) => {
                  const t = templates.find((x) => x.id === e.target.value)
                  if (t) {
                    onChange({ caption: draft.caption ? `${draft.caption}\n\n${t.body}` : t.body, pillar: t.pillar ?? draft.pillar })
                  }
                }}
              >
                <option value="">Vorlage einfügen …</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <div className="flex flex-wrap gap-0.5 rounded-lg border border-line bg-surface p-0.5">
                {EMOJIS.map((e) => (
                  <button key={e} type="button" onClick={() => insertAtCursor(e)} className="size-7 rounded-md text-sm hover:bg-surface-2" aria-label={`Emoji ${e} einfügen`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              ref={captionRef}
              value={draft.caption}
              onChange={(e) => onChange({ caption: e.target.value })}
              rows={7}
              placeholder={'Hook in der ersten Zeile.\nDann die Geschichte.\nZum Schluss eine klare Handlung (Link in Bio, Kommentar, Speichern).'}
            />
            <p className="mt-1.5 text-[11px] text-ink-3">
              Tipp: Die ersten 125 Zeichen entscheiden – danach kürzt Instagram mit „… mehr“. {draft.platforms.map((p) => PLATFORM[p].hashtagHint).slice(0, 1)}
            </p>

            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-ink-2">Hashtags</span>
                <Badge tone={tagLimit != null && allTags.length > tagLimit ? 'danger' : 'muted'}>
                  {allTags.length}
                  {tagLimit != null ? ` / ${tagLimit}` : ''}
                </Badge>
                {tagLimit != null && allTags.length > tagLimit ? (
                  <span className="text-[11px] text-danger">{tagLimitPlatform} erlaubt max. {tagLimit}</span>
                ) : null}
                <span className="mx-1 h-4 w-px bg-line" />
                {hashtagSets.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const fresh = s.tags.filter((t) => !allTags.includes(t))
                      const room = tagLimit != null ? Math.max(0, tagLimit - allTags.length) : fresh.length
                      const take = fresh.slice(0, room)
                      onChange({ hashtags: [...draft.hashtags, ...take] })
                      if (take.length < fresh.length) {
                        toast({ title: `${take.length} von ${fresh.length} Hashtags übernommen`, description: `${tagLimitPlatform} erlaubt max. ${tagLimit} – wähle die stärksten.` })
                      }
                    }}
                    className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-line-strong px-2 text-[11px] text-ink-2 hover:border-accent hover:text-accent-text"
                  >
                    <Plus className="size-3" /> {s.name}
                  </button>
                ))}
              </div>
              <div className="field flex min-h-10 flex-wrap items-center gap-1.5 py-1.5">
                {draft.hashtags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-md bg-surface-2 py-0.5 pr-1 pl-2 text-xs text-ink-2">
                    {t}
                    <button type="button" onClick={() => onChange({ hashtags: draft.hashtags.filter((x) => x !== t) })} className="rounded p-0.5 hover:bg-surface-3" aria-label={`${t} entfernen`}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                      e.preventDefault()
                      addTags(tagInput)
                      setTagInput('')
                    } else if (e.key === 'Backspace' && !tagInput && draft.hashtags.length) {
                      onChange({ hashtags: draft.hashtags.slice(0, -1) })
                    }
                  }}
                  onBlur={() => {
                    addTags(tagInput)
                    setTagInput('')
                  }}
                  placeholder={draft.hashtags.length ? '' : '#hashtag + Enter'}
                  className="min-w-28 flex-1 bg-transparent text-xs outline-none"
                  aria-label="Hashtag hinzufügen"
                />
              </div>
            </div>
          </Section>

          <Section title="Zeitplan" icon={<CalendarClock className="size-4" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Datum" htmlFor="post-date">
                <Input id="post-date" type="date" value={format(when, 'yyyy-MM-dd')} onChange={(e) => setDateTime(e.target.value, format(when, 'HH:mm'))} />
              </Field>
              <Field label="Uhrzeit" htmlFor="post-time" aside={formatDe(when, 'EEEE')}>
                <Input id="post-time" type="time" step={300} value={format(when, 'HH:mm')} onChange={(e) => setDateTime(format(when, 'yyyy-MM-dd'), e.target.value)} />
              </Field>
            </div>
            {bestTimes.length ? (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-medium text-ink-3">Beste Zeiten (Annahme – in Analytics prüfen)</p>
                <div className="flex flex-wrap gap-1.5">
                  {bestTimes.slice(0, 6).map((b) => (
                    <button
                      key={`${b.platform}-${b.label}`}
                      type="button"
                      onClick={() => onChange({ scheduledAt: nextSlot(when, b.days, b.time).toISOString() })}
                      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-[11px] text-ink-2 hover:border-accent hover:text-accent-text"
                    >
                      <PlatformIcon platform={b.platform} className="size-3" /> {b.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {dayOcc.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {dayOcc.map((o) => (
                  <Tint key={o.keyDate.id} color={KEYDATE_KINDS[o.keyDate.kind].color} className="px-2 py-1 text-xs">
                    Anlass: {o.keyDate.title}
                  </Tint>
                ))}
              </div>
            ) : null}
          </Section>

          <Section title="Details">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Content-Säule" htmlFor="post-pillar">
                <Select id="post-pillar" value={draft.pillar} onChange={(e) => onChange({ pillar: e.target.value as Post['pillar'] })}>
                  {PILLARS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Standort" htmlFor="post-location">
                <Select id="post-location" value={draft.location} onChange={(e) => onChange({ location: e.target.value as Post['location'] })}>
                  {Object.entries(LOCATIONS).map(([id, l]) => (
                    <option key={id} value={id}>
                      {l.label} – {l.detail}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Verantwortlich" htmlFor="post-assignee">
                <Select id="post-assignee" value={draft.assigneeId ?? ''} onChange={(e) => onChange({ assigneeId: e.target.value || null })}>
                  <option value="">Noch niemand</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.role}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Kampagne" htmlFor="post-campaign" hint="Verknüpfte Posts erscheinen als Creatives in der Kampagne.">
                <Select id="post-campaign" value={draft.campaignId ?? ''} onChange={(e) => onChange({ campaignId: e.target.value || null })}>
                  <option value="">Organisch (keine Kampagne)</option>
                  {campaigns
                    .filter((c) => c.status !== 'completed' || c.id === draft.campaignId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field
                label="Link"
                htmlFor="post-link"
                className="sm:col-span-2"
                aside={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium text-accent-text hover:underline"
                    onClick={() =>
                      onChange({
                        link: buildUtmUrl(draft.link || 'https://roestbrueder.com/', {
                          source: draft.platforms[0] ?? 'social',
                          medium: draft.campaignId ? 'paid_social' : draft.platforms[0] === 'newsletter' ? 'email' : 'social',
                          campaign: `${format(when, 'yyyy-MM')}_${slugify(draft.title || 'post')}`.slice(0, 48),
                        }),
                      })
                    }
                  >
                    <Link2 className="size-3" /> UTM anhängen
                  </button>
                }
              >
                <Input id="post-link" value={draft.link ?? ''} onChange={(e) => onChange({ link: e.target.value })} placeholder="https://roestbrueder.com/shop/" />
              </Field>
            </div>
          </Section>

          <Section title="Bild & Stimmung" icon={<ImagePlus className="size-4" />}>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploading(true)
                  try {
                    onChange({ mediaUrl: await compressImage(file) })
                  } catch {
                    toast({ tone: 'danger', title: 'Bild konnte nicht geladen werden' })
                  } finally {
                    setUploading(false)
                    e.target.value = ''
                  }
                }}
              />
              <Button size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
                <ImagePlus className="size-3.5" /> {draft.mediaUrl ? 'Bild ersetzen' : 'Bild hochladen'}
              </Button>
              {draft.mediaUrl ? (
                <Button size="sm" variant="ghost" onClick={() => onChange({ mediaUrl: undefined })}>
                  <X className="size-3.5" /> Entfernen
                </Button>
              ) : null}
              <span className="text-[11px] text-ink-3">oder Platzhalter-Stimmung:</span>
              <div className="flex gap-1.5">
                {(Object.keys(MEDIA_TONES) as MediaTone[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    title={MEDIA_TONES[t].label}
                    aria-label={`Stimmung ${MEDIA_TONES[t].label}`}
                    aria-pressed={draft.mediaTone === t}
                    onClick={() => onChange({ mediaTone: t })}
                    className={cn('size-7 rounded-full ring-offset-2 ring-offset-surface transition-shadow', draft.mediaTone === t && 'ring-2 ring-accent')}
                    style={{ backgroundImage: `linear-gradient(145deg, ${MEDIA_TONES[t].from}, ${MEDIA_TONES[t].to})` }}
                  />
                ))}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink-3">Bilder werden im Browser auf 1080 px verkleinert und lokal gespeichert.</p>
          </Section>

          <Section title="Checkliste" icon={<ListChecks className="size-4" />} aside={<span className="text-[11px] font-semibold text-ink-3 tabular">{checklistDone}/{draft.checklist.length}</span>}>
            <div className="mb-3 h-1.5 w-full rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-success transition-[width] duration-300" style={{ width: `${draft.checklist.length ? (checklistDone / draft.checklist.length) * 100 : 0}%` }} />
            </div>
            <ul className="space-y-1">
              {draft.checklist.map((c) => (
                <li key={c.id} className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={c.done}
                    onChange={() => onChange({ checklist: draft.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) })}
                    className="size-4 accent-[var(--accent)]"
                    id={c.id}
                  />
                  <label htmlFor={c.id} className={cn('flex-1 text-sm', c.done ? 'text-ink-3 line-through' : 'text-ink')}>
                    {c.label}
                  </label>
                  <button
                    type="button"
                    onClick={() => onChange({ checklist: draft.checklist.filter((x) => x.id !== c.id) })}
                    className="rounded p-0.5 text-ink-3 opacity-0 group-hover:opacity-100 hover:text-danger focus:opacity-100"
                    aria-label="Punkt entfernen"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!checkInput.trim()) return
                onChange({ checklist: [...draft.checklist, { id: uid('chk'), label: checkInput.trim(), done: false }] })
                setCheckInput('')
              }}
            >
              <Input value={checkInput} onChange={(e) => setCheckInput(e.target.value)} placeholder="Weiterer Punkt …" className="h-8 text-xs" />
              <Button size="sm" type="submit">
                <Plus className="size-3.5" />
              </Button>
            </form>
          </Section>

          {showMetrics ? <MetricsSection metrics={draft.metrics} onChange={(metrics) => onChange({ metrics })} /> : null}

          <Section title="Notizen">
            <Textarea value={draft.notes} onChange={(e) => onChange({ notes: e.target.value })} rows={3} placeholder="Drehideen, Musik, Personen markieren, Freigabe-Kommentare …" />
          </Section>
        </div>

        <aside className="border-t border-line bg-canvas p-5 md:p-6 lg:border-t-0">
          <div className="lg:sticky lg:top-0">
            <PostPreview draft={draft} />
          </div>
        </aside>
      </div>
    </Drawer>
  )
}

const METRIC_FIELDS: { key: keyof PostMetrics; label: string }[] = [
  { key: 'reach', label: 'Reichweite' },
  { key: 'impressions', label: 'Impressionen' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Kommentare' },
  { key: 'shares', label: 'Geteilt' },
  { key: 'saves', label: 'Gespeichert' },
  { key: 'clicks', label: 'Link-Klicks' },
]

function MetricsSection({ metrics, onChange }: { metrics?: PostMetrics; onChange: (m: PostMetrics) => void }) {
  const m: PostMetrics = metrics ?? { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0 }
  const rate = m.reach ? ((m.likes + m.comments + m.shares + m.saves) / m.reach) * 100 : 0
  return (
    <Section
      title="Kennzahlen nach Veröffentlichung"
      aside={<Badge tone={rate >= 5 ? 'success' : rate >= 3 ? 'accent' : 'muted'}>Interaktionsrate {rate.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %</Badge>}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METRIC_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`m-${f.key}`}>
            <Input
              id={`m-${f.key}`}
              type="number"
              min={0}
              inputMode="numeric"
              value={m[f.key] || ''}
              onChange={(e) => onChange({ ...m, [f.key]: Math.max(0, Number(e.target.value) || 0) })}
              className="text-right tabular"
            />
          </Field>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-3">Bis zur API-Anbindung (Phase 2) einfach aus den Insights abtippen – dauert 30 Sekunden und füttert Analytics.</p>
    </Section>
  )
}
