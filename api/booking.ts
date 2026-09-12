import { createHash } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateBrief } from '../src/lib/booking'
import { hasSupabaseCredentials } from './_lib/supabaseRest'
import { validMutation } from './_lib/artistAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }) }
  if (!hasSupabaseCredentials() || !process.env.APP_ORIGIN) return res.status(503).json({ error: 'Online enquiries are not connected yet. Please send your brief by email.' })
  if (!validMutation(req)) return res.status(403).json({ error: 'Request origin not allowed.' })
  const { details, id, consent, website } = req.body ?? {}
  const brief = validateBrief(details)
  if (!brief || consent !== true || typeof id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id) || website) {
    return res.status(400).json({ error: 'Please check your name, venue, city, date, email and consent.' })
  }
  // Do not retain raw IP addresses. The database applies an atomic, cross-instance submission limit.
  const ip = req.headers['x-vercel-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  const requesterHash = createHash('sha256').update(`${process.env.SUPABASE_SERVICE_ROLE_KEY}:${ip}`).digest('hex')
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/submit_booking_brief`, {
      method: 'POST', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_id: id, p_details: brief, p_requester_hash: requesterHash }), signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      const failure = await response.json() as { message?: string }
      if (failure.message === 'submission_limit') return res.status(429).json({ error: 'You have sent several enquiries recently. Please contact the team by email.' })
      throw new Error('Booking insert failed')
    }
    const reference = await response.json() as string
    return res.status(201).json({ reference })
  } catch { return res.status(503).json({ error: 'We could not confirm your submission. Please try again or email your brief.' }) }
}
