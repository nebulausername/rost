import type { BrewMethod, Grind, Product } from '../../lib/types'
import { ROAST_LABELS } from '../lib'

// Geschmacksfinder: Fragen, Kodierung für die URL (?a=…) und Scoring gegen die
// Geschmacksprofile (`taste`) & Zubereitungen (`brew`) der Produkte aus dem Store.

export type BrewAnswer = 'espresso' | 'filter' | 'french' | 'moka' | 'vollautomat'
export type MilkAnswer = 'milch' | 'beides' | 'schwarz'
export type FlavorAnswer = 'schoko' | 'frucht' | 'karamell' | 'egal'
export type StrengthAnswer = 'sanft' | 'ausgewogen' | 'kraeftig'
export type AcidAnswer = 'wenig' | 'etwas' | 'lebendig'

export interface Answers {
  brew: BrewAnswer
  milk: MilkAnswer
  flavor: FlavorAnswer
  strength: StrengthAnswer
  acid: AcidAnswer
}

export interface QuizOption {
  id: string
  label: string
  hint: string
}

export interface QuizQuestion {
  key: keyof Answers
  title: string
  kicker: string
  short: string
  options: QuizOption[]
}

export const QUESTIONS: QuizQuestion[] = [
  {
    key: 'brew',
    title: 'Wie bereitest du Kaffee zu?',
    kicker: 'Fangen wir beim Werkzeug an.',
    short: 'Zubereitung',
    options: [
      { id: 'espresso', label: 'Siebträger', hint: 'Espresso, Cappuccino & Co.' },
      { id: 'filter', label: 'Handfilter & AeroPress', hint: 'V60, Chemex, AeroPress' },
      { id: 'french', label: 'French Press', hint: 'Ziehen lassen, pressen' },
      { id: 'moka', label: 'Mokkakanne', hint: 'Der Klassiker vom Herd' },
      { id: 'vollautomat', label: 'Vollautomat', hint: 'Knopf drücken, fertig' },
    ],
  },
  {
    key: 'milk',
    title: 'Mit Milch oder schwarz?',
    kicker: 'Keine falsche Antwort. Versprochen.',
    short: 'Milch',
    options: [
      { id: 'milch', label: 'Meist mit Milch', hint: 'Cappuccino, Flat White, Latte' },
      { id: 'beides', label: 'Mal so, mal so', hint: 'Je nach Laune & Uhrzeit' },
      { id: 'schwarz', label: 'Schwarz', hint: 'Pur, so wie er ist' },
    ],
  },
  {
    key: 'flavor',
    title: 'Was schmeckt dir?',
    kicker: 'Denk an deinen Lieblingsnachtisch.',
    short: 'Aroma',
    options: [
      { id: 'schoko', label: 'Schokolade & Nuss', hint: 'Kakao, Haselnuss, Nougat' },
      { id: 'frucht', label: 'Beeren & Zitrus', hint: 'Saftig, hell, frisch' },
      { id: 'karamell', label: 'Karamell & Honig', hint: 'Rund, süß, weich' },
      { id: 'egal', label: 'Überrasch mich', hint: 'Ich bin offen für alles' },
    ],
  },
  {
    key: 'strength',
    title: 'Wie kräftig darf’s sein?',
    kicker: 'Von sanftem Morgen bis Weckruf.',
    short: 'Stärke',
    options: [
      { id: 'sanft', label: 'Sanft', hint: 'Leicht & zugänglich' },
      { id: 'ausgewogen', label: 'Ausgewogen', hint: 'Rund & harmonisch' },
      { id: 'kraeftig', label: 'Kräftig', hint: 'Voller Körper, viel Druck' },
    ],
  },
  {
    key: 'acid',
    title: 'Wie viel Säure magst du?',
    kicker: 'Säure ist bei gutem Kaffee kein Fehler, sondern Frische.',
    short: 'Säure',
    options: [
      { id: 'wenig', label: 'Wenig', hint: 'Mild & bekömmlich' },
      { id: 'etwas', label: 'Etwas', hint: 'Ein bisschen Frische' },
      { id: 'lebendig', label: 'Gern lebendig', hint: 'Saftig wie frisches Obst' },
    ],
  },
]

/** „espresso-milch-schoko-kraeftig-wenig“ → gültige Antworten (bricht beim ersten ungültigen Wert ab) */
export function parseAnswers(raw: string | null): string[] {
  if (!raw) return []
  const parts = raw.split('-')
  const out: string[] = []
  for (let i = 0; i < QUESTIONS.length && i < parts.length; i++) {
    if (!QUESTIONS[i].options.some((o) => o.id === parts[i])) break
    out.push(parts[i])
  }
  return out
}

