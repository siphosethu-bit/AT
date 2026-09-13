import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireArtist, validMutation } from './_lib/artistAuth'
import { supabaseInsert, supabaseSelect, supabaseUpdate, SupabaseConflictError } from './_lib/supabaseRest'
import { validateContent, type ContentEntry } from '../src/lib/siteContent'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireArtist(req, res)
  if (!user) return
  try {
    if (req.method === 'GET') {
      const entries = await supabaseSelect<ContentEntry>('site_content', 'select=id,kind,state,data,updated_at&order=updated_at.desc&limit=1000')
      return res.status(200).json({ entries })
    }
    if (req.method !== 'PUT') { res.setHeader('Allow','GET, PUT'); return res.status(405).json({ error: 'Method not allowed.' }) }
    if (!validMutation(req)) return res.status(403).json({ error: 'Request origin not allowed.' })
    const { id, kind, state, data } = req.body ?? {}
    if (typeof id !== 'string' || !/^(cms-[a-f0-9-]{36}|bit-\d{1,30})$/.test(id) || !['show','release'].includes(kind) || !['draft','published'].includes(state)) return res.status(400).json({ error: 'Invalid content request.' })
    const validated = validateContent(kind, data, id)
    if (!validated) return res.status(400).json({ error: 'Check the required fields, map coordinates, date and links. Release artwork must be an HTTPS image URL.' })
    const record = { id, kind, state, data: validated, updated_at: new Date().toISOString(), updated_by: user.id }
    try { await supabaseInsert('site_content', record) }
    catch (error) {
      if (!(error instanceof SupabaseConflictError)) throw error
      const [existing] = await supabaseSelect<ContentEntry>('site_content', `select=kind&id=eq.${id}&limit=1`)
      if (!existing || existing.kind !== kind) return res.status(409).json({ error: 'This ID belongs to another kind of content.' })
      await supabaseUpdate('site_content', `id=eq.${id}`, record)
    }
    return res.status(200).json({ entry: record })
  } catch { return res.status(503).json({ error: 'Content could not be saved or loaded. Check that the content migration has been applied.' }) }
}
