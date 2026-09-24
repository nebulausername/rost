import { addDays, differenceInCalendarDays, format, setHours, setMinutes, startOfDay, startOfWeek, subWeeks } from 'date-fns'
import { DEFAULT_CHECKLIST } from './constants'
import { occurrencesBetween } from './keydates'
import type {
  AdChannel,
  BudgetPlan,
  Campaign,
  CaptionTemplate,
  ChannelAccount,
  DailyStat,
  HashtagSet,
  Idea,
  KeyDate,
  MediaTone,
  Pillar,
  Platform,
  Post,
  PostFormat,
  PostStatus,
  Location,
  TeamMember,
} from './types'
import { dayKey, mulberry32, uid } from './utils'

// ---------------------------------------------------------------------------
// Stammdaten
// ---------------------------------------------------------------------------

export const TEAM: TeamMember[] = [
  { id: 'collin', name: 'Collin', role: 'Mitgründer · Röster', initials: 'C', color: '#c4702f' },
  { id: 'vincent', name: 'Vincent', role: 'Mitgründer · Barista', initials: 'V', color: '#5b7fa6' },
  { id: 'team', name: 'Café-Team', role: 'Baristas Espressobar & Rösterei', initials: 'T', color: '#4f7049' },
  { id: 'content', name: 'Content-Support', role: 'Freelance Foto/Video (optional)', initials: 'CS', color: '#a2465e' },
]

export const KEY_DATES: KeyDate[] = [
  { id: 'kd-kaffeetag', title: 'Tag des Kaffees', kind: 'kaffee', rule: { type: 'fixed', md: '10-01' }, angle: 'Größter Kaffee-Tag des Jahres: Aktion im Café + Abo-Special online.' },
  { id: 'kd-semester', title: 'Semesterstart Bauhaus-Uni', kind: 'weimar', rule: { type: 'fixed', md: '10-12', days: 5 }, angle: 'Studi-Willkommen: Stempelkarte, Brühkurs light, Lernplatz-Kaffee.', verify: true },
  { id: 'kd-zwiebelmarkt', title: 'Weimarer Zwiebelmarkt', kind: 'weimar', rule: { type: 'nth-weekday', month: 10, weekday: 5, n: 2, days: 3 }, angle: 'Altstadt voll: Espressobar-Präsenz, To-go-Fokus, Stadt-Content.', verify: true },
  { id: 'kd-halloween', title: 'Halloween & Herbstferien-Ende', kind: 'feiertag', rule: { type: 'fixed', md: '10-31' }, angle: 'Herbst-Signature-Drink, gemütliche Café-Stimmung.' },
  { id: 'kd-blackfriday', title: 'Black Friday', kind: 'handel', rule: { type: 'nth-weekday', month: 11, weekday: 4, n: 4, offset: 1 }, angle: 'Kein Rabatt-Schreien: „Fair Friday“ – Abo-Bonus statt Preisschlacht.' },
  { id: 'kd-cybermonday', title: 'Cyber Monday', kind: 'handel', rule: { type: 'nth-weekday', month: 11, weekday: 4, n: 4, offset: 4 }, angle: 'Letzte Chance Abo-Bonus, Geschenk-Abo pushen.' },
  { id: 'kd-weihnachtsmarkt', title: 'Weimarer Weihnachtsmarkt', kind: 'weimar', rule: { type: 'nth-weekday', month: 11, weekday: 3, n: -1, days: 38 }, angle: 'Altstadt-Frequenz: Espressobar, Geschenk-Sets, Glühkaffee-Idee.', verify: true },
  { id: 'kd-advent', title: '1. Advent', kind: 'feiertag', rule: { type: 'advent' }, angle: 'Start Geschenke-Saison: Geschenkboxen, Workshop-Gutscheine.' },
  { id: 'kd-nikolaus', title: 'Nikolaus', kind: 'feiertag', rule: { type: 'fixed', md: '12-06' }, angle: 'Kleine Überraschung im Café, Story-Gewinnspiel.' },
  { id: 'kd-versand', title: 'Letzter Versandtag vor Weihnachten', kind: 'intern', rule: { type: 'fixed', md: '12-18' }, angle: 'Deadline-Countdown für Shop & Geschenk-Abo.', verify: true },
  { id: 'kd-neujahr', title: 'Neujahr – Neue Routinen', kind: 'feiertag', rule: { type: 'fixed', md: '01-02' }, angle: '„Besserer Kaffee zuhause“: Brühguides, Einsteiger-Sets.' },
  { id: 'kd-valentin', title: 'Valentinstag', kind: 'handel', rule: { type: 'fixed', md: '02-14' }, angle: 'Workshop für zwei, „Kaffee-Date“ in der Espressobar.' },
  { id: 'kd-jubilaeum', title: 'Röstbrüder-Jubiläum', kind: 'intern', rule: { type: 'fixed', md: '03-01' }, angle: 'Gegründet März 2020: Jubiläumsröstung, Community-Dank.', verify: true },
  { id: 'kd-ostern', title: 'Ostern', kind: 'feiertag', rule: { type: 'easter', offset: -2, days: 4 }, angle: 'Osterbrunch-Kaffee, Öffnungszeiten, Geschenke.' },
  { id: 'kd-terrasse', title: 'Saisonstart Sommerterrasse', kind: 'intern', rule: { type: 'fixed', md: '04-15' }, angle: 'Terrasse am Herderplatz öffnet: Cold Brew & Espresso Tonic Launch.', verify: true },
  { id: 'kd-muttertag', title: 'Muttertag', kind: 'handel', rule: { type: 'nth-weekday', month: 5, weekday: 0, n: 2 }, angle: 'Geschenk-Abo & Gutscheine, Frühstück in der Espressobar.' },
  { id: 'kd-vatertag', title: 'Vatertag / Himmelfahrt', kind: 'feiertag', rule: { type: 'easter', offset: 39 }, angle: 'Home-Barista-Equipment & Espresso-Sets.' },
  { id: 'kd-coldbrew', title: 'Cold-Brew-Saison', kind: 'kaffee', rule: { type: 'fixed', md: '06-01', days: 92 }, angle: 'Sommerdrinks, Rezepte für zuhause, Terrasse.' },
  { id: 'kd-ernte', title: 'Neue Rohkaffees treffen ein', kind: 'intern', rule: { type: 'fixed', md: '05-15' }, angle: 'Import-Story: neue Ernte, neue Namen – Launch-Serie.', verify: true },
  { id: 'kd-kunstfest', title: 'Kunstfest Weimar', kind: 'weimar', rule: { type: 'nth-weekday', month: 8, weekday: 3, n: -1, days: 17 }, angle: 'Kulturpublikum & Gäste: Espressobar als Treffpunkt.', verify: true },
]

