import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireArtist } from './_lib/artistAuth'

// Bandsintown's Events API reads listings. Publishing remains in Bandsintown for Artists.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireArtist(req, res))) return
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed.' }) }
  const appId = process.env.BANDSINTOWN_APP_ID
  const artistId = process.env.BANDSINTOWN_ARTIST_ID
  if (!appId || !artistId) return res.status(200).json({ configured: false, events: [] })
  try {
    const response = await fetch(`https://rest.bandsintown.com/artists/${encodeURIComponent(`id_${artistId}`)}/events/?app_id=${encodeURIComponent(appId)}&date=upcoming`, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('Provider unavailable')
    const payload = await response.json() as unknown
    if (!Array.isArray(payload)) throw new Error('Unexpected response')
    const events = payload.slice(0, 100).flatMap((item: Record<string, unknown>) => {
      const venue = item.venue as Record<string, unknown> | undefined
      if (typeof item.datetime !== 'string' || !venue || typeof item.url !== 'string') return []
      const url = new URL(item.url)
      if (url.protocol !== 'https:' || !(url.hostname === 'bandsintown.com' || url.hostname.endsWith('.bandsintown.com'))) return []
      return [{ id: String(item.id), title: String(item.title || ''), date: item.datetime,
        venue: String(venue.name || ''), city: String(venue.city || ''), url: url.href }]
    })
    return res.status(200).json({ configured: true, events })
  } catch { return res.status(503).json({ error: 'Bandsintown could not be reached. No public listings have been changed.' }) }
}
