import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import type { Campaign, DailyStat, Post } from './types'
import { sum } from './utils'

export interface CampaignTotals {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  ctr: number
  cpc: number
  cpm: number
  cpa: number
  roas: number
  cvr: number
}

export function totals(daily: DailyStat[]): CampaignTotals {
  const spend = sum(daily, (d) => d.spend)
  const impressions = sum(daily, (d) => d.impressions)
  const clicks = sum(daily, (d) => d.clicks)
  const conversions = sum(daily, (d) => d.conversions)
  const revenue = sum(daily, (d) => d.revenue)
  return {
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    ctr: impressions ? clicks / impressions : 0,
    cpc: clicks ? spend / clicks : 0,
    cpm: impressions ? (spend / impressions) * 1000 : 0,
    cpa: conversions ? spend / conversions : 0,
    roas: spend ? revenue / spend : 0,
    cvr: clicks ? conversions / clicks : 0,
  }
}

export interface Pacing {
  totalDays: number
  elapsedDays: number
  /** Anteil der Laufzeit (0–1) */
  timeShare: number
  /** Anteil des Budgets ausgegeben (0–1+) */
  spendShare: number
  /** Soll-Ausgaben bis heute */
  expected: number
  /** >1 = zu schnell, <1 = zu langsam */
  ratio: number
  state: 'not-started' | 'on-track' | 'over' | 'under' | 'done'
  remaining: number
  suggestedDaily: number
}

export function pacing(c: Campaign, today = new Date()): Pacing {
  const start = parseISO(c.startDate)
  const end = parseISO(c.endDate)
  const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1)
  const elapsedDays = Math.min(totalDays, Math.max(0, differenceInCalendarDays(startOfDay(today), start) + 1))
  const spent = sum(c.daily, (d) => d.spend)
  const timeShare = elapsedDays / totalDays
  const spendShare = c.budget ? spent / c.budget : 0
  const expected = c.budget * timeShare
  const ratio = expected ? spent / expected : 0
  const remaining = Math.max(0, c.budget - spent)
  const daysLeft = totalDays - elapsedDays
  let state: Pacing['state'] = 'on-track'
  if (elapsedDays === 0) state = 'not-started'
  else if (c.status === 'completed' || daysLeft <= 0) state = 'done'
  else if (ratio > 1.12) state = 'over'
  else if (ratio < 0.85) state = 'under'
  return {
    totalDays,
    elapsedDays,
    timeShare,
    spendShare,
    expected,
    ratio,
    state,
    remaining,
    suggestedDaily: daysLeft > 0 ? remaining / daysLeft : 0,
  }
}

export function engagement(p: Post) {
  const m = p.metrics
  if (!m) return 0
  return m.likes + m.comments * 2 + m.shares * 3 + m.saves * 3
}

/** Interaktionsrate = (Likes + Kommentare + Shares + Saves) / Reichweite */
export function engagementRate(p: Post) {
  const m = p.metrics
  if (!m || !m.reach) return 0
  return (m.likes + m.comments + m.shares + m.saves) / m.reach
}
