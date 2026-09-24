import { createBrowserRouter } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { NotFoundPage } from './pages/NotFound'
import { SiteShell } from './site/SiteShell'

const site = (load: () => Promise<Record<string, React.ComponentType>>, name: string) => () => load().then((m) => ({ Component: m[name] }))

// Öffentliche Website (liest dieselben Daten wie das Studio)
const siteRoutes = [
  { path: 'shop', lazy: site(() => import('./site/pages/Shop'), 'ShopPage') },
  { path: 'shop/:slug', lazy: site(() => import('./site/pages/Product'), 'ProductPage') },
  { path: 'kasse', lazy: site(() => import('./site/pages/Checkout'), 'CheckoutPage') },
  { path: 'geschmacksfinder', lazy: site(() => import('./site/pages/TasteFinder'), 'TasteFinderPage') },
  { path: 'abo', lazy: site(() => import('./site/pages/Abo'), 'AboPage') },
  { path: 'workshops', lazy: site(() => import('./site/pages/Workshops'), 'WorkshopsPage') },
  { path: 'cafes', lazy: site(() => import('./site/pages/Cafes'), 'CafesPage') },
  { path: 'herkunft', lazy: site(() => import('./site/pages/Origin'), 'OriginPage') },
  { path: 'anleitungen', lazy: site(() => import('./site/pages/Guides'), 'GuidesPage') },
  { path: 'anleitungen/:slug', lazy: site(() => import('./site/pages/Guide'), 'GuidePage') },
  { path: 'ueber-uns', lazy: site(() => import('./site/pages/About'), 'AboutPage') },
  { path: 'impressum', lazy: site(() => import('./site/pages/Legal'), 'LegalPage') },
  { path: 'datenschutz', lazy: site(() => import('./site/pages/Legal'), 'LegalPage') },
]

// Website unter „/“, Studio unter „/studio“. Jede Seite ist ein eigener Chunk.
export const router = createBrowserRouter([
  {
    element: <SiteShell />,
    HydrateFallback: BootScreen,
    children: [
      { index: true, lazy: site(() => import('./site/pages/Home'), 'HomePage') },
      ...siteRoutes,
      { path: '*', lazy: site(() => import('./site/pages/SiteNotFound'), 'SiteNotFoundPage') },
    ],
  },
  {
    path: '/studio',
    element: <AppShell />,
    HydrateFallback: BootScreen,
    children: [
      { index: true, lazy: () => import('./pages/Cockpit').then((m) => ({ Component: m.CockpitPage })) },
      { path: 'kalender', lazy: () => import('./pages/Calendar').then((m) => ({ Component: m.CalendarPage })) },
      { path: 'pipeline', lazy: () => import('./pages/Pipeline').then((m) => ({ Component: m.PipelinePage })) },
      { path: 'ideen', lazy: () => import('./pages/Ideas').then((m) => ({ Component: m.IdeasPage })) },
      { path: 'kampagnen', lazy: () => import('./pages/Campaigns').then((m) => ({ Component: m.CampaignsPage })) },
      { path: 'kampagnen/:id', lazy: () => import('./pages/CampaignDetail').then((m) => ({ Component: m.CampaignDetailPage })) },
      { path: 'budget', lazy: () => import('./pages/Budget').then((m) => ({ Component: m.BudgetPage })) },
      { path: 'analytics', lazy: () => import('./pages/Analytics').then((m) => ({ Component: m.AnalyticsPage })) },
      { path: 'bibliothek', lazy: () => import('./pages/Library').then((m) => ({ Component: m.LibraryPage })) },
      { path: 'report', lazy: () => import('./pages/Report').then((m) => ({ Component: m.ReportPage })) },
      { path: 'website', lazy: () => import('./pages/Website').then((m) => ({ Component: m.WebsitePage })) },
      { path: 'einstellungen', lazy: () => import('./pages/Settings').then((m) => ({ Component: m.SettingsPage })) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

function BootScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3 text-ink-3">
        <svg viewBox="0 0 64 64" className="size-10 animate-pulse" aria-hidden>
          <g transform="rotate(-30 32 32)">
            <ellipse cx="32" cy="32" rx="15" ry="21" fill="var(--accent)" />
            <path d="M32 12c-5 7 5 13 0 20s5 13 0 20" fill="none" stroke="var(--canvas)" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </svg>
        <p className="text-xs font-medium tracking-[0.2em] uppercase">Röstbrüder Studio</p>
      </div>
    </div>
  )
}
