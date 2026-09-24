import { Link } from 'react-router'
import { Container, siteButtonClass } from '../components'

export function SiteNotFoundPage() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="font-display text-8xl font-semibold text-accent-text">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink md:text-4xl">Hier ist der Kaffee alle.</h1>
      <p className="mt-3 max-w-md text-ink-2">Diese Seite gibt es nicht (mehr). Aber frisch Geröstetes gibt’s nebenan.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/shop" className={siteButtonClass('primary')}>
          Zum Shop
        </Link>
        <Link to="/" className={siteButtonClass('secondary')}>
          Startseite
        </Link>
      </div>
    </Container>
  )
}
