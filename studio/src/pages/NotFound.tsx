import { Coffee } from 'lucide-react'
import { Link } from 'react-router'
import { Button, EmptyState } from '../components/ui/primitives'

export function NotFoundPage() {
  return (
    <EmptyState
      className="mt-16"
      icon={<Coffee className="size-5" />}
      title="Hier ist der Kaffee alle."
      description="Diese Seite gibt es nicht (mehr). Zurück ins Cockpit?"
      action={
        <Link to="/studio">
          <Button variant="primary">Zum Cockpit</Button>
        </Link>
      }
    />
  )
}
