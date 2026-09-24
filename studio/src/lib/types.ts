// Datenmodell von Röstbrüder Studio.
// Bewusst flach & serialisierbar gehalten (localStorage heute, Supabase morgen –
// siehe supabase/migrations für das passende SQL-Schema).

export type Platform =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'google'
  | 'pinterest'
  | 'newsletter'
  | 'linkedin'
  | 'youtube'

export type PostFormat = 'feed' | 'carousel' | 'reel' | 'story' | 'video' | 'text' | 'offer' | 'event'

export type PostStatus = 'idea' | 'draft' | 'review' | 'approved' | 'scheduled' | 'published'

export type Pillar = 'bohne' | 'roesten' | 'cafe' | 'bruehen' | 'brueder' | 'events' | 'shop'

export type Location = 'roesterei' | 'espressobar' | 'online' | 'extern'

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface PostMetrics {
  reach: number
  impressions: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
}

export interface Post {
  id: string
  title: string
  caption: string
  platforms: Platform[]
  format: PostFormat
  status: PostStatus
  pillar: Pillar
  /** ISO-Zeitpunkt der Veröffentlichung (lokal) */
  scheduledAt: string
  location: Location
  assigneeId: string | null
  hashtags: string[]
  /** Daten-URL (komprimiert) oder leer → Farbfläche als Platzhalter */
  mediaUrl?: string
  mediaTone: MediaTone
  campaignId: string | null
  link?: string
  notes: string
  checklist: ChecklistItem[]
  metrics?: PostMetrics
  createdAt: string
  updatedAt: string
}

export type MediaTone = 'espresso' | 'crema' | 'kupfer' | 'salbei' | 'nacht' | 'sonne'

export type CampaignObjective = 'awareness' | 'traffic' | 'sales' | 'visits' | 'leads' | 'engagement'

export type AdChannel = 'meta' | 'influencer' | 'tiktok' | 'google' | 'pinterest' | 'local' | 'email' | 'print'

export type CampaignStatus = 'planned' | 'active' | 'paused' | 'completed'

