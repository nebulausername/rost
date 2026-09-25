import { create } from 'zustand'
import { readLocal, writeLocal } from './storage'

// ---------------------------------------------------------------------------
// Cookie-Einwilligung (DSGVO/TTDSG) – Zustand & Hook. Oberfläche: ConsentManager.tsx
// „Alle akzeptieren“ und „Nur notwendige“ sind gleich gewichtet, optionale Kategorien
// sind standardmäßig aus. Gespeichert wird lokal mit Version & Datum.
// Der Prototyp setzt keine Tracking-Cookies – useConsent() ist der Anschluss für später:
//   const { statistics } = useConsent(); if (statistics) loadAnalytics()
// ---------------------------------------------------------------------------
export const CONSENT_KEY = 'rb-consent'
/** Erhöhen, wenn sich Kategorien/Zwecke ändern → alle werden neu gefragt */
export const CONSENT_VERSION = 1

export interface ConsentRecord {
  v: number
  /** ISO-Zeitpunkt der Entscheidung */
  date: string
  statistics: boolean
  marketing: boolean
}

export type Prefs = Pick<ConsentRecord, 'statistics' | 'marketing'>

const isRecord = (x: unknown): x is ConsentRecord => {
  if (!x || typeof x !== 'object') return false
  const r = x as Record<string, unknown>
  return r.v === CONSENT_VERSION && typeof r.date === 'string' && typeof r.statistics === 'boolean' && typeof r.marketing === 'boolean'
}

interface ConsentStore {
  record: ConsentRecord | null
  settingsOpen: boolean
  save: (prefs: Prefs) => void
  setSettingsOpen: (open: boolean) => void
}

const useConsentStore = create<ConsentStore>()((set) => ({
  record: typeof window === 'undefined' ? null : readLocal<ConsentRecord | null>(CONSENT_KEY, null, isRecord),
  settingsOpen: false,
  save: (prefs) => {
    const record: ConsentRecord = { v: CONSENT_VERSION, date: new Date().toISOString(), ...prefs }
    writeLocal(CONSENT_KEY, record)
    set({ record, settingsOpen: false })
  },
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}))

/** Aktuelle Einwilligung + Aktionen. `statistics`/`marketing` sind false, solange nicht entschieden. */
export function useConsent() {
  const record = useConsentStore((s) => s.record)
  const save = useConsentStore((s) => s.save)
  const setSettingsOpen = useConsentStore((s) => s.setSettingsOpen)
  return {
    decided: record !== null,
    necessary: true as const,
    statistics: record?.statistics ?? false,
    marketing: record?.marketing ?? false,
    date: record?.date ?? null,
    acceptAll: () => save({ statistics: true, marketing: true }),
    acceptNecessary: () => save({ statistics: false, marketing: false }),
    save,
    openSettings: () => setSettingsOpen(true),
  }
}

/** Öffnet die Einstellungen von überall (z. B. Link in Footer oder Datenschutz) */
export const openConsentSettings = () => useConsentStore.getState().setSettingsOpen(true)

/** nur für die Oberfläche */
export const useConsentUi = useConsentStore
