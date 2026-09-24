import { addDays, setHours, setMinutes, startOfDay } from 'date-fns'
import type { Booking, CafeLocation, Order, Product, SiteSettings, Subscriber, Workshop } from './types'
import { mulberry32, uid } from './utils'

// Website-Stammdaten für den Prototyp.
// Namen, Herkunft „Santos, Brasilien“ (Dörte) und „Espresso-Blend 80/20“ (Hausbrüh) sind öffentlich bekannt.
// Preise, Aromen & weitere Details sind BEISPIELWERTE – im Studio unter „Website → Sortiment“ pflegen.

export const PRODUCTS: Product[] = [
  {
    id: 'p-hausbrueh',
    slug: 'hausbrueh',
    name: 'Hausbrüh',
    subtitle: 'Espresso-Blend 80/20',
    kind: 'espresso',
    origin: 'Blend',
    region: '80/20 – Zusammensetzung laut Shop',
    process: 'gewaschen & natural',
    roast: 3,
    notes: ['Zartbitter', 'Haselnuss', 'Karamell'],
    description:
      'Unser Haus-Espresso. Rund, schokoladig, verlässlich – im Siebträger genauso wie in der Mokkakanne. Der Kaffee, den wir selbst am häufigsten trinken.',
    story: 'Hausbrüh ist das, was bei uns immer läuft: der Kaffee fürs Haus. Kein Schnickschnack, einfach gut.',
    price: 11.9,
    priceKg: 39.9,
    available: true,
    featured: true,
    color: '#5b3a29',
    brew: ['espresso', 'moka', 'vollautomat'],
    taste: { acidity: 2, body: 4, sweetness: 4, chocolate: 5, fruit: 1 },
    verify: true,
  },
  {
    id: 'p-doerte',
    slug: 'doerte',
    name: 'Dörte',
    subtitle: 'Santos, Brasilien',
    kind: 'omni',
    origin: 'Brasilien',
    region: 'Santos',
    process: 'natural',
    roast: 3,
    notes: ['Nougat', 'Milchschokolade', 'Mandel'],
    description:
      'Dörte ist unser Beweis, dass „schokoladig“ nicht „langweilig“ heißt. Sanfte Süße, wenig Säure, schöner Körper – als Filter und Espresso.',
    story: 'Dörte ist die gute Seele: unkompliziert, herzlich, immer da, wenn man sie braucht.',
    price: 10.9,
    priceKg: 36.9,
    available: true,
    featured: true,
    color: '#b8743f',
    brew: ['espresso', 'filter', 'french', 'vollautomat', 'aeropress'],
    taste: { acidity: 2, body: 3, sweetness: 4, chocolate: 4, fruit: 2 },
    verify: true,
  },
  {
    id: 'p-bergboee',
    slug: 'bergboee',
    name: 'Bergböe',
    subtitle: 'Espresso',
    kind: 'espresso',
    origin: 'Single Origin',
    region: 'Herkunft laut Shop',
    process: 'gewaschen',
    roast: 4,
    notes: ['Kakao', 'Rohrzucker', 'Gewürze'],
    description:
      'Kräftig, rund, mit einem Finish, das nachweht wie der Name. Für alle, die ihren Espresso mit Nachdruck mögen – und für Milchgetränke mit Charakter.',
    story: 'Eine Bergböe ist eine kräftige Böe vom Berg. Man merkt sie – und sie bleibt im Gedächtnis.',
    price: 12.9,
    priceKg: 42.9,
    available: true,
    featured: true,
    color: '#2c3448',
    brew: ['espresso', 'moka', 'vollautomat'],
    taste: { acidity: 1, body: 5, sweetness: 3, chocolate: 4, fruit: 1 },
    verify: true,
  },
  {
    id: 'p-joerg',
    slug: 'joerg',
    name: 'Jörg',
    subtitle: 'Filterkaffee',
    kind: 'filter',
    origin: 'Single Origin',
    region: 'Herkunft laut Shop',
    process: 'gewaschen',
    roast: 2,
    notes: ['Steinobst', 'Honig', 'Schwarztee'],
    description:
      'Klar, saftig, mit einer Säure, die Lust auf die nächste Tasse macht. Jörg zeigt, was Filterkaffee kann – in V60, Chemex oder AeroPress.',
    story: 'Jörg ist der, der morgens als Erster wach ist und trotzdem gute Laune hat.',
    price: 11.5,
    priceKg: 38.9,
    available: true,
    featured: true,
    color: '#4f7049',
    brew: ['filter', 'aeropress', 'french'],
    taste: { acidity: 4, body: 2, sweetness: 3, chocolate: 1, fruit: 5 },
    verify: true,
  },
  {
    id: 'p-saison',
    slug: 'saisonkaffee',
    name: 'Saisonkaffee',
    subtitle: 'wechselnd · limitiert',
    kind: 'filter',
    origin: 'wechselnd',
    region: 'aktuelle Ernte',
    process: 'wechselnd',
    roast: 2,
    notes: ['überraschend', 'frisch', 'limitiert'],
    description:
      'Was gerade frisch aus dem Import kommt und uns begeistert. Kleine Charge, solange der Rohkaffee reicht. Auch im Kaffee-Abo enthalten.',
    story: 'Jede Saison bekommt einen neuen Namen – sobald wir ihn kennengelernt haben.',
    price: 13.9,
    priceKg: null,
    available: true,
    featured: false,
    color: '#c4702f',
    brew: ['filter', 'aeropress', 'french'],
    taste: { acidity: 4, body: 2, sweetness: 4, chocolate: 2, fruit: 4 },
    verify: true,
  },
  {
    id: 'p-brueder',
    slug: 'brueder-paket',
    name: 'Brüderpaket',
    subtitle: 'Geschenkbox · 3 × 250 g',
    kind: 'gift',
    origin: 'Hausbrüh, Dörte & Jörg',
    region: 'Weimar',
    process: '—',
    roast: 3,
    notes: ['Geschenk', 'Probierset', 'Lieblinge'],
    description: 'Drei Kaffees, drei Charaktere – liebevoll verpackt mit Brühkarte. Das Geschenk für alle, die besseren Kaffee verdienen.',
    story: 'Weil man sich bei Geschwistern nie auf einen Favoriten einigen kann.',
    price: 34.9,
    priceKg: null,
    available: true,
    featured: false,
    color: '#8a5634',
    brew: ['espresso', 'filter', 'french', 'moka', 'vollautomat', 'aeropress'],
    taste: { acidity: 3, body: 3, sweetness: 4, chocolate: 3, fruit: 3 },
    verify: true,
  },
]

