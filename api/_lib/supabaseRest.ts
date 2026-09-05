// Minimal PostgREST client shared by the community and tour-request serverless functions. We use
// plain fetch instead of @supabase/supabase-js to keep these functions dependency-free and fast
// to cold-start; every call here runs server-side only, authenticated with the service-role key.
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export class SupabaseConflictError extends Error {}

export function hasSupabaseCredentials(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY ?? '',
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY ?? ''}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export async function supabaseSelect<T>(table: string, query: string): Promise<T[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: headers() })
  if (!response.ok) throw new Error(`Supabase select on ${table} failed: ${response.status}`)
  return (await response.json()) as T[]
}

export async function supabaseInsert<T>(table: string, record: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(record),
  })
  if (response.status === 409) throw new SupabaseConflictError(`Duplicate row in ${table}`)
  if (!response.ok) throw new Error(`Supabase insert into ${table} failed: ${response.status}`)
  const rows = (await response.json()) as T[]
  return rows[0]
}

export async function supabaseUpdate(table: string, query: string, patch: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify(patch),
  })
  if (!response.ok) throw new Error(`Supabase update on ${table} failed: ${response.status}`)
}
