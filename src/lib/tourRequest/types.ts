import type { CommunityCampaignInfo } from '../community/types'

/** Where a tour request was triggered from. Extend when new entry points are added. */
export type TourRequestSignupContext = 'live-map-city-request'

export interface TourRequestInput {
  firstName: string
  email: string
  phone: string
  city: string
  /** Opt-in: let this fan know if a show near this city is announced. Separate from joinCommunity. */
  notifyOnAnnouncement: boolean
  /** Opt-in: also join the general Internet Athi community. Separate from notifyOnAnnouncement. */
  joinCommunity: boolean
  /** Honeypot field. Real visitors never populate this. */
  website: string
  /** Client timestamp (ms) captured when the form became visible, used for a bot-timing check. */
  startedAt: number
  sourcePage: string
  signupContext: TourRequestSignupContext
  campaign: CommunityCampaignInfo
}

export type TourRequestStatus = 'created' | 'duplicate' | 'existing_show'

export interface TourRequestExistingShow {
  title: string
  venue: string
  city: string
  dateLabel: string
  ticketUrl: string | null
  directionsUrl: string | null
}

export interface TourRequestResponse {
  status: TourRequestStatus
  firstName: string
  city: string
  province: string | null
  requestCount: number
  existingShow?: TourRequestExistingShow
}

export interface TourRequestErrorResponse {
  error: string
  fieldErrors?: Partial<Record<'firstName' | 'email' | 'city' | 'phone', string>>
}

export interface CityDemandPoint {
  city: string
  province: string | null
  latitude: number
  longitude: number
  requesterCount: number
}
