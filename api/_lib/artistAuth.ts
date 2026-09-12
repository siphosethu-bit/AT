import type { VercelRequest, VercelResponse } from '@vercel/node'

const COOKIE = 'athi_artist_session'
export function authConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.ARTIST_ADMIN_USER_IDS && process.env.APP_ORIGIN)
}
export function privateResponse(res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Vary', 'Cookie')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
}
export function validMutation(req: VercelRequest) {
  return Boolean(process.env.APP_ORIGIN && req.headers.origin === process.env.APP_ORIGIN &&
    req.headers['content-type']?.startsWith('application/json'))
}
export function isAllowedUser(id: string) {
  return (process.env.ARTIST_ADMIN_USER_IDS ?? '').split(',').map((value) => value.trim()).includes(id)
}
export function authHeaders(token?: string) {
  return { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', 'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}
export function sessionToken(req: VercelRequest) {
  const raw = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))
  const token = raw?.slice(COOKIE.length + 1) ?? ''
  return /^[A-Za-z0-9._-]+$/.test(token) ? token : ''
}
export function setSessionCookie(res: VercelResponse, token: string, seconds: number) {
  // Local HTTP is the only non-Secure exception; production requires HTTPS in APP_ORIGIN.
  const secure = !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.APP_ORIGIN ?? '')
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${Math.max(0, Math.min(seconds, 3600))}${secure ? '; Secure' : ''}`)
}
export async function requireArtist(req: VercelRequest, res: VercelResponse): Promise<{ id: string; email: string } | null> {
  privateResponse(res)
  if (!authConfigured()) { res.status(503).json({ error: 'Artist sign-in is awaiting server configuration.' }); return null }
  const token = sessionToken(req)
  if (!token) { res.status(401).json({ error: 'Please sign in to your artist desk.' }); return null }
  try {
    // Verify with the auth server on EVERY request; never trust decoded JWT data or client state.
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: authHeaders(token), signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) { res.status(401).json({ error: 'Your session has expired. Please sign in again.' }); return null }
    const user = await response.json() as { id: string; email: string }
    if (!isAllowedUser(user.id)) { res.status(403).json({ error: 'This account does not have artist access.' }); return null }
    return { id: user.id, email: user.email }
  } catch { res.status(503).json({ error: 'Sign-in is temporarily unavailable. Please try again.' }); return null }
}
