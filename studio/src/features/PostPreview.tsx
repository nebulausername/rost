import { Bookmark, Globe2, Heart, MessageCircle, MoreHorizontal, Music2, Send, Share2, ThumbsUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { MediaThumb, PlatformIcon } from '../components/domain'
import { Segmented } from '../components/ui/primitives'
import { FORMATS, LOCATIONS, PLATFORM } from '../lib/constants'
import type { Platform, Post } from '../lib/types'
import { cn, formatDe } from '../lib/utils'

type Draft = Pick<Post, 'title' | 'caption' | 'platforms' | 'format' | 'hashtags' | 'mediaUrl' | 'mediaTone' | 'location' | 'scheduledAt' | 'link'>

function BrandAvatar({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#1c130e] ring-2 ring-[#c4702f]/60" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" style={{ width: size * 0.62, height: size * 0.62 }} aria-hidden>
        <g transform="rotate(-30 32 32)">
          <ellipse cx="32" cy="32" rx="15" ry="21" fill="#C4702F" />
          <path d="M32 12c-5 7 5 13 0 20s5 13 0 20" fill="none" stroke="#1C130E" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      </svg>
    </span>
  )
}

function CaptionText({ text, tags, clamp }: { text: string; tags: string[]; clamp?: boolean }) {
  const [open, setOpen] = useState(false)
  const full = [text.trim(), tags.join(' ')].filter(Boolean).join('\n\n')
  if (!full) return <p className="text-[13px] text-neutral-400 italic">Hier erscheint deine Caption …</p>
  const parts = full.split(/(#[\p{L}\p{N}_]+|@[\w.]+)/gu)
  return (
    <div className="relative">
      <p className={cn('text-[13px] leading-[1.45] whitespace-pre-line', clamp && !open && 'line-clamp-3')}>
        {parts.map((p, i) =>
          p.startsWith('#') || p.startsWith('@') ? (
            <span key={i} className="text-[#2f5d8a]">
              {p}
            </span>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </p>
      {clamp && !open && full.length > 140 ? (
        <button onClick={() => setOpen(true)} className="text-[13px] text-neutral-500">
          … mehr
        </button>
      ) : null}
    </div>
  )
}

function PhoneFrame({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className={cn('mx-auto w-full max-w-[340px] overflow-hidden rounded-[28px] border-[6px] shadow-lift', dark ? 'border-[#0b0806] bg-black text-white' : 'border-[#0b0806] bg-white text-neutral-900')}>
      <div className={cn('flex h-6 items-center justify-between px-5 text-[10px] font-semibold', dark ? 'text-white/80' : 'text-neutral-800')}>
        <span>9:41</span>
        <span className="h-3.5 w-16 rounded-full bg-[#0b0806]" />
        <span>●●● 100%</span>
      </div>
      {children}
    </div>
  )
}

function InstagramFeed({ d }: { d: Draft }) {
  const carousel = d.format === 'carousel'
  return (
    <PhoneFrame>
      <div className="flex items-center gap-2.5 px-3 py-2">
        <BrandAvatar size={30} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[13px] font-semibold">roestbrueder</p>
          <p className="truncate text-[11px] text-neutral-500">{d.location === 'online' ? 'Weimar' : LOCATIONS[d.location].detail}</p>
        </div>
        <MoreHorizontal className="size-4 text-neutral-600" />
      </div>
      <MediaThumb url={d.mediaUrl} tone={d.mediaTone} className="aspect-[4/5] w-full">
        {!d.mediaUrl ? <PreviewOverlay title={d.title} /> : null}
        {carousel ? <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">1/5</span> : null}
      </MediaThumb>
      <div className="px-3 pt-2.5 pb-4">
        <div className="flex items-center gap-3.5">
          <Heart className="size-5" />
          <MessageCircle className="size-5" />
          <Send className="size-5" />
          {carousel ? (
            <span className="mx-auto flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={cn('size-1.5 rounded-full', i === 0 ? 'bg-[#3897f0]' : 'bg-neutral-300')} />
              ))}
            </span>
          ) : null}
          <Bookmark className="ml-auto size-5" />
        </div>
        <p className="mt-2 text-[13px] font-semibold">Gefällt deiner Community</p>
        <div className="mt-1">
          <span className="mr-1 text-[13px] font-semibold">roestbrueder</span>
          <CaptionText text={d.caption} tags={d.hashtags} clamp />
        </div>
        <p className="mt-1.5 text-[10px] tracking-wide text-neutral-400 uppercase">{formatDe(d.scheduledAt, 'd. MMMM')}</p>
      </div>
    </PhoneFrame>
  )
}

function PreviewOverlay({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end p-5">
      <p className="text-[10px] font-semibold tracking-[0.2em] uppercase opacity-70">Röstbrüder · Weimar</p>
      <p className="mt-1 font-display text-2xl leading-tight font-semibold">{title || 'Dein nächster Post'}</p>
    </div>
  )
}

function VerticalVideo({ d, platform }: { d: Draft; platform: Platform }) {
  const story = d.format === 'story'
  const tiktok = platform === 'tiktok'
  return (
    <PhoneFrame dark>
      <MediaThumb url={d.mediaUrl} tone={d.mediaTone} className="aspect-[9/16] w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
        {story ? (
          <div className="absolute inset-x-3 top-2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn('h-0.5 flex-1 rounded-full', i === 0 ? 'bg-white' : 'bg-white/40')} />
            ))}
          </div>
        ) : null}
        <div className="absolute top-5 left-3 flex items-center gap-2 text-white">
          <BrandAvatar size={26} />
          <span className="text-[12px] font-semibold">roestbrueder</span>
          <span className="text-[11px] text-white/70">{story ? '2 Std.' : ''}</span>
        </div>
        {!d.mediaUrl ? (
          <div className="absolute inset-x-6 top-1/3 text-center text-white">
            <p className="font-display text-2xl leading-tight font-semibold drop-shadow">{d.title || 'Hook in 3 Sekunden'}</p>
          </div>
        ) : null}
        {!story ? (
          <div className="absolute right-2.5 bottom-24 flex flex-col items-center gap-4 text-white">
            <Heart className="size-6" />
            <MessageCircle className="size-6" />
            {tiktok ? <Bookmark className="size-6" /> : <Send className="size-6" />}
            <Share2 className="size-6" />
          </div>
        ) : null}
        <div className="absolute inset-x-3 bottom-3 text-white">
          {story ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 rounded-full border border-white/60 px-3 py-2 text-[12px] text-white/80">Nachricht senden …</span>
              <Heart className="size-5" />
              <Send className="size-5" />
            </div>
          ) : (
            <>
              <p className="text-[12px] font-semibold">@roestbrueder</p>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-white/90">
                {d.caption || 'Caption …'} <span className="font-semibold">{d.hashtags.slice(0, 3).join(' ')}</span>
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/80">
                <Music2 className="size-3" /> Originalton – roestbrueder
              </p>
            </>
          )}
        </div>
      </MediaThumb>
    </PhoneFrame>
  )
}

