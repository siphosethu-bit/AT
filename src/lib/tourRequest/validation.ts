// Shared between the client form and the /api/tour-request serverless function.
import { isValidCity, isValidEmail, isValidName, isValidPhone, MIN_SUBMIT_MS } from '../community/validation'

export { MIN_SUBMIT_MS }

export interface TourRequestFieldErrors {
  firstName?: string
  email?: string
  city?: string
  phone?: string
}

export function validateTourRequest(input: {
  firstName: string
  email: string
  city: string
  phone: string
}): TourRequestFieldErrors {
  const errors: TourRequestFieldErrors = {}

  if (!isValidCity(input.city)) {
    errors.city = 'Choose or enter a city.'
  }
  if (!isValidName(input.firstName)) {
    errors.firstName = 'Enter your first name.'
  }
  if (!isValidEmail(input.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!isValidPhone(input.phone)) {
    errors.phone = 'Enter a valid phone number, or leave this blank.'
  }

  return errors
}

export function hasTourRequestFieldErrors(errors: TourRequestFieldErrors): boolean {
  return Object.keys(errors).length > 0
}