export function toAnswers(list: (string | undefined)[]): Answers | null {
  if (list.length < QUESTIONS.length || list.some((x) => !x)) return null
  const [brew, milk, flavor, strength, acid] = list as string[]
  return { brew, milk, flavor, strength, acid } as Answers
}

export function optionLabel(qIndex: number, id: string | undefined) {
  return QUESTIONS[qIndex].options.find((o) => o.id === id)?.label ?? ''
}

export const BREW_TO_METHODS: Record<BrewAnswer, BrewMethod[]> = {
  espresso: ['espresso'],
  filter: ['filter', 'aeropress'],
  french: ['french'],
  moka: ['moka'],
  vollautomat: ['vollautomat'],
}

export const BREW_TO_GRIND: Record<BrewAnswer, Grind> = {
  espresso: 'espresso',
  filter: 'filter',
  french: 'french',
  moka: 'moka',
  vollautomat: 'bohne',
}

const BREW_NAME: Record<BrewAnswer, string> = {
  espresso: 'den Siebträger',
  filter: 'Handfilter & AeroPress',
  french: 'die French Press',
  moka: 'die Mokkakanne',
  vollautomat: 'den Vollautomaten',
}

type Dim = keyof Product['taste']

const clamp15 = (v: number) => Math.min(5, Math.max(1, v))

function targetProfile(a: Answers) {
  const t: Record<Dim, number> = { acidity: 3, body: 3, sweetness: 3.5, chocolate: 3, fruit: 3 }
  const w: Record<Dim, number> = { acidity: 1.2, body: 1, sweetness: 0.5, chocolate: 0.6, fruit: 0.6 }

  t.acidity = { wenig: 1.5, etwas: 3, lebendig: 4.6 }[a.acid]
  t.body = { sanft: 2, ausgewogen: 3, kraeftig: 4.6 }[a.strength]

  if (a.milk === 'milch') {
    t.body += 0.6
    t.chocolate += 0.8
    w.body += 0.3
  } else if (a.milk === 'beides') {
    t.body += 0.2
  } else {
    w.acidity += 0.2
  }

  if (a.flavor === 'schoko') {
    Object.assign(t, { chocolate: 5, fruit: 1.5 })
    Object.assign(w, { chocolate: 1.4, fruit: 0.8 })
  } else if (a.flavor === 'frucht') {
    Object.assign(t, { fruit: 5, chocolate: 1.5 })
    Object.assign(w, { fruit: 1.4, chocolate: 0.8 })
    t.acidity += 0.3
  } else if (a.flavor === 'karamell') {
    Object.assign(t, { sweetness: 4.8, chocolate: 3.3, fruit: 2.3 })
    w.sweetness = 1.4
  } else {
    w.chocolate = 0.3
    w.fruit = 0.3
  }

  if (a.brew === 'espresso' || a.brew === 'moka' || a.brew === 'vollautomat') t.body += 0.3
  for (const k of Object.keys(t) as Dim[]) t[k] = clamp15(t[k])
  return { t, w }
}

export interface Match {
  product: Product
  /** 0–100, gerundet */
  score: number
  brewFit: boolean
}

/** Kaffees (keine Geschenke/Gutscheine, nur verfügbare) nach Passung sortiert */
export function rankProducts(products: Product[], a: Answers): Match[] {
  const { t, w } = targetProfile(a)
  const methods = BREW_TO_METHODS[a.brew]
  const wSum = Object.values(w).reduce((x, y) => x + y, 0)
  return products
    .filter((p) => p.available && p.kind !== 'gift' && p.kind !== 'voucher')
    .map((p) => {
      let dist = 0
      for (const k of Object.keys(t) as Dim[]) dist += (w[k] * Math.abs(t[k] - p.taste[k])) / 4
      let sim = 1 - dist / wSum
      if (a.flavor === 'egal' && !p.featured) sim += 0.05
      const brewFit = p.brew.some((m) => methods.includes(m))
      const raw = 38 + 60 * (0.78 * Math.min(1, sim) + 0.22 * (brewFit ? 1 : 0))
      return { product: p, score: Math.max(20, Math.min(98, Math.round(raw))), brewFit }
    })
    .sort((x, y) => y.score - x.score || Number(y.product.featured) - Number(x.product.featured))
}

const pair = (notes: string[]) => (notes.length > 1 ? `${notes[0]} & ${notes[1]}` : (notes[0] ?? 'viel Charakter'))

