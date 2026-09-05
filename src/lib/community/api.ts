import type { CommunitySignupErrorResponse, CommunitySignupInput, CommunitySignupResponse } from './types'

export class CommunitySignupError extends Error {
  fieldErrors?: CommunitySignupErrorResponse['fieldErrors']

  constructor(message: string, fieldErrors?: CommunitySignupErrorResponse['fieldErrors']) {
    super(message)
    this.name = 'CommunitySignupError'
    this.fieldErrors = fieldErrors
  }
}

const GENERIC_ERROR = 'Something went wrong while joining the community. Please try again.'

export async function submitCommunitySignup(input: CommunitySignupInput): Promise<CommunitySignupResponse> {
  let response: Response
  try {
    response = await fetch('/api/community-join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    throw new CommunitySignupError(GENERIC_ERROR)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const errorPayload = payload as CommunitySignupErrorResponse | null
    throw new CommunitySignupError(errorPayload?.error ?? GENERIC_ERROR, errorPayload?.fieldErrors)
  }

  return payload as CommunitySignupResponse
}
