import { randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireArtist, validMutation } from './_lib/artistAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireArtist(req, res))) return
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ error: 'Method not allowed.' }) }
  if (!validMutation(req)) return res.status(403).json({ error: 'Request origin not allowed.' })
  const { base64 } = req.body ?? {}
  if (typeof base64 !== 'string' || base64.length > 2800000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return res.status(400).json({ error: 'Choose a JPEG, PNG or WebP image smaller than 2 MB.' })
  const bytes = Buffer.from(base64, 'base64')
  const type = bytes.subarray(0,3).equals(Buffer.from([255,216,255])) ? 'jpeg' :
    bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' :
      bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP' ? 'webp' : null
  if (!type || bytes.length > 2097152) return res.status(400).json({ error: 'Choose a valid JPEG, PNG or WebP image smaller than 2 MB. SVG and other files are not accepted.' })
  const path = `covers/${randomUUID()}.${type}`
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/artist-media/${path}`, {
      method: 'POST', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': `image/${type}`, 'x-upsert': 'false' }, body: bytes, signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) throw new Error('Upload failed')
    return res.status(201).json({ url: `${process.env.SUPABASE_URL}/storage/v1/object/public/artist-media/${path}` })
  } catch { return res.status(503).json({ error: 'Artwork upload failed. Check the artist-media storage bucket, then try again.' }) }
}
