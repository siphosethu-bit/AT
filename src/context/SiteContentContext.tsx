/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { discographyReleases, liveEvents } from '../content/artist'
import type { SiteContent } from '../lib/siteContent'

const initial = { shows: liveEvents, releases: discographyReleases }
const SiteContentContext = createContext<SiteContent>(initial)
export function SiteContentProvider({ children }: PropsWithChildren) {
  const [content, setContent] = useState<SiteContent>(initial)
  useEffect(() => {
    let ignore = false
    const refresh = async () => {
      try {
        const response = await fetch('/api/site-content', { signal: AbortSignal.timeout(10000), cache: 'no-store' })
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return
        const data = await response.json() as SiteContent
        if (!ignore && Array.isArray(data.shows) && Array.isArray(data.releases)) setContent(data)
      } catch { /* Keep the verified built-in archive available if the CMS cannot be reached. */ }
    }
    void refresh()
    window.addEventListener('focus', refresh)
    const interval = window.setInterval(() => { if (!document.hidden) void refresh() }, 60000)
    return () => { ignore = true; window.removeEventListener('focus', refresh); window.clearInterval(interval) }
  }, [])
  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>
}
export const useSiteContent = () => useContext(SiteContentContext)
