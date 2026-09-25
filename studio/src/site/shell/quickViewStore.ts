import { create } from 'zustand'

// Welches Produkt ist in der Schnellansicht offen? (Oberfläche: QuickView.tsx)

export const useQuickView = create<{ slug: string | null; set: (slug: string | null) => void }>()((set) => ({
  slug: null,
  set: (slug) => set({ slug }),
}))

export const openQuickView = (slug: string) => useQuickView.getState().set(slug)
export const closeQuickView = () => useQuickView.getState().set(null)