export const HASHTAG_SETS: HashtagSet[] = [
  { id: 'hs-lokal', name: 'Lokal Weimar', tags: ['#weimar', '#weimarcity', '#thüringen', '#weimarliebe', '#herderplatz', '#kaffeeweimar', '#visitweimar', '#weimarcafe'] },
  { id: 'hs-specialty', name: 'Specialty Coffee', tags: ['#specialtycoffee', '#kaffeerösterei', '#handgeröstet', '#directtrade', '#coffeeroaster', '#frischgeröstet', '#specialtycoffeegermany'] },
  { id: 'hs-brew', name: 'Home-Barista', tags: ['#filterkaffee', '#pourover', '#v60', '#aeropress', '#homebarista', '#espressoathome', '#brewguide', '#kaffeezuhause'] },
  { id: 'hs-gift', name: 'Geschenke', tags: ['#geschenkidee', '#kaffeeabo', '#kaffeeliebe', '#weihnachtsgeschenk', '#geschenkfürkaffeeliebhaber', '#supportlocal'] },
  { id: 'hs-cafe', name: 'Café-Moment', tags: ['#espressobar', '#flatwhite', '#latteart', '#cafeweimar', '#coffeetime', '#kaffeepause'] },
]

export const CAPTION_TEMPLATES: CaptionTemplate[] = [
  {
    id: 'ct-bohne',
    name: 'Bohne der Woche',
    pillar: 'bohne',
    body: 'Darf ich vorstellen: {Name} ☕\n\nHerkunft: {Land/Region}\nProzess: {Aufbereitung}\nIn der Tasse: {3 Aromen}\n\nWarum {Name}? {kurze Namensgeschichte}\n\nJetzt im Shop & in beiden Cafés. Link in Bio.',
  },
  {
    id: 'ct-workshop',
    name: 'Workshop – Plätze frei',
    pillar: 'events',
    body: 'Noch {Anzahl} Plätze frei: {Workshop-Name} am {Datum} in der Rösterei.\n\nDu lernst:\n→ {Lernziel 1}\n→ {Lernziel 2}\n→ {Lernziel 3}\n\nMax. {Teilnehmende} Personen, Kaffee & Snacks inklusive. Buchung über den Link in Bio.',
  },
  {
    id: 'ct-abo',
    name: 'Kaffee-Abo',
    pillar: 'shop',
    body: 'Nie wieder „Kaffee ist alle“. 🫘\n\nMit dem Röstbrüder-Abo bekommst du {Rhythmus} frisch geröstete Saisonkaffees – direkt aus unserer Rösterei in Weimar.\n\n✓ jederzeit pausierbar\n✓ Bohne oder gemahlen\n✓ versandkostenfrei ab {Wert}\n\n→ roestbrueder.com',
  },
  {
    id: 'ct-cafe',
    name: 'Café-Moment',
    pillar: 'cafe',
    body: '{Uhrzeit} am Herderplatz. {Sinneseindruck in einem Satz}.\n\nWas trinkst du heute? 👇\n\n📍 Espressobar · Kaufstraße 19\n📍 Rösterei · Richard-Wagner-Str. 17',
  },
  {
    id: 'ct-roest',
    name: 'Röstprotokoll',
    pillar: 'roesten',
    body: 'Röstprotokoll #{Nr.}: {Kaffee}\n\n🔥 Chargentemperatur: {°C}\n⏱ Röstzeit: {min}\n📈 Entwicklungszeit: {%}\n\n{Was wir diesmal verändert haben und warum}. Schmeckt man. Versprochen.',
  },
  {
    id: 'ct-brew',
    name: 'Brüh-Tipp',
    pillar: 'bruehen',
    body: 'Dein Filterkaffee schmeckt {sauer/bitter}? Das liegt fast immer an {Ursache}.\n\nSo fixst du es:\n1. {Schritt}\n2. {Schritt}\n3. {Schritt}\n\nSpeichern für morgen früh. 🔖 Mehr Anleitungen: roestbrueder.com/roestbrueder-anleitungen',
  },
]

