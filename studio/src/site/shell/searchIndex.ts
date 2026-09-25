import type { CafeLocation, Product, Workshop } from '../../lib/types'
import type { BrewGuide } from '../content/guides'
import type { BrewIconName } from '../content/icons'
import { BREW_LABELS, price } from '../lib'

// ---------------------------------------------------------------------------
// Website-Suche: kleiner, lokaler Index über Kaffees, Anleitungen, Workshops & Seiten.
// Normalisiert Umlaute (ö = oe = o), versteht Synonyme („Siebträger“ → Espresso,
// „fruchtig“ → Geschmacksprofil) und toleriert einen Tippfehler pro Wort.
// ---------------------------------------------------------------------------

export type SearchGroup = 'coffee' | 'guide' | 'workshop' | 'page'

export const GROUP_LABELS: Record<SearchGroup, string> = {
  coffee: 'Kaffees & Geschenke',
  guide: 'Brühanleitungen',
  workshop: 'Workshops',
  page: 'Seiten',
}

export type SearchVisual =
  | { kind: 'product'; product: Product }
  | { kind: 'guide'; icon: BrewIconName; color: string }
  | { kind: 'workshop'; color: string }
  | { kind: 'page'; icon: PageIcon }

export type PageIcon = 'shop' | 'abo' | 'finder' | 'workshops' | 'cafe' | 'origin' | 'guides' | 'about' | 'gift' | 'legal' | 'cookie' | 'cart' | 'mail'

export interface SearchDoc {
  id: string
  group: SearchGroup
  title: string
  subtitle: string
  /** Ziel-URL – oder null bei Aktionen (z. B. Cookie-Einstellungen) */
  to: string | null
  action?: 'consent'
  meta?: string
  visual: SearchVisual
  /** Suchfelder mit Gewicht */
  fields: { text: string; w: number }[]
  /** Facetten aus dem Geschmacksprofil etc. (normalisiert), z. B. „fruchtig“, „mild“ */
  tags: Map<string, string>
  boost: number
}

// --- Normalisierung ----------------------------------------------------------

/** Kleinbuchstaben, ß → ss, ä/ae → a, ö/oe → o, ü/ue → u, Akzente weg. `map[i]` = Index im Original. */
export function foldWithMap(s: string) {
  const lower = s.toLowerCase()
  let text = ''
  const map: number[] = []
  for (let i = 0; i < lower.length; i++) {
    const c = lower[i]
    let r: string
    if (c === 'ä') r = 'a'
    else if (c === 'ö') r = 'o'
    else if (c === 'ü') r = 'u'
    else if (c === 'ß') r = 'ss'
    else if ((c === 'a' || c === 'o' || c === 'u') && lower[i + 1] === 'e') {
      text += c
      map.push(i)
      i++
      continue
    } else if (c === '-' || c === '–' || c === '/' || c === '·' || c === '(' || c === ')' || c === ',' || c === '„' || c === '“' || c === '"' || c === '&') r = ' '
    else r = c.normalize('NFD').replace(/[̀-ͯ]/g, '') || c
    for (const ch of r) {
      text += ch
      map.push(i)
    }
  }
  return { text, map }
}

export const fold = (s: string) => foldWithMap(s).text

const words = (s: string) => s.split(/\s+/).filter(Boolean)

/** Levenshtein ≤ 1 (schnelle Prüfung) */
function withinOne(a: string, b: string) {
  if (a === b) return true
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (la > lb) i++
    else if (lb > la) j++
    else {
      i++
      j++
    }
  }
  return edits + (la - i) + (lb - j) <= 1
}

// --- Synonyme -----------------------------------------------------------------

