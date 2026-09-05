import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { CommunityInterest } from '../src/lib/community/types'
import {
  hasFieldErrors,
  isValidInterests,
  MIN_SUBMIT_MS,
  normalizeEmail,
  validateCommunitySignup,
} from '../src/lib/community/validation'
import { findCommunityMemberByEmail, insertCommunityMember, updateCommunityMember } from './_lib/communityMembers'
import { hasSupabaseCredentials, SupabaseConflictError } from './_lib/supabaseRest'

const GENERIC_ERROR = 'Something went wrong while joining the community. Please try again.'

function readString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : ''
}

function readNullableString(value: unknown, maxLength: number): string | null {
  const text = readString(value, maxLength).trim()
  return text || null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  if (!hasSupabaseCredentials()) {
    console.error('community-join: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables')
    return res.status(500).json({ error: GENERIC_ERROR })
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const firstName = readString(body.firstName, 100)
  const emailRaw = readString(body.email, 254)
  const city = readString(body.city, 100)
  const phone = readString(body.phone, 30)
  const consent = body.consent === true
  const website = readString(body.website, 200)
  const startedAt = typeof body.startedAt === 'number' ? body.startedAt : 0
  const sourcePage = readNullableString(body.sourcePage, 200)
  const interests: CommunityInterest[] = isValidInterests(body.interests) ? body.interests : []
  const campaign = (typeof body.campaign === 'object' && body.campaign !== null ? body.campaign : {}) as Record<string, unknown>

  // Honeypot and timing heuristics catch bots without exposing that detection to the client.
  const looksAutomated = Boolean(website) || (startedAt > 0 && Date.now() - startedAt < MIN_SUBMIT_MS)
  if (looksAutomated) {
    return res.status(200).json({ status: 'created', firstName: firstName.trim() || 'friend' })
  }

  const fieldErrors = validateCommunitySignup({ firstName, email: emailRaw, city, phone, consent })
  if (hasFieldErrors(fieldErrors)) {
    return res.status(400).json({ error: 'Check the highlighted fields and try again.', fieldErrors })
  }

  const email = normalizeEmail(emailRaw)
  const nowIso = new Date().toISOString()

  try {
    const existing = await findCommunityMemberByEmail(email)

    if (existing) {
      await updateCommunityMember(existing.id, {
        first_name: firstName.trim(),
        city: city.trim(),
        phone: phone.trim() || existing.phone,
        interests: interests.length ? interests : existing.interests,
        consent: consent || existing.consent,
        consent_timestamp: nowIso,
        updated_at: nowIso,
      })
      return res.status(200).json({ status: 'duplicate', firstName: firstName.trim() })
    }

    const newRecord = {
      first_name: firstName.trim(),
      email,
      city: city.trim(),
      phone: phone.trim() || null,
      interests,
      consent,
      consent_timestamp: nowIso,
      source: 'website',
      source_page: sourcePage,
      signup_context: readNullableString(body.signupContext, 60) ?? 'footer-cta',
      utm_source: readNullableString(campaign.utmSource, 200),
      utm_medium: readNullableString(campaign.utmMedium, 200),
      utm_campaign: readNullableString(campaign.utmCampaign, 200),
      referrer: readNullableString(campaign.referrer, 500),
    }

    try {
      await insertCommunityMember(newRecord)
      return res.status(200).json({ status: 'created', firstName: firstName.trim() })
    } catch (insertError) {
      if (!(insertError instanceof SupabaseConflictError)) throw insertError

      // Two simultaneous submissions for a brand-new email can both pass the lookup above.
      // Treat the resulting unique-constraint conflict as a duplicate join, not a failure.
      const raceExisting = await findCommunityMemberByEmail(email)
      if (!raceExisting) throw insertError
      await updateCommunityMember(raceExisting.id, {
        first_name: firstName.trim(),
        city: city.trim(),
        phone: phone.trim() || raceExisting.phone,
        interests: interests.length ? interests : raceExisting.interests,
        consent: consent || raceExisting.consent,
        consent_timestamp: nowIso,
        updated_at: nowIso,
      })
      return res.status(200).json({ status: 'duplicate', firstName: firstName.trim() })
    }
  } catch (error) {
    console.error('community-join: failed to persist signup', error)
    return res.status(500).json({ error: GENERIC_ERROR })
  }
}