export const ACCOUNTS_BASE: { platform: Platform; handle: string; connected: boolean; followers: number; growth: number }[] = [
  { platform: 'instagram', handle: '@roestbrueder', connected: false, followers: 4800, growth: 0.009 },
  { platform: 'facebook', handle: '/roestbrueder', connected: false, followers: 1350, growth: 0.002 },
  { platform: 'tiktok', handle: '@roestbrueder', connected: false, followers: 620, growth: 0.035 },
  { platform: 'google', handle: 'Röstbrüder Weimar', connected: false, followers: 410, growth: 0.012 },
  { platform: 'newsletter', handle: 'Röstbrüder Post', connected: false, followers: 900, growth: 0.014 },
  { platform: 'pinterest', handle: '—', connected: false, followers: 0, growth: 0 },
  { platform: 'linkedin', handle: '—', connected: false, followers: 0, growth: 0 },
  { platform: 'youtube', handle: '—', connected: false, followers: 0, growth: 0 },
]

// ---------------------------------------------------------------------------
// Content-Bausteine (echte Röstbrüder-Themen)
// ---------------------------------------------------------------------------

interface PostSeed {
  title: string
  caption: string
  pillar: Pillar
  platforms: Platform[]
  format: PostFormat
  location: Location
  tone: MediaTone
  hashtagSets: string[]
  hour: number
  minute?: number
  assignee: string
}

const POOL: PostSeed[] = [
  {
    title: 'Bohne der Woche: Dörte aus Santos',
    caption: 'Darf ich vorstellen: Dörte ☕\n\nHerkunft: Santos, Brasilien\nIn der Tasse: Nougat, Haselnuss, dunkle Schokolade\n\nDörte ist unser Beweis, dass „schokoladig“ nicht „langweilig“ heißt. Jetzt im Shop & in beiden Cafés.',
    pillar: 'bohne', platforms: ['instagram', 'facebook'], format: 'carousel', location: 'online', tone: 'espresso', hashtagSets: ['hs-specialty'], hour: 7, minute: 30, assignee: 'collin',
  },
  {
    title: 'Röstprotokoll: Hausbrüh 80/20',
    caption: 'Röstprotokoll #12: Hausbrüh – unser Espresso-Blend 80/20.\n\nWir zeigen, wie aus zwei Bohnen ein Espresso wird, der in Siebträger UND Mokkakanne funktioniert. Ton an. 🔊',
    pillar: 'roesten', platforms: ['instagram', 'tiktok', 'youtube'], format: 'reel', location: 'roesterei', tone: 'kupfer', hashtagSets: ['hs-specialty'], hour: 18, minute: 30, assignee: 'collin',
  },
  {
    title: 'Morgens am Herderplatz',
    caption: '8:58 am Herderplatz. Die Mühle läuft warm, die Stadt wacht auf.\n\nWas trinkst du heute? 👇\n\n📍 Espressobar · Kaufstraße 19',
    pillar: 'cafe', platforms: ['instagram'], format: 'story', location: 'espressobar', tone: 'sonne', hashtagSets: ['hs-lokal', 'hs-cafe'], hour: 9, assignee: 'team',
  },
  {
    title: 'V60 in 4 Schritten',
    caption: 'Dein Filterkaffee schmeckt sauer? Meistens ist der Mahlgrad zu grob.\n\n1. 15 g Kaffee, 250 g Wasser (94 °C)\n2. 40 g aufgießen, 30 s Blooming\n3. In Kreisen auf 250 g\n4. Ziel: 2:45–3:15 min\n\nSpeichern für morgen früh. 🔖',
    pillar: 'bruehen', platforms: ['instagram', 'tiktok', 'pinterest'], format: 'reel', location: 'online', tone: 'crema', hashtagSets: ['hs-brew'], hour: 12, assignee: 'vincent',
  },
  {
    title: 'Brüderzwist: AeroPress vs. French Press',
    caption: 'Brüderzwist, Runde 3: Collin schwört auf AeroPress, Vincent auf French Press. Gleiche Bohne, gleiche Zeit – ihr entscheidet. Kommentiert A oder F! 🥊',
    pillar: 'brueder', platforms: ['instagram', 'tiktok'], format: 'reel', location: 'roesterei', tone: 'espresso', hashtagSets: ['hs-brew'], hour: 19, minute: 30, assignee: 'vincent',
  },
  {
    title: 'Barista-Workshop: Latte Art – Plätze frei',
    caption: 'Noch 3 Plätze frei: Latte Art Basics in der Rösterei.\n\n→ Milch richtig schäumen\n→ Herz & Tulpe gießen\n→ Siebträger-Grundlagen\n\nMax. 6 Personen, Kaffee & Snacks inklusive.',
    pillar: 'events', platforms: ['instagram', 'facebook', 'google'], format: 'feed', location: 'roesterei', tone: 'crema', hashtagSets: ['hs-lokal'], hour: 18, assignee: 'vincent',
  },
  {
    title: 'Kaffee-Abo: Nie wieder „Kaffee ist alle“',
    caption: 'Mit dem Röstbrüder-Abo bekommst du regelmäßig frisch geröstete Saisonkaffees – direkt aus Weimar. Jederzeit pausierbar. → roestbrueder.com',
    pillar: 'shop', platforms: ['instagram', 'facebook'], format: 'feed', location: 'online', tone: 'kupfer', hashtagSets: ['hs-gift'], hour: 20, assignee: 'collin',
  },
  {
    title: 'Warum unsere Kaffees Namen tragen',
    caption: 'Dörte, Jörg, Bergböe … Warum heißen unsere Kaffees wie eure Nachbarn? Weil jeder Kaffee eine Persönlichkeit hat – und eine Geschichte. Heute: die Story hinter den Namen. 👇',
    pillar: 'bohne', platforms: ['instagram', 'tiktok'], format: 'reel', location: 'roesterei', tone: 'espresso', hashtagSets: ['hs-specialty'], hour: 18, minute: 30, assignee: 'collin',
  },
  {
    title: 'Neu: Espresso Bergböe',
    caption: 'Bergböe ist da. Kräftig, rund, mit einem Finish, das nachweht wie der Name. Im Shop & an der Bar.',
    pillar: 'shop', platforms: ['instagram', 'facebook', 'google'], format: 'feed', location: 'online', tone: 'nacht', hashtagSets: ['hs-specialty'], hour: 7, minute: 30, assignee: 'collin',
  },
  {
    title: 'Cupping-Abend in der Rösterei',
    caption: 'Schlürfen erlaubt. Beim offenen Cupping verkosten wir 5 Kaffees blind – ohne Vorwissen, ohne Fachsprache-Pflicht. Donnerstag, 18 Uhr, Richard-Wagner-Str. 17.',
    pillar: 'events', platforms: ['instagram', 'facebook', 'google'], format: 'event', location: 'roesterei', tone: 'kupfer', hashtagSets: ['hs-lokal', 'hs-specialty'], hour: 12, assignee: 'vincent',
  },
  {
    title: 'Team-Porträt: Hinter der Bar',
    caption: 'Wer macht eigentlich deinen Flat White? Heute stellen wir euch unser Team an der Espressobar vor. Sagt Hallo! 👋',
    pillar: 'brueder', platforms: ['instagram', 'linkedin'], format: 'carousel', location: 'espressobar', tone: 'sonne', hashtagSets: ['hs-cafe'], hour: 12, assignee: 'team',
  },
  {
    title: 'Import-Story: Vom Hafen nach Weimar',
    caption: 'Wie kommt Rohkaffee eigentlich von der Farm in unsere Rösterei? Wir kaufen bei kleinen Importeuren, die direkt importieren und fair zahlen. Der Weg in 60 Sekunden.',
    pillar: 'bohne', platforms: ['instagram', 'tiktok', 'youtube', 'linkedin'], format: 'reel', location: 'roesterei', tone: 'salbei', hashtagSets: ['hs-specialty'], hour: 18, minute: 30, assignee: 'collin',
  },
  {
    title: 'Newsletter: Röstbrüder Post',
    caption: 'Betreff: Neue Ernte, neue Namen & ein Workshop-Termin\n\n1. Bohne des Monats\n2. Brüh-Tipp der Saison\n3. Termine: Workshops & Cupping\n4. Abo-Vorteil für Leser:innen',
    pillar: 'shop', platforms: ['newsletter'], format: 'text', location: 'online', tone: 'crema', hashtagSets: [], hour: 7, assignee: 'vincent',
  },
  {
    title: 'Mahlgrad erklärt in 30 Sekunden',
    caption: 'Fein wie Puderzucker? Grob wie Meersalz? Der Mahlgrad entscheidet über alles. Hier die Übersicht für jede Zubereitung.',
    pillar: 'bruehen', platforms: ['tiktok', 'instagram', 'pinterest'], format: 'video', location: 'online', tone: 'crema', hashtagSets: ['hs-brew'], hour: 12, assignee: 'vincent',
  },
  {
    title: 'Google-Post: Öffnungszeiten & Terrasse',
    caption: 'Die Espressobar am Herderplatz hat täglich geöffnet – bei Sonne auch auf der Terrasse. Aktuelle Zeiten auf roestbrueder.com/cafes.',
    pillar: 'cafe', platforms: ['google'], format: 'feed', location: 'espressobar', tone: 'sonne', hashtagSets: [], hour: 8, assignee: 'team',
  },
  {
    title: 'B2B: Röstbrüder in deinem Büro',
    caption: 'Guter Kaffee ist das günstigste Team-Benefit. Wir beliefern Büros & Gastronomie in Thüringen mit frisch Geröstetem – inkl. Beratung & Schulung.',
    pillar: 'shop', platforms: ['linkedin'], format: 'feed', location: 'online', tone: 'espresso', hashtagSets: [], hour: 8, assignee: 'collin',
  },
]

