import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

/** Klassen zusammenführen – spätere Tailwind-Klassen gewinnen (z. B. `w-auto` überschreibt `w-full`) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`
}

const eur0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eur2 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = new Intl.NumberFormat('de-DE')
const compact = new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 })
const pct1 = new Intl.NumberFormat('de-DE', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const fmt = {
  eur: (v: number) => eur0.format(Math.round(v)),
  eur2: (v: number) => eur2.format(v),
  num: (v: number) => num.format(Math.round(v)),
  compact: (v: number) => (Math.abs(v) >= 10000 ? compact.format(v) : num.format(Math.round(v))),
  pct: (v: number) => pct1.format(Number.isFinite(v) ? v : 0),
  ratio: (v: number) => (Number.isFinite(v) ? `${v.toLocaleString('de-DE', { maximumFractionDigits: 1 })}×` : '–'),
  date: (d: Date | string, pattern = 'd. MMM yyyy') => format(typeof d === 'string' ? parseISO(d) : d, pattern, { locale: de }),
  signed: (v: number, unit = '') => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${num.format(Math.abs(Math.round(v)))}${unit}`,
}

export function formatDe(d: Date | string, pattern: string) {
  return format(typeof d === 'string' ? parseISO(d) : d, pattern, { locale: de })
}

/** yyyy-MM-dd in lokaler Zeit */
export function dayKey(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

/** Deterministischer Zufall für reproduzierbare Demo-Daten */
export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function sum<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((acc, item) => acc + pick(item), 0)
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K) {
  const out = {} as Record<K, T[]>
  for (const item of items) {
    const k = key(item)
    ;(out[k] ??= []).push(item)
  }
  return out
}

export function extractHashtags(text: string) {
  return Array.from(new Set(text.match(/#[\p{L}\p{N}_]+/gu) ?? []))
}

export function buildUtmUrl(base: string, p: { source?: string; medium?: string; campaign?: string; content?: string }) {
  if (!base) return ''
  try {
    const url = new URL(base.startsWith('http') ? base : `https://${base}`)
    if (p.source) url.searchParams.set('utm_source', p.source)
    if (p.medium) url.searchParams.set('utm_medium', p.medium)
    if (p.campaign) url.searchParams.set('utm_campaign', p.campaign)
    if (p.content) url.searchParams.set('utm_content', p.content)
    return url.toString()
  } catch {
    return ''
  }
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Bild im Browser verkleinern, damit es in den lokalen Speicher passt */
export function compressImage(file: File, maxSize = 1080, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas nicht verfügbar'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function downloadFile(name: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