function FacebookPost({ d, linkedin }: { d: Draft; linkedin?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-lift">
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <BrandAvatar size={38} />
        <div className="leading-tight">
          <p className="text-[14px] font-semibold">Röstbrüder – Kaffeerösterei & Cafés</p>
          <p className="flex items-center gap-1 text-[11px] text-neutral-500">
            {linkedin ? 'Kaffeerösterei · Weimar' : formatDe(d.scheduledAt, "d. MMMM 'um' HH:mm")} · <Globe2 className="size-3" />
          </p>
        </div>
      </div>
      <div className="px-3.5 py-2.5">
        <CaptionText text={d.caption} tags={d.hashtags.slice(0, linkedin ? 5 : 3)} clamp />
      </div>
      <MediaThumb url={d.mediaUrl} tone={d.mediaTone} className="aspect-[1.91/1] w-full">
        {!d.mediaUrl ? <PreviewOverlay title={d.title} /> : null}
      </MediaThumb>
      {d.link ? (
        <div className="border-b border-neutral-200 bg-neutral-50 px-3.5 py-2">
          <p className="text-[11px] text-neutral-500 uppercase">roestbrueder.com</p>
          <p className="truncate text-[13px] font-semibold">{d.title}</p>
        </div>
      ) : null}
      <div className="flex justify-around border-t border-neutral-200 py-1.5 text-[12px] font-medium text-neutral-600">
        <span className="flex items-center gap-1.5">
          <ThumbsUp className="size-4" /> Gefällt mir
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="size-4" /> Kommentieren
        </span>
        <span className="flex items-center gap-1.5">
          <Share2 className="size-4" /> Teilen
        </span>
      </div>
    </div>
  )
}