function session(daysFromNow: number, hour: number, taken: number) {
  return { id: uid('ses'), startsAt: setMinutes(setHours(addDays(startOfDay(new Date()), daysFromNow), hour), 0).toISOString(), seatsTaken: taken }
}

export function seedWorkshops(): Workshop[] {
  return [
    {
      id: 'w-latte',
      slug: 'latte-art-basics',
      title: 'Latte Art Basics',
      subtitle: 'Milch schäumen, Herz & Tulpe gießen',
      description: 'Vom samtigen Milchschaum bis zum ersten Herz: Wir zeigen dir Technik, Haltung und Tricks – und du gießt, bis es klappt.',
      learn: ['Milch richtig temperieren & texturieren', 'Herz, Tulpe & Rosetta Schritt für Schritt', 'Siebträger-Grundlagen für die perfekte Crema'],
      durationMin: 150,
      price: 69,
      capacity: 6,
      level: 'Einsteiger',
      location: 'roesterei',
      color: '#c4702f',
      sessions: [session(9, 17, 3), session(23, 17, 5), session(37, 11, 1), session(51, 17, 0)],
    },
    {
      id: 'w-espresso',
      slug: 'espresso-basics',
      title: 'Espresso Basics',
      subtitle: 'Siebträger verstehen & einstellen',
      description: 'Mahlgrad, Dosis, Brühzeit: Wir entzaubern den Espresso. Danach stellst du jede Bohne selbst ein – zuhause wie im Profi-Setup.',
      learn: ['Rezepte lesen: Dosis, Ausbeute, Zeit', 'Mahlgrad einstellen nach Geschmack', 'Fehler erkennen: sauer, bitter, dünn'],
      durationMin: 180,
      price: 79,
      capacity: 6,
      level: 'Alle',
      location: 'roesterei',
      color: '#5b3a29',
      sessions: [session(16, 11, 2), session(30, 17, 6), session(44, 11, 0)],
    },
    {
      id: 'w-filter',
      slug: 'filterkaffee-bruehmethoden',
      title: 'Filterkaffee & Brühmethoden',
      subtitle: 'V60, AeroPress, French Press im Vergleich',
      description: 'Ein Kaffee, vier Methoden, vier Geschmäcker. Du findest deine Lieblingszubereitung und nimmst ein Rezept für zuhause mit.',
      learn: ['Brühverhältnis & Wassertemperatur', 'V60, AeroPress, French Press & Chemex', 'Dein persönliches Rezept für morgens'],
      durationMin: 120,
      price: 49,
      capacity: 8,
      level: 'Einsteiger',
      location: 'roesterei',
      color: '#4f7049',
      sessions: [session(12, 17, 4), session(26, 11, 2), session(40, 17, 0)],
    },
    {
      id: 'w-cupping',
      slug: 'cupping-abend',
      title: 'Cupping-Abend',
      subtitle: 'Blind verkosten wie die Profis',
      description: 'Schlürfen erlaubt! Wir verkosten fünf Kaffees blind – ohne Fachsprache-Pflicht. Ideal für Neugierige und als Team-Event.',
      learn: ['Aromen erkennen & benennen', 'Herkunft & Aufbereitung schmecken', 'Wie wir unsere Rohkaffees auswählen'],
      durationMin: 90,
      price: 25,
      capacity: 12,
      level: 'Alle',
      location: 'roesterei',
      color: '#2c3448',
      sessions: [session(6, 18, 7), session(34, 18, 3)],
    },
  ]
}

