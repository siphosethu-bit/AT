// Shared between the client form and the /api/community-join serverless function.
// Keep this file free of browser- or Node-only APIs so it can run in both places.
import type { CommunityInterest } from './types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_NAME_LENGTH = 2
const MIN_CITY_LENGTH = 2
/** Real users take longer than this to fill the form; bots that submit instantly are dropped. */
export const MIN_SUBMIT_MS = 1200

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidName(name: string): boolean {
  return name.trim().length >= MIN_NAME_LENGTH
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(email))
}

export function isValidCity(city: string): boolean {
  return city.trim().length >= MIN_CITY_LENGTH
}

export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim()
  if (!trimmed) return true
  const digitCount = trimmed.replace(/\D/g, '').length
  return /^\+?[0-9\s().-]{7,20}$/.test(trimmed) && digitCount >= 7 && digitCount <= 15
}

export function isValidInterests(interests: unknown): interests is CommunityInterest[] {
  if (!Array.isArray(interests)) return false
  const allowed: CommunityInterest[] = ['new_music', 'live_shows', 'everything']
  return interests.every((interest) => allowed.includes(interest as CommunityInterest))
}

export interface CommunityFieldErrors {
  firstName?: string
  email?: string
  city?: string
  phone?: string
  consent?: string
}

export function validateCommunitySignup(input: {
  firstName: string
  email: string
  city: string
  phone: string
  consent: boolean
}): CommunityFieldErrors {
  const errors: CommunityFieldErrors = {}

  if (!isValidName(input.firstName)) {
    errors.firstName = 'Enter your first name.'
  }
  if (!isValidEmail(input.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!isValidCity(input.city)) {
    errors.city = 'Enter your city.'
  }
  if (!isValidPhone(input.phone)) {
    errors.phone = 'Enter a valid phone number, or leave this blank.'
  }
  if (!input.consent) {
    errors.consent = 'Consent is required to join the community.'
  }

  return errors
}

export function hasFieldErrors(errors: CommunityFieldErrors): boolean {
  return Object.keys(errors).length > 0
}