const STATUS_FUTURE: PostStatus[] = ['scheduled', 'scheduled', 'approved', 'review', 'draft', 'draft', 'idea']

function checklistFor(status: PostStatus) {
  const doneCount = { idea: 0, draft: 1, review: 3, approved: 5, scheduled: 5, published: 5 }[status]
  return DEFAULT_CHECKLIST.map((label, i) => ({ id: uid('chk'), label, done: i < doneCount }))
}

function tagsFor(setIds: string[]) {
  // Instagram erlaubt inzwischen nur noch wenige Hashtags – max. 5 pro Post
  return setIds.flatMap((id) => HASHTAG_SETS.find((s) => s.id === id)?.tags.slice(0, 3) ?? []).slice(0, 5)
}

function metricsFor(rand: () => number, seed: PostSeed) {
  const base = seed.format === 'reel' || seed.format === 'video' ? 3200 : seed.format === 'story' ? 900 : 1500
  const reach = Math.round(base * (0.6 + rand() * 1.4))
  const rate = 0.035 + rand() * 0.05
  const inter = reach * rate
  return {
    reach,
    impressions: Math.round(reach * (1.25 + rand() * 0.4)),
    likes: Math.round(inter * 0.72),
    comments: Math.round(inter * (seed.pillar === 'brueder' ? 0.16 : 0.06)),
    shares: Math.round(inter * 0.08),
    saves: Math.round(inter * (seed.pillar === 'bruehen' ? 0.22 : 0.08)),
    clicks: Math.round(reach * (0.004 + rand() * 0.012)),
  }
}

