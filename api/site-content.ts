import type { VercelRequest, VercelResponse } from '@vercel/node'
import { liveEvents, discographyReleases } from '../src/content/artist'
import type { DiscographyRelease, LiveEvent } from '../src/content/types'
import type { ContentEntry } from '../src/lib/siteContent'
import { hasSupabaseCredentials, supabaseSelect } from './_lib/supabaseRest'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ error: 'Method not allowed.' }) }
  try {
    const entries = hasSupabaseCredentials() ? await supabaseSelect<ContentEntry>('site_content', 'select=id,kind,data&state=eq.published&order=updated_at.desc&limit=1000') : []
    return res.status(200).json({
      shows: [...liveEvents, ...entries.filter((entry) => entry.kind === 'show').map((entry) => entry.data as LiveEvent)],
      releases: [...entries.filter((entry) => entry.kind === 'release').map((entry) => entry.data as DiscographyRelease), ...discographyReleases],
    })
  } catch { return res.status(503).json({ error: 'Published content is temporarily unavailable.' }) }
}