export const CAFES: CafeLocation[] = [
  {
    id: 'roesterei',
    name: 'Rösterei & Café',
    address: 'Richard-Wagner-Straße 17, 99423 Weimar',
    tagline: 'Kaffee trinken, während der Röster läuft',
    description:
      'Rustikal, urban und mitten im Geschehen: Hier rösten wir, hier verkosten wir, hier finden die Workshops statt. Wer Glück hat, erwischt den ersten Crack live.',
    hours: {
      0: { open: '12:00', close: '18:00' },
      1: null,
      2: null,
      3: { open: '12:00', close: '18:00' },
      4: { open: '12:00', close: '18:00' },
      5: { open: '12:00', close: '18:00' },
      6: { open: '12:00', close: '18:00' },
    },
    notice: '',
    features: ['Röster in Aktion', 'Bohnen zum Mitnehmen', 'Workshops & Cuppings', 'Filterkaffee-Bar'],
  },
  {
    id: 'espressobar',
    name: 'Espressobar',
    address: 'Kaufstraße 19 · am Herderplatz, 99423 Weimar',
    tagline: 'Die Altstadt im Blick, den Espresso in der Hand',
    description:
      'Unsere Bar im historischen Zentrum: kleine Karte, große Aussicht und im Sommer eine Terrasse am Herderplatz. Perfekt für den Espresso zwischen Goethe und Herder.',
    hours: {
      0: { open: '09:00', close: '18:00' },
      1: { open: '09:00', close: '18:00' },
      2: { open: '09:00', close: '18:00' },
      3: { open: '09:00', close: '18:00' },
      4: { open: '09:00', close: '18:00' },
      5: { open: '09:00', close: '18:00' },
      6: { open: '09:00', close: '18:00' },
    },
    notice: '',
    features: ['Sommerterrasse', 'Blick auf den Herderplatz', 'Espresso & Milchgetränke', 'Bohnen to go'],
  },
]

