import { addDays, differenceInCalendarDays, format, parseISO, setHours, setMinutes, subDays } from 'date-fns'
import {
  CalendarPlus,
  Clock3,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  Package,
  Plus,
  ShoppingBag,
  Star,
  Ticket,
  Trash2,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { BarList, Delta, Meter, StatTile } from '../components/charts'
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select, Textarea, Toggle } from '../components/ui/primitives'
import { CoffeeBag } from '../site/components'
import { compactHours, DAY_NAMES, openState } from '../site/lib'
import { toast, useStore } from '../lib/store'
import type { CafeLocation, Product, Workshop } from '../lib/types'
import { cn, downloadFile, fmt, formatDe, slugify, sum, uid } from '../lib/utils'

type Tab = 'overview' | 'products' | 'workshops' | 'cafes' | 'content' | 'orders'

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Übersicht' },
  { value: 'products', label: 'Sortiment' },
  { value: 'workshops', label: 'Workshops' },
  { value: 'cafes', label: 'Cafés' },
  { value: 'content', label: 'Startseite & Aktionen' },
  { value: 'orders', label: 'Bestellungen, Anfragen & Newsletter' },
]

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  meta: 'Meta Ads',
  google: 'Google',
  newsletter: 'Newsletter',
  print: 'Print / QR',
  direct: 'Direkt / unbekannt',
}