/** Suchwort (normalisiert) → Begriffe/Facetten, nach denen zusätzlich gesucht wird */
const SYNONYMS: Record<string, string[]> = {
  siebtrager: ['espresso'],
  siebtraegermaschine: ['espresso'],
  espressomaschine: ['espresso'],
  portafilter: ['espresso'],
  barista: ['espresso', 'latte art'],
  crema: ['espresso'],
  vollautomat: ['vollautomat', 'espresso'],
  kaffeevollautomat: ['vollautomat', 'espresso'],
  fruchtig: ['fruchtig'],
  fruchtige: ['fruchtig'],
  beerig: ['fruchtig'],
  spritzig: ['fruchtig'],
  sauerlich: ['fruchtig'],
  mild: ['mild'],
  sanft: ['mild'],
  bekommlich: ['mild'],
  magenfreundlich: ['mild'],
  saurearm: ['mild'],
  rund: ['mild', 'schokoladig'],
  schokoladig: ['schokoladig'],
  schoko: ['schokoladig'],
  schokolade: ['schokoladig'],
  kakao: ['schokoladig'],
  nussig: ['schokoladig', 'haselnuss', 'mandel'],
  kraftig: ['kraftig'],
  stark: ['kraftig'],
  intensiv: ['kraftig'],
  vollmundig: ['kraftig'],
  suss: ['suss'],
  hell: ['hell'],
  dunkel: ['dunkel'],
  handfilter: ['filter', 'v60'],
  pourover: ['filter', 'v60'],
  hario: ['v60'],
  filterkaffee: ['filter'],
  kanne: ['filter', 'chemex', 'french press'],
  stempelkanne: ['french press'],
  pressstempel: ['french press'],
  herdkanne: ['mokkakanne'],
  bialetti: ['mokkakanne'],
  espressokocher: ['mokkakanne'],
  moka: ['mokkakanne'],
  mokka: ['mokkakanne'],
  geschenk: ['geschenk', 'gutschein'],
  geschenkidee: ['geschenk', 'gutschein'],
  verschenken: ['geschenk', 'gutschein'],
  geburtstag: ['geschenk', 'gutschein'],
  weihnachten: ['geschenk', 'gutschein'],
  abonnement: ['abo'],
  regelmassig: ['abo'],
  offnungszeiten: ['cafes'],
  geoffnet: ['cafes'],
  offen: ['cafes'],
  adresse: ['cafes'],
  anfahrt: ['cafes'],
  fruhstuck: ['cafes'],
  terrasse: ['cafes'],
  milch: ['latte art'],
  milchschaum: ['latte art'],
  cappuccino: ['latte art'],
  kurs: ['workshop'],
  seminar: ['workshop'],
  schulung: ['workshop'],
  lernen: ['workshop'],
  verkostung: ['cupping'],
  fair: ['herkunft'],
  direkthandel: ['herkunft'],
  bauern: ['herkunft'],
  farmer: ['herkunft'],
  kontakt: ['kontakt'],
  team: ['uber uns'],
  rezept: ['anleitung'],
  bruhen: ['anleitung'],
  zubereitung: ['anleitung'],
  empfehlung: ['geschmacksfinder'],
  quiz: ['geschmacksfinder'],
  bestellen: ['shop'],
  kaufen: ['shop'],
  bohnen: ['shop'],
  cookies: ['cookie'],
  tracking: ['cookie'],
}

/** Beschriftung der Facetten für den Treffergrund */
const TAG_LABELS: Record<string, string> = {
  fruchtig: 'fruchtig',
  mild: 'mild · wenig Säure',
  schokoladig: 'schokoladig',
  kraftig: 'kräftig',
  suss: 'süß',
  hell: 'helle Röstung',
  dunkel: 'dunkle Röstung',
}

function expansions(token: string): string[] {
  const out = new Set<string>()
  const direct = SYNONYMS[token]
  if (direct) direct.forEach((x) => out.add(x))
  // Anfang eines Synonyms („schok“ → schokoladig), erst ab 4 Zeichen
  if (token.length >= 4) {
    for (const [k, v] of Object.entries(SYNONYMS)) if (k !== token && k.startsWith(token)) v.forEach((x) => out.add(x))
  }
  return [...out]
}

// --- Index --------------------------------------------------------------------

const KIND_LABEL: Record<Product['kind'], string> = { espresso: 'Espresso', filter: 'Filterkaffee', omni: 'Espresso & Filter', gift: 'Geschenk', voucher: 'Gutschein' }

