import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { CityDemandPoint } from '../src/lib/tourRequest/types'
import { hasSupabaseCredentials, supabaseSelect } from './_lib/supabaseRest'

interface CityDemandViewRow {
  city: string
  province: string | null
  latitude: number | null
  longitude: number | null
  requester_count: number
}

// Public, read-only aggregate: city name, province and a unique-requester count only. No names,
// emails, phone numbers or per-request rows are ever exposed here.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  if (!hasSupabaseCredentials()) {
    return res.status(200).json({ points: [] })
  }

  try {
    const rows = await supabaseSelect<CityDemandViewRow>(
      'city_demand',
      'select=city,province,latitude,longitude,requester_count&order=requester_count.desc&limit=100',
    )

    const points: CityDemandPoint[] = rows
      .filter((row) => row.latitude !== null && row.longitude !== null && row.requester_count > 0)
      .map((row) => ({
        city: row.city,
        province: row.province,
        latitude: row.latitude as number,
        longitude: row.longitude as number,
        requesterCount: row.requester_count,
      }))

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    return res.status(200).json({ points })
  } catch (error) {
    console.error('tour-demand: failed to load aggregate demand', error)
    return res.status(200).json({ points: [] })
  }
}
