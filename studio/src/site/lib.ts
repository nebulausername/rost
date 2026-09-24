import { addDays, format } from 'date-fns'
import type { CafeLocation, WeekHours } from '../lib/types'

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
export const price = (v: number) => eur.format(v)

export const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
export const DAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export interface OpenState {
  open: boolean
  /** z. B. „Geöffnet bis 18:00“ oder „Öffnet Mi um 12:00“ */
  label: string
  closesSoon: boolean
}

/** Live-Status eines Cafés aus den Wochen-Öffnungszeiten */
export function openState(hours: WeekHours, now = new Date()): OpenState {
  const today = hours[now.getDay()]
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (today && nowMin >= minutes(today.open) && nowMin < minutes(today.close)) {
    const left = minutes(today.close) - nowMin
    return { open: true, label: `Geöffnet bis ${today.close} Uhr`, closesSoon: left <= 45 }
  }
  if (today && nowMin < minutes(today.open)) return { open: false, label: `Öffnet heute um ${today.open} Uhr`, closesSoon: false }
  for (let i = 1; i <= 7; i++) {
    const d = addDays(now, i)
    const h = hours[d.getDay()]
    if (h) return { open: false, label: `Öffnet ${i === 1 ? 'morgen' : DAY_NAMES[d.getDay()]} um ${h.open} Uhr`, closesSoon: false }
  }
  return { open: false, label: 'Derzeit geschlossen', closesSoon: false }
}

/** Kompakte Öffnungszeiten, z. B. [{days: 'Mi–So', time: '12–18 Uhr'}, {days: 'Mo–Di', time: 'geschlossen'}] */
export function compactHours(hours: WeekHours) {
  const order = [1, 2, 3, 4, 5, 6, 0]
  const rows: { days: number[]; time: string }[] = []
  for (const d of order) {
    const h = hours[d]
    const time = h ? `${h.open.replace(':00', '')}–${h.close.replace(':00', '')} Uhr` : 'geschlossen'
    const last = rows[rows.length - 1]
    if (last && last.time === time) last.days.push(d)
    else rows.push({ days: [d], time })
  }
  return rows.map((r) => ({
    days: r.days.length > 2 ? `${DAY_SHORT[r.days[0]]}–${DAY_SHORT[r.days[r.days.length - 1]]}` : r.days.map((d) => DAY_SHORT[d]).join(', '),
    time: r.time,
  }))
}

export function anyCafeOpen(cafes: CafeLocation[], now = new Date()) {
  return cafes.map((c) => ({ cafe: c, state: openState(c.hours, now) }))
}

export function orderNumber() {
  return `RB-${format(new Date(), 'yyMMdd')}-${Math.floor(1000 + Math.random() * 9000)}`
}

export const ROAST_LABELS = ['', 'sehr hell', 'hell', 'mittel', 'mittel-dunkel', 'dunkel']

export const BREW_LABELS: Record<string, string> = {
  espresso: 'Siebträger',
  filter: 'Handfilter',
  french: 'French Press',
  moka: 'Mokkakanne',
  vollautomat: 'Vollautomat',
  aeropress: 'AeroPress',
}