function productTags(p: Product) {
  const t = new Map<string, string>()
  const coffee = p.kind === 'espresso' || p.kind === 'filter' || p.kind === 'omni'
  if (coffee) {
    if (p.taste.fruit >= 4) t.set('fruchtig', `Fruchtigkeit ${p.taste.fruit}/5`)
    if (p.taste.acidity <= 2) t.set('mild', `Säure ${p.taste.acidity}/5`)
    if (p.taste.chocolate >= 4) t.set('schokoladig', `Schokoladig ${p.taste.chocolate}/5`)
    if (p.taste.body >= 4) t.set('kraftig', `Körper ${p.taste.body}/5`)
    if (p.taste.sweetness >= 4) t.set('suss', `Süße ${p.taste.sweetness}/5`)
    if (p.roast <= 2) t.set('hell', 'helle Röstung')
    if (p.roast >= 4) t.set('dunkel', 'dunkle Röstung')
  }
  for (const b of p.brew) {
    t.set(fold(BREW_LABELS[b] ?? b), `für ${BREW_LABELS[b] ?? b}`)
    if (b === 'espresso') t.set('espresso', 'für Siebträger')
    if (b === 'filter') {
      t.set('filter', 'für Handfilter')
      t.set('v60', 'für Handfilter')
    }
    if (b === 'moka') t.set('mokkakanne', 'für die Mokkakanne')
    if (b === 'french') t.set('french press', 'für French Press')
  }
  if (p.kind === 'gift' || p.kind === 'voucher') t.set('geschenk', 'Geschenk')
  t.set('shop', '')
  return t
}

interface PageDef {
  id: string
  title: string
  subtitle: string
  to: string | null
  icon: PageIcon
  keywords: string
  action?: 'consent'
}

const PAGES: PageDef[] = [
  { id: 'shop', title: 'Shop', subtitle: 'Alle Kaffees, frisch geröstet in Weimar', to: '/shop', icon: 'shop', keywords: 'shop kaffee bohnen kaufen bestellen sortiment espresso filter' },
  { id: 'abo', title: 'Kaffee-Abo', subtitle: 'Alle 2 oder 4 Wochen frisch zu dir', to: '/abo', icon: 'abo', keywords: 'abo abonnement lieferung regelmäßig pausierbar versandkostenfrei abo verschenken' },
  { id: 'finder', title: 'Geschmacksfinder', subtitle: 'In einer Minute zu deinem Kaffee', to: '/geschmacksfinder', icon: 'finder', keywords: 'geschmacksfinder quiz empfehlung welcher kaffee passt test' },
  { id: 'workshops', title: 'Workshops', subtitle: 'Barista-Kurse in unseren Cafés', to: '/workshops', icon: 'workshops', keywords: 'workshop kurs barista latte art espresso cupping termine' },
  { id: 'cafes', title: 'Cafés', subtitle: 'Rösterei & Espressobar in Weimar – Öffnungszeiten & Anfahrt', to: '/cafes', icon: 'cafe', keywords: 'cafes café öffnungszeiten adresse anfahrt karte frühstück terrasse' },
  { id: 'herkunft', title: 'Herkunft', subtitle: 'Direkt gehandelt über kleine Importeure', to: '/herkunft', icon: 'origin', keywords: 'herkunft direct trade direkthandel fair importeur farm anbau ernte' },
  { id: 'anleitungen', title: 'Brühanleitungen', subtitle: 'Rezepte, Timer & Mengenrechner', to: '/anleitungen', icon: 'guides', keywords: 'anleitung brühen zubereitung rezept rechner verhältnis' },
  { id: 'ueber-uns', title: 'Über uns', subtitle: 'Collin & Vincent – die Röstbrüder', to: '/ueber-uns', icon: 'about', keywords: 'über uns team geschichte collin vincent brüder rösterei' },
  { id: 'kontakt', title: 'Kontakt', subtitle: 'Schreib uns – Fragen, Firmenkaffee, Events', to: '/ueber-uns#kontakt', icon: 'mail', keywords: 'kontakt e-mail nachricht anfrage firma event' },
  { id: 'gutschein', title: 'Geschenke & Gutscheine', subtitle: 'Brüderpaket, Gutschein, Abo verschenken', to: '/shop?kat=geschenke', icon: 'gift', keywords: 'geschenk gutschein verschenken geschenkbox' },
  { id: 'kasse', title: 'Warenkorb & Kasse', subtitle: 'Bestellung abschließen', to: '/kasse', icon: 'cart', keywords: 'warenkorb kasse checkout bezahlen versand' },
  { id: 'cookies', title: 'Cookie-Einstellungen', subtitle: 'Deine Einwilligung ansehen oder ändern', to: null, action: 'consent', icon: 'cookie', keywords: 'cookie cookies einwilligung consent tracking datenschutz' },
  { id: 'datenschutz', title: 'Datenschutz', subtitle: 'Wie wir mit deinen Daten umgehen', to: '/datenschutz', icon: 'legal', keywords: 'datenschutz dsgvo privatsphäre' },
  { id: 'impressum', title: 'Impressum', subtitle: 'Anbieterkennzeichnung', to: '/impressum', icon: 'legal', keywords: 'impressum anbieter kontakt' },
]

