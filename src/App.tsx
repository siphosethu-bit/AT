import { lazy, Suspense } from 'react'
import { Layout } from './components/Layout'
import { SchemaMarkup } from './components/SchemaMarkup'
import { CommunityProvider } from './context/CommunityContext'
import { TourRequestProvider } from './context/TourRequestContext'
import { SiteContentProvider } from './context/SiteContentContext'
import { useRouter } from './lib/router'
import { BookPage } from './pages/BookPage'
import { HomePage } from './pages/HomePage'
import { ListenPage } from './pages/ListenPage'
import { LivePage } from './pages/LivePage'
import { StoryPage } from './pages/StoryPage'

const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })))

export default function App() {
  const { pathname } = useRouter()
  if (pathname === '/admin' || pathname === '/admin/preview') {
    return <SiteContentProvider><Suspense fallback={<p className="artist-loading" role="status">Opening the artist desk…</p>}><AdminPage key={pathname} /></Suspense></SiteContentProvider>
  }
  const page = {
    '/': <HomePage />,
    '/listen': <ListenPage />,
    '/live': <LivePage />,
    '/story': <StoryPage />,
    '/book': <BookPage />,
  }[pathname] ?? <HomePage />

  return (
    <SiteContentProvider><CommunityProvider>
      <TourRequestProvider>
        <SchemaMarkup />
        <Layout>{page}</Layout>
      </TourRequestProvider>
    </CommunityProvider></SiteContentProvider>
  )
}
