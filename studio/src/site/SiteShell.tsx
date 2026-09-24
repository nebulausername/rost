import { Link, Outlet } from 'react-router'
import { Container } from './components'

// Platzhalter – wird durch den vollständigen Website-Rahmen ersetzt.
export function SiteShell() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" className="font-display text-xl font-semibold">
            Röstbrüder
          </Link>
          <Link to="/studio" className="text-sm text-ink-3">
            Studio
          </Link>
        </Container>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