// ---------------------------------------------------------------------------
// Generatoren
// ---------------------------------------------------------------------------

export function seedPosts(today = new Date(), campaigns: Campaign[] = []): Post[] {
  const rand = mulberry32(2020)
  const posts: Post[] = []
  const monday = startOfWeek(today, { weekStartsOn: 1 })
  const now = new Date().toISOString()
  // Rhythmus pro Woche: Di, Do, Sa (+ So Newsletter alle 2 Wochen)
  const slots = [1, 3, 5]
  let poolIndex = 0
  for (let w = -10; w <= 6; w++) {
    const weekStart = addDays(monday, w * 7)
    const extra = w % 2 === 0 ? [6] : []
    for (const offset of [...slots, ...extra]) {
      const seed = POOL[poolIndex % POOL.length]
      poolIndex++
      const day = addDays(weekStart, offset)
      const at = setMinutes(setHours(day, seed.hour), seed.minute ?? 0)
      const past = at < today
      const status: PostStatus = past ? 'published' : STATUS_FUTURE[Math.floor(rand() * STATUS_FUTURE.length)]
      const dist = differenceInCalendarDays(day, today)
      const finalStatus: PostStatus = !past && dist <= 3 && (status === 'idea' || status === 'draft') ? 'review' : status
      const campaign = seed.pillar === 'shop' || seed.pillar === 'events' ? campaigns.find((c) => c.status === 'active' && (seed.pillar === 'shop' ? c.objective === 'sales' : c.objective === 'leads')) : undefined
      posts.push({
        id: uid('post'),
        title: seed.title,
        caption: seed.caption,
        platforms: seed.platforms,
        format: seed.format,
        status: finalStatus,
        pillar: seed.pillar,
        scheduledAt: at.toISOString(),
        location: seed.location,
        assigneeId: seed.assignee,
        hashtags: tagsFor(seed.hashtagSets),
        mediaTone: seed.tone,
        campaignId: campaign?.id ?? null,
        link: seed.pillar === 'shop' ? 'https://roestbrueder.com/shop/' : undefined,
        notes: '',
        checklist: checklistFor(finalStatus),
        metrics: past ? metricsFor(rand, seed) : undefined,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  // Anlass-Posts für die nächsten 70 Tage
  const occ = occurrencesBetween(KEY_DATES, today, addDays(today, 70))
  const special: Record<string, Omit<PostSeed, 'hour'> & { hour: number }> = {
    'kd-kaffeetag': { title: 'Tag des Kaffees: Doppelte Stempel & Abo-Special', caption: 'Heute ist Tag des Kaffees! ☕ In beiden Cafés gibt’s doppelte Stempel – und online einen Bonus-Beutel zu jedem neuen Abo.', pillar: 'shop', platforms: ['instagram', 'facebook', 'google', 'tiktok'], format: 'reel', location: 'online', tone: 'kupfer', hashtagSets: ['hs-lokal', 'hs-gift'], hour: 7, minute: 30, assignee: 'collin' },
    'kd-zwiebelmarkt': { title: 'Zwiebelmarkt: Espresso to go am Herderplatz', caption: 'Zwiebelmarkt-Wochenende! Holt euch euren Espresso to go am Herderplatz – wir haben früher geöffnet.', pillar: 'cafe', platforms: ['instagram', 'facebook', 'google'], format: 'feed', location: 'espressobar', tone: 'sonne', hashtagSets: ['hs-lokal'], hour: 8, assignee: 'team' },
    'kd-semester': { title: 'Willkommen, Erstis! Studi-Stempelkarte', caption: 'Neu in Weimar? Willkommen! Mit Studi-Ausweis gibt’s die Stempelkarte mit Startbonus.', pillar: 'cafe', platforms: ['instagram', 'tiktok'], format: 'reel', location: 'espressobar', tone: 'sonne', hashtagSets: ['hs-lokal'], hour: 12, assignee: 'team' },
    'kd-blackfriday': { title: 'Fair Friday: Abo-Bonus statt Rabattschlacht', caption: 'Kein Black Friday bei uns – dafür Fair Friday: Wer heute ein Abo startet, bekommt die erste Lieferung doppelt. Fair für euch, fair für die Farmen.', pillar: 'shop', platforms: ['instagram', 'facebook', 'newsletter'], format: 'carousel', location: 'online', tone: 'nacht', hashtagSets: ['hs-gift'], hour: 7, assignee: 'collin' },
    'kd-advent': { title: 'Geschenkboxen & Workshop-Gutscheine', caption: 'Der Advent ist da – und mit ihm unsere Geschenkboxen. Für alle, die Kaffee lieben (oder lieben lernen sollen).', pillar: 'shop', platforms: ['instagram', 'facebook', 'pinterest'], format: 'carousel', location: 'online', tone: 'kupfer', hashtagSets: ['hs-gift'], hour: 18, assignee: 'vincent' },
  }
  for (const o of occ) {
    const s = special[o.keyDate.id]
    if (!s) continue
    const at = setMinutes(setHours(o.start, s.hour), s.minute ?? 0)
    if (at < today) continue
    const dist = differenceInCalendarDays(at, today)
    const status: PostStatus = dist < 10 ? 'approved' : dist < 30 ? 'draft' : 'idea'
    posts.push({
      id: uid('post'),
      title: s.title,
      caption: s.caption,
      platforms: s.platforms,
      format: s.format,
      status,
      pillar: s.pillar,
      scheduledAt: at.toISOString(),
      location: s.location,
      assigneeId: s.assignee,
      hashtags: tagsFor(s.hashtagSets),
      mediaTone: s.tone,
      campaignId: null,
      notes: `Anlass: ${o.keyDate.title}`,
      checklist: checklistFor(status),
      createdAt: now,
      updatedAt: now,
    })
  }
  return posts.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
}

interface CampaignSeed {
  name: string
  objective: Campaign['objective']
  channels: AdChannel[]
  startOffset: number
  days: number
  budget: number
  audience: string
  radiusKm: number | null
  ageMin: number
  ageMax: number
  interests: string[]
  offer: string
  landingUrl: string
  utmSource: string
  utmMedium: string
  cpm: number
  ctr: number
  cvr: number
  aov: number
  targets: Campaign['targets']
  notes: string
  forceStatus?: Campaign['status']
}

const CAMPAIGNS: CampaignSeed[] = [
  {
    name: 'Lokal-Awareness Weimar (Always-on)',
    objective: 'awareness', channels: ['meta'], startOffset: -45, days: 120, budget: 600,
    audience: 'Menschen in Weimar & Umland, Interesse an Kaffee, Cafés, Kultur', radiusKm: 20, ageMin: 20, ageMax: 55,
    interests: ['Kaffee', 'Specialty Coffee', 'Cafés', 'Bauhaus', 'Frühstück'], offer: 'Zwei Cafés, eine Rösterei – mitten in Weimar',
    landingUrl: 'https://roestbrueder.com/cafes/', utmSource: 'meta', utmMedium: 'paid_social', cpm: 4.2, ctr: 0.009, cvr: 0.02, aov: 9,
    targets: { ctr: 0.008, cpc: 0.6 }, notes: 'Reels aus Rösterei & Espressobar, 3 Creatives im Wechsel. Frequenz ≤ 3/Woche.',
  },
  {
    name: 'Kaffee-Abo Herbststart',
    objective: 'sales', channels: ['meta', 'google'], startOffset: -21, days: 56, budget: 600,
    audience: 'Home-Baristas DE, Retargeting Shop-Besucher 30 Tage, Lookalike Käufer 1 %', radiusKm: null, ageMin: 25, ageMax: 60,
    interests: ['Espressomaschine', 'Filterkaffee', 'Barista', 'Feinkost'], offer: 'Erste Abo-Lieferung mit Bonus-Beutel',
    landingUrl: 'https://roestbrueder.com/shop/', utmSource: 'meta', utmMedium: 'paid_social', cpm: 7.5, ctr: 0.014, cvr: 0.032, aov: 38,
    targets: { roas: 3, cpa: 18 }, notes: 'Karussell „Welcher Kaffee passt zu dir?“ performt am besten. Google Shopping ergänzend.',
  },
  {
    name: 'Barista-Workshops Q4',
    objective: 'leads', channels: ['meta', 'google'], startOffset: -10, days: 75, budget: 300,
    audience: 'Weimar, Erfurt, Jena (30 km), Interesse Kaffee/Kochkurse/Geschenke', radiusKm: 30, ageMin: 22, ageMax: 55,
    interests: ['Barista', 'Latte Art', 'Kochkurse', 'Erlebnisgeschenke'], offer: 'Latte Art & Espresso-Basics – max. 6 Personen',
    landingUrl: 'https://roestbrueder.com/produkt-kategorie/workshops/', utmSource: 'meta', utmMedium: 'paid_social', cpm: 5.8, ctr: 0.012, cvr: 0.025, aov: 69,
    targets: { cpa: 20 }, notes: 'Gutschein-Variante ab 1. Advent als Geschenk-Creative.',
  },
  {
    name: 'Google Search: „Kaffeerösterei Weimar“',
    objective: 'traffic', channels: ['google'], startOffset: -60, days: 180, budget: 720,
    audience: 'Suchanfragen rund um Kaffee, Café & Rösterei in Weimar', radiusKm: 25, ageMin: 18, ageMax: 75,
    interests: ['kaffeerösterei weimar', 'café weimar', 'kaffee kaufen weimar', 'barista kurs thüringen'], offer: 'Frisch geröstet in Weimar – Shop, Cafés, Workshops',
    landingUrl: 'https://roestbrueder.com/', utmSource: 'google', utmMedium: 'cpc', cpm: 28, ctr: 0.07, cvr: 0.04, aov: 32,
    targets: { cpc: 0.5, ctr: 0.06 }, notes: 'Brand-Keywords separat. Negativ-Keywords: „Kaffeemaschine reparatur“, „Jobs“.',
  },
  {
    name: 'Flyer & Tischaufsteller mit QR (Abo)',
    objective: 'sales', channels: ['print', 'local'], startOffset: -30, days: 60, budget: 180,
    audience: 'Gäste in beiden Cafés, Partner-Hotels, Tourist-Info', radiusKm: 5, ageMin: 18, ageMax: 80,
    interests: [], offer: 'QR-Code → 10 % auf die erste Abo-Lieferung',
    landingUrl: 'https://roestbrueder.com/shop/', utmSource: 'print', utmMedium: 'qr', cpm: 12, ctr: 0.004, cvr: 0.08, aov: 36,
    targets: { cpa: 12 }, notes: 'Einmalkosten Druck, Scans über UTM messen. „Impressionen“ = geschätzte Kontakte.',
  },
  {
    name: 'Fair Friday & Black Week',
    objective: 'sales', channels: ['meta', 'google', 'email'], startOffset: 55, days: 11, budget: 500,
    audience: 'Newsletter, Retargeting 90 Tage, Lookalike Abo-Kunden', radiusKm: null, ageMin: 25, ageMax: 65,
    interests: ['Geschenke', 'Kaffee', 'Nachhaltigkeit'], offer: 'Abo starten: erste Lieferung doppelt',
    landingUrl: 'https://roestbrueder.com/shop/', utmSource: 'meta', utmMedium: 'paid_social', cpm: 9, ctr: 0.016, cvr: 0.04, aov: 42,
    targets: { roas: 4 }, notes: 'Bewusst gegen Rabattschlacht positionieren. Creatives: Farm-Footage + Brüder-Statement.', forceStatus: 'planned',
  },
  {
    name: 'Weihnachten: Geschenkboxen & Gutscheine',
    objective: 'sales', channels: ['meta', 'pinterest', 'google', 'influencer'], startOffset: 62, days: 24, budget: 900,
    audience: 'Geschenke-Käufer:innen DE, 25–65, Interesse Feinkost/Kaffee; Weimar-Radius für Workshop-Gutscheine', radiusKm: null, ageMin: 25, ageMax: 65,
    interests: ['Geschenkideen', 'Feinkost', 'Kaffee', 'Adventskalender'], offer: 'Geschenkbox „Brüderpaket“ + Workshop-Gutschein',
    landingUrl: 'https://roestbrueder.com/shop/', utmSource: 'meta', utmMedium: 'paid_social', cpm: 8.5, ctr: 0.015, cvr: 0.035, aov: 45,
    targets: { roas: 3.5 }, notes: 'Deadline-Countdown zum letzten Versandtag. 2 Food-Creator aus Thüringen anfragen.', forceStatus: 'planned',
  },
  {
    name: 'Sommerterrasse Espressobar',
    objective: 'visits', channels: ['meta', 'local'], startOffset: -150, days: 90, budget: 450,
    audience: 'Touristen & Einheimische im 3-km-Radius Herderplatz', radiusKm: 3, ageMin: 18, ageMax: 70,
    interests: ['Städtereisen', 'Kultur', 'Café'], offer: 'Espresso Tonic & Cold Brew auf der Terrasse',
    landingUrl: 'https://roestbrueder.com/cafes/', utmSource: 'meta', utmMedium: 'paid_social', cpm: 3.6, ctr: 0.011, cvr: 0.015, aov: 7,
    targets: { cpc: 0.4 }, notes: 'Learnings: Wetter-getriggerte Anzeigen (Sonne > 22 °C) hatten doppelte CTR.', forceStatus: 'completed',
  },
]

function genDaily(rand: () => number, c: CampaignSeed, start: Date, end: Date, today: Date): DailyStat[] {
  const days = differenceInCalendarDays(end, start) + 1
  const perDay = c.budget / days
  const out: DailyStat[] = []
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i)
    if (d >= startOfDay(today)) break
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const spend = Math.max(0, perDay * (0.8 + rand() * 0.45) * (weekend ? 1.1 : 1))
    const impressions = Math.round((spend / c.cpm) * 1000)
    const clicks = Math.round(impressions * c.ctr * (0.75 + rand() * 0.5))
    const conversions = Math.round(clicks * c.cvr * (0.5 + rand() * 1.0))
    const revenue = conversions * c.aov * (0.8 + rand() * 0.5)
    out.push({ date: dayKey(d), spend: Math.round(spend * 100) / 100, impressions, clicks, conversions, revenue: Math.round(revenue * 100) / 100 })
  }
  return out
}

export function seedCampaigns(today = new Date()): Campaign[] {
  const rand = mulberry32(310)
  const now = new Date().toISOString()
  return CAMPAIGNS.map((c) => {
    const start = addDays(startOfDay(today), c.startOffset)
    const end = addDays(start, c.days - 1)
    const status: Campaign['status'] = c.forceStatus ?? (end < startOfDay(today) ? 'completed' : start > today ? 'planned' : 'active')
    const daily = status === 'planned' ? [] : genDaily(rand, c, start, end, today)
    return {
      id: uid('cmp'),
      name: c.name,
      objective: c.objective,
      channels: c.channels,
      status,
      startDate: dayKey(start),
      endDate: dayKey(end),
      budget: c.budget,
      dailyLimit: Math.round((c.budget / c.days) * 1.3),
      audience: c.audience,
      radiusKm: c.radiusKm,
      ageMin: c.ageMin,
      ageMax: c.ageMax,
      interests: c.interests,
      offer: c.offer,
      landingUrl: c.landingUrl,
      utmSource: c.utmSource,
      utmMedium: c.utmMedium,
      utmCampaign: `${format(start, 'yyyy-MM')}_${c.name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)}`,
      targets: c.targets,
      daily,
      notes: c.notes,
      createdAt: now,
      updatedAt: now,
    }
  })
}

export function seedIdeas(): Idea[] {
  const now = new Date().toISOString()
  const list: Omit<Idea, 'id' | 'createdAt'>[] = [
    { title: 'Welcher Bruder-Kaffee passt zu dir? (Quiz-Story)', description: 'Story-Umfrage in 4 Schritten → Ergebnis-Kaffee mit Shop-Link. Später als Website-Quiz.', pillar: 'shop', platforms: ['instagram'], format: 'story', effort: 'M', votes: 7 },
    { title: 'Namensgeber-Serie: Wer ist Dörte?', description: 'Jede Woche die (echte oder erfundene) Geschichte hinter einem Kaffeenamen. Wiedererkennbares Intro.', pillar: 'bohne', platforms: ['instagram', 'tiktok'], format: 'reel', effort: 'M', votes: 9 },
    { title: '24 Stunden Röstbrüder (Day in the Life)', description: 'Vom ersten Röstvorgang bis zum Abschließen der Espressobar – schnell geschnitten.', pillar: 'brueder', platforms: ['tiktok', 'instagram', 'youtube'], format: 'reel', effort: 'L', votes: 6 },
    { title: 'Frag den Röster (Q&A-Sticker)', description: 'Fragen sammeln, Antworten als Reel-Serie mit Collin am Röster.', pillar: 'roesten', platforms: ['instagram'], format: 'story', effort: 'S', votes: 5 },
    { title: 'Latte-Art-Throwdown in der Espressobar', description: 'Abendevent mit Weimarer Baristas, Publikumsvoting, Live-Stories.', pillar: 'events', platforms: ['instagram', 'facebook', 'google'], format: 'event', effort: 'L', votes: 8 },
    { title: 'Kaffee-Fehler, die jeder macht', description: 'Serie: 5 häufige Fehler (Wasser, Mahlgrad, Lagerung …) mit Fix in 20 Sekunden.', pillar: 'bruehen', platforms: ['tiktok', 'instagram', 'pinterest'], format: 'video', effort: 'S', votes: 10 },
    { title: 'Weimar-Spaziergang mit Kaffee', description: 'Route: Rösterei → Goethehaus → Herderplatz. Kooperation mit Tourist-Info?', pillar: 'cafe', platforms: ['instagram', 'pinterest'], format: 'carousel', effort: 'M', votes: 4 },
    { title: 'Röstgrad-Vergleich: Hell vs. Dunkel', description: 'Gleiche Bohne, drei Röstgrade, blind verkostet von Gästen.', pillar: 'roesten', platforms: ['tiktok', 'instagram'], format: 'reel', effort: 'M', votes: 6 },
    { title: 'Abo-Unboxing mit Kund:innen', description: 'UGC anstoßen: Abo-Kund:innen schicken ihr Unboxing, wir reposten mit Dank.', pillar: 'shop', platforms: ['instagram', 'tiktok'], format: 'reel', effort: 'S', votes: 3 },
    { title: 'Gastro-Case: Kaffee im Partner-Café', description: 'LinkedIn-Case mit einem Wiederverkäufer/Gastro-Partner – Schulung, Rezeptur, Ergebnis.', pillar: 'shop', platforms: ['linkedin'], format: 'carousel', effort: 'M', votes: 2 },
    { title: 'Cold Brew Rezept für zuhause', description: 'Saisonal ab Mai: Rezept-Pin + Reel, Verweis auf passende Bohne.', pillar: 'bruehen', platforms: ['pinterest', 'instagram'], format: 'video', effort: 'S', votes: 4 },
    { title: 'Behind the Scenes: Rohkaffee-Lieferung', description: 'Jutesäcke, Probenröstung, erstes Cupping – Spannungsbogen über 3 Stories.', pillar: 'bohne', platforms: ['instagram'], format: 'story', effort: 'S', votes: 5 },
  ]
  return list.map((i) => ({ ...i, id: uid('idea'), createdAt: now, keyDateId: null }))
}

export function seedAccounts(today = new Date()): ChannelAccount[] {
  const rand = mulberry32(99)
  return ACCOUNTS_BASE.map((a) => {
    const history: { date: string; value: number }[] = []
    let v = a.followers / Math.pow(1 + a.growth, 26)
    for (let w = 26; w >= 0; w--) {
      const d = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), w)
      if (w < 26) v = v * (1 + a.growth * (0.4 + rand() * 1.2))
      history.push({ date: dayKey(d), value: Math.round(w === 0 ? a.followers : v) })
    }
    return { platform: a.platform, handle: a.handle, connected: a.connected, followers: a.followers, history: a.followers ? history : [] }
  })
}