function GooglePost({ d }: { d: Draft }) {
  const cta = d.format === 'event' ? 'Mehr erfahren' : d.format === 'offer' ? 'Angebot ansehen' : 'Online bestellen'
  return (
    <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-lift">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
        <BrandAvatar size={34} />
        <div className="leading-tight">
          <p className="text-[14px] font-medium">Röstbrüder Weimar</p>
          <p className="text-[11px] text-neutral-500">Kaffeerösterei · Weimar · {formatDe(d.scheduledAt, 'd. MMM')}</p>
        </div>
      </div>
      <MediaThumb url={d.mediaUrl} tone={d.mediaTone} className="aspect-[4/3] w-full">
        {!d.mediaUrl ? <PreviewOverlay title={d.title} /> : null}
      </MediaThumb>
      <div className="px-4 pt-3 pb-4">
        {d.format === 'event' || d.format === 'offer' ? <p className="mb-1 text-[15px] font-medium">{d.title}</p> : null}
        <p className="line-clamp-4 text-[13px] leading-snug whitespace-pre-line text-neutral-700">{d.caption || 'Beschreibung …'}</p>
        <span className="mt-3 inline-flex rounded-full border border-neutral-300 px-4 py-1.5 text-[13px] font-medium text-[#1a73e8]">{cta}</span>
      </div>
    </div>
  )
}

function NewsletterPreview({ d }: { d: Draft }) {
  return (
    <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-lift">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[12px] text-neutral-600">
        <p>
          <span className="text-neutral-400">Von:</span> Röstbrüder Post &lt;hallo@roestbrueder.com&gt;
        </p>
        <p className="mt-0.5 font-semibold text-neutral-900">{d.title || 'Betreffzeile'}</p>
      </div>
      <div className="bg-[#1c130e] px-5 py-4 text-[#f3e6d6]">
        <p className="font-display text-xl font-semibold">Röstbrüder Post</p>
        <p className="text-[11px] tracking-[0.2em] text-[#c9a78e] uppercase">Frisch geröstet aus Weimar</p>
      </div>
      <MediaThumb url={d.mediaUrl} tone={d.mediaTone} className="aspect-[2/1] w-full" />
      <div className="px-5 py-4">
        <p className="text-[13px] leading-relaxed whitespace-pre-line text-neutral-700">{d.caption || 'Inhalt der Mail …'}</p>
        <span className="mt-4 inline-flex rounded-lg bg-[#c4702f] px-4 py-2 text-[13px] font-semibold text-white">Zum Shop</span>
      </div>
    </div>
  )
}

function PinterestPin({ d }: { d: Draft }) {
  return (
    <div className="mx-auto w-full max-w-[260px]">
      <MediaThumb url={d.mediaUrl} tone={d.mediaTone} className="aspect-[2/3] w-full rounded-2xl shadow-lift">
        {!d.mediaUrl ? <PreviewOverlay title={d.title} /> : null}
        <span className="absolute top-3 right-3 rounded-full bg-[#e60023] px-3 py-1.5 text-[12px] font-semibold text-white">Merken</span>
      </MediaThumb>
      <p className="mt-2 line-clamp-2 text-[13px] font-semibold text-ink">{d.title}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
        <BrandAvatar size={18} /> Röstbrüder
      </p>
    </div>
  )
}

export function PostPreview({ draft }: { draft: Draft }) {
  const [sel, setSel] = useState<Platform | null>(null)
  const platform = sel && draft.platforms.includes(sel) ? sel : (draft.platforms[0] ?? 'instagram')
  const vertical = draft.format === 'reel' || draft.format === 'story' || draft.format === 'video'
  let body: ReactNode
  if (platform === 'newsletter') body = <NewsletterPreview d={draft} />
  else if (platform === 'google') body = <GooglePost d={draft} />
  else if (platform === 'pinterest') body = <PinterestPin d={draft} />
  else if (platform === 'tiktok' || platform === 'youtube' || vertical) body = <VerticalVideo d={draft} platform={platform} />
  else if (platform === 'facebook' || platform === 'linkedin') body = <FacebookPost d={draft} linkedin={platform === 'linkedin'} />
  else body = <InstagramFeed d={draft} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-[0.14em] text-ink-3 uppercase">Live-Vorschau</p>
        <span className="text-[11px] text-ink-3">
          {FORMATS[draft.format].label} · {FORMATS[draft.format].ratio}
        </span>
      </div>
      {draft.platforms.length > 1 ? (
        <Segmented
          size="sm"
          label="Vorschau-Kanal"
          value={platform}
          onChange={(v) => setSel(v)}
          className="max-w-full self-start overflow-x-auto"
          options={draft.platforms.map((p) => ({ value: p, label: PLATFORM[p].short, icon: <PlatformIcon platform={p} className="size-3.5" /> }))}
        />
      ) : null}
      <div className="rounded-2xl bg-surface-2 p-4 md:p-6">{body}</div>
      <p className="text-center text-[11px] text-ink-3">Vorschau angenähert – echte Darstellung variiert je nach App-Version.</p>
    </div>
  )
}
