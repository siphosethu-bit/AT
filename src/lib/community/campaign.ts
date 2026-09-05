import type { CommunityCampaignInfo } from './types'

const STORAGE_KEY = 'internet-athi-campaign'

interface StoredCampaign extends CommunityCampaignInfo {
  sourceQuery: string | null
}

function readStorage(): StoredCampaign | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredCampaign) : null
  } catch {
    return null
  }
}

function writeStorage(value: StoredCampaign) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private browsing, quota). Campaign attribution is best-effort.
  }
}

/**
 * Captures utm_* params, a custom `source` query param and the landing referrer on first load,
 * then persists them for the rest of the session so a signup completed later (e.g. from the
 * footer CTA on a different page) still records where the visit originated.
 */
export function captureCampaignFromLocation() {
  if (typeof window === 'undefined') return

  const existing = readStorage()
  if (existing) return

  const params = new URLSearchParams(window.location.search)
  writeStorage({
    utmSource: params.get('utm_source') ?? params.get('source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    referrer: document.referrer || null,
    sourceQuery: params.get('source'),
  })
}

export function getStoredCampaign(): CommunityCampaignInfo {
  const stored = readStorage()
  return {
    utmSource: stored?.utmSource ?? null,
    utmMedium: stored?.utmMedium ?? null,
    utmCampaign: stored?.utmCampaign ?? null,
    referrer: stored?.referrer ?? null,
  }
}
