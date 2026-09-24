import {
  Ban,
  Camera,
  Check,
  CircleCheck,
  CircleX,
  Copy,
  FileText,
  Hash,
  Info,
  Lightbulb,
  Mic,
  Pencil,
  Plus,
  Quote,
  Repeat,
  ShieldCheck,
  Smile,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { MediaThumb, PillarBadge, PlatformStack } from '../components/domain'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Segmented,
  Select,
  Textarea,
} from '../components/ui/primitives'
import { FORMATS, PILLARS } from '../lib/constants'
import { toast, useStore, useUi } from '../lib/store'
import type { CaptionTemplate, HashtagSet, Idea, MediaTone, Pillar, Platform, PostFormat } from '../lib/types'
import { cn, uid } from '../lib/utils'

// ---------------------------------------------------------------------------
// Helfer
// ---------------------------------------------------------------------------

type Tab = 'hashtags' | 'templates' | 'voice' | 'series'

const TABS: { value: Tab; label: string; icon: ReactNode }[] = [
  { value: 'hashtags', label: 'Hashtag-Sets', icon: <Hash className="size-3.5" /> },
  { value: 'templates', label: 'Caption-Vorlagen', icon: <FileText className="size-3.5" /> },
  { value: 'voice', label: 'Markenstimme', icon: <Mic className="size-3.5" /> },
  { value: 'series', label: 'Formate & Serien', icon: <Repeat className="size-3.5" /> },
]
const isTab = (v: string | null): v is Tab => TABS.some((t) => t.value === v)

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Kurzes „Kopiert ✓“-Feedback am Button */
function useCopyFeedback() {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const copy = async (id: string, text: string, what: string) => {
    const ok = await copyText(text)
    if (ok) {
      setCopied(id)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(null), 1600)
      toast({ title: `${what} kopiert`, description: 'Liegt in der Zwischenablage – einfach einfügen.', tone: 'success' })
    } else {
      toast({ title: 'Kopieren nicht möglich', description: 'Dein Browser blockiert die Zwischenablage.', tone: 'danger' })
    }
  }
  return { copied, copy }
}

/** Hashtags normalisieren: # voran, Sonderzeichen raus, Dubletten (ohne Groß/klein) raus */
function normalizeTags(raw: string) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[\s,;]+/)) {
    const word = part.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '')
    if (!word) continue
    const key = word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(`#${word}`)
  }
  return out
}

const PLACEHOLDER = /\{[^{}\n]+\}/g

function placeholdersOf(body: string) {
  return Array.from(new Set(body.match(PLACEHOLDER) ?? []))
}

