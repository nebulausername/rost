import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { seedAll } from './seed'
import type {
  AdChannel,
  BudgetPlan,
  Campaign,
  CaptionTemplate,
  ChannelAccount,
  DailyStat,
  HashtagSet,
  Idea,
  KeyDate,
  Post,
  PostStatus,
  Settings,
  TeamMember,
} from './types'
import { uid } from './utils'

export interface DataState {
  posts: Post[]
  campaigns: Campaign[]
  ideas: Idea[]
  keyDates: KeyDate[]
  hashtagSets: HashtagSet[]
  templates: CaptionTemplate[]
  team: TeamMember[]
  accounts: ChannelAccount[]
  budget: BudgetPlan
  settings: Settings
}

interface Actions {
  // Posts
  upsertPost: (post: Post) => void
  movePost: (id: string, scheduledAt: string) => void
  setPostStatus: (id: string, status: PostStatus) => void
  duplicatePost: (id: string) => Post | undefined
  deletePost: (id: string) => void
  // Kampagnen
  upsertCampaign: (c: Campaign) => void
  deleteCampaign: (id: string) => void
  upsertDaily: (campaignId: string, stat: DailyStat) => void
  deleteDaily: (campaignId: string, date: string) => void
  // Ideen
  upsertIdea: (idea: Idea) => void
  voteIdea: (id: string, delta: number) => void
  deleteIdea: (id: string) => void
  // Bibliothek
  upsertHashtagSet: (s: HashtagSet) => void
  deleteHashtagSet: (id: string) => void
  upsertTemplate: (t: CaptionTemplate) => void
  deleteTemplate: (id: string) => void
  upsertKeyDate: (k: KeyDate) => void
  deleteKeyDate: (id: string) => void
  // Team & Kanäle
  upsertMember: (m: TeamMember) => void
  deleteMember: (id: string) => void
  updateAccount: (a: ChannelAccount) => void
  // Budget
  setBudgetCell: (month: string, channel: AdChannel, value: number) => void
  setBudgetMonths: (plan: BudgetPlan) => void
  // Einstellungen & Daten
  updateSettings: (patch: Partial<Settings>) => void
  resetDemo: () => void
  clearAll: () => void
  importData: (data: Partial<DataState>) => void
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  calendarColorBy: 'platform',
  monthlyBudgetCap: 1200,
  demoData: true,
  brandName: 'Röstbrüder',
}

function freshState(): DataState {
  return { ...seedAll(new Date()), settings: DEFAULT_SETTINGS }
}

const touch = <T extends { updatedAt: string }>(x: T): T => ({ ...x, updatedAt: new Date().toISOString() })

