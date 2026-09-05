import { SupabaseConflictError, supabaseInsert, supabaseSelect, supabaseUpdate } from './supabaseRest'

const TABLE = 'community_members'

export interface CommunityMemberRow {
  id: string
  first_name: string
  email: string
  city: string
  phone: string | null
  interests: string[]
  consent: boolean
}

export async function findCommunityMemberByEmail(email: string): Promise<CommunityMemberRow | null> {
  const rows = await supabaseSelect<CommunityMemberRow>(
    TABLE,
    `select=id,first_name,email,city,phone,interests,consent&email=eq.${encodeURIComponent(email)}&limit=1`,
  )
  return rows[0] ?? null
}

export async function updateCommunityMember(id: string, patch: Record<string, unknown>): Promise<void> {
  await supabaseUpdate(TABLE, `id=eq.${id}`, patch)
}

export async function insertCommunityMember(record: Record<string, unknown>): Promise<CommunityMemberRow> {
  return supabaseInsert<CommunityMemberRow>(TABLE, record)
}

/**
 * Finds-or-creates the community_members identity row for an email, updating known fields.
 * `consent` is only ever raised (false -> true) here, never lowered, since this helper is used
 * by flows (like tour requests) where marketing consent is a separate, optional checkbox.
 */
export async function upsertCommunityMember(params: {
  email: string
  firstName: string
  phone: string
  fallbackCity: string
  consent: boolean
  nowIso: string
}): Promise<{ member: CommunityMemberRow; wasCreated: boolean }> {
  const { email, firstName, phone, fallbackCity, consent, nowIso } = params
  const existing = await findCommunityMemberByEmail(email)

  if (existing) {
    const patch: Record<string, unknown> = {
      first_name: firstName,
      phone: phone || existing.phone,
      updated_at: nowIso,
    }
    if (consent && !existing.consent) {
      patch.consent = true
      patch.consent_timestamp = nowIso
    }
    await updateCommunityMember(existing.id, patch)
    return { member: { ...existing, ...patch } as CommunityMemberRow, wasCreated: false }
  }

  try {
    const created = await insertCommunityMember({
      first_name: firstName,
      email,
      city: fallbackCity,
      phone: phone || null,
      interests: [],
      consent,
      consent_timestamp: consent ? nowIso : null,
      source: 'website',
    })
    return { member: created, wasCreated: true }
  } catch (error) {
    if (!(error instanceof SupabaseConflictError)) throw error
    // Simultaneous submissions for a brand-new email can both pass the lookup above.
    const raceExisting = await findCommunityMemberByEmail(email)
    if (!raceExisting) throw error
    return { member: raceExisting, wasCreated: false }
  }
}