export interface DailyStat {
  /** yyyy-MM-dd */
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

export interface Campaign {
  id: string
  name: string
  objective: CampaignObjective
  channels: AdChannel[]
  status: CampaignStatus
  /** yyyy-MM-dd */
  startDate: string
  /** yyyy-MM-dd */
  endDate: string
  budget: number
  dailyLimit: number | null
  audience: string
  radiusKm: number | null
  ageMin: number
  ageMax: number
  interests: string[]
  offer: string
  landingUrl: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  targets: { ctr?: number; cpc?: number; cpa?: number; roas?: number }
  /** Tageswerte – manuell gepflegt oder später per API importiert */
  daily: DailyStat[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Idea {
  id: string
  title: string
  description: string
  pillar: Pillar
  platforms: Platform[]
  format: PostFormat
  effort: 'S' | 'M' | 'L'
  votes: number
  keyDateId?: string | null
  createdAt: string
}

export type KeyDateKind = 'kaffee' | 'weimar' | 'handel' | 'feiertag' | 'intern'

export interface KeyDate {
  id: string
  title: string
  kind: KeyDateKind
  /** Regel: fixes Datum ("MM-DD") oder berechnet */
  rule:
    | { type: 'fixed'; md: string; days?: number }
    | { type: 'easter'; offset: number; days?: number }
    | { type: 'nth-weekday'; month: number; weekday: number; n: number; offset?: number; days?: number }
    | { type: 'advent'; offset?: number; days?: number }
  angle: string
  verify?: boolean
}

export interface KeyDateOccurrence {
  keyDate: KeyDate
  start: Date
  end: Date
}

export interface HashtagSet {
  id: string
  name: string
  tags: string[]
}

export interface CaptionTemplate {
  id: string
  name: string
  pillar: Pillar | null
  body: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  initials: string
  color: string
}

export interface ChannelAccount {
  platform: Platform
  handle: string
  connected: boolean
  followers: number
  /** Wöchentliche Follower-Stände (yyyy-MM-dd → Wert) */
  history: { date: string; value: number }[]
}

/** Budgetplan: "yyyy-MM" → Kanal → Euro */
export type BudgetPlan = Record<string, Partial<Record<AdChannel, number>>>

export interface Settings {
  theme: 'system' | 'light' | 'dark'
  calendarColorBy: 'platform' | 'pillar' | 'status'
  monthlyBudgetCap: number
  demoData: boolean
  brandName: string
  /** Erledigte Schritte der Einrichtungs-Checkliste im Cockpit */
  onboardingDone?: string[]
  onboardingHidden?: boolean
}

// ---------------------------------------------------------------------------
// Website (öffentlicher Shop & Inhalte – gepflegt im Studio-Modul „Website“)
// ---------------------------------------------------------------------------

export type BrewMethod = 'espresso' | 'filter' | 'french' | 'moka' | 'vollautomat' | 'aeropress'

export type Grind = 'bohne' | 'espresso' | 'filter' | 'french' | 'moka'

export interface Product {
  id: string
  slug: string
  name: string
  /** Kurzbeschreibung unter dem Namen, z. B. „Espresso-Blend 80/20“ */
  subtitle: string
  kind: 'espresso' | 'filter' | 'omni' | 'gift' | 'voucher'
  origin: string
  region: string
  process: string
  /** 1 = sehr hell … 5 = dunkel */
  roast: number
  notes: string[]
  description: string
  /** Warum heißt der Kaffee so? */
  story: string
  /** Preis 250 g (bzw. Stückpreis bei Geschenken) */
  price: number
  /** Preis 1 kg, falls angeboten */
  priceKg: number | null
  available: boolean
  featured: boolean
  /** Verpackungsfarbe */
  color: string
  brew: BrewMethod[]
  /** Geschmacksprofil 1–5 für den Geschmacksfinder */
  taste: { acidity: number; body: number; sweetness: number; chocolate: number; fruit: number }
  /** Angaben, die noch mit der echten Produktseite abgeglichen werden müssen */
  verify: boolean
}

export interface WorkshopSession {
  id: string
  /** ISO-Zeitpunkt */
  startsAt: string
  seatsTaken: number
}

export interface Workshop {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  learn: string[]
  durationMin: number
  price: number
  capacity: number
  level: 'Einsteiger' | 'Fortgeschritten' | 'Alle'
  location: 'roesterei' | 'espressobar'
  color: string
  sessions: WorkshopSession[]
}

/** Öffnungszeiten je Wochentag (0 = So … 6 = Sa); null = geschlossen */
export type WeekHours = Record<number, { open: string; close: string } | null>

export interface CafeLocation {
  id: 'roesterei' | 'espressobar'
  name: string
  address: string
  tagline: string
  description: string
  hours: WeekHours
  /** Sonderhinweis, z. B. „Heute ab 8 Uhr wegen Zwiebelmarkt“ */
  notice: string
  features: string[]
}

export interface SiteSettings {
  promo: { enabled: boolean; text: string; link: string; linkLabel: string }
  heroTitle: string
  heroText: string
  prototypeNotice: boolean
}

export type CartItem =
  | { key: string; kind: 'product'; productId: string; size: '250' | '1000'; grind: Grind; qty: number }
  | { key: string; kind: 'abo'; productId: string | null; amount: 250 | 500 | 1000; rhythmWeeks: 2 | 4; grind: Grind; qty: number }
  | { key: string; kind: 'voucher'; value: number; qty: number }

export interface Order {
  id: string
  number: string
  createdAt: string
  customer: { name: string; email: string; city: string }
  items: { label: string; detail: string; qty: number; unit: number }[]
  shipping: number
  total: number
  hasAbo: boolean
  utmSource: string | null
}

export interface Booking {
  id: string
  workshopId: string
  sessionId: string
  name: string
  email: string
  seats: number
  gift: boolean
  giftNote?: string
  createdAt: string
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  topic: string
  message: string
  createdAt: string
  done: boolean
}

export interface Subscriber {
  email: string
  source: string
  createdAt: string
}