function pageTags(id: string) {
  const t = new Map<string, string>()
  const map: Record<string, string[]> = {
    cafes: ['cafes'],
    workshops: ['workshop'],
    herkunft: ['herkunft'],
    kontakt: ['kontakt'],
    'ueber-uns': ['uber uns', 'kontakt'],
    anleitungen: ['anleitung'],
    finder: ['geschmacksfinder'],
    abo: ['abo'],
    shop: ['shop'],
    gutschein: ['geschenk', 'gutschein'],
    cookies: ['cookie'],
  }
  for (const k of map[id] ?? []) t.set(k, '')
  return t
}

export function buildIndex({ products, guides, workshops, cafes }: { products: Product[]; guides: BrewGuide[]; workshops: Workshop[]; cafes: CafeLocation[] }): SearchDoc[] {
  const docs: SearchDoc[] = []
  for (const p of products) {
    const isGift = p.kind === 'gift' || p.kind === 'voucher'
    docs.push({
      id: `p-${p.id}`,
      group: 'coffee',
      title: p.name,
      subtitle: p.subtitle,
      to: `/shop/${p.slug}`,
      meta: p.available ? price(p.price) : 'ausverkauft',
      visual: { kind: 'product', product: p },
      fields: [
        { text: p.name, w: 12 },
        { text: p.subtitle, w: 6 },
        { text: p.notes.join(' · '), w: 7 },
        { text: `${p.origin} ${p.region}`, w: 5 },
        { text: `${KIND_LABEL[p.kind]} ${p.process} ${p.brew.map((b) => BREW_LABELS[b]).join(' ')}`, w: 3 },
        { text: p.description, w: 1 },
      ],
      tags: productTags(p),
      boost: (p.available ? 1 : 0) + (p.featured ? 0.5 : 0) + (isGift ? -0.5 : 0),
    })
  }
  for (const g of guides) {
    const t = new Map<string, string>([['anleitung', '']])
    t.set(fold(g.slug.replace('-', ' ')), '')
    if (g.slug === 'espresso') t.set('espresso', '')
    if (g.slug === 'v60') {
      t.set('filter', '')
      t.set('v60', '')
    }
    docs.push({
      id: `g-${g.slug}`,
      group: 'guide',
      title: g.title,
      subtitle: g.subtitle,
      to: `/anleitungen/${g.slug}`,
      meta: g.difficulty,
      visual: { kind: 'guide', icon: g.icon, color: g.color },
      fields: [
        { text: g.title, w: 11 },
        { text: g.subtitle, w: 4 },
        { text: `${g.equipment.join(' ')} ${g.ratio} ${g.grindHint}`, w: 2 },
        { text: `Anleitung Rezept Brühen ${g.difficulty}`, w: 2 },
      ],
      tags: t,
      boost: 0.3,
    })
  }
  for (const w of workshops) {
    const t = new Map<string, string>([['workshop', '']])
    if (/latte/i.test(w.title)) t.set('latte art', '')
    const upcoming = w.sessions.filter((s) => new Date(s.startsAt).getTime() > Date.now()).length
    docs.push({
      id: `w-${w.id}`,
      group: 'workshop',
      title: w.title,
      subtitle: w.subtitle,
      to: `/workshops#${w.slug}`,
      meta: upcoming ? `${upcoming} ${upcoming === 1 ? 'Termin' : 'Termine'}` : 'Termine folgen',
      visual: { kind: 'workshop', color: w.color },
      fields: [
        { text: w.title, w: 11 },
        { text: w.subtitle, w: 6 },
        { text: w.learn.join(' '), w: 3 },
        { text: `Workshop Kurs ${w.level} ${w.description}`, w: 1 },
      ],
      tags: t,
      boost: 0.2,
    })
  }
  for (const pg of PAGES) {
    docs.push({
      id: `s-${pg.id}`,
      group: 'page',
      title: pg.title,
      subtitle: pg.subtitle,
      to: pg.to,
      action: pg.action,
      visual: { kind: 'page', icon: pg.icon },
      fields: [
        { text: pg.title, w: 10 },
        { text: pg.subtitle, w: 3 },
        { text: pg.keywords, w: 4 },
      ],
      tags: pageTags(pg.id),
      boost: 0,
    })
  }
  for (const c of cafes) {
    docs.push({
      id: `c-${c.id}`,
      group: 'page',
      title: c.name,
      subtitle: c.address,
      to: `/cafes#${c.id}`,
      visual: { kind: 'page', icon: 'cafe' },
      fields: [
        { text: c.name, w: 10 },
        { text: c.address, w: 5 },
        { text: `${c.tagline} ${c.features.join(' ')} Café Öffnungszeiten`, w: 2 },
      ],
      tags: new Map([['cafes', '']]),
      boost: 0.1,
    })
  }
  // Suchfelder einmal normalisieren
  for (const d of docs) d.fields = d.fields.map((f) => ({ text: fold(f.text), w: f.w }))
  return docs
}

