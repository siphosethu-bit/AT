import type { VercelRequest, VercelResponse } from '@vercel/node'
import { findCityDirectoryEntry } from '../src/data/southAfricaCityDirectory'
import { liveEvents } from '../src/content/liveEvents'
import { normalizeEmail } from '../src/lib/community/validation'
import { formatLiveEventDate, getLiveEventStatus, sortLiveEvents } from '../src/lib/liveEvents'
import type { TourRequestExistingShow } from '../src/lib/tourRequest/types'
import { hasTourRequestFieldErrors, MIN_SUBMIT_MS, validateTourRequest } from '../src/lib/tourRequest/validation'
import { upsertCommunityMember } from './_lib/communityMembers'
import { hasSupabaseCredentials } from './_lib/supabaseRest'
import { bumpTourRequest, findTourRequest, insertTourRequest, SupabaseConflictError } from './_lib/tourRequests'

const GENERIC_ERROR = "We couldn't put your city on the map right now. Please try again."

function readString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : ''
}

function readNullableString(value: unknown, maxLength: number): string | null {
  const text = readString(value, maxLength).trim()
  return text || null
}

function findExistingShow(city: string): TourRequestExistingShow | null {
  const normalizedCity = city.trim().toLowerCase()
  const matches = liveEvents.filter(
    (event) => event.city.trim().toLowerCase() === normalizedCity && getLiveEventStatus(event) !== 'past',
  )
  if (!matches.length) return null

  const soonest = sortLiveEvents(matches)[0]
  return {
    title: soonest.title,
    venue: soonest.venue,
    city: soonest.city,
    dateLabel: formatLiveEventDate(soonest),
    ticketUrl: soonest.ticketUrl ?? null,
    directionsUrl: soonest.directionsUrl ?? null,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  if (!hasSupabaseCredentials()) {
    console.error('tour-request: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables')
    return res.status(500).json({ error: GENERIC_ERROR })
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const firstName = readString(body.firstName, 100)
  const emailRaw = readString(body.email, 254)
  const phone = readString(body.phone, 30)
  const cityRaw = readString(body.city, 100)
  const notifyOnAnnouncement = body.notifyOnAnnouncement === true
  const joinCommunity = body.joinCommunity === true
  const website = readString(body.website, 200)
  const startedAt = typeof body.startedAt === 'number' ? body.startedAt : 0
  const sourcePage = readNullableString(body.sourcePage, 200)
  const campaign = (typeof body.campaign === 'object' && body.campaign !== null ? body.campaign : {}) as Record<string, unknown>

  const looksAutomated = Boolean(website) || (startedAt > 0 && Date.now() - startedAt < MIN_SUBMIT_MS)
  if (looksAutomated) {
    return res.status(200).json({
      status: 'created',
      firstName: firstName.trim() || 'friend',
      city: cityRaw.trim(),
      province: null,
      requestCount: 1,
    })
  }

  const fieldErrors = validateTourRequest({ firstName, email: emailRaw, city: cityRaw, phone })
  if (hasTourRequestFieldErrors(fieldErrors)) {
    return res.status(400).json({ error: 'Check the highlighted fields and try again.', fieldErrors })
  }

  const email = normalizeEmail(emailRaw)
  const directoryEntry = findCityDirectoryEntry(cityRaw)
  const city = directoryEntry?.name ?? cityRaw.trim()
  const province = directoryEntry?.province ?? null
  const nowIso = new Date().toISOString()

  try {
    const { member } = await upsertCommunityMember({
      email,
      firstName: firstName.trim(),
      phone: phone.trim(),
      fallbackCity: city,
      consent: joinCommunity,
      nowIso,
    })

    const attribution = {
      source: 'website',
      source_page: sourcePage,
      signup_context: readNullableString(body.signupContext, 60) ?? 'live-map-city-request',
      utm_source: readNullableString(campaign.utmSource, 200),
      utm_medium: readNullableString(campaign.utmMedium, 200),
      utm_campaign: readNullableString(campaign.utmCampaign, 200),
      referrer: readNullableString(campaign.referrer, 500),
    }

    const existing = await findTourRequest(member.id, city)
    let requestCount = 1

    if (existing) {
      await bumpTourRequest(existing, { notifyOnAnnouncement, nowIso })
      requestCount = existing.request_count + 1
    } else {
      try {
        const created = await insertTourRequest({
          community_member_id: member.id,
          requested_city: city,
          requested_province: province,
          requested_country: 'South Africa',
          latitude: directoryEntry?.latitude ?? null,
          longitude: directoryEntry?.longitude ?? null,
          notify_on_announcement: notifyOnAnnouncement,
          notify_consent_timestamp: notifyOnAnnouncement ? nowIso : null,
          ...attribution,
        })
        requestCount = created.request_count
      } catch (insertError) {
        if (!(insertError instanceof SupabaseConflictError)) throw insertError
        // Simultaneous submissions for the same brand-new member+city pair.
        const raceExisting = await findTourRequest(member.id, city)
        if (!raceExisting) throw insertError
        await bumpTourRequest(raceExisting, { notifyOnAnnouncement, nowIso })
        requestCount = raceExisting.request_count + 1
      }
    }

    const existingShow = findExistingShow(city)

    return res.status(200).json({
      status: existingShow ? 'existing_show' : existing ? 'duplicate' : 'created',
      firstName: firstName.trim(),
      city,
      province,
      requestCount,
      ...(existingShow ? { existingShow } : {}),
    })
  } catch (error) {
    console.error('tour-request: failed to persist request', error)
    return res.status(500).json({ error: GENERIC_ERROR })
  }
}
