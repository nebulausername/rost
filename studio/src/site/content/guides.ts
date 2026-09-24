import type { Grind } from '../../lib/types'
import type { BrewIconName } from './icons'

// Brühanleitungen – redaktionelle Inhalte der Website.
// Rezepte sind bewährte Ausgangswerte (keine Dogmen): Mahlgrad & Zeit am eigenen Setup nachjustieren.

export interface BrewStep {
  label: string
  detail: string
  /** Start des Schritts in Sekunden ab Timer-Start */
  atSec: number
  /** Zielgewicht (g) am Ende dieses Schritts – Wasser bzw. bei Espresso die Ausbeute in der Tasse */
  pourTo?: number
}

export interface BrewGuide {
  slug: string
  title: string
  subtitle: string
  icon: BrewIconName
  difficulty: 'Einfach' | 'Mittel' | 'Anspruchsvoll'
  /** Gesamtdauer des Timers in Sekunden */
  totalSec: number
  /** Kaffeemenge (g) */
  dose: number
  /** Einstellbereich für den Dosis-Regler */
  doseRange: [number, number]
  /** Wasser (bzw. Ausbeute bei Espresso) */
  water: number
  waterUnit: 'g' | 'ml'
  /** Was `water` bedeutet */
  waterLabel: 'Wasser' | 'Ausbeute'
  /** Verb für Zielgewichte im Timer */
  pourVerb: 'Gieße bis' | 'Stopp bei' | 'Fülle bis'
  ratio: string
  temp: string
  grind: Grind
  grindHint: string
  equipment: string[]
  prep: string[]
  steps: BrewStep[]
  tips: string[]
  /** Produkt-Slugs aus dem Sortiment */
  recommended: string[]
  /** Farbakzent der Karte */
  color: string
}

