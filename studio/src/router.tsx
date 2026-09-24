import { createBrowserRouter } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { AnalyticsPage } from './pages/Analytics'
import { BudgetPage } from './pages/Budget'
import { CalendarPage } from './pages/Calendar'
import { CampaignDetailPage } from './pages/CampaignDetail'
import { CampaignsPage } from './pages/Campaigns'
import { CockpitPage } from './pages/Cockpit'
import { IdeasPage } from './pages/Ideas'
import { LibraryPage } from './pages/Library'
import { NotFoundPage } from './pages/NotFound'
import { PipelinePage } from './pages/Pipeline'
import { SettingsPage } from './pages/Settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <CockpitPage /> },
      { path: 'kalender', element: <CalendarPage /> },
      { path: 'pipeline', element: <PipelinePage /> },
      { path: 'ideen', element: <IdeasPage /> },
      { path: 'kampagnen', element: <CampaignsPage /> },
      { path: 'kampagnen/:id', element: <CampaignDetailPage /> },
      { path: 'budget', element: <BudgetPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'bibliothek', element: <LibraryPage /> },
      { path: 'einstellungen', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
