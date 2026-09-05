import type { CityDemandPoint, TourRequestErrorResponse, TourRequestInput, TourRequestResponse } from './types'

export class TourRequestError extends Error {
  fieldErrors?: TourRequestErrorResponse['fieldErrors']

  constructor(message: string, fieldErrors?: TourRequestErrorResponse['fieldErrors']) {
    super(message)
    this.name = 'TourRequestError'
    this.fieldErrors = fieldErrors
  }
}

const GENERIC_ERROR = "We couldn't put your city on the map right now. Please try again."

export async function submitTourRequest(input: TourRequestInput): Promise<TourRequestResponse> {
  let response: Response
  try {
    response = await fetch('/api/tour-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    throw new TourRequestError(GENERIC_ERROR)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const errorPayload = payload as TourRequestErrorResponse | null
    throw new TourRequestError(errorPayload?.error ?? GENERIC_ERROR, errorPayload?.fieldErrors)
  }

  return payload as TourRequestResponse
}

export async function fetchCityDemand(): Promise<CityDemandPoint[]> {
  try {
    const response = await fetch('/api/tour-demand')
    if (!response.ok) return []
    const payload = (await response.json()) as { points?: CityDemandPoint[] }
    return payload.points ?? []
  } catch {
    return []
  }
}