export const GUIDES: BrewGuide[] = [
  {
    slug: 'v60',
    title: 'Handfilter (V60)',
    subtitle: 'Klar, fein, jeden Morgen ein bisschen anders.',
    icon: 'v60',
    difficulty: 'Mittel',
    totalSec: 180,
    dose: 15,
    doseRange: [10, 30],
    water: 250,
    waterUnit: 'g',
    waterLabel: 'Wasser',
    pourVerb: 'Gieße bis',
    ratio: '1:16,7',
    temp: '93 °C',
    grind: 'filter',
    grindHint: 'mittelfein – etwa wie Tafelsalz',
    equipment: ['V60 oder anderer Handfilter', 'Papierfilter', 'Waage mit Timer', 'Wasserkocher (am besten mit Schwanenhals)', 'Tasse oder Kanne'],
    prep: ['Wasser auf ca. 93 °C bringen', 'Papierfilter heiß ausspülen – das nimmt den Papiergeschmack und wärmt alles vor', 'Spülwasser wegkippen, Kaffee mahlen und einfüllen, Mulde in die Mitte drücken', 'Alles auf die Waage stellen und tarieren'],
    steps: [
      { label: 'Blooming', detail: 'Langsam in Kreisen gießen, bis alles Kaffeemehl nass ist. Einmal sanft schwenken – jetzt entweicht CO₂.', atSec: 0, pourTo: 45 },
      { label: 'Erster Aufguss', detail: 'In gleichmäßigen Spiralen von innen nach außen gießen, den Rand aussparen.', atSec: 40, pourTo: 150 },
      { label: 'Zweiter Aufguss', detail: 'Genauso ruhig weiter, bis die Waage das Ziel zeigt.', atSec: 75, pourTo: 250 },
      { label: 'Durchlaufen lassen', detail: 'Einmal leicht schwenken, damit sich ein flaches Kaffeebett bildet. Dann einfach laufen lassen.', atSec: 105 },
      { label: 'Genießen', detail: 'Filter raus, Kanne kurz schwenken – fertig. Läuft es deutlich länger oder kürzer, beim nächsten Mal feiner bzw. gröber mahlen.', atSec: 170 },
    ],
    tips: ['Schmeckt es sauer und dünn? Etwas feiner mahlen.', 'Bitter und trocken? Etwas gröber mahlen oder kühleres Wasser nehmen.', 'Weiches Wasser (oder gefiltertes) macht die Aromen klarer.'],
    recommended: ['joerg', 'saisonkaffee', 'doerte'],
    color: '#4f7049',
  },
  {
    slug: 'aeropress',
    title: 'AeroPress',
    subtitle: 'Schnell, robust, reisetauglich – und verzeiht fast alles.',
    icon: 'aeropress',
    difficulty: 'Einfach',
    totalSec: 135,
    dose: 15,
    doseRange: [11, 22],
    water: 230,
    waterUnit: 'g',
    waterLabel: 'Wasser',
    pourVerb: 'Gieße bis',
    ratio: '1:15,3',
    temp: '88 °C',
    grind: 'filter',
    grindHint: 'mittelfein, eher etwas feiner als für den Handfilter',
    equipment: ['AeroPress mit Papierfilter', 'Waage mit Timer', 'Wasserkocher', 'Rührstab oder Löffel', 'Stabile Tasse'],
    prep: ['Wasser auf ca. 88 °C bringen', 'Filter in die Kappe legen und kurz anfeuchten', 'AeroPress auf die Tasse setzen, Kaffee einfüllen, tarieren'],
    steps: [
      { label: 'Aufgießen', detail: 'Zügig das ganze Wasser eingießen, bis die Waage das Ziel zeigt.', atSec: 0, pourTo: 230 },
      { label: 'Umrühren', detail: '3–4 Mal sanft umrühren, damit alles Kaffeemehl benetzt ist.', atSec: 10 },
      { label: 'Kolben aufsetzen', detail: 'Kolben leicht einsetzen – das erzeugt ein Vakuum, nichts tropft mehr durch. Jetzt ziehen lassen.', atSec: 20 },
      { label: 'Schwenken', detail: 'Die ganze AeroPress einmal vorsichtig schwenken.', atSec: 90 },
      { label: 'Pressen', detail: 'Langsam und gleichmäßig drücken – etwa 30 Sekunden. Beim Zischen aufhören.', atSec: 100 },
      { label: 'Genießen', detail: 'Fertig! Zu stark? Einfach mit etwas heißem Wasser verlängern.', atSec: 130 },
    ],
    tips: ['Presse nie mit Gewalt – mehr Druck heißt nicht mehr Geschmack.', 'Für mehr Körper: 2 g mehr Kaffee statt länger ziehen lassen.', 'Unterwegs? Bohnen vorher mahlen und luftdicht verpacken.'],
    recommended: ['joerg', 'doerte', 'saisonkaffee'],
    color: '#8a5634',
  },
  {
    slug: 'french-press',
    title: 'French Press',
    subtitle: 'Voller Körper, kaum Aufwand. Der Wochenend-Klassiker.',
    icon: 'french',
    difficulty: 'Einfach',
    totalSec: 300,
    dose: 30,
    doseRange: [15, 60],
    water: 500,
    waterUnit: 'g',
    waterLabel: 'Wasser',
    pourVerb: 'Gieße bis',
    ratio: '1:16,7',
    temp: '94 °C',
    grind: 'french',
    grindHint: 'grob – etwa wie grobes Meersalz',
    equipment: ['French Press', 'Waage mit Timer', 'Wasserkocher', 'Zwei Löffel'],
    prep: ['Wasser aufkochen und kurz stehen lassen (ca. 94 °C)', 'Kanne mit heißem Wasser vorwärmen, ausgießen', 'Kaffee grob mahlen, einfüllen, tarieren'],
    steps: [
      { label: 'Aufgießen', detail: 'Das ganze Wasser zügig und gleichmäßig über das Kaffeemehl gießen.', atSec: 0, pourTo: 500 },
      { label: 'Ziehen lassen', detail: 'Deckel auflegen, Stempel oben lassen. Nicht rühren – einfach Geduld.', atSec: 15 },
      { label: 'Kruste brechen', detail: 'Mit einem Löffel die Kruste an der Oberfläche aufbrechen, Schaum & Partikel mit zwei Löffeln abschöpfen.', atSec: 240 },
      { label: 'Pressen', detail: 'Stempel nur bis knapp unter die Oberfläche drücken – nicht bis zum Boden.', atSec: 270 },
      { label: 'Genießen', detail: 'Sofort komplett ausgießen, damit nichts nachzieht.', atSec: 290 },
    ],
    tips: ['Wer mag, lässt nach dem Abschöpfen noch 3–5 Minuten ruhen – der Kaffee wird noch klarer.', 'Rest nicht in der Kanne stehen lassen, sonst wird er bitter.', 'Zu schlammig? Gröber mahlen.'],
    recommended: ['doerte', 'saisonkaffee', 'joerg'],
    color: '#b8743f',
  },
  {
    slug: 'espresso',
    title: 'Siebträger-Espresso',
    subtitle: 'Konzentriert, süß, mit Crema. Die Königsdisziplin.',
    icon: 'espresso',
    difficulty: 'Anspruchsvoll',
    totalSec: 30,
    dose: 18,
    doseRange: [14, 22],
    water: 36,
    waterUnit: 'g',
    waterLabel: 'Ausbeute',
    pourVerb: 'Stopp bei',
    ratio: '1:2',
    temp: '93 °C',
    grind: 'espresso',
    grindHint: 'fein – der Mahlgrad ist deine wichtigste Stellschraube',
    equipment: ['Siebträgermaschine (gut aufgeheizt)', 'Mühle mit Espresso-Mahlgrad', 'Tamper', 'Waage mit Timer', 'Vorgewärmte Tasse'],
    prep: ['Maschine mindestens 20 Minuten aufheizen lassen', 'Siebträger trocken wischen, Kaffee einwiegen', 'Verteilen, gerade tampern, Rand säubern', 'Kurz spülen, einspannen, Tasse auf die Waage – tarieren'],
    steps: [
      { label: 'Bezug starten', detail: 'Pumpe an und Timer gleichzeitig starten.', atSec: 0 },
      { label: 'Erste Tropfen', detail: 'Nach etwa 5–8 Sekunden sollten die ersten dunklen Tropfen erscheinen.', atSec: 6 },
      { label: 'Honigfluss', detail: 'Der Strahl sollte wie warmer Honig laufen, gleichmäßig und mittig.', atSec: 12 },
      { label: 'Stoppen', detail: 'Bei Erreichen der Ausbeute Pumpe aus – meist zwischen 25 und 30 Sekunden.', atSec: 22, pourTo: 36 },
      { label: 'Genießen', detail: 'Umrühren, riechen, probieren. Sauer? Feiner mahlen. Bitter? Gröber mahlen.', atSec: 28 },
    ],
    tips: ['Ändere immer nur eine Variable auf einmal – meistens den Mahlgrad.', 'Frisch gerösteter Kaffee braucht ein paar Tage Ruhe, bevor er im Siebträger glänzt.', 'Für Milchgetränke darf es gern ein Hauch mehr Dosis sein.'],
    recommended: ['hausbrueh', 'bergboee', 'doerte'],
    color: '#5b3a29',
  },
  {
    slug: 'mokkakanne',
    title: 'Mokkakanne',
    subtitle: 'Italienischer Herd-Klassiker – rund statt bitter, wenn man ihn lässt.',
    icon: 'moka',
    difficulty: 'Mittel',
    totalSec: 270,
    dose: 16,
    doseRange: [10, 30],
    water: 160,
    waterUnit: 'ml',
    waterLabel: 'Wasser',
    pourVerb: 'Fülle bis',
    ratio: '1:10',
    temp: 'heiß eingefüllt',
    grind: 'moka',
    grindHint: 'feiner als Filter, gröber als Espresso',
    equipment: ['Mokkakanne (hier: für 3 Tassen)', 'Herdplatte', 'Wasserkocher', 'Küchentuch'],
    prep: ['Wasser im Kocher erhitzen – das verkürzt die Zeit auf dem Herd und verhindert Bitterkeit', 'Heißes Wasser bis knapp unter das Ventil in den Boden füllen (Tuch benutzen!)', 'Sieb locker mit Kaffee füllen – nicht andrücken – und Rand abwischen', 'Kanne vorsichtig zuschrauben'],
    steps: [
      { label: 'Auf den Herd', detail: 'Mittlere Hitze, Deckel offen lassen, damit du zuschauen kannst.', atSec: 0 },
      { label: 'Kaffee fließt', detail: 'Sobald Kaffee aufsteigt, Hitze reduzieren. Er soll ruhig und honigartig laufen.', atSec: 90 },
      { label: 'Vom Herd nehmen', detail: 'Wird der Strahl hell und fängt es an zu blubbern: sofort runter vom Herd.', atSec: 180 },
      { label: 'Abkühlen', detail: 'Boden kurz unter kaltes Wasser halten oder in ein nasses Tuch stellen – das stoppt die Extraktion.', atSec: 200 },
      { label: 'Genießen', detail: 'Umrühren und direkt servieren. Schmeckt auch toll mit einem Schluck warmer Milch.', atSec: 240 },
    ],
    tips: ['Niemals tampern – sonst baut sich zu viel Druck auf.', 'Deckel offen lassen und zuschauen: Das Blubbern ist dein Signal.', 'Nach dem Benutzen nur mit Wasser ausspülen, kein Spülmittel.'],
    recommended: ['hausbrueh', 'bergboee'],
    color: '#2c3448',
  },
  {
    slug: 'chemex',
    title: 'Chemex',
    subtitle: 'Für die große Kanne: sauber, elegant, sehr klar.',
    icon: 'chemex',
    difficulty: 'Mittel',
    totalSec: 270,
    dose: 30,
    doseRange: [20, 50],
    water: 500,
    waterUnit: 'g',
    waterLabel: 'Wasser',
    pourVerb: 'Gieße bis',
    ratio: '1:16,7',
    temp: '94 °C',
    grind: 'filter',
    grindHint: 'mittel – etwas gröber als für den V60',
    equipment: ['Chemex', 'Chemex-Filter (die dicken)', 'Waage mit Timer', 'Wasserkocher mit Schwanenhals'],
    prep: ['Wasser auf ca. 94 °C bringen', 'Filter mit der dreifachen Lage zur Ausgießrille einsetzen und heiß ausspülen', 'Spülwasser abgießen, Kaffee einfüllen, tarieren'],
    steps: [
      { label: 'Blooming', detail: 'Etwa doppelt so viel Wasser wie Kaffee eingießen, bis alles nass ist.', atSec: 0, pourTo: 60 },
      { label: 'Erster Aufguss', detail: 'In ruhigen Kreisen gießen, der Wasserstand bleibt etwa zwei Finger unter dem Rand.', atSec: 45, pourTo: 200 },
      { label: 'Zweiter Aufguss', detail: 'Weiter in Spiralen – nicht direkt auf den Filter gießen.', atSec: 90, pourTo: 350 },
      { label: 'Letzter Aufguss', detail: 'Bis zum Zielgewicht auffüllen.', atSec: 135, pourTo: 500 },
      { label: 'Durchlaufen lassen', detail: 'Geduld. Das dicke Papier filtert langsam, dafür besonders klar.', atSec: 170 },
      { label: 'Genießen', detail: 'Filter entsorgen, Chemex schwenken und einschenken.', atSec: 260 },
    ],
    tips: ['Läuft es zu langsam? Gröber mahlen.', 'Die Chemex ist perfekt für zwei bis vier Tassen – Dosis einfach mit dem Regler anpassen.', 'Die dreifache Filterlage gehört immer zur Ausgießrille.'],
    recommended: ['joerg', 'saisonkaffee'],
    color: '#c4702f',
  },
]

export function findGuide(slug: string | undefined) {
  return GUIDES.find((g) => g.slug === slug)
}

/** „3:00“ bzw. „0:30“ */
export function mmss(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Brühzeit lesbar, z. B. „ca. 3 Min.“ oder „ca. 30 Sek.“ */
export function durationLabel(totalSec: number) {
  return totalSec < 90 ? `ca. ${totalSec} Sek.` : `ca. ${Math.round(totalSec / 60)} Min.`
}

/** 16.666 → „16,7“ */
export function deNum(v: number, digits = 1) {
  return v.toLocaleString('de-DE', { maximumFractionDigits: digits })
}