/** Budgetplan (Szenario „M“) mit Saisonalität – Q4 stark, Sommer Terrasse */
export function seedBudget(today = new Date()): BudgetPlan {
  const plan: BudgetPlan = {}
  const season = [0.8, 0.7, 0.9, 1.0, 1.0, 0.9, 1.0, 0.9, 1.0, 1.1, 1.4, 1.7] // Jan–Dez
  const base: Partial<Record<AdChannel, number>> = { meta: 380, google: 170, tiktok: 60, influencer: 60, pinterest: 20, local: 40, email: 20, print: 50 }
  const startYear = today.getFullYear()
  for (let y = startYear; y <= startYear + 1; y++) {
    for (let m = 0; m < 12; m++) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}`
      const f = season[m]
      const row: Partial<Record<AdChannel, number>> = {}
      for (const [ch, v] of Object.entries(base) as [AdChannel, number][]) {
        let val = v * f
        if (ch === 'pinterest' && (m === 10 || m === 11)) val *= 3
        if (ch === 'influencer' && m !== 10 && m !== 11 && m !== 4) val *= 0.5
        row[ch] = Math.round(val / 10) * 10
      }
      plan[key] = row
    }
  }
  return plan
}

export function seedAll(today = new Date()) {
  const campaigns = seedCampaigns(today)
  return {
    posts: seedPosts(today, campaigns),
    campaigns,
    ideas: seedIdeas(),
    keyDates: KEY_DATES,
    hashtagSets: HASHTAG_SETS,
    templates: CAPTION_TEMPLATES,
    team: TEAM,
    accounts: seedAccounts(today),
    budget: seedBudget(today),
  }
}

