import type {
  AdChannel,
  CampaignObjective,
  CampaignStatus,
  KeyDateKind,
  Location,
  MediaTone,
  Pillar,
  Platform,
  PostFormat,
  PostStatus,
} from './types'

export interface PlatformMeta {
  id: Platform
  label: string
  short: string
  /** Diagramm-/Chip-Farbe (validierte Serienfarbe, folgt der Entität) */
  color: string
  charLimit: number | null
  hashtagHint: string
  /** Beste Posting-Zeiten – Annahme, per Analytics validieren */
  bestTimes: { days: number[]; time: string; label: string }[]
  formats: PostFormat[]
}

// Reihenfolge = feste Serien-Reihenfolge der Diagramm-Palette. Nicht umsortieren.
export const PLATFORMS: PlatformMeta[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    short: 'FB',
    color: 'var(--series-1)',
    charLimit: 5000,
    hashtagHint: '1–3 Hashtags reichen',
    bestTimes: [
      { days: [2, 3, 4], time: '09:00', label: 'Di–Do 9:00' },
      { days: [6], time: '10:00', label: 'Sa 10:00' },
    ],
    formats: ['feed', 'carousel', 'reel', 'story', 'video', 'event', 'offer'],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    short: 'IG',
    color: 'var(--series-2)',
    charLimit: 2200,
    hashtagHint: '3–8 präzise Hashtags, max. 30',
    bestTimes: [
      { days: [2, 3, 4], time: '07:30', label: 'Di–Do 7:30 (Kaffee-Routine)' },
      { days: [1, 2, 3, 4, 5], time: '18:30', label: 'Mo–Fr 18:30' },
      { days: [6, 0], time: '09:30', label: 'Sa/So 9:30' },
    ],
    formats: ['feed', 'carousel', 'reel', 'story'],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    short: 'TT',
    color: 'var(--series-3)',
    charLimit: 4000,
    hashtagHint: '3–5 Hashtags, Suchbegriffe in den Text',
    bestTimes: [
      { days: [1, 2, 3, 4, 5], time: '12:00', label: 'Mittagspause 12:00' },
      { days: [0, 1, 2, 3, 4, 5, 6], time: '19:30', label: 'Abends 19:30' },
    ],
    formats: ['video', 'reel', 'carousel'],
  },
  {
    id: 'google',
    label: 'Google Unternehmensprofil',
    short: 'G',
    color: 'var(--series-4)',
    charLimit: 1500,
    hashtagHint: 'Keine Hashtags – lokale Keywords nutzen',
    bestTimes: [{ days: [1, 4], time: '08:00', label: 'Mo & Do 8:00' }],
    formats: ['feed', 'offer', 'event'],
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    short: 'P',
    color: 'var(--series-5)',
    charLimit: 500,
    hashtagHint: 'Keywords im Titel & Text statt Hashtags',
    bestTimes: [{ days: [0, 5, 6], time: '20:00', label: 'Fr–So 20:00' }],
    formats: ['feed', 'video'],
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    short: 'NL',
    color: 'var(--series-6)',
    charLimit: null,
    hashtagHint: 'Keine Hashtags – eine klare Handlung pro Mail',
    bestTimes: [
      { days: [4], time: '07:00', label: 'Do 7:00' },
      { days: [0], time: '09:00', label: 'So 9:00' },
    ],
    formats: ['text', 'offer', 'event'],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    short: 'IN',
    color: 'var(--series-7)',
    charLimit: 3000,
    hashtagHint: '3–5 Hashtags, B2B-Ton',
    bestTimes: [{ days: [2, 3, 4], time: '08:00', label: 'Di–Do 8:00' }],
    formats: ['feed', 'carousel', 'video', 'text'],
  },
  {
    id: 'youtube',
    label: 'YouTube Shorts',
    short: 'YT',
    color: 'var(--series-8)',
    charLimit: 5000,
    hashtagHint: '#shorts + 2–3 Themen-Hashtags',
    bestTimes: [{ days: [5, 6, 0], time: '17:00', label: 'Fr–So 17:00' }],
    formats: ['video', 'reel'],
  },
]

