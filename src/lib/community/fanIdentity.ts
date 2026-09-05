// A lightweight, same-device convenience only — never an identity or auth mechanism. After a
// successful community signup or tour request, we remember the name/email locally so the next
// form on this browser can start pre-filled instead of asking again. Fields stay visible and
// editable; nothing is hidden or assumed on the strength of this alone.
const STORAGE_KEY = 'internet-athi-fan'

export interface StoredFanIdentity {
  firstName: string
  email: string
}

export function getStoredFanIdentity(): StoredFanIdentity | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredFanIdentity>
    if (typeof parsed.firstName !== 'string' || typeof parsed.email !== 'string') return null
    return { firstName: parsed.firstName, email: parsed.email }
  } catch {
    return null
  }
}

export function storeFanIdentity(identity: StoredFanIdentity) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    // Storage can be unavailable (private browsing, quota). Prefill is best-effort.
  }
}
