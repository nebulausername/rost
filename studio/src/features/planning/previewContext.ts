import { createContext, useContext } from 'react'

export type PreviewBind = {
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onFocus: (e: React.FocusEvent<HTMLElement>) => void
  onBlur: () => void
  onPointerDown: () => void
}

export const PreviewCtx = createContext<{ bind: (id: string) => PreviewBind; hide: () => void } | null>(null)

export function usePreview() {
  return useContext(PreviewCtx)
}
