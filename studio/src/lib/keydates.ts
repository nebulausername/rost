import { addDays, isWithinInterval, startOfDay } from 'date-fns'
import type { KeyDate, KeyDateOccurrence } from './types'

/** Ostersonntag (Gauß/Meeus) */
export function easterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/** n-ter Wochentag im Monat (n = -1 → letzter) */
function nthWeekday(year: number, month: number, weekday: number, n: number) {
  if (n > 0) {
    const first = new Date(year, month - 1, 1)
    const diff = (weekday - first.getDay() + 7) % 7
    return new Date(year, month - 1, 1 + diff + (n - 1) * 7)
  }
  const last = new Date(year, month, 0)
  const diff = (last.getDay() - weekday + 7) % 7
  return new Date(year, month - 1, last.getDate() - diff)
}

/** 1. Advent = 4. Sonntag vor dem 25.12. */
function firstAdvent(year: number) {
  const christmas = new Date(year, 11, 25)
  const back = christmas.getDay() === 0 ? 7 : christmas.getDay()
  return addDays(christmas, -back - 21)
}

export function occurrenceInYear(kd: KeyDate, year: number): KeyDateOccurrence {
  const r = kd.rule
  let start: Date
  switch (r.type) {
    case 'fixed': {
      const [m, d] = r.md.split('-').map(Number)
      start = new Date(year, m - 1, d)
      break
    }
    case 'easter':
      start = addDays(easterSunday(year), r.offset)
      break
    case 'nth-weekday':
      start = addDays(nthWeekday(year, r.month, r.weekday, r.n), r.offset ?? 0)
      break
    case 'advent':
      start = addDays(firstAdvent(year), r.offset ?? 0)
      break
  }
  const days = Math.max(1, r.days ?? 1)
  return { keyDate: kd, start: startOfDay(start), end: startOfDay(addDays(start, days - 1)) }
}

/** Alle Vorkommen im Zeitraum (inklusive), chronologisch */
export function occurrencesBetween(keyDates: KeyDate[], from: Date, to: Date) {
  const out: KeyDateOccurrence[] = []
  for (let y = from.getFullYear() - 1; y <= to.getFullYear(); y++) {
    for (const kd of keyDates) {
      const occ = occurrenceInYear(kd, y)
      if (occ.end >= startOfDay(from) && occ.start <= to) out.push(occ)
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime())
}

export function occurrencesOnDay(occ: KeyDateOccurrence[], day: Date) {
  const d = startOfDay(day)
  return occ.filter((o) => isWithinInterval(d, { start: o.start, end: o.end }))
}
