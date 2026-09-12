import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authConfigured, authHeaders, isAllowedUser, privateResponse, requireArtist, sessionToken, setSessionCookie, validMutation } from './_lib/artistAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  privateResponse(res)
  if (req.method === 'GET') {
    const user = await requireArtist(req, res)
    if (user) return res.status(200).json({ user })
    return
  }
  if (!['POST', 'DELETE'].includes(req.method ?? '')) { res.setHeader('Allow', 'GET, POST, DELETE'); return res.status(405).json({ error: 'Method not allowed.' }) }
  if (!authConfigured()) return res.status(503).json({ error: 'Artist sign-in is awaiting server configuration. You can explore the sample desk below.' })
  if (!validMutation(req)) return res.status(403).json({ error: 'Request origin not allowed.' })
  if (req.method === 'DELETE') {
    const token = sessionToken(req)
    setSessionCookie(res, '', 0)
    // Clear the browser cookie even if the auth service is temporarily unreachable.
    if (token) await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout?scope=local`, {
      method: 'POST', headers: authHeaders(token), signal: AbortSignal.timeout(5000),
    }).catch(() => undefined)
    return res.status(200).json({ ok: true })
  }
  const { email, password } = req.body ?? {}
  if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || !password || password.length > 1024) {
    return res.status(400).json({ error: 'Enter your email address and password.' })
  }
  try {
    // Supabase provides password hashing and authentication rate limiting. No public signup here.
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ email: email.trim(), password }), signal: AbortSignal.timeout(8000),
    })
    if (response.status === 429) return res.status(429).json({ error: 'Too many sign-in attempts. Please wait a few minutes.' })
    if (!response.ok) return res.status(401).json({ error: 'We could not sign you in. Check your details and artist access.' })
    const data = await response.json() as { access_token: string; expires_in: number; user: { id: string; email: string } }
    if (!isAllowedUser(data.user.id)) return res.status(401).json({ error: 'We could not sign you in. Check your details and artist access.' })
    setSessionCookie(res, data.access_token, data.expires_in)
    return res.status(200).json({ user: { id: data.user.id, email: data.user.email } })
  } catch { return res.status(503).json({ error: 'Sign-in is temporarily unavailable. Please try again.' }) }
}
