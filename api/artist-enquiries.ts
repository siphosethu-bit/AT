import type { VercelRequest, VercelResponse } from '@vercel/node'
import { bookingStatuses, type BookingEnquiry } from '../src/lib/booking'
import { requireArtist, validMutation } from './_lib/artistAuth'
import { supabaseSelect, supabaseUpdate } from './_lib/supabaseRest'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireArtist(req, res)
  if (!user) return
  try {
    if (req.method === 'GET') {
      const offset = Math.max(0, Math.min(Number(req.query.offset) || 0, 100000))
      const rows = await supabaseSelect<BookingEnquiry>('booking_enquiries', `select=id,reference,created_at,updated_at,status,details,private_notes&order=created_at.desc&limit=51&offset=${Math.floor(offset)}`)
      return res.status(200).json({ enquiries: rows.slice(0, 50), hasMore: rows.length > 50 })
    }
    if (req.method !== 'PATCH') { res.setHeader('Allow', 'GET, PATCH'); return res.status(405).json({ error: 'Method not allowed.' }) }
    if (!validMutation(req)) return res.status(403).json({ error: 'Request origin not allowed.' })
    const { id, status, notes } = req.body ?? {}
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id) || !bookingStatuses.includes(status) || typeof notes !== 'string' || notes.length > 4000) {
      return res.status(400).json({ error: 'Check the status and notes before saving.' })
    }
    const existing = await supabaseSelect<{ id: string }>('booking_enquiries', `select=id&id=eq.${id}&limit=1`)
    if (!existing.length) return res.status(404).json({ error: 'This enquiry could not be found.' })
    await supabaseUpdate('booking_enquiries', `id=eq.${id}`, {
      status, private_notes: notes, updated_at: new Date().toISOString(), updated_by: user.id,
    })
    return res.status(200).json({ ok: true })
  } catch { return res.status(503).json({ error: 'The booking desk could not reach the database. Your changes have not been saved.' }) }
}