/** Drei Gründe „Warum er zu dir passt“ – aus Antworten & Profil generiert */
export function reasonsFor(p: Product, a: Answers, brewFit: boolean): string[] {
  const s = p.taste
  const out: { text: string; w: number }[] = []

  const brewText: Record<BrewAnswer, string> = {
    espresso:
      s.body >= 4 ? `Gemacht für den Siebträger: ${p.name} bringt Druck, Crema und Süße in die Tasse.` : `Im Siebträger rund und süß – ein Espresso, der auch pur Spaß macht.`,
    filter: `Im Handfilter oder in der AeroPress zeigt sich ${p.name} von der klarsten Seite.`,
    french:
      s.body >= 3
        ? `In der French Press bekommt ${p.name} genau den vollen, runden Körper, den er verdient.`
        : `In der French Press zeigt sich ${p.name} saftig und klar – mit etwas mehr Körper als im Filter.`,
    moka: `Passt zur Mokkakanne – rund statt bitter, wenn du sie nicht zu heiß werden lässt.`,
    vollautomat: `Unkompliziert im Vollautomaten – wir schicken ihn dir als ganze Bohne.`,
  }
  out.push(
    brewFit
      ? { text: brewText[a.brew], w: 3 }
      : { text: `Nicht unser Klassiker für ${BREW_NAME[a.brew]} – aber mit angepasstem Mahlgrad ein spannendes Experiment.`, w: 1.2 },
  )

  if (a.milk === 'milch') {
    if (s.body >= 4 || s.chocolate >= 4) out.push({ text: 'Genug Körper und Schokolade, um sich in Milch durchzusetzen – ideal für Cappuccino & Flat White.', w: 2.8 })
    else out.push({ text: 'Auch mit Milch fein – aber probier unbedingt einen Schluck pur.', w: 1 })
  } else if (a.milk === 'schwarz') {
    if (s.fruit >= 4) out.push({ text: 'Schwarz getrunken kommt seine Frucht voll zur Geltung.', w: 2.6 })
    else if (s.sweetness >= 4) out.push({ text: 'Pur schon schön süß – da fehlt wirklich nichts.', w: 2.4 })
  } else if (s.body >= 3) {
    out.push({ text: 'Mit Milch schokoladig, schwarz überraschend klar – ein Kaffee für beide Launen.', w: 2 })
  }

  const notes = pair(p.notes)
  if (a.flavor === 'schoko') {
    out.push(s.chocolate >= 4 ? { text: `Schmeckt nach ${notes} – genau deine schokoladige Richtung.`, w: 3 } : { text: `Weniger Schokolade, dafür ${notes}. Trau dich!`, w: 1 })
  } else if (a.flavor === 'frucht') {
    out.push(s.fruit >= 4 ? { text: `${notes}: fruchtig, saftig, genau dein Ding.`, w: 3 } : { text: `Eher ${notes} als Beere – aber mit schöner Frische.`, w: 1 })
  } else if (a.flavor === 'karamell') {
    out.push(s.sweetness >= 4 ? { text: `Viel natürliche Süße mit Noten von ${notes}.`, w: 3 } : { text: `Süße trifft ${notes} – eine schöne Balance.`, w: 1.4 })
  } else {
    out.push({ text: `Du wolltest überrascht werden: ${p.notes.join(', ')}.`, w: 2.5 })
  }

  if (a.acid === 'wenig' && s.acidity <= 2) out.push({ text: 'Wenig Säure, dafür schön bekömmlich und rund.', w: 2.7 })
  if (a.acid === 'lebendig' && s.acidity >= 4) out.push({ text: 'Lebendige Säure, die an frisches Obst erinnert.', w: 2.7 })
  if (a.acid === 'etwas' && s.acidity >= 2 && s.acidity <= 3) out.push({ text: 'Ein Hauch Frische, ohne sauer zu werden.', w: 2.2 })

  if (a.strength === 'kraeftig' && s.body >= 4) out.push({ text: 'Voller Körper – der weckt dich zuverlässig.', w: 2.5 })
  if (a.strength === 'sanft' && s.body <= 2) out.push({ text: 'Leicht und klar – trinkt sich wie von selbst.', w: 2.5 })
  if (a.strength === 'ausgewogen' && s.body === 3) out.push({ text: 'Schön ausgewogen: nicht zu leicht, nicht zu wuchtig.', w: 2.3 })

  out.push({ text: `${ROAST_LABELS[p.roast][0].toUpperCase()}${ROAST_LABELS[p.roast].slice(1)} geröstet – frisch aus unserer Rösterei in Weimar.`, w: 0.5 })

  return out
    .sort((x, y) => y.w - x.w)
    .slice(0, 3)
    .map((r) => r.text)
}