// --- Suche --------------------------------------------------------------------

export interface SearchHit {
  doc: SearchDoc
  score: number
  /** normalisierte Begriffe, die im Titel/Untertitel markiert werden */
  terms: string[]
  /** z. B. „passt zu fruchtig · Fruchtigkeit 4/5“ */
  reason: string | null
}

function fieldScore(text: string, term: string, w: number) {
  if (!text) return 0
  const idx = text.indexOf(term)
  if (idx >= 0) {
    const atWord = idx === 0 || text[idx - 1] === ' '
    return atWord ? w : w * 0.5
  }
  if (term.length >= 5 && !term.includes(' ')) {
    for (const word of words(text)) {
      if (word.length < 3) continue
      // Tippfehler: ganzes Wort oder gleich langer Wortanfang
      if (withinOne(term, word) || (word.length > term.length && withinOne(term, word.slice(0, term.length)))) return w * 0.35
    }
  }
  return 0
}

export function searchDocs(docs: SearchDoc[], query: string): SearchHit[] {
  const tokens = words(fold(query)).filter((t) => t.length > 0)
  if (!tokens.length) return []
  const hits: SearchHit[] = []
  for (const doc of docs) {
    let total = 0
    const terms: string[] = []
    let reason: string | null = null
    let ok = true
    for (const token of tokens) {
      let best = 0
      for (const f of doc.fields) best = Math.max(best, fieldScore(f.text, token, f.w))
      if (best > 0) terms.push(token)
      for (const exp of expansions(token)) {
        const tagNote = doc.tags.get(exp)
        if (tagNote !== undefined) {
          // Facetten-Treffer (Geschmack, Zubereitung) zählen bei Kaffees besonders
          best = Math.max(best, doc.group === 'coffee' ? 9 : 6)
          if (!reason) reason = TAG_LABELS[exp] ? `passt zu „${TAG_LABELS[exp]}“${tagNote ? ` · ${tagNote}` : ''}` : tagNote || null
        }
        let fs = 0
        for (const f of doc.fields) fs = Math.max(fs, fieldScore(f.text, exp, f.w) * 0.8)
        if (fs > 0) {
          terms.push(exp)
          best = Math.max(best, fs)
        }
      }
      if (best <= 0) {
        ok = false
        break
      }
      total += best
    }
    if (!ok) continue
    hits.push({ doc, score: total + doc.boost, terms, reason })
  }
  return hits.sort((a, b) => b.score - a.score)
}

/** Markierbare Bereiche im Original-Text (für <mark>) */
export function highlightRanges(text: string, terms: string[]): [number, number][] {
  if (!terms.length) return []
  const { text: folded, map } = foldWithMap(text)
  const ranges: [number, number][] = []
  for (const term of terms) {
    if (term.length < 2) continue
    let from = 0
    for (;;) {
      const idx = folded.indexOf(term, from)
      if (idx < 0) break
      const end = idx + term.length
      ranges.push([map[idx], end < map.length ? map[end] : text.length])
      from = end
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([r[0], r[1]])
  }
  return merged
}