export const useStore = create<DataState & Actions>()(
  persist(
    (set, get) => ({
      ...freshState(),

      upsertPost: (post) =>
        set((s) => {
          const exists = s.posts.some((p) => p.id === post.id)
          const next = touch(post)
          return { posts: exists ? s.posts.map((p) => (p.id === post.id ? next : p)) : [...s.posts, next] }
        }),
      movePost: (id, scheduledAt) =>
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? touch({ ...p, scheduledAt }) : p)) })),
      setPostStatus: (id, status) =>
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? touch({ ...p, status }) : p)) })),
      duplicatePost: (id) => {
        const src = get().posts.find((p) => p.id === id)
        if (!src) return undefined
        const now = new Date().toISOString()
        const copy: Post = {
          ...src,
          id: uid('post'),
          title: `${src.title} (Kopie)`,
          status: 'draft',
          metrics: undefined,
          checklist: src.checklist.map((c) => ({ ...c, id: uid('chk'), done: false })),
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ posts: [...s.posts, copy] }))
        return copy
      },
      deletePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),

      upsertCampaign: (c) =>
        set((s) => {
          const exists = s.campaigns.some((x) => x.id === c.id)
          const next = touch(c)
          return { campaigns: exists ? s.campaigns.map((x) => (x.id === c.id ? next : x)) : [...s.campaigns, next] }
        }),
      deleteCampaign: (id) =>
        set((s) => ({
          campaigns: s.campaigns.filter((c) => c.id !== id),
          posts: s.posts.map((p) => (p.campaignId === id ? { ...p, campaignId: null } : p)),
        })),
      upsertDaily: (campaignId, stat) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) => {
            if (c.id !== campaignId) return c
            const rest = c.daily.filter((d) => d.date !== stat.date)
            return touch({ ...c, daily: [...rest, stat].sort((a, b) => a.date.localeCompare(b.date)) })
          }),
        })),
      deleteDaily: (campaignId, date) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) => (c.id === campaignId ? touch({ ...c, daily: c.daily.filter((d) => d.date !== date) }) : c)),
        })),

      upsertIdea: (idea) =>
        set((s) => ({
          ideas: s.ideas.some((i) => i.id === idea.id) ? s.ideas.map((i) => (i.id === idea.id ? idea : i)) : [idea, ...s.ideas],
        })),
      voteIdea: (id, delta) =>
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, votes: Math.max(0, i.votes + delta) } : i)) })),
      deleteIdea: (id) => set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) })),

      upsertHashtagSet: (hs) =>
        set((s) => ({
          hashtagSets: s.hashtagSets.some((x) => x.id === hs.id) ? s.hashtagSets.map((x) => (x.id === hs.id ? hs : x)) : [...s.hashtagSets, hs],
        })),
      deleteHashtagSet: (id) => set((s) => ({ hashtagSets: s.hashtagSets.filter((x) => x.id !== id) })),
      upsertTemplate: (t) =>
        set((s) => ({
          templates: s.templates.some((x) => x.id === t.id) ? s.templates.map((x) => (x.id === t.id ? t : x)) : [...s.templates, t],
        })),
      deleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((x) => x.id !== id) })),
      upsertKeyDate: (k) =>
        set((s) => ({
          keyDates: s.keyDates.some((x) => x.id === k.id) ? s.keyDates.map((x) => (x.id === k.id ? k : x)) : [...s.keyDates, k],
        })),
      deleteKeyDate: (id) => set((s) => ({ keyDates: s.keyDates.filter((x) => x.id !== id) })),

      upsertMember: (m) =>
        set((s) => ({ team: s.team.some((x) => x.id === m.id) ? s.team.map((x) => (x.id === m.id ? m : x)) : [...s.team, m] })),
      deleteMember: (id) =>
        set((s) => ({
          team: s.team.filter((m) => m.id !== id),
          posts: s.posts.map((p) => (p.assigneeId === id ? { ...p, assigneeId: null } : p)),
        })),
      updateAccount: (a) => set((s) => ({ accounts: s.accounts.map((x) => (x.platform === a.platform ? a : x)) })),

      setBudgetCell: (month, channel, value) =>
        set((s) => ({ budget: { ...s.budget, [month]: { ...s.budget[month], [channel]: Math.max(0, value) } } })),
      setBudgetMonths: (plan) => set((s) => ({ budget: { ...s.budget, ...plan } })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetDemo: () => set((s) => ({ ...freshState(), settings: { ...s.settings, demoData: true } })),
      clearAll: () =>
        set((s) => ({
          posts: [],
          campaigns: [],
          ideas: [],
          budget: {},
          accounts: s.accounts.map((a) => ({ ...a, followers: 0, history: [] })),
          settings: { ...s.settings, demoData: false },
        })),
      importData: (data) => set((s) => ({ ...s, ...data })),
    }),
    {
      name: 'rb-studio-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

// ---------------------------------------------------------------------------
// UI-Zustand (nicht persistiert): Editoren, Toasts, Command Palette
// ---------------------------------------------------------------------------

export interface PostDraftPreset {
  scheduledAt?: string
  title?: string
  caption?: string
  pillar?: Post['pillar']
  platforms?: Post['platforms']
  format?: Post['format']
  status?: PostStatus
  campaignId?: string | null
  notes?: string
  fromIdeaId?: string
}

export interface Toast {
  id: string
  title: string
  description?: string
  tone?: 'default' | 'success' | 'danger'
  action?: { label: string; run: () => void }
}

interface UiState {
  postEditor: { open: boolean; postId: string | null; preset: PostDraftPreset | null }
  campaignEditor: { open: boolean; campaignId: string | null }
  paletteOpen: boolean
  navOpen: boolean
  toasts: Toast[]
  openPost: (postId: string | null, preset?: PostDraftPreset) => void
  closePost: () => void
  openCampaign: (campaignId: string | null) => void
  closeCampaign: () => void
  setPalette: (open: boolean) => void
  setNav: (open: boolean) => void
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

export const useUi = create<UiState>()((set, get) => ({
  postEditor: { open: false, postId: null, preset: null },
  campaignEditor: { open: false, campaignId: null },
  paletteOpen: false,
  navOpen: false,
  toasts: [],
  openPost: (postId, preset) => set({ postEditor: { open: true, postId, preset: preset ?? null } }),
  closePost: () => set({ postEditor: { open: false, postId: null, preset: null } }),
  openCampaign: (campaignId) => set({ campaignEditor: { open: true, campaignId } }),
  closeCampaign: () => set({ campaignEditor: { open: false, campaignId: null } }),
  setPalette: (open) => set({ paletteOpen: open }),
  setNav: (open) => set({ navOpen: open }),
  toast: (t) => {
    const id = uid('toast')
    set({ toasts: [...get().toasts, { ...t, id }] })
    setTimeout(() => get().dismissToast(id), 4200)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = (t: Omit<Toast, 'id'>) => useUi.getState().toast(t)
