import type { Pillar, Product } from './types'

// Hook-Baukasten: erste Zeilen, die zum Weiterlesen bringen – je Content-Säule.
// Platzhalter: {kaffee} = erkannter oder Beispiel-Kaffee, {herkunft} = dessen Herkunft.
const HOOKS: Record<Pillar, string[]> = {
  bohne: [
    'Warum heißt unser Kaffee eigentlich {kaffee}? 👇',
    'Von der Farm bis nach Weimar: So reist {kaffee} zu dir.',
    '3 Dinge, die du über Kaffee aus {herkunft} nicht wusstest.',
    'Darf ich vorstellen: {kaffee}. ☕',
    'Direkt gehandelt heißt für uns: Wir wissen, wo {kaffee} herkommt.',
  ],
  roesten: [
    'So klingt der erste Crack. 🔊 Ton an.',
    'Was passiert eigentlich in 12 Minuten Röstung?',
    'Hell oder dunkel – was ist wirklich besser? (Spoiler: kommt drauf an.)',
    'Röstprotokoll: Warum wir {kaffee} diese Woche anders rösten.',
    'Dieser Geruch, wenn die Trommel aufgeht. 🔥',
  ],
  cafe: [
    '8:58 am Herderplatz. Mehr braucht es nicht.',
    'Dein Platz für die Mittagspause? Wir hätten da was. ☀️',
    'Terrasse, Espresso, Altstadt – check.',
    'Was trinkst du heute? Wir raten mal … 👇',
    'Hier röstet es, während du trinkst.',
  ],
  bruehen: [
    'Dein Filterkaffee schmeckt sauer? Das ist der Grund.',
    'Der häufigste Fehler beim Espresso zuhause.',
    'Speichern für morgen früh: das perfekte V60-Rezept. 🔖',
    'Mahlgrad erklärt in 20 Sekunden.',
    'Kein Equipment? Kein Problem. So geht guter Kaffee mit dem, was du hast.',
  ],
  brueder: [
    'Brüderzwist: Wer hat recht? 🥊 Kommentiert!',
    'Was wir nach Jahren Rösterei heute anders machen würden.',
    'Ein Tag bei den Röstbrüdern – in 30 Sekunden.',
    'Wer macht eigentlich deinen Flat White? Sagt Hallo! 👋',
    'Zwei Brüder, eine Trommel, null Einigkeit beim Mahlgrad.',
  ],
  events: [
    'Noch 3 Plätze frei – und einer davon ist deiner.',
    'Latte Art in 2,5 Stunden? Wir zeigen’s dir.',
    'Schlürfen erlaubt: Cupping-Abend in der Rösterei.',
    'Das Geschenk, das man nicht einpacken muss: ein Barista-Workshop.',
    'Save the date: Wir öffnen die Rösterei für euch.',
  ],
  shop: [
    'Nie wieder „Kaffee ist alle“.',
    'Das Geschenk für Menschen, die schon alles haben.',
    'Neu im Sortiment: {kaffee}. Und er ist ein Charakterkopf.',
    'Frisch geröstet, direkt aus Weimar in deine Tasse.',
    '{kaffee} ist wieder da. Schnell sein lohnt sich.',
  ],
}

export function suggestHooks(pillar: Pillar, text: string, products: Product[]) {
  const lower = text.toLowerCase()
  const hit = products.find((p) => p.kind !== 'voucher' && lower.includes(p.name.toLowerCase()))
  const product = hit ?? products.find((p) => p.featured) ?? products[0]
  const kaffee = product?.name ?? 'Dörte'
  const herkunft = product && product.origin && !['Blend', 'Single Origin', 'wechselnd'].includes(product.origin) ? product.origin : 'Brasilien'
  return HOOKS[pillar].map((h) => h.replaceAll('{kaffee}', kaffee).replaceAll('{herkunft}', herkunft))
}