export const PLATFORM: Record<Platform, PlatformMeta> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p]),
) as Record<Platform, PlatformMeta>

export const FORMATS: Record<PostFormat, { label: string; ratio: string }> = {
  feed: { label: 'Feed-Post', ratio: '4:5' },
  carousel: { label: 'Karussell', ratio: '4:5' },
  reel: { label: 'Reel', ratio: '9:16' },
  story: { label: 'Story', ratio: '9:16' },
  video: { label: 'Kurzvideo', ratio: '9:16' },
  text: { label: 'Text / Mail', ratio: '—' },
  offer: { label: 'Angebot', ratio: '1:1' },
  event: { label: 'Event', ratio: '16:9' },
}

export const STATUSES: { id: PostStatus; label: string; color: string; hint: string }[] = [
  { id: 'idea', label: 'Idee', color: '#8a7666', hint: 'Roher Gedanke, noch kein Inhalt' },
  { id: 'draft', label: 'Entwurf', color: '#5b7fa6', hint: 'Text & Material in Arbeit' },
  { id: 'review', label: 'Review', color: '#c98a1a', hint: 'Wartet auf Freigabe' },
  { id: 'approved', label: 'Freigegeben', color: '#4f9a6a', hint: 'Bereit zum Einplanen' },
  { id: 'scheduled', label: 'Geplant', color: '#c4702f', hint: 'Termin steht' },
  { id: 'published', label: 'Veröffentlicht', color: '#7a5540', hint: 'Live – Zahlen nachtragen' },
]

export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.id, s])) as Record<
  PostStatus,
  (typeof STATUSES)[number]
>

export const PILLARS: { id: Pillar; label: string; color: string; description: string; share: number }[] = [
  {
    id: 'bohne',
    label: 'Bohne & Herkunft',
    color: '#8a5634',
    description: 'Farmen, Importpartner, Ernte, warum jede Bohne einen Namen trägt.',
    share: 20,
  },
  {
    id: 'roesten',
    label: 'Röst-Handwerk',
    color: '#c4702f',
    description: 'Röstprofile, Röster in Aktion, Cupping, Qualität – Handwerk sichtbar machen.',
    share: 15,
  },
  {
    id: 'cafe',
    label: 'Café-Leben Weimar',
    color: '#3f7cac',
    description: 'Rösterei-Café & Espressobar am Herderplatz, Gäste, Terrasse, Altstadt-Momente.',
    share: 20,
  },
  {
    id: 'bruehen',
    label: 'Brüh-Wissen',
    color: '#2f8f7a',
    description: 'Brühanleitungen, Rezepte, Fehler-Fixes, Equipment – Nutzwert für Home-Baristas.',
    share: 15,
  },
  {
    id: 'brueder',
    label: 'Die Brüder & Team',
    color: '#a2465e',
    description: 'Collin, Vincent & Team – Persönlichkeit, Humor, Behind the Scenes.',
    share: 10,
  },
  {
    id: 'events',
    label: 'Events & Workshops',
    color: '#b8860b',
    description: 'Barista-Workshops, Cuppings, Stadt-Events, Kooperationen.',
    share: 10,
  },
  {
    id: 'shop',
    label: 'Shop & Abo',
    color: '#4f7049',
    description: 'Kaffee-Abo, Neuheiten, Geschenke, Angebote – klarer Call-to-Action.',
    share: 10,
  },
]

export const PILLAR = Object.fromEntries(PILLARS.map((p) => [p.id, p])) as Record<Pillar, (typeof PILLARS)[number]>

export const LOCATIONS: Record<Location, { label: string; detail: string }> = {
  roesterei: { label: 'Rösterei & Café', detail: 'Richard-Wagner-Str. 17' },
  espressobar: { label: 'Espressobar', detail: 'Kaufstraße 19 · Herderplatz' },
  online: { label: 'Online-Shop', detail: 'roestbrueder.com' },
  extern: { label: 'Extern / Event', detail: 'Unterwegs in Weimar' },
}

