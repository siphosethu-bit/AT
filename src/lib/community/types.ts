export type CommunityInterest = 'new_music' | 'live_shows' | 'everything'

/** Where a community signup was triggered from. Extend when new entry points are added. */
export type CommunitySignupContext = 'footer-cta' | 'home-afterword-cta' | 'live-map-city-request'

export interface CommunityCampaignInfo {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  referrer: string | null
}

export interface CommunitySignupInput {
  firstName: string
  email: string
  city: string
  phone: string
  interests: CommunityInterest[]
  consent: boolean
  /** Honeypot field. Real visitors never populate this. */
  website: string
  /** Client timestamp (ms) captured when the form became visible, used for a bot-timing check. */
  startedAt: number
  sourcePage: string
  signupContext: CommunitySignupContext
  campaign: CommunityCampaignInfo
}

export type CommunitySignupStatus = 'created' | 'duplicate'

export interface CommunitySignupResponse {
  status: CommunitySignupStatus
  firstName: string
}

export interface CommunitySignupErrorResponse {
  error: string
  fieldErrors?: Partial<Record<'firstName' | 'email' | 'city' | 'phone' | 'consent', string>>
}
