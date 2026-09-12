export const bookingStatuses = ['new', 'reviewing', 'confirmed', 'declined'] as const
export type BookingStatus = typeof bookingStatuses[number]
export const bookingStatusLabels: Record<BookingStatus, string> = {
  new: 'New enquiry', reviewing: 'In conversation', confirmed: 'Confirmed', declined: 'Closed',
}
export interface BookingBrief {
  venue: string; city: string; date: string; format: string; audience: string;
  email: string; room: string; who: string;
}
export interface BookingEnquiry {
  id: string; reference: string; created_at: string; updated_at: string;
  status: BookingStatus; details: BookingBrief; private_notes: string;
}
export const briefLimits: Record<keyof BookingBrief, number> = {
  venue: 160, city: 100, date: 100, format: 100, audience: 60, email: 254, room: 3000, who: 160,
}
export function validateBrief(input: unknown): BookingBrief | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const raw = input as Record<string, unknown>
  const result = {} as BookingBrief
  for (const field of Object.keys(briefLimits) as (keyof BookingBrief)[]) {
    if (typeof raw[field] !== 'string' || raw[field].length > briefLimits[field]) return null
    result[field] = raw[field].trim()
  }
  if (!result.venue || !result.date || !result.who || !result.city ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) return null
  result.email = result.email.toLowerCase()
  return result
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}
export async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init.headers }, signal: init.signal ?? AbortSignal.timeout(15000) })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  if (!isJson) throw new ApiError('The server connection is not set up yet. Please try again later.', 503)
  const data = await response.json() as { error?: string }
  if (!response.ok) throw new ApiError(data?.error || 'Something went wrong. Please try again.', response.status)
  return data as T
}
