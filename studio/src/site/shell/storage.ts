import { useEffect, useSyncExternalStore } from 'react'

// ---------------------------------------------------------------------------
// Lokaler Speicher der Website (kann in privaten Fenstern / bei blockierten
// Website-Daten werfen → alles in try/catch, die Seite funktioniert auch ohne).
// ---------------------------------------------------------------------------

export function readLocal<T>(key: string, fallback: T, guard?: (v: unknown) => v is T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (guard && !guard(parsed)) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

export function writeLocal(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Kein Speicher – dann gilt es nur bis zum Reload.
  }
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

/**
 * Kleine, geteilte Liste von Strings in localStorage (zuletzt angesehen, letzte Suchen).
 * Liefert stabile Referenzen (useSyncExternalStore-tauglich) und synchronisiert Tabs.
 */
export function createLocalList(key: string, max: number) {
  let cache: string[] | null = null
  const listeners = new Set<() => void>()
  const read = () => (cache ??= readLocal<string[]>(key, [], isStringArray).slice(0, max))
  const emit = () => listeners.forEach((l) => l())
  const set = (next: string[]) => {
    cache = next.slice(0, max)
    writeLocal(key, cache.length ? cache : null)
    emit()
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key !== key && e.key !== null) return
    cache = null
    emit()
  }
  const subscribe = (l: () => void) => {
    listeners.add(l)
    if (listeners.size === 1) window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(l)
      if (!listeners.size) window.removeEventListener('storage', onStorage)
    }
  }
  const EMPTY: string[] = []
  return {
    get: read,
    /** Setzt `value` an den Anfang (ohne Duplikate, Groß-/Kleinschreibung egal) */
    push(value: string) {
      const v = value.trim()
      if (!v) return
      const lower = v.toLowerCase()
      set([v, ...read().filter((x) => x.toLowerCase() !== lower)])
    },
    remove(value: string) {
      set(read().filter((x) => x !== value))
    },
    clear() {
      set([])
    },
    useList() {
      return useSyncExternalStore(subscribe, read, () => EMPTY)
    },
  }
}

/** Zuletzt angesehene Produkte (Slugs, neueste zuerst) */
export const recentlyViewed = createLocalList('rb-recently-viewed', 8)

/** Letzte Suchbegriffe der Website-Suche */
export const recentSearches = createLocalList('rb-recent-searches', 5)

/** Merkt sich den Besuch einer Produktseite */
export function useTrackProductView(slug: string | undefined) {
  useEffect(() => {
    if (slug) recentlyViewed.push(slug)
  }, [slug])
}
