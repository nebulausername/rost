import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CartItem, Grind, Product } from './types'
import { uid } from './utils'

export const GRINDS: Record<Grind, string> = {
  bohne: 'Ganze Bohne',
  espresso: 'Espresso (fein)',
  moka: 'Mokkakanne',
  filter: 'Filter / V60',
  french: 'French Press (grob)',
}

export const FREE_SHIPPING_FROM = 35
export const SHIPPING = 4.9

/** Abo-Preise pro Lieferung (Beispielwerte) */
export const ABO_PRICES: Record<250 | 500 | 1000, number> = { 250: 10.9, 500: 20.9, 1000: 38.9 }

type NewItem = CartItem extends infer T ? (T extends CartItem ? Omit<T, 'key'> : never) : never

interface CartState {
  items: CartItem[]
  open: boolean
  add: (item: NewItem) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  setOpen: (open: boolean) => void
}

function sameItem(a: CartItem, b: NewItem) {
  if (a.kind !== b.kind) return false
  if (a.kind === 'product' && b.kind === 'product') return a.productId === b.productId && a.size === b.size && a.grind === b.grind
  if (a.kind === 'abo' && b.kind === 'abo') return a.productId === b.productId && a.amount === b.amount && a.rhythmWeeks === b.rhythmWeeks && a.grind === b.grind
  if (a.kind === 'voucher' && b.kind === 'voucher') return a.value === b.value
  return false
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => sameItem(i, item))
          if (existing) return { items: s.items.map((i) => (i === existing ? { ...i, qty: Math.min(20, i.qty + item.qty) } : i)), open: true }
          return { items: [...s.items, { ...item, key: uid('cart') } as CartItem], open: true }
        }),
      setQty: (key, qty) => set((s) => ({ items: qty <= 0 ? s.items.filter((i) => i.key !== key) : s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(20, qty) } : i)) })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: 'rb-cart-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
)

export function unitPrice(item: CartItem, products: Product[]) {
  if (item.kind === 'voucher') return item.value
  if (item.kind === 'abo') return ABO_PRICES[item.amount]
  const p = products.find((x) => x.id === item.productId)
  if (!p) return 0
  return item.size === '1000' && p.priceKg ? p.priceKg : p.price
}

export function describeItem(item: CartItem, products: Product[]) {
  if (item.kind === 'voucher') return { title: `Gutschein ${item.value} €`, detail: 'per E-Mail, 3 Jahre gültig' }
  const p = item.productId ? products.find((x) => x.id === item.productId) : null
  if (item.kind === 'abo') {
    return {
      title: `Kaffee-Abo · ${p ? p.name : 'Röster-Auswahl'}`,
      detail: `${item.amount} g alle ${item.rhythmWeeks} Wochen · ${GRINDS[item.grind]}`,
    }
  }
  return { title: p?.name ?? 'Kaffee', detail: `${item.size === '1000' ? '1 kg' : '250 g'} · ${GRINDS[item.grind]}` }
}

export function cartTotals(items: CartItem[], products: Product[]) {
  const subtotal = items.reduce((acc, i) => acc + unitPrice(i, products) * i.qty, 0)
  const hasAbo = items.some((i) => i.kind === 'abo')
  const onlyVouchers = items.length > 0 && items.every((i) => i.kind === 'voucher')
  const shipping = !items.length || hasAbo || onlyVouchers || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING
  return { subtotal, shipping, total: subtotal + shipping, hasAbo, missingForFree: Math.max(0, FREE_SHIPPING_FROM - subtotal), count: items.reduce((a, i) => a + i.qty, 0) }
}
