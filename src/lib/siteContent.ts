import type { DiscographyRelease, LiveEvent } from '../content/types'
export type ContentKind = 'show' | 'release'
export interface ContentEntry {
  id: string; kind: ContentKind; state: 'draft' | 'published';
  data: LiveEvent | DiscographyRelease; updated_at: string;
}
export interface SiteContent { shows: LiveEvent[]; releases: DiscographyRelease[] }
export const provinces = ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape']
export function safeHttps(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000) return false
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password }
  catch { return false }
}
export function validateContent(kind: ContentKind, raw: unknown, id: string): LiveEvent | DiscographyRelease | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const input = raw as Record<string, unknown>
  const text = (field: string, max = 200) => typeof input[field] === 'string' && input[field].trim().length <= max ? input[field].trim() : ''
  const title = text('title')
  if (!title) return null
  if (kind === 'release') {
    const year = Number(input.year)
    if (!Number.isInteger(year) || year < 1900 || year > 2100 || !['Album','Single'].includes(String(input.releaseType)) ||
      !safeHttps(input.image) || !safeHttps(input.spotifyUrl) || !text('alt',300)) return null
    const destination = new URL(input.spotifyUrl)
    if (destination.hostname !== 'open.spotify.com' || !/^\/(album|track)\/[A-Za-z0-9]+/.test(destination.pathname)) return null
    return { id, title, year, releaseType: input.releaseType as 'Album'|'Single', image: input.image, spotifyUrl: input.spotifyUrl, alt: text('alt',300), accent: '#a44b32' }
  }
  const latitude = Number(input.latitude), longitude = Number(input.longitude)
  const start = text('startDateTime',50)
  if (!text('venue') || !text('city',100) || !provinces.includes(text('region')) ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -35.5 || latitude > -22 || longitude < 16 || longitude > 33.5 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\+02:00|Z)$/.test(start) || !Number.isFinite(Date.parse(start)) ||
    (input.ticketUrl && !safeHttps(input.ticketUrl))) return null
  return { id, slug: id, title, startDateTime: start, timezone: 'Africa/Johannesburg', venue: text('venue'),
    city: text('city',100), region: text('region'), country: 'South Africa', latitude, longitude,
    description: text('description',3000), ...(input.ticketUrl ? { ticketUrl: String(input.ticketUrl) } : {}) }
}