export const SITE_SETTINGS: SiteSettings = {
  promo: { enabled: true, text: 'Tag des Kaffees am 1. Oktober: doppelte Stempel in beiden Cafés', link: '/cafes', linkLabel: 'Zu den Cafés' },
  heroTitle: 'Handgeröstet in Weimar. Von Brüdern gemacht.',
  heroText: 'Wir kaufen Rohkaffee bei kleinen Importeuren, die direkt und fair handeln – und rösten ihn in der Richard-Wagner-Straße zu Kaffees mit Charakter. Jeder davon hat einen Namen.',
  prototypeNotice: true,
}

/** Beispiel-Bestellungen & -Buchungen der letzten Wochen (Demo) */
export function seedSales(workshops: Workshop[]): { orders: Order[]; bookings: Booking[]; subscribers: Subscriber[] } {
  const rand = mulberry32(77)
  const cities = ['Weimar', 'Erfurt', 'Jena', 'Leipzig', 'Berlin', 'Gotha', 'Apolda', 'Dresden']
  const names = ['A. K.', 'M. S.', 'J. B.', 'L. W.', 'T. H.', 'S. R.', 'F. M.', 'C. P.', 'N. G.', 'E. D.']
  const sources = [null, 'instagram', 'google', 'newsletter', 'meta', 'print']
  const orders: Order[] = []
  for (let i = 0; i < 38; i++) {
    const d = addDays(new Date(), -Math.floor(rand() * 42))
    const p = PRODUCTS[Math.floor(rand() * 5)]
    const qty = 1 + Math.floor(rand() * 2)
    const kg = rand() < 0.2 && p.priceKg
    const abo = rand() < 0.25
    const unit = kg ? p.priceKg! : p.price
    const sub = unit * qty
    const shipping = sub >= 35 || abo ? 0 : 4.9
    orders.push({
      id: uid('ord'),
      number: `RB-${String(1040 + i)}`,
      createdAt: d.toISOString(),
      customer: { name: names[i % names.length], email: 'kunde@example.com', city: cities[Math.floor(rand() * cities.length)] },
      items: [{ label: abo ? `Kaffee-Abo · ${p.name}` : p.name, detail: kg ? '1 kg · ganze Bohne' : '250 g · ganze Bohne', qty, unit }],
      shipping,
      total: Math.round((sub + shipping) * 100) / 100,
      hasAbo: abo,
      utmSource: sources[Math.floor(rand() * sources.length)],
    })
  }
  const bookings: Booking[] = []
  for (const w of workshops) {
    for (const s of w.sessions) {
      let left = s.seatsTaken
      while (left > 0) {
        const seats = Math.min(left, 1 + Math.floor(rand() * 2))
        left -= seats
        bookings.push({
          id: uid('bk'),
          workshopId: w.id,
          sessionId: s.id,
          name: names[Math.floor(rand() * names.length)],
          email: 'gast@example.com',
          seats,
          gift: rand() < 0.3,
          createdAt: addDays(new Date(), -Math.floor(rand() * 20)).toISOString(),
        })
      }
    }
  }
  const subscribers: Subscriber[] = Array.from({ length: 24 }, (_, i) => ({
    email: `leser${i + 1}@example.com`,
    source: ['Website-Footer', 'Kasse', 'Geschmacksfinder', 'Café-QR'][i % 4],
    createdAt: addDays(new Date(), -Math.floor(rand() * 60)).toISOString(),
  }))
  return { orders: orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), bookings, subscribers }
}