/** Text mit hervorgehobenen {Platzhaltern} */
function TemplateText({ body, className }: { body: string; className?: string }) {
  const parts = body.split(/(\{[^{}\n]+\})/g)
  return (
    <p className={cn('whitespace-pre-line', className)}>
      {parts.map((part, i) =>
        /^\{[^{}\n]+\}$/.test(part) ? (
          <mark key={i} className="rounded bg-accent-soft px-0.5 text-accent-text">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

export function LibraryPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = isTab(raw) ? raw : 'hashtags'
  const [setForm, setSetForm] = useState<HashtagSet | 'new' | null>(null)
  const [tplForm, setTplForm] = useState<CaptionTemplate | 'new' | null>(null)

  const changeTab = (t: Tab) => {
    const next = new URLSearchParams(params)
    if (t === 'hashtags') next.delete('tab')
    else next.set('tab', t)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader
        eyebrow="Werkzeuge"
        title="Bibliothek"
        description="Alles, was jeden Post schneller und unverwechselbar macht: Hashtag-Sets, Caption-Vorlagen, unsere Markenstimme und wiederkehrende Serien."
        actions={
          tab === 'hashtags' ? (
            <Button variant="primary" onClick={() => setSetForm('new')}>
              <Plus className="size-4" /> Neues Set
            </Button>
          ) : tab === 'templates' ? (
            <Button variant="primary" onClick={() => setTplForm('new')}>
              <Plus className="size-4" /> Neue Vorlage
            </Button>
          ) : null
        }
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-1 scrollbar-thin md:mx-0 md:px-0">
          <Segmented value={tab} onChange={changeTab} options={TABS} label="Bereich der Bibliothek" />
        </div>
      </PageHeader>

      {tab === 'hashtags' ? <HashtagTab onNew={() => setSetForm('new')} onEdit={setSetForm} /> : null}
      {tab === 'templates' ? <TemplateTab onNew={() => setTplForm('new')} onEdit={setTplForm} /> : null}
      {tab === 'voice' ? <VoiceTab /> : null}
      {tab === 'series' ? <SeriesTab /> : null}

      {setForm ? <HashtagSetModal initial={setForm === 'new' ? null : setForm} onClose={() => setSetForm(null)} /> : null}
      {tplForm ? <TemplateModal initial={tplForm === 'new' ? null : tplForm} onClose={() => setTplForm(null)} /> : null}
    </>
  )
}

// ---------------------------------------------------------------------------
// Hashtag-Sets
// ---------------------------------------------------------------------------

function tagCountState(n: number): { tone: 'success' | 'warning' | 'muted'; label: string } {
  // Sets sind Pools: pro Post werden höchstens 5 davon genutzt
  if (n > 12) return { tone: 'warning', label: 'eher ausdünnen' }
  if (n >= 5) return { tone: 'success', label: 'guter Pool' }
  return { tone: 'muted', label: 'ausbaufähig' }
}

function HashtagTab({ onNew, onEdit }: { onNew: () => void; onEdit: (s: HashtagSet) => void }) {
  const sets = useStore((s) => s.hashtagSets)
  const deleteSet = useStore((s) => s.deleteHashtagSet)
  const { copied, copy } = useCopyFeedback()

  const remove = (s: HashtagSet) => {
    deleteSet(s.id)
    toast({ title: 'Set gelöscht', description: s.name, action: { label: 'Rückgängig', run: () => useStore.getState().upsertHashtagSet(s) } })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-soft">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
          <Info className="size-4" aria-hidden />
        </span>
        <div className="text-xs leading-relaxed text-ink-2">
          <p className="font-semibold text-ink">Sets sind Pools – pro Instagram-Post höchstens 5 Hashtags (aktuelles Limit, Stand prüfen).</p>
          <p className="mt-0.5">
            Mische lokal (#weimar), Nische (#specialtycoffee) und Thema (#pourover). Wähle aus dem Pool die passendsten aus, statt alles zu
            übernehmen – Instagram sortiert heute vor allem über Bild, Text & Keywords. Auf TikTok 3–5, bei Google & Newsletter gar keine.
          </p>
        </div>
      </div>

      {sets.length ? (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {sets.map((s) => {
            const state = tagCountState(s.tags.length)
            return (
              <li key={s.id} className="min-w-0">
                <Card className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-ink">{s.name}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-3">
                        <span className="tabular">
                          {s.tags.length} {s.tags.length === 1 ? 'Hashtag' : 'Hashtags'}
                        </span>
                        <Badge tone={state.tone}>{state.label}</Badge>
                      </p>
                    </div>
                    <div className="flex shrink-0">
                      <Button size="icon-sm" variant="ghost" onClick={() => onEdit(s)} aria-label={`Set „${s.name}“ bearbeiten`}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => remove(s)} aria-label={`Set „${s.name}“ löschen`} className="hover:text-danger">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {s.tags.map((t) => (
                      <li key={t} className="rounded-md bg-surface-2 px-2 py-1 text-xs text-ink-2">
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex justify-end pt-4">
                    <Button size="sm" onClick={() => copy(s.id, s.tags.join(' '), 'Hashtags')} disabled={!s.tags.length}>
                      {copied === s.id ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                      {copied === s.id ? 'Kopiert' : 'Kopieren'}
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={onNew}
              className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm font-medium text-ink-3 transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent-text"
            >
              <Plus className="size-5" /> Neues Set anlegen
            </button>
          </li>
        </ul>
      ) : (
        <EmptyState
          icon={<Hash className="size-5" />}
          title="Noch keine Hashtag-Sets"
          description="Leg dir Sets für wiederkehrende Themen an – lokal, Specialty, Home-Barista – und kopiere sie mit einem Klick."
          action={
            <Button variant="primary" size="sm" onClick={onNew}>
              <Plus className="size-4" /> Erstes Set anlegen
            </Button>
          }
        />
      )}
    </div>
  )
}

function HashtagSetModal({ initial, onClose }: { initial: HashtagSet | null; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertHashtagSet)
  const [name, setName] = useState(initial?.name ?? '')
  const [text, setText] = useState(initial?.tags.join(' ') ?? '')
  const tags = useMemo(() => normalizeTags(text), [text])
  const state = tagCountState(tags.length)
  const valid = name.trim().length > 0 && tags.length > 0

  const save = () => {
    if (!valid) return
    upsert({ id: initial?.id ?? uid('hs'), name: name.trim(), tags })
    toast({ title: initial ? 'Set aktualisiert' : 'Set angelegt', description: `${name.trim()} · ${tags.length} Hashtags`, tone: 'success' })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'Hashtag-Set bearbeiten' : 'Neues Hashtag-Set'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={save} disabled={!valid}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" htmlFor="hs-name">
          <Input id="hs-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Weihnachten & Geschenke" />
        </Field>
        <Field
          label="Hashtags"
          htmlFor="hs-tags"
          hint="Getrennt durch Leerzeichen, Komma oder Zeilenumbruch – das # ergänzen wir. CamelCase (#WeimarLiebe) hilft Screenreadern."
        >
          <Textarea
            id="hs-tags"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'weimar\nspecialtycoffee\n#kaffeeliebe'}
          />
        </Field>
        <div className="rounded-xl border border-line bg-surface-2/50 p-3">
          <div className="flex items-center justify-between gap-2 text-[11px] text-ink-3">
            <span>Vorschau</span>
            <span className="flex items-center gap-1.5">
              <span className="tabular">{tags.length} Hashtags</span>
              {tags.length ? <Badge tone={state.tone}>{state.label}</Badge> : null}
            </span>
          </div>
          {tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-md bg-surface px-2 py-1 text-xs text-ink-2 shadow-soft">
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink-3">Noch keine Hashtags erkannt.</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Caption-Vorlagen
// ---------------------------------------------------------------------------

function TemplateTab({ onNew, onEdit }: { onNew: () => void; onEdit: (t: CaptionTemplate) => void }) {
  const templates = useStore((s) => s.templates)
  const deleteTemplate = useStore((s) => s.deleteTemplate)
  const openPost = useUi((s) => s.openPost)
  const { copied, copy } = useCopyFeedback()

  const remove = (t: CaptionTemplate) => {
    deleteTemplate(t.id)
    toast({ title: 'Vorlage gelöscht', description: t.name, action: { label: 'Rückgängig', run: () => useStore.getState().upsertTemplate(t) } })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-soft">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
          <Info className="size-4" aria-hidden />
        </span>
        <p className="text-xs leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">So funktionieren Vorlagen:</span> Alles in{' '}
          <mark className="rounded bg-accent-soft px-0.5 text-accent-text">{'{geschweiften Klammern}'}</mark> ist ein Platzhalter – z. B.{' '}
          {'{Name}'} oder {'{Datum}'}. Beim Schreiben ersetzt du ihn durch den echten Inhalt. „Als Post nutzen“ öffnet den Post-Editor mit
          der Vorlage als Entwurf.
        </p>
      </div>

      {templates.length ? (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {templates.map((t) => {
            const ph = placeholdersOf(t.body)
            return (
              <li key={t.id} className="min-w-0">
                <Card className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-ink">{t.name}</h3>
                      <div className="mt-1">{t.pillar ? <PillarBadge pillar={t.pillar} /> : <Badge tone="muted">Alle Säulen</Badge>}</div>
                    </div>
                    <div className="flex shrink-0">
                      <Button size="icon-sm" variant="ghost" onClick={() => onEdit(t)} aria-label={`Vorlage „${t.name}“ bearbeiten`}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => remove(t)} aria-label={`Vorlage „${t.name}“ löschen`} className="hover:text-danger">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-surface-2/60 p-3 text-xs leading-relaxed text-ink-2">
                    <TemplateText body={t.body} className="line-clamp-7" />
                  </div>
                  <p className="mt-2 text-[11px] text-ink-3 tabular">
                    {ph.length} {ph.length === 1 ? 'Platzhalter' : 'Platzhalter'} · {t.body.length} Zeichen
                  </p>
                  <div className="mt-auto flex flex-wrap justify-end gap-1.5 pt-4">
                    <Button size="sm" onClick={() => copy(t.id, t.body, 'Vorlage')}>
                      {copied === t.id ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                      {copied === t.id ? 'Kopiert' : 'Kopieren'}
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openPost(null, { caption: t.body, pillar: t.pillar ?? undefined, title: t.name, status: 'draft' })}
                    >
                      <WandSparkles className="size-3.5" /> Als Post nutzen
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={onNew}
              className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm font-medium text-ink-3 transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent-text"
            >
              <Plus className="size-5" /> Neue Vorlage anlegen
            </button>
          </li>
        </ul>
      ) : (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="Noch keine Caption-Vorlagen"
          description="Vorlagen sparen Zeit bei wiederkehrenden Posts – Bohne der Woche, Workshop-Termine, Abo-Hinweise."
          action={
            <Button variant="primary" size="sm" onClick={onNew}>
              <Plus className="size-4" /> Erste Vorlage anlegen
            </Button>
          }
        />
      )}
    </div>
  )
}

function TemplateModal({ initial, onClose }: { initial: CaptionTemplate | null; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertTemplate)
  const [name, setName] = useState(initial?.name ?? '')
  const [pillar, setPillar] = useState<Pillar | ''>(initial?.pillar ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const ph = useMemo(() => placeholdersOf(body), [body])
  const valid = name.trim().length > 0 && body.trim().length > 0

  const save = () => {
    if (!valid) return
    upsert({ id: initial?.id ?? uid('ct'), name: name.trim(), pillar: pillar || null, body: body.trim() })
    toast({ title: initial ? 'Vorlage aktualisiert' : 'Vorlage angelegt', description: name.trim(), tone: 'success' })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'Vorlage bearbeiten' : 'Neue Caption-Vorlage'}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={save} disabled={!valid}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="ct-name">
            <Input id="ct-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Cupping-Einladung" />
          </Field>
          <Field label="Content-Säule" htmlFor="ct-pillar">
            <Select id="ct-pillar" value={pillar} onChange={(e) => setPillar(e.target.value as Pillar | '')}>
              <option value="">Alle Säulen</option>
              {PILLARS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Text"
          htmlFor="ct-body"
          aside={<span className={cn('tabular', body.length > 2200 && 'font-semibold text-danger')}>{body.length} / 2.200 (Instagram)</span>}
          hint="Platzhalter in {geschweiften Klammern} – z. B. {Name}, {Datum}, {Link}."
        >
          <Textarea
            id="ct-body"
            rows={9}
            className="min-h-52"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={'Neu im Shop: {Name} ☕\n\nIn der Tasse: {3 Aromen}\n\n→ roestbrueder.com'}
          />
        </Field>
        {ph.length ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
            <span>Erkannte Platzhalter:</span>
            {ph.map((p) => (
              <mark key={p} className="rounded bg-accent-soft px-1 py-0.5 text-accent-text">
                {p}
              </mark>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Markenstimme (statisch)
// ---------------------------------------------------------------------------

const VALUES = [
  { title: 'Handwerk', text: 'Wir zeigen, wie Kaffee entsteht – mit Hitze, Zeit und Geduld. Hände, Maschinen, Protokolle.' },
  { title: 'Nähe', text: 'Zwei Cafés, eine Rösterei, echte Menschen. Wir reden, wie wir am Tresen reden.' },
  { title: 'Ehrlichkeit', text: 'Wir sagen, was wir wissen – und was nicht. Keine leeren Superlative, keine Rabattschlachten.' },
]

const TONE_SCALES = [
  { left: 'förmlich', right: 'locker', pos: 88, note: 'Sehr locker – wir duzen. Immer.' },
  { left: 'laut', right: 'ruhig', pos: 66, note: 'Eher ruhig – Begeisterung ja, Ausrufezeichen-Kaskaden nein.' },
  { left: 'Fachsprache', right: 'verständlich', pos: 74, note: 'Fachbegriffe dürfen sein, wir erklären sie im selben Satz.' },
  { left: 'ernst', right: 'humorvoll', pos: 70, note: 'Humorvoll, gern über uns selbst – aber nie albern.' },
]

const DOS = [
  'Duzen und direkt ansprechen: „Was trinkst du heute?“',
  'Konkret statt blumig: Herkunft, Aufbereitung, drei Aromen',
  'Handwerk zeigen: Hände, Röster, echte Menschen, echte Orte',
  'Fachbegriffe kurz erklären („Blooming = den Kaffee atmen lassen“)',
  'Die Brüder dürfen sich necken – Humor über uns, nie über Gäste',
  'Eine klare Handlung pro Post: Shop, Workshop, vorbeikommen',
  'Weimar-Bezug: Herderplatz, Altstadt, Wetter, Stadt-Events',
]

const DONTS = [
  'Rabatt-Geschrei & künstliche Verknappung („Nur heute!!!“)',
  'Leere Superlative: „bester Kaffee der Welt“, „premium“',
  'Kaffee-Snobismus – niemand wird für Kapselkaffee belächelt',
  'Nachhaltigkeits-Claims ohne Beleg',
  'Stockfotos oder KI-Bilder von Kaffee, den wir nicht haben',
  'Hashtag-Wände und mehr als drei Emojis pro Post',
  'Politische Statements ohne Bezug zu Kaffee, Team oder Weimar',
]

const WORDING = [
  { say: 'Rohkaffee direkt von kleinen Importeuren', not: 'exotische Bohnen' },
  { say: 'Kaffee-Abo', not: 'Subscription' },
  { say: 'frisch geröstet', not: 'premium' },
  { say: 'handgeröstet in Weimar', not: 'Manufaktur-Erlebnis' },
  { say: 'nach Nougat & Haselnuss', not: 'vollmundiges Aroma' },
  { say: 'Workshop, Kurs', not: 'Masterclass' },
  { say: 'fair bezahlt – mit Zahlen', not: 'nachhaltig (ohne Beleg)' },
  { say: 'du', not: 'Sie' },
]

const EMOJI_OK = [
  { e: '☕', label: 'Kaffee' },
  { e: '🫘', label: 'Bohne' },
  { e: '🔥', label: 'Röstung' },
  { e: '👋', label: 'Hallo' },
  { e: '📍', label: 'Ort' },
  { e: '🔖', label: 'Speichern' },
]
const EMOJI_NO = [
  { e: '💯', label: 'Hype' },
  { e: '🤑', label: 'Geld' },
  { e: '🚀', label: 'Start-up' },
  { e: '‼️', label: 'Druck' },
]

const PHOTO_STYLE: { tone: MediaTone; title: string; text: string }[] = [
  { tone: 'kupfer', title: 'Warm', text: 'Kupfer, Holz, Crema-Töne' },
  { tone: 'sonne', title: 'Natürliches Licht', text: 'Fenster & Terrasse, kein Blitz' },
  { tone: 'crema', title: 'Hände', text: 'Mahlen, Gießen, Einschenken' },
  { tone: 'espresso', title: 'Dampf', text: 'Bewegung, Crema, Aufguss' },
  { tone: 'salbei', title: 'Der Röster', text: 'Trommel, Kühlsieb, Protokoll' },
  { tone: 'nacht', title: 'Weimar-Altstadt', text: 'Herderplatz, Gassen, Laternen' },
]

const MANDATORY = [
  {
    title: 'Werbung kennzeichnen',
    text: '„Werbung“ oder „Anzeige“ gut sichtbar am Anfang – bei Kooperationen, Gratis-Produkten & Influencer-Posts. Zusätzlich das Partnerschafts-Label der Plattform nutzen.',
  },
  { title: 'Impressum in der Bio', text: 'Link zu roestbrueder.com/impressum – auf jedem geschäftlichen Profil, max. zwei Klicks entfernt.' },
  { title: 'Gewinnspiele', text: 'Teilnahmebedingungen verlinken und klarstellen, dass die Plattform nicht beteiligt ist.' },
  { title: 'Menschen im Bild', text: 'Gäste & Team vorher fragen – bei Kindern immer die Eltern. Im Zweifel: nicht erkennbar zeigen.' },
  { title: 'Musik', text: 'Nur Sounds aus der kommerziellen Bibliothek der Plattform – Charts-Songs sind für Unternehmen tabu.' },
]

const NAMES = [
  { name: 'Dörte', line: '„Dörte ist wieder da.“', note: 'Wie eine gute Bekannte, die zurückkommt – nie „die Sorte Dörte“.' },
  { name: 'Jörg', line: '„Jörg hat heute Frühschicht.“', note: 'Kaffees handeln, haben Launen und Termine – das macht sie greifbar.' },
  { name: 'Bergböe', line: '„Bergböe: kräftig, rund, mit Nachhall.“', note: 'Charakter in drei Worten – so beschreiben wir auch Menschen.' },
  { name: 'Hausbrüh', line: '„Hausbrüh läuft in Siebträger und Mokkakanne.“', note: 'Unser Espresso-Blend 80/20 – der verlässliche Mitbewohner.' },
]

function VoiceTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <MediaThumb tone="espresso" className="flex flex-col justify-between rounded-2xl p-6 shadow-soft md:p-8 lg:col-span-3" label="Markenkern">
          <div className="relative">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase opacity-70">Markenkern</p>
            <Quote className="mt-4 size-7 opacity-40" aria-hidden />
            <p className="mt-2 font-display text-2xl leading-snug font-semibold md:text-[32px] md:leading-tight">
              Handgeröstet in Weimar. Direkt gehandelt. Von Brüdern gemacht.
            </p>
          </div>
          <dl className="relative mt-8 grid gap-5 sm:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title}>
                <dt className="text-sm font-semibold">{v.title}</dt>
                <dd className="mt-1 text-xs leading-relaxed opacity-75">{v.text}</dd>
              </div>
            ))}
          </dl>
        </MediaThumb>

        <Card className="lg:col-span-2">
          <CardHeader icon={<Mic className="size-4" />} title="Tonalität" subtitle="Wir schreiben, wie Collin & Vincent am Tresen reden – nur ohne Füllwörter." />
          <ul className="space-y-5 px-5 pb-5">
            {TONE_SCALES.map((s) => (
              <li key={s.left}>
                <div className="flex justify-between text-xs">
                  <span className={cn(s.pos < 50 ? 'font-semibold text-ink' : 'text-ink-3')}>{s.left}</span>
                  <span className={cn(s.pos >= 50 ? 'font-semibold text-ink' : 'text-ink-3')}>{s.right}</span>
                </div>
                <div className="relative mt-2 h-1.5 rounded-full bg-surface-2" role="img" aria-label={`${s.left} bis ${s.right}: ${s.note}`}>
                  {[25, 50, 75].map((t) => (
                    <span key={t} className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-line-strong" style={{ left: `${t}%` }} aria-hidden />
                  ))}
                  <span className="absolute inset-y-0 left-0 rounded-full bg-accent/35" style={{ width: `${s.pos}%` }} aria-hidden />
                  <span
                    className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent shadow-soft"
                    style={{ left: `${s.pos}%` }}
                    aria-hidden
                  />
                </div>
                <p className="mt-2 text-[11px] text-ink-3">{s.note}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="grid md:grid-cols-2">
          <div className="p-5 md:border-r md:border-line">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <CircleCheck className="size-4 text-success" aria-hidden /> So klingen wir
            </h2>
            <ul className="mt-3 space-y-2.5">
              {DOS.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-ink-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-line p-5 md:border-t-0">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <CircleX className="size-4 text-danger" aria-hidden /> So klingen wir nicht
            </h2>
            <ul className="mt-3 space-y-2.5">
              {DONTS.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-ink-2">
                  <Ban className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-3">
          <CardHeader icon={<FileText className="size-4" />} title="Wording" subtitle="Kleine Worte, großer Unterschied" />
          <div className="overflow-x-auto px-5 pb-4">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-[11px] text-ink-3">
                  <th scope="col" className="pb-2 font-medium">
                    Wir sagen
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    statt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {WORDING.map((w) => (
                  <tr key={w.say}>
                    <td className="py-2.5 pr-4 font-medium text-ink">
                      <span className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        {w.say}
                      </span>
                    </td>
                    <td className="py-2.5 text-ink-3">
                      <span className="line-through decoration-danger/60 decoration-1">{w.not}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader icon={<Smile className="size-4" />} title="Emoji-Guide" subtitle="Maximal drei pro Post – am Zeilenende, nie als Wortersatz." />
          <div className="space-y-4 px-5 pb-5">
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Gern</p>
              <ul className="grid grid-cols-3 gap-2">
                {EMOJI_OK.map((x) => (
                  <li key={x.label} className="flex flex-col items-center rounded-xl bg-surface-2/70 py-2.5">
                    <span className="text-2xl leading-none" aria-hidden>
                      {x.e}
                    </span>
                    <span className="mt-1.5 text-[11px] text-ink-2">{x.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Lieber nicht</p>
              <ul className="grid grid-cols-4 gap-2">
                {EMOJI_NO.map((x) => (
                  <li key={x.label} className="relative flex flex-col items-center rounded-xl border border-dashed border-line-strong py-2.5">
                    <span className="text-2xl leading-none opacity-45 grayscale" aria-hidden>
                      {x.e}
                    </span>
                    <span className="mt-1.5 text-[11px] text-ink-3">{x.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-ink-3">Wirkt nach Verkaufsdruck – passt nicht zu handgeröstet.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader icon={<Camera className="size-4" />} title="Foto-Stil" subtitle="Warm, echt, nah dran – man soll den Kaffee fast riechen." />
          <div className="px-5 pb-5">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PHOTO_STYLE.map((p) => (
                <li key={p.title}>
                  <MediaThumb tone={p.tone} className="flex aspect-[4/3] flex-col justify-end rounded-xl p-3" label={p.title}>
                    <p className="relative text-sm font-semibold">{p.title}</p>
                    <p className="relative text-[11px] leading-snug opacity-80">{p.text}</p>
                  </MediaThumb>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-2 text-xs text-ink-2">
              <Ban className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden />
              <span>
                <span className="font-semibold text-ink">Nicht:</span> kalte Blitzfotos, Stockbilder, starke Filter, leere Tassen ohne
                Kontext.
              </span>
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader icon={<ShieldCheck className="size-4" />} title="Pflicht-Angaben" subtitle="Damit kein Post Ärger macht" />
          <ul className="space-y-3 px-5 pb-4">
            {MANDATORY.map((m) => (
              <li key={m.title} className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-ink">{m.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{m.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[11px] text-ink-3">Keine Rechtsberatung – im Zweifel kurz prüfen lassen.</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="border-b border-line bg-accent-soft/50 p-6 lg:border-r lg:border-b-0">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-accent-text uppercase">Unser Erkennungszeichen</p>
            <h2 className="mt-2 font-display text-2xl leading-tight font-semibold text-ink">Jede Bohne hat einen Namen.</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Wir sprechen über unsere Kaffees wie über Menschen: mit Vornamen, Charakter und Geschichte. Keine Anführungszeichen, kein
              „Sorte“ davor.
            </p>
          </div>
          <ul className="grid gap-px bg-line sm:grid-cols-2">
            {NAMES.map((n) => (
              <li key={n.name} className="bg-surface p-5">
                <p className="font-display text-xl font-semibold text-ink">{n.name}</p>
                <p className="mt-1 text-sm text-ink-2 italic">{n.line}</p>
                <p className="mt-2 text-xs leading-relaxed text-ink-3">{n.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formate & Serien
// ---------------------------------------------------------------------------

interface Series {
  id: string
  name: string
  pitch: string
  pillar: Pillar
  platforms: Platform[]
  format: PostFormat
  formatLabel: string
  frequency: string
  length: string
  effort: Idea['effort']
  outline: string[]
}

const SERIES: Series[] = [
  {
    id: 'bohne-der-woche',
    name: 'Bohne der Woche',
    pitch: 'Ein Kaffee, ein Karussell: Herkunft, Geschmack und die Geschichte hinter dem Namen.',
    pillar: 'bohne',
    platforms: ['instagram', 'facebook'],
    format: 'carousel',
    formatLabel: 'Karussell',
    frequency: 'wöchentlich, Di 7:30',
    length: '5–7 Slides',
    effort: 'M',
    outline: [
      'Cover: Name groß + Tasse im Morgenlicht',
      'Herkunft: Land, Region, Importpartner',
      'Aufbereitung & Röstgrad in einem Satz',
      'In der Tasse: drei Aromen, ehrlich beschrieben',
      'Warum der Name? Kurze Anekdote',
      'CTA: im Shop & in beiden Cafés',
    ],
  },
  {
    id: 'roestprotokoll',
    name: 'Röstprotokoll',
    pitch: 'Collin am Röster: eine Charge, eine Entscheidung, ein Ergebnis. Handwerk zum Zuschauen.',
    pillar: 'roesten',
    platforms: ['instagram', 'tiktok', 'youtube'],
    format: 'reel',
    formatLabel: 'Reel',
    frequency: 'alle 2 Wochen',
    length: '30–45 Sek.',
    effort: 'M',
    outline: [
      'Hook: Rohkaffee rauscht in die Trommel (Ton an!)',
      'Kurve & Temperatur als Overlay',
      'Der First Crack – Nahaufnahme',
      'Auswurf aufs Kühlsieb',
      'Fazit von Collin in einem Satz',
    ],
  },
  {
    id: 'bruederzwist',
    name: 'Brüderzwist',
    pitch: 'Collin vs. Vincent im Brüh-Duell – gleiche Bohne, andere Methode, die Community entscheidet.',
    pillar: 'brueder',
    platforms: ['instagram', 'tiktok'],
    format: 'reel',
    formatLabel: 'Reel / TikTok',
    frequency: 'alle 2 Wochen',
    length: '45–60 Sek.',
    effort: 'M',
    outline: [
      'Kampfansage im Split-Screen',
      'Gleiche Bohne, gleiche Zeit, zwei Methoden',
      'Blindverkostung durch Gast oder Team',
      'Abstimmung in den Kommentaren',
      'Auflösung in der Story – nächste Runde ankündigen',
    ],
  },
  {
    id: 'weimar-am-morgen',
    name: 'Weimar am Morgen',
    pitch: 'Die Stadt wacht auf, die Mühle läuft warm – ruhige Story-Momente aus Altstadt und Espressobar.',
    pillar: 'cafe',
    platforms: ['instagram'],
    format: 'story',
    formatLabel: 'Story',
    frequency: '2× pro Woche',
    length: '3–5 Frames',
    effort: 'S',
    outline: [
      'Altstadt-Motiv vor Öffnung',
      'Erster Shot des Tages',
      'Tagesfrage oder Umfrage-Sticker',
      'Standort-Sticker Espressobar / Rösterei',
    ],
  },
  {
    id: 'frag-den-roester',
    name: 'Frag den Röster',
    pitch: 'Die Community fragt, Collin antwortet am Röster – aus Story-Fragen werden kurze Reels.',
    pillar: 'roesten',
    platforms: ['instagram', 'tiktok'],
    format: 'story',
    formatLabel: 'Story-Q&A → Reel',
    frequency: 'monatlich',
    length: '3 Antworten à 20–30 Sek.',
    effort: 'S',
    outline: [
      'Montag: Fragen-Sticker in der Story',
      'Die drei besten Fragen auswählen',
      'Antworten am Röster – je ein Take',
      'Als Reel-Serie posten + Story-Highlight',
    ],
  },
  {
    id: 'namensgeber',
    name: 'Namensgeber',
    pitch: 'Wer ist eigentlich Dörte? Die (wahren oder erfundenen) Geschichten hinter unseren Kaffeenamen.',
    pillar: 'bohne',
    platforms: ['instagram', 'tiktok'],
    format: 'reel',
    formatLabel: 'Reel',
    frequency: 'monatlich',
    length: '30–40 Sek.',
    effort: 'M',
    outline: [
      'Wiedererkennbares Intro: „Wer ist eigentlich …?“',
      'Die Anekdote zur Namensgebung',
      'Tasse + Geschmacksprofil',
      'Frage an die Community: Welcher Name fehlt noch?',
    ],
  },
  {
    id: 'fehler-fix',
    name: 'Fehler-Fix in 20 Sekunden',
    pitch: 'Sauer, bitter, wässrig? Ein Fehler, eine Ursache, ein Fix – Brüh-Wissen zum Speichern.',
    pillar: 'bruehen',
    platforms: ['tiktok', 'instagram', 'youtube', 'pinterest'],
    format: 'video',
    formatLabel: 'TikTok / Kurzvideo',
    frequency: 'wöchentlich',
    length: '15–20 Sek.',
    effort: 'S',
    outline: [
      'Fehler zeigen: „Dein Kaffee ist sauer?“',
      'Die Ursache in einem Satz',
      'Den Fix vorführen',
      'Rezept als Text-Overlay zum Speichern',
    ],
  },
  {
    id: 'roestbrueder-post',
    name: 'Röstbrüder Post',
    pitch: 'Der Newsletter: eine Mail im Monat mit allem, was in Rösterei und Cafés passiert.',
    pillar: 'shop',
    platforms: ['newsletter'],
    format: 'text',
    formatLabel: 'Newsletter',
    frequency: 'monatlich',
    length: '1 Mail · 4 Blöcke',
    effort: 'M',
    outline: ['Bohne des Monats', 'Brüh-Tipp der Saison', 'Termine: Workshops & Cupping', 'Abo-Vorteil für Leser:innen'],
  },
]

function SeriesTab() {
  const ideas = useStore((s) => s.ideas)
  const upsertIdea = useStore((s) => s.upsertIdea)
  const navigate = useNavigate()

  const adopt = (s: Series) => {
    const title = `Serie: ${s.name}`
    const exists = ideas.some((i) => i.title === title)
    if (exists) {
      toast({ title: 'Steht schon im Ideen-Backlog', description: title, action: { label: 'Ansehen', run: () => navigate('/ideen') } })
      return
    }
    upsertIdea({
      id: uid('idea'),
      title,
      description: `${s.pitch} (${s.frequency}, ${s.length}) – Ablauf: ${s.outline.join(' → ')}`,
      pillar: s.pillar,
      platforms: s.platforms,
      format: s.format,
      effort: s.effort,
      votes: 0,
      keyDateId: null,
      createdAt: new Date().toISOString(),
    })
    toast({ title: 'Als Idee übernommen', description: s.name, tone: 'success', action: { label: 'Ansehen', run: () => navigate('/ideen') } })
  }

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-ink-2">
        Serien sind der Rhythmus eures Feeds: wiedererkennbar, planbar, weniger Denkarbeit pro Post. Übernimm eine Serie in den
        Ideen-Backlog und plane die erste Folge.
      </p>
      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {SERIES.map((s) => {
          const adopted = ideas.some((i) => i.title === `Serie: ${s.name}`)
          return (
            <li key={s.id} className="min-w-0">
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <PillarBadge pillar={s.pillar} />
                  <PlatformStack platforms={s.platforms} />
                </div>
                <h3 className="mt-3 font-display text-lg leading-snug font-semibold text-ink">{s.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">{s.pitch}</p>
                <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line text-xs">
                  {[
                    { k: 'Format', v: s.formatLabel },
                    { k: 'Rhythmus', v: s.frequency },
                    { k: 'Länge', v: s.length },
                  ].map((x) => (
                    <div key={x.k} className="bg-surface-2/70 px-2.5 py-2">
                      <dt className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">{x.k}</dt>
                      <dd className="mt-0.5 leading-snug font-medium text-ink">{x.v}</dd>
                    </div>
                  ))}
                </dl>
                <ol className="relative mt-4 space-y-2">
                  <span className="absolute top-2 bottom-2 left-[9px] w-px bg-line" aria-hidden />
                  {s.outline.map((step, i) => (
                    <li key={step} className="relative flex items-start gap-2.5 text-xs text-ink-2">
                      <span className="relative flex size-[19px] shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[10px] font-semibold text-ink-3 tabular">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-auto flex items-center justify-between gap-2 pt-5">
                  <span className="text-[11px] text-ink-3">{FORMATS[s.format].label}</span>
                  <Button size="sm" variant={adopted ? 'ghost' : 'secondary'} onClick={() => adopt(s)}>
                    {adopted ? <Check className="size-3.5 text-success" /> : <Lightbulb className="size-3.5" />}
                    {adopted ? 'Im Backlog' : 'Als Idee übernehmen'}
                  </Button>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