export const OBJECTIVES: Record<CampaignObjective, { label: string; kpi: string; description: string }> = {
  awareness: { label: 'Bekanntheit', kpi: 'Reichweite & CPM', description: 'Neue Menschen in Weimar & Umgebung erreichen' },
  traffic: { label: 'Traffic', kpi: 'Klicks & CPC', description: 'Besucher auf roestbrueder.com bringen' },
  sales: { label: 'Verkäufe', kpi: 'ROAS & CPA', description: 'Shop-Bestellungen & Abo-Abschlüsse' },
  visits: { label: 'Café-Besuche', kpi: 'Routen & Anrufe', description: 'Menschen in Rösterei & Espressobar holen' },
  leads: { label: 'Buchungen & Leads', kpi: 'Kosten pro Buchung', description: 'Workshops, Gastro- & Büro-Anfragen' },
  engagement: { label: 'Interaktion', kpi: 'Interaktionsrate', description: 'Community aufbauen, Gespräche anstoßen' },
}

export interface AdChannelMeta {
  id: AdChannel
  label: string
  color: string
  paid: boolean
}

// Reihenfolge = Stapel-/Serienreihenfolge in Diagrammen. Nicht umsortieren.
export const AD_CHANNELS: AdChannelMeta[] = [
  { id: 'meta', label: 'Meta Ads (IG/FB)', color: 'var(--series-1)', paid: true },
  { id: 'influencer', label: 'Influencer & Kooperation', color: 'var(--series-2)', paid: true },
  { id: 'tiktok', label: 'TikTok Ads', color: 'var(--series-3)', paid: true },
  { id: 'google', label: 'Google Ads', color: 'var(--series-4)', paid: true },
  { id: 'pinterest', label: 'Pinterest Ads', color: 'var(--series-5)', paid: true },
  { id: 'local', label: 'Lokal Weimar', color: 'var(--series-6)', paid: true },
  { id: 'email', label: 'E-Mail & CRM', color: 'var(--series-7)', paid: false },
  { id: 'print', label: 'Print & POS', color: 'var(--series-8)', paid: true },
]

export const AD_CHANNEL = Object.fromEntries(AD_CHANNELS.map((c) => [c.id, c])) as Record<AdChannel, AdChannelMeta>

export const CAMPAIGN_STATUSES: Record<CampaignStatus, { label: string; tone: 'neutral' | 'success' | 'warning' | 'muted' }> = {
  planned: { label: 'Geplant', tone: 'neutral' },
  active: { label: 'Aktiv', tone: 'success' },
  paused: { label: 'Pausiert', tone: 'warning' },
  completed: { label: 'Abgeschlossen', tone: 'muted' },
}

export const MEDIA_TONES: Record<MediaTone, { label: string; from: string; to: string; ink: string }> = {
  espresso: { label: 'Espresso', from: '#2b1b12', to: '#5b3a29', ink: '#f3e6d6' },
  crema: { label: 'Crema', from: '#f1e2cf', to: '#d9b38c', ink: '#3b2519' },
  kupfer: { label: 'Kupfer', from: '#e0924f', to: '#9c4f1c', ink: '#fff5ea' },
  salbei: { label: 'Salbei', from: '#a8bda0', to: '#4f7049', ink: '#f4f8f1' },
  nacht: { label: 'Altstadt-Nacht', from: '#2c3448', to: '#141824', ink: '#f0e6d8' },
  sonne: { label: 'Terrasse', from: '#f6d58e', to: '#e38b3c', ink: '#3b2112' },
}

export const KEYDATE_KINDS: Record<KeyDateKind, { label: string; color: string }> = {
  kaffee: { label: 'Kaffee', color: '#8a5634' },
  weimar: { label: 'Weimar', color: '#3f7cac' },
  handel: { label: 'Handel', color: '#c4702f' },
  feiertag: { label: 'Feiertag', color: '#4f7049' },
  intern: { label: 'Röstbrüder', color: '#a2465e' },
}

export const DEFAULT_CHECKLIST = [
  'Foto/Video final & im richtigen Format',
  'Caption Korrektur gelesen',
  'Hashtags, Standort & Markierungen',
  'Link mit UTM-Parametern',
  'Freigabe durch Collin oder Vincent',
]

export const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