export function WebsitePage() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'overview') as Tab
  const demo = useStore((s) => s.settings.demoData)

  return (
    <div>
      <PageHeader
        eyebrow="Website & Shop"
        title="Website"
        description="Alles, was auf roestbrueder.com steht, pflegst du hier: Sortiment, Workshop-Termine, Öffnungszeiten und Aktionen. Bestellungen, Buchungen und Newsletter-Anmeldungen der Website landen automatisch hier."
        actions={
          <>
            {demo ? <Badge tone="muted">Demo-Daten</Badge> : null}
            <a href="/" target="_blank" rel="noopener">
              <Button variant="primary">
                <Globe className="size-4" /> Website ansehen <ExternalLink className="size-3.5 opacity-70" />
              </Button>
            </a>
          </>
        }
      >
        <Segmented
          label="Bereich"
          value={tab}
          onChange={(v) => setParams(v === 'overview' ? {} : { tab: v }, { replace: true })}
          options={TABS}
          className="max-w-full self-start overflow-x-auto"
        />
      </PageHeader>
      {tab === 'overview' ? <Overview /> : null}
      {tab === 'products' ? <Products /> : null}
      {tab === 'workshops' ? <Workshops /> : null}
      {tab === 'cafes' ? <Cafes /> : null}
      {tab === 'content' ? <Content /> : null}
      {tab === 'orders' ? <Orders /> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Übersicht
// ---------------------------------------------------------------------------

function Overview() {
  const orders = useStore((s) => s.orders)
  const bookings = useStore((s) => s.bookings)
  const workshops = useStore((s) => s.workshops)
  const subscribers = useStore((s) => s.subscribers)
  const products = useStore((s) => s.products)
  const [, setParams] = useSearchParams()

  const k = useMemo(() => {
    const now = new Date()
    const from = subDays(now, 30)
    const prevFrom = subDays(now, 60)
    const cur = orders.filter((o) => parseISO(o.createdAt) >= from)
    const prev = orders.filter((o) => parseISO(o.createdAt) >= prevFrom && parseISO(o.createdAt) < from)
    const revenue = sum(cur, (o) => o.total)
    const revenuePrev = sum(prev, (o) => o.total)
    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = format(subDays(now, 29 - i), 'yyyy-MM-dd')
      return sum(orders.filter((o) => o.createdAt.slice(0, 10) === d), (o) => o.total)
    })
    const upcoming = workshops
      .flatMap((w) => w.sessions.map((s) => ({ w, s })))
      .filter(({ s }) => parseISO(s.startsAt) > now)
      .sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt))
    const seats = sum(upcoming, ({ w }) => w.capacity)
    const taken = sum(upcoming, ({ s }) => s.seatsTaken)
    const sources: Record<string, number> = {}
    for (const o of cur) sources[o.utmSource ?? 'direct'] = (sources[o.utmSource ?? 'direct'] ?? 0) + o.total
    const productRevenue: Record<string, number> = {}
    for (const o of cur) for (const it of o.items) productRevenue[it.label.replace('Kaffee-Abo · ', '')] = (productRevenue[it.label.replace('Kaffee-Abo · ', '')] ?? 0) + it.unit * it.qty
    const newSubs = subscribers.filter((x) => parseISO(x.createdAt) >= from).length
    return {
      cur,
      revenue,
      revenueDelta: revenuePrev ? ((revenue - revenuePrev) / revenuePrev) * 100 : 0,
      aov: cur.length ? revenue / cur.length : 0,
      aboShare: cur.length ? cur.filter((o) => o.hasAbo).length / cur.length : 0,
      daily,
      upcoming,
      occupancy: seats ? taken / seats : 0,
      sources: Object.entries(sources).sort((a, b) => b[1] - a[1]),
      productRevenue: Object.entries(productRevenue).sort((a, b) => b[1] - a[1]).slice(0, 6),
      newSubs,
      bookings30: bookings.filter((b) => parseISO(b.createdAt) >= from),
    }
  }, [orders, bookings, workshops, subscribers])

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Kennzahlen Website">
        <StatTile
          label="Shop-Umsatz · 30 Tage"
          icon={<ShoppingBag className="size-4" />}
          value={fmt.eur(k.revenue)}
          delta={<Delta value={k.revenueDelta} suffix=" %" />}
          deltaLabel="vs. Vormonat"
          trend={k.daily}
          trendFormat={(v) => fmt.eur(v)}
        />
        <StatTile label="Bestellungen" icon={<Package className="size-4" />} value={fmt.num(k.cur.length)} footnote={`Ø Warenkorb ${fmt.eur2(k.aov)} · ${fmt.pct(k.aboShare)} mit Abo`} />
        <StatTile
          label="Workshop-Auslastung"
          icon={<Ticket className="size-4" />}
          value={fmt.pct(k.occupancy)}
          footnote={
            <span className="block">
              <span className="mb-1.5 block">{k.bookings30.length} Buchungen in 30 Tagen</span>
              <Meter value={k.occupancy} max={1} tone={k.occupancy > 0.8 ? 'success' : 'accent'} label="Workshop-Auslastung" />
            </span>
          }
        />
        <StatTile label="Newsletter" icon={<Mail className="size-4" />} value={fmt.num(subscribers.length)} delta={<Delta value={k.newSubs} format={(v) => fmt.num(v)} />} deltaLabel="neu in 30 Tagen" />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Neueste Bestellungen"
            subtitle="Direkt aus dem Website-Checkout"
            icon={<ShoppingBag className="size-4" />}
            action={
              <Button size="sm" variant="ghost" onClick={() => setParams({ tab: 'orders' })}>
                Alle ansehen
              </Button>
            }
          />
          <OrderTable limit={7} />
        </Card>
        <Card>
          <CardHeader title="Umsatz nach Herkunft" subtitle="UTM-Quelle der Bestellung · 30 Tage – verbindet Shop & Kampagnen" />
          <div className="px-5 pb-5">
            {k.sources.length ? (
              <BarList items={k.sources.map(([key, v]) => ({ key, label: SOURCE_LABELS[key] ?? key, value: v }))} format={(v) => fmt.eur(v)} />
            ) : (
              <p className="py-6 text-center text-sm text-ink-3">Noch keine Bestellungen.</p>
            )}
            <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
              Die Website merkt sich <code className="rounded bg-surface-2 px-1">utm_source</code> beim ersten Besuch. Links aus Kampagnen & Posts mit UTM landen hier.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Nächste Workshop-Termine" subtitle="Plätze & Buchungen" icon={<Ticket className="size-4" />} />
          <ul className="divide-y divide-line px-5 pb-3">
            {k.upcoming.slice(0, 6).map(({ w, s }) => {
              const left = w.capacity - s.seatsTaken
              return (
                <li key={s.id} className="grid grid-cols-[56px_1fr] items-center gap-4 py-3 sm:grid-cols-[56px_1fr_220px]">
                  <div className="rounded-xl bg-surface-2 py-1.5 text-center">
                    <p className="text-[10px] font-semibold text-ink-3 uppercase">{formatDe(s.startsAt, 'MMM')}</p>
                    <p className="text-lg leading-none font-semibold text-ink tabular">{format(parseISO(s.startsAt), 'd')}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{w.title}</p>
                    <p className="text-[11px] text-ink-3">
                      {formatDe(s.startsAt, "EEEE, HH:mm 'Uhr'")} · {fmt.eur(w.price)} · in {differenceInCalendarDays(parseISO(s.startsAt), new Date())} Tagen
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <div className="mb-1 flex justify-between text-[11px] text-ink-3 tabular">
                      <span>
                        {s.seatsTaken}/{w.capacity} Plätze
                      </span>
                      <span className={cn(left === 0 ? 'font-semibold text-success' : left <= 2 ? 'text-warning' : '')}>{left === 0 ? 'ausgebucht' : `${left} frei`}</span>
                    </div>
                    <Meter value={s.seatsTaken} max={w.capacity} tone={left === 0 ? 'success' : 'accent'} label={`Auslastung ${w.title}`} />
                  </div>
                </li>
              )
            })}
            {!k.upcoming.length ? <li className="py-6 text-center text-sm text-ink-3">Keine kommenden Termine – lege welche unter „Workshops“ an.</li> : null}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Bestseller" subtitle="Umsatz je Kaffee · 30 Tage" icon={<Star className="size-4" />} />
          <div className="px-5 pb-5">
            {k.productRevenue.length ? (
              <BarList items={k.productRevenue.map(([key, v]) => ({ key, label: key, value: v }))} format={(v) => fmt.eur(v)} color="var(--roast)" />
            ) : (
              <p className="py-6 text-center text-sm text-ink-3">Noch keine Verkäufe.</p>
            )}
            <p className="mt-4 text-[11px] text-ink-3">{products.filter((p) => !p.available).length ? `${products.filter((p) => !p.available).length} Produkt(e) gerade ausverkauft.` : 'Alle Produkte verfügbar.'}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function OrderTable({ limit }: { limit?: number }) {
  const orders = useStore((s) => s.orders)
  const list = limit ? orders.slice(0, limit) : orders
  if (!orders.length) return <EmptyState className="m-5" icon={<ShoppingBag className="size-5" />} title="Noch keine Bestellungen" description="Sobald jemand im Website-Shop bestellt, erscheint es hier." />
  return (
    <div className="overflow-x-auto px-2 pb-3 scrollbar-thin">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            <th className="px-3 py-2">Bestellung</th>
            <th className="px-3 py-2">Kund:in</th>
            <th className="px-3 py-2">Artikel</th>
            <th className="px-3 py-2">Quelle</th>
            <th className="px-3 py-2 text-right">Summe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {list.map((o) => (
            <tr key={o.id} className="hover:bg-surface-2/50">
              <td className="px-3 py-2.5">
                <p className="font-semibold text-ink tabular">{o.number}</p>
                <p className="text-[11px] text-ink-3">{formatDe(o.createdAt, "d. MMM, HH:mm 'Uhr'")}</p>
              </td>
              <td className="px-3 py-2.5">
                <p className="text-ink">{o.customer.name}</p>
                <p className="text-[11px] text-ink-3">{o.customer.city}</p>
              </td>
              <td className="max-w-[260px] px-3 py-2.5">
                <p className="truncate text-ink-2">{o.items.map((i) => `${i.qty}× ${i.label}`).join(', ')}</p>
                {o.hasAbo ? <Badge tone="accent">Abo</Badge> : null}
              </td>
              <td className="px-3 py-2.5 text-ink-2">{SOURCE_LABELS[o.utmSource ?? 'direct'] ?? o.utmSource}</td>
              <td className="px-3 py-2.5 text-right font-semibold text-ink tabular">{fmt.eur2(o.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sortiment
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<Product['kind'], string> = { espresso: 'Espresso', filter: 'Filter', omni: 'Für alles', gift: 'Geschenk', voucher: 'Gutschein' }

function Products() {
  const products = useStore((s) => s.products)
  const upsert = useStore((s) => s.upsertProduct)
  const [edit, setEdit] = useState<Product | null>(null)
  const blank = (): Product => ({
    id: uid('p'),
    slug: '',
    name: '',
    subtitle: '',
    kind: 'filter',
    origin: '',
    region: '',
    process: 'gewaschen',
    roast: 3,
    notes: [],
    description: '',
    story: '',
    price: 11.9,
    priceKg: null,
    available: true,
    featured: false,
    color: '#8a5634',
    brew: ['filter'],
    taste: { acidity: 3, body: 3, sweetness: 3, chocolate: 3, fruit: 3 },
    verify: true,
  })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          {products.length} Produkte · {products.filter((p) => p.available).length} verfügbar · {products.filter((p) => p.featured).length} auf der Startseite
        </p>
        <Button variant="primary" onClick={() => setEdit(blank())}>
          <Plus className="size-4" /> Neuer Kaffee
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <Card key={p.id} className={cn('flex flex-col overflow-hidden', !p.available && 'opacity-70')}>
            <div className="relative flex items-end justify-center px-10 pt-6" style={{ background: `color-mix(in oklab, ${p.color} 18%, var(--surface-2))` }}>
              <CoffeeBag product={p} className="w-36 translate-y-4" />
              <div className="absolute top-3 left-3 flex gap-1.5">
                {p.featured ? <Badge tone="accent">Startseite</Badge> : null}
                {!p.available ? <Badge tone="danger">Ausverkauft</Badge> : null}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold text-ink">{p.name}</p>
                  <p className="text-xs text-ink-3">
                    {p.subtitle} · {KIND_LABELS[p.kind]}
                  </p>
                </div>
                <p className="text-right text-sm font-semibold text-ink tabular">
                  {fmt.eur2(p.price)}
                  {p.priceKg ? <span className="block text-[11px] font-normal text-ink-3">1 kg {fmt.eur2(p.priceKg)}</span> : null}
                </p>
              </div>
              <p className="line-clamp-2 text-xs text-ink-2">{p.notes.join(' · ')}</p>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                <label className="flex items-center gap-2 text-xs text-ink-2">
                  <Toggle checked={p.available} onChange={(v) => upsert({ ...p, available: v })} label={`${p.name} verfügbar`} /> verfügbar
                </label>
                <label className="flex items-center gap-2 text-xs text-ink-2">
                  <Toggle checked={p.featured} onChange={(v) => upsert({ ...p, featured: v })} label={`${p.name} auf Startseite`} /> Startseite
                </label>
                <Button size="sm" onClick={() => setEdit(p)}>
                  Bearbeiten
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-[11px] text-ink-3">Preise, Aromen und Herkunftsdetails sind Beispielwerte aus dem Prototyp – bitte mit dem echten Shop abgleichen.</p>
      {edit ? <ProductModal product={edit} onClose={() => setEdit(null)} /> : null}
    </div>
  )
}

function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertProduct)
  const remove = useStore((s) => s.deleteProduct)
  const exists = useStore((s) => s.products.some((p) => p.id === product.id))
  const [p, setP] = useState(product)
  const [notes, setNotes] = useState(product.notes.join(', '))
  const [error, setError] = useState('')
  const set = (patch: Partial<Product>) => setP((x) => ({ ...x, ...patch }))
  const save = () => {
    if (!p.name.trim()) return setError('Der Kaffee braucht einen Namen.')
    if (!(p.price > 0)) return setError('Bitte einen Preis angeben.')
    upsert({ ...p, name: p.name.trim(), slug: p.slug || slugify(p.name), notes: notes.split(',').map((n) => n.trim()).filter(Boolean) })
    toast({ tone: 'success', title: exists ? 'Produkt gespeichert' : 'Produkt angelegt', description: 'Die Website zeigt die Änderung sofort.' })
    onClose()
  }
  const tasteRows: { key: keyof Product['taste']; label: string }[] = [
    { key: 'acidity', label: 'Säure' },
    { key: 'body', label: 'Körper' },
    { key: 'sweetness', label: 'Süße' },
    { key: 'chocolate', label: 'Schokoladig' },
    { key: 'fruit', label: 'Fruchtig' },
  ]
  return (
    <Modal
      open
      onClose={onClose}
      title={exists ? `${product.name} bearbeiten` : 'Neuer Kaffee'}
      className="max-w-3xl"
      footer={
        <>
          {exists ? (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:bg-danger-soft hover:text-danger"
              onClick={() => {
                remove(product.id)
                toast({ title: 'Produkt entfernt', action: { label: 'Rückgängig', run: () => useStore.getState().upsertProduct(product) } })
                onClose()
              }}
            >
              <Trash2 className="size-4" /> Löschen
            </Button>
          ) : null}
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" onClick={save}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_180px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="pr-name">
            <Input id="pr-name" value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="z. B. Gisela" />
          </Field>
          <Field label="Untertitel" htmlFor="pr-sub">
            <Input id="pr-sub" value={p.subtitle} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Herkunft oder Stil" />
          </Field>
          <Field label="Art" htmlFor="pr-kind">
            <Select id="pr-kind" value={p.kind} onChange={(e) => set({ kind: e.target.value as Product['kind'] })}>
              {Object.entries(KIND_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Röstgrad" htmlFor="pr-roast" aside={['', 'sehr hell', 'hell', 'mittel', 'mittel-dunkel', 'dunkel'][p.roast]}>
            <input id="pr-roast" type="range" min={1} max={5} value={p.roast} onChange={(e) => set({ roast: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
          </Field>
          <Field label="Preis 250 g (€)" htmlFor="pr-price">
            <Input id="pr-price" type="number" step="0.1" min={0} value={p.price} onChange={(e) => set({ price: Number(e.target.value) })} className="text-right tabular" />
          </Field>
          <Field label="Preis 1 kg (€, optional)" htmlFor="pr-kg">
            <Input id="pr-kg" type="number" step="0.1" min={0} value={p.priceKg ?? ''} onChange={(e) => set({ priceKg: e.target.value ? Number(e.target.value) : null })} className="text-right tabular" />
          </Field>
          <Field label="Herkunft" htmlFor="pr-origin">
            <Input id="pr-origin" value={p.origin} onChange={(e) => set({ origin: e.target.value })} />
          </Field>
          <Field label="Region / Farm" htmlFor="pr-region">
            <Input id="pr-region" value={p.region} onChange={(e) => set({ region: e.target.value })} />
          </Field>
          <Field label="Aromen (kommagetrennt)" htmlFor="pr-notes" className="sm:col-span-2">
            <Input id="pr-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nougat, Haselnuss, Kakao" />
          </Field>
          <Field label="Beschreibung" htmlFor="pr-desc" className="sm:col-span-2">
            <Textarea id="pr-desc" rows={3} value={p.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <Field label="Warum heißt er so?" htmlFor="pr-story" className="sm:col-span-2" hint="Die Namensgeschichte – unser stärkstes Markenelement.">
            <Textarea id="pr-story" rows={2} value={p.story} onChange={(e) => set({ story: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <p className="label">Geschmacksprofil (für den Geschmacksfinder)</p>
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {tasteRows.map((r) => (
                <label key={r.key} className="grid grid-cols-[90px_1fr_20px] items-center gap-2 text-xs text-ink-2">
                  {r.label}
                  <input type="range" min={1} max={5} value={p.taste[r.key]} onChange={(e) => set({ taste: { ...p.taste, [r.key]: Number(e.target.value) } })} className="accent-[var(--accent)]" />
                  <span className="text-right font-semibold text-ink tabular">{p.taste[r.key]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="w-full rounded-2xl px-4 pt-4" style={{ background: `color-mix(in oklab, ${p.color} 18%, var(--surface-2))` }}>
            <CoffeeBag product={{ ...p, name: p.name || 'Name', subtitle: p.subtitle || 'Untertitel' }} />
          </div>
          <label className="flex w-full items-center justify-between gap-2 text-xs text-ink-2">
            Tütenfarbe
            <input type="color" value={p.color} onChange={(e) => set({ color: e.target.value })} className="h-8 w-14 cursor-pointer rounded border border-line bg-surface" />
          </label>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Workshops
// ---------------------------------------------------------------------------

function Workshops() {
  const workshops = useStore((s) => s.workshops)
  const bookings = useStore((s) => s.bookings)
  const upsert = useStore((s) => s.upsertWorkshop)
  const [adding, setAdding] = useState<Workshop | null>(null)
  const [date, setDate] = useState(() => format(addDays(new Date(), 14), 'yyyy-MM-dd'))
  const [time, setTime] = useState('17:00')

  const addSession = (w: Workshop) => {
    const [y, m, d] = date.split('-').map(Number)
    const [h, min] = time.split(':').map(Number)
    const startsAt = setMinutes(setHours(new Date(y, m - 1, d), h), min)
    if (startsAt < new Date()) return toast({ tone: 'danger', title: 'Der Termin liegt in der Vergangenheit' })
    upsert({ ...w, sessions: [...w.sessions, { id: uid('ses'), startsAt: startsAt.toISOString(), seatsTaken: 0 }].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) })
    toast({ tone: 'success', title: 'Termin hinzugefügt', description: `${w.title} · ${formatDe(startsAt, "EEE d. MMM, HH:mm 'Uhr'")} – ab sofort buchbar.` })
    setAdding(null)
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {workshops.map((w) => {
        const upcoming = w.sessions.filter((s) => parseISO(s.startsAt) > new Date())
        return (
          <Card key={w.id} className="overflow-hidden">
            <div className="h-1.5" style={{ background: w.color }} />
            <CardHeader
              title={w.title}
              subtitle={`${w.subtitle} · ${Math.round(w.durationMin / 60 * 10) / 10} Std. · ${fmt.eur(w.price)} · max. ${w.capacity} Personen`}
              action={
                <Button size="sm" onClick={() => setAdding(w)}>
                  <CalendarPlus className="size-3.5" /> Termin
                </Button>
              }
            />
            <ul className="divide-y divide-line px-5 pb-3">
              {upcoming.map((s) => {
                const sb = bookings.filter((b) => b.sessionId === s.id)
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <div className="w-40 shrink-0">
                      <p className="text-sm font-medium text-ink">{formatDe(s.startsAt, 'EEE d. MMM')}</p>
                      <p className="text-[11px] text-ink-3">{formatDe(s.startsAt, "HH:mm 'Uhr'")}</p>
                    </div>
                    <div className="min-w-32 flex-1">
                      <div className="mb-1 flex justify-between text-[11px] text-ink-3 tabular">
                        <span>{s.seatsTaken}/{w.capacity}</span>
                        <span>{sb.length} Buchung{sb.length === 1 ? '' : 'en'}</span>
                      </div>
                      <Meter value={s.seatsTaken} max={w.capacity} tone={s.seatsTaken >= w.capacity ? 'success' : 'accent'} label="Auslastung" />
                    </div>
                    <div className="flex -space-x-1.5" title={sb.map((b) => `${b.name} (${b.seats})${b.gift ? ' – Geschenk' : ''}`).join(', ')}>
                      {sb.slice(0, 5).map((b) => (
                        <span key={b.id} className="flex size-6 items-center justify-center rounded-full bg-surface-3 text-[9px] font-semibold text-ink-2 ring-2 ring-surface">
                          {b.name.replace(/[^A-ZÄÖÜ]/g, '').slice(0, 2)}
                        </span>
                      ))}
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Termin entfernen"
                      disabled={s.seatsTaken > 0}
                      title={s.seatsTaken > 0 ? 'Termin hat Buchungen – erst Gäste informieren' : 'Termin entfernen'}
                      onClick={() => upsert({ ...w, sessions: w.sessions.filter((x) => x.id !== s.id) })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                )
              })}
              {!upcoming.length ? <li className="py-5 text-center text-sm text-ink-3">Keine kommenden Termine – auf der Website erscheint „Neue Termine folgen“.</li> : null}
            </ul>
          </Card>
        )
      })}
      <Modal
        open={!!adding}
        onClose={() => setAdding(null)}
        title={`Neuer Termin: ${adding?.title ?? ''}`}
        footer={
          <>
            <Button onClick={() => setAdding(null)}>Abbrechen</Button>
            <Button variant="primary" onClick={() => adding && addSession(adding)}>
              Termin anlegen
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Datum" htmlFor="ws-date">
            <Input id="ws-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Uhrzeit" htmlFor="ws-time">
            <Input id="ws-time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-ink-3">Tipp: Plane einen Post zum Termin – im Redaktionskalender unter „Events & Workshops“.</p>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cafés & Öffnungszeiten
// ---------------------------------------------------------------------------

function Cafes() {
  const cafes = useStore((s) => s.cafes)
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {cafes.map((c) => (
        <CafeEditor key={c.id} cafe={c} />
      ))}
    </div>
  )
}

function CafeEditor({ cafe }: { cafe: CafeLocation }) {
  const update = useStore((s) => s.updateCafe)
  const state = openState(cafe.hours)
  const setDay = (d: number, v: CafeLocation['hours'][number]) => update(cafe.id, { hours: { ...cafe.hours, [d]: v } })
  return (
    <Card>
      <CardHeader
        title={cafe.name}
        subtitle={cafe.address}
        icon={<Clock3 className="size-4" />}
        action={<Badge tone={state.open ? 'success' : 'muted'} dot>{state.label}</Badge>}
      />
      <div className="space-y-4 px-5 pb-5">
        <ul className="divide-y divide-line rounded-xl border border-line">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const h = cafe.hours[d]
            return (
              <li key={d} className={cn('flex flex-wrap items-center gap-3 px-3 py-2', new Date().getDay() === d && 'bg-accent-soft/40')}>
                <span className="w-24 text-sm font-medium text-ink">{DAY_NAMES[d]}</span>
                <Toggle checked={!!h} onChange={(v) => setDay(d, v ? { open: '09:00', close: '18:00' } : null)} label={`${DAY_NAMES[d]} geöffnet`} />
                {h ? (
                  <span className="flex items-center gap-1.5">
                    <Input type="time" step={900} value={h.open} onChange={(e) => setDay(d, { ...h, open: e.target.value })} className="h-8 w-28 text-xs" aria-label={`${DAY_NAMES[d]} öffnet`} />
                    <span className="text-ink-3">–</span>
                    <Input type="time" step={900} value={h.close} onChange={(e) => setDay(d, { ...h, close: e.target.value })} className="h-8 w-28 text-xs" aria-label={`${DAY_NAMES[d]} schließt`} />
                  </span>
                ) : (
                  <span className="text-xs text-ink-3">geschlossen</span>
                )}
              </li>
            )
          })}
        </ul>
        <Field label="Hinweis auf der Website" htmlFor={`notice-${cafe.id}`} hint="Z. B. „Zwiebelmarkt: Samstag schon ab 8 Uhr“ – leer lassen, wenn es nichts gibt.">
          <Input id={`notice-${cafe.id}`} value={cafe.notice} onChange={(e) => update(cafe.id, { notice: e.target.value })} placeholder="Sonderöffnungszeiten, Terrasse geöffnet …" />
        </Field>
        <p className="text-[11px] text-ink-3">
          Auf der Website: {compactHours(cafe.hours).map((r) => `${r.days} ${r.time}`).join(' · ')}. Öffnungszeiten laut echter Website prüfen – auch im Google-Unternehmensprofil aktualisieren.
        </p>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Startseite & Aktionen
// ---------------------------------------------------------------------------

function Content() {
  const site = useStore((s) => s.site)
  const update = useStore((s) => s.updateSite)
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Aktionsbanner" subtitle="Schmale Leiste ganz oben auf jeder Seite" action={<Toggle checked={site.promo.enabled} onChange={(v) => update({ promo: { ...site.promo, enabled: v } })} label="Aktionsbanner aktiv" />} />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <Field label="Text" htmlFor="promo-text" className="sm:col-span-2">
              <Input id="promo-text" value={site.promo.text} onChange={(e) => update({ promo: { ...site.promo, text: e.target.value } })} />
            </Field>
            <Field label="Link" htmlFor="promo-link">
              <Select id="promo-link" value={site.promo.link} onChange={(e) => update({ promo: { ...site.promo, link: e.target.value } })}>
                {['/shop', '/abo', '/workshops', '/cafes', '/geschmacksfinder', '/herkunft', '/anleitungen'].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Link-Text" htmlFor="promo-label">
              <Input id="promo-label" value={site.promo.linkLabel} onChange={(e) => update({ promo: { ...site.promo, linkLabel: e.target.value } })} />
            </Field>
            <div className="flex flex-wrap gap-1.5 sm:col-span-2">
              {[
                { text: 'Tag des Kaffees am 1. Oktober: doppelte Stempel in beiden Cafés', link: '/cafes', linkLabel: 'Zu den Cafés' },
                { text: 'Fair Friday: Abo starten, erste Lieferung doppelt', link: '/abo', linkLabel: 'Zum Abo' },
                { text: 'Geschenke mit Geschmack: Brüderpaket & Workshop-Gutscheine', link: '/shop', linkLabel: 'Geschenke' },
                { text: 'Letzter Versandtag vor Weihnachten: 18.12.', link: '/shop', linkLabel: 'Jetzt bestellen' },
              ].map((preset) => (
                <button
                  key={preset.text}
                  type="button"
                  onClick={() => update({ promo: { ...preset, enabled: true } })}
                  className="rounded-lg border border-dashed border-line-strong px-2.5 py-1 text-[11px] text-ink-2 hover:border-accent hover:text-accent-text"
                >
                  {preset.text.split(':')[0]}
                </button>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Startseite" subtitle="Headline & Einleitung im großen Hero-Bereich" />
          <div className="space-y-3 px-5 pb-5">
            <Field label="Headline" htmlFor="hero-title" aside={`${site.heroTitle.length} Zeichen`}>
              <Input id="hero-title" value={site.heroTitle} onChange={(e) => update({ heroTitle: e.target.value })} />
            </Field>
            <Field label="Einleitung" htmlFor="hero-text" aside={`${site.heroText.length} Zeichen`}>
              <Textarea id="hero-text" rows={4} value={site.heroText} onChange={(e) => update({ heroText: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-xs text-ink-2">
              <Toggle checked={site.prototypeNotice} onChange={(v) => update({ prototypeNotice: v })} label="Prototyp-Hinweis" /> Hinweis „Prototyp · Beispielpreise“ auf der Website anzeigen
            </label>
          </div>
        </Card>
      </div>
      <Card className="self-start overflow-hidden xl:sticky xl:top-20">
        <CardHeader title="Vorschau" subtitle="So ungefähr sieht’s auf der Startseite aus" action={<a href="/" target="_blank" rel="noopener" className="text-xs font-semibold text-accent-text hover:underline">Live öffnen</a>} />
        <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-line">
          {site.promo.enabled ? (
            <div className="bg-accent-solid px-3 py-1.5 text-center text-[10px] font-medium text-on-accent">
              {site.promo.text} · <span className="underline">{site.promo.linkLabel}</span>
            </div>
          ) : null}
          <div className="grain bg-sidebar px-5 py-8 text-sidebar-ink">
            <p className="text-[9px] font-semibold tracking-[0.2em] text-accent uppercase">Kaffeerösterei & Cafés in Weimar</p>
            <p className="mt-2 font-display text-2xl leading-tight font-semibold">{site.heroTitle || 'Headline'}</p>
            <p className="mt-2 line-clamp-4 text-xs text-sidebar-ink/75">{site.heroText}</p>
            <div className="mt-4 flex gap-2">
              <span className="rounded-full bg-accent-solid px-3 py-1 text-[10px] font-semibold text-on-accent">Kaffee entdecken</span>
              <span className="rounded-full border border-white/25 px-3 py-1 text-[10px] font-semibold">Welcher Kaffee passt zu mir?</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bestellungen & Newsletter
// ---------------------------------------------------------------------------

function Messages() {
  const messages = useStore((s) => s.messages ?? [])
  const setDone = useStore((s) => s.setMessageDone)
  const open = messages.filter((m) => !m.done).length
  return (
    <Card>
      <CardHeader title="Kontaktanfragen" subtitle={`${messages.length} Nachrichten über das Formular auf „Über uns“ · ${open} offen`} icon={<Mail className="size-4" />} />
      {messages.length ? (
        <ul className="divide-y divide-line px-5 pb-3">
          {messages.map((m) => (
            <li key={m.id} className={cn('flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between', m.done && 'opacity-60')}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {m.name} <span className="font-normal text-ink-3">· {m.email}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-ink-3">
                  {m.topic} · {formatDe(m.createdAt, "d. MMM, HH:mm 'Uhr'")}
                </p>
                <p className="mt-1.5 text-sm whitespace-pre-line text-ink-2">{m.message}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic}`)}`}>
                  <Button size="sm">Antworten</Button>
                </a>
                <Button size="sm" variant={m.done ? 'ghost' : 'secondary'} onClick={() => setDone(m.id, !m.done)}>
                  {m.done ? 'Wieder öffnen' : 'Erledigt'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-6 text-sm text-ink-3">Noch keine Anfragen – sie erscheinen hier, sobald jemand das Kontaktformular auf der Website nutzt.</p>
      )}
    </Card>
  )
}

function Orders() {
  const subscribers = useStore((s) => s.subscribers)
  const bookings = useStore((s) => s.bookings)
  const workshops = useStore((s) => s.workshops)
  const exportCsv = () => {
    const rows = ['E-Mail;Quelle;Datum', ...subscribers.map((s) => `${s.email};${s.source};${format(parseISO(s.createdAt), 'dd.MM.yyyy')}`)]
    downloadFile(`newsletter-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows.join('\n'), 'text/csv;charset=utf-8')
  }
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Bestellungen" subtitle="Alle Bestellungen aus dem Website-Checkout (Demo – keine echten Zahlungen)" icon={<ShoppingBag className="size-4" />} />
        <OrderTable />
      </Card>
      <Messages />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Workshop-Buchungen" subtitle={`${bookings.length} Buchungen`} icon={<Users className="size-4" />} />
          <ul className="max-h-96 divide-y divide-line overflow-y-auto px-5 pb-3 scrollbar-thin">
            {bookings.slice(0, 60).map((b) => {
              const w = workshops.find((x) => x.id === b.workshopId)
              const s = w?.sessions.find((x) => x.id === b.sessionId)
              return (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">
                      {b.name} · {b.seats} {b.seats === 1 ? 'Platz' : 'Plätze'}
                    </span>
                    <span className="block text-[11px] text-ink-3">
                      {w?.title ?? 'Workshop'} {s ? `· ${formatDe(s.startsAt, 'd. MMM, HH:mm')}` : ''}
                    </span>
                    {b.giftNote ? <span className="mt-0.5 block text-[11px] text-accent-text italic">„{b.giftNote}“</span> : null}
                  </span>
                  {b.gift ? <Badge tone="accent">Geschenk</Badge> : null}
                </li>
              )
            })}
            {!bookings.length ? <li className="py-6 text-center text-sm text-ink-3">Noch keine Buchungen.</li> : null}
          </ul>
        </Card>
        <Card>
          <CardHeader
            title="Newsletter „Röstbrüder Post“"
            subtitle={`${subscribers.length} Anmeldungen`}
            icon={<Mail className="size-4" />}
            action={
              <Button size="sm" onClick={exportCsv} disabled={!subscribers.length}>
                <Copy className="size-3.5" /> CSV
              </Button>
            }
          />
          <div className="px-5 pb-3">
            <BarList
              items={Object.entries(subscribers.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.source]: (acc[s.source] ?? 0) + 1 }), {}))
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => ({ key: k, label: k, value: v }))}
            />
            <ul className="mt-4 max-h-52 divide-y divide-line overflow-y-auto text-sm scrollbar-thin">
              {subscribers.slice(0, 40).map((s) => (
                <li key={s.email} className="flex justify-between gap-3 py-2">
                  <span className="truncate text-ink-2">{s.email}</span>
                  <span className="shrink-0 text-[11px] text-ink-3">{formatDe(s.createdAt, 'd. MMM')}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-ink-3">Vor dem Versand: Double-Opt-in über euren Newsletter-Dienst (DSGVO).</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
