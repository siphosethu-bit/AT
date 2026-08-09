import { Layout } from './components/Layout'
import { SchemaMarkup } from './components/SchemaMarkup'
import { useRouter } from './lib/router'
import { BookPage } from './pages/BookPage'
import { HomePage } from './pages/HomePage'
import { ListenPage } from './pages/ListenPage'
import { LivePage } from './pages/LivePage'
import { StoryPage } from './pages/StoryPage'

export default function App() {
  const { pathname } = useRouter()
  const page = {
    '/': <HomePage />,
    '/listen': <ListenPage />,
    '/live': <LivePage />,
    '/story': <StoryPage />,
    '/book': <BookPage />,
  }[pathname] ?? <HomePage />

  return (
    <>
      <SchemaMarkup />
      <Layout>{page}</Layout>
    </>
  )
}
