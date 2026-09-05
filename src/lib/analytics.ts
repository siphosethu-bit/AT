// No analytics provider is wired into this project yet. Rather than invent one, events are
// dispatched as a DOM CustomEvent so a future provider (GA4, Plausible, etc.) can be attached
// with a single `window.addEventListener('internetathi:analytics', ...)` call. Never pass
// personally identifiable information (email, phone, full name) in `detail`.
export type AnalyticsEvent =
  // Join Internet Athi Community
  | 'community_cta_viewed'
  | 'community_cta_clicked'
  | 'community_form_started'
  | 'community_form_submitted'
  | 'community_signup_success'
  | 'community_signup_duplicate'
  // Bring Internet Athi to my city
  | 'city_request_cta_viewed'
  | 'city_request_cta_clicked'
  | 'city_search_started'
  | 'city_selected'
  | 'city_request_form_started'
  | 'city_request_submitted'
  | 'city_request_duplicate'
  | 'city_request_success'
  | 'city_request_existing_event_conversion'

export interface AnalyticsDetail {
  page: string
  source?: string
  campaign?: string | null
  city?: string
}

const EVENT_NAME = 'internetathi:analytics'

export function trackEvent(event: AnalyticsEvent, detail: AnalyticsDetail) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { event, ...detail } }))

  if (import.meta.env.DEV) {
    console.debug(`[analytics] ${event}`, detail)
  }
}
