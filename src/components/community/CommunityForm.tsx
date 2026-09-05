import { useRef, useState, type FormEvent } from 'react'
import { southAfricaCities } from '../../data/southAfricaCities'
import { CommunitySignupError, submitCommunitySignup } from '../../lib/community/api'
import { getStoredCampaign } from '../../lib/community/campaign'
import { getStoredFanIdentity, storeFanIdentity } from '../../lib/community/fanIdentity'
import type { CommunityInterest, CommunitySignupContext, CommunitySignupStatus } from '../../lib/community/types'
import { hasFieldErrors, validateCommunitySignup, type CommunityFieldErrors } from '../../lib/community/validation'
import { trackEvent } from '../../lib/analytics'
import { useRouter } from '../../lib/router'

interface CommunityFormProps {
  signupContext: CommunitySignupContext
  onSuccess: (firstName: string, status: CommunitySignupStatus) => void
  firstFieldRef: React.RefObject<HTMLInputElement | null>
}

const interestOptions: { value: CommunityInterest; label: string }[] = [
  { value: 'new_music', label: 'New music' },
  { value: 'live_shows', label: 'Live shows' },
  { value: 'everything', label: 'Everything Internet Athi' },
]

const GENERIC_ERROR = 'Something went wrong while joining the community. Please try again.'

export function CommunityForm({ signupContext, onSuccess, firstFieldRef }: CommunityFormProps) {
  const { pathname } = useRouter()
  const storedIdentity = useRef(getStoredFanIdentity())
  const [firstName, setFirstName] = useState(storedIdentity.current?.firstName ?? '')
  const [email, setEmail] = useState(storedIdentity.current?.email ?? '')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [interest, setInterest] = useState<CommunityInterest | null>(null)
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [fieldErrors, setFieldErrors] = useState<CommunityFieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const startedAt = useRef(Date.now())
  const hasTrackedStart = useRef(false)

  const markStarted = () => {
    if (hasTrackedStart.current) return
    hasTrackedStart.current = true
    trackEvent('community_form_started', { page: pathname, source: signupContext })
  }

  const clearFieldError = (field: keyof CommunityFieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || website) return

    const errors = validateCommunitySignup({ firstName, email, city, phone, consent })
    if (hasFieldErrors(errors)) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    trackEvent('community_form_submitted', { page: pathname, source: signupContext })

    try {
      const result = await submitCommunitySignup({
        firstName: firstName.trim(),
        email,
        city: city.trim(),
        phone: phone.trim(),
        interests: interest ? [interest] : [],
        consent,
        website,
        startedAt: startedAt.current,
        sourcePage: pathname,
        signupContext,
        campaign: getStoredCampaign(),
      })

      trackEvent(
        result.status === 'duplicate' ? 'community_signup_duplicate' : 'community_signup_success',
        { page: pathname, source: signupContext, city: city.trim() },
      )
      storeFanIdentity({ firstName: result.firstName || firstName.trim(), email: email.trim().toLowerCase() })
      onSuccess(result.firstName || firstName.trim(), result.status)
    } catch (error) {
      if (error instanceof CommunitySignupError) {
        setSubmitError(error.message)
        if (error.fieldErrors) setFieldErrors((current) => ({ ...current, ...error.fieldErrors }))
      } else {
        setSubmitError(GENERIC_ERROR)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="community-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="community-first-name">First name</label>
        <input
          ref={firstFieldRef}
          id="community-first-name"
          name="firstName"
          autoComplete="given-name"
          required
          aria-invalid={fieldErrors.firstName ? true : undefined}
          aria-describedby={fieldErrors.firstName ? 'community-first-name-error' : undefined}
          value={firstName}
          onChange={(event) => {
            markStarted()
            setFirstName(event.target.value)
            clearFieldError('firstName')
          }}
        />
        {fieldErrors.firstName ? (
          <p className="community-form__error" id="community-first-name-error" role="alert">{fieldErrors.firstName}</p>
        ) : null}
      </div>

      <div className="form-field">
        <label htmlFor="community-email">Email address</label>
        <input
          id="community-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? 'community-email-error' : undefined}
          value={email}
          onChange={(event) => {
            markStarted()
            setEmail(event.target.value)
            clearFieldError('email')
          }}
        />
        {fieldErrors.email ? (
          <p className="community-form__error" id="community-email-error" role="alert">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="form-field">
        <label htmlFor="community-city">City</label>
        <input
          id="community-city"
          name="city"
          list="community-city-options"
          autoComplete="address-level2"
          required
          aria-invalid={fieldErrors.city ? true : undefined}
          aria-describedby={fieldErrors.city ? 'community-city-error' : undefined}
          value={city}
          onChange={(event) => {
            markStarted()
            setCity(event.target.value)
            clearFieldError('city')
          }}
        />
        <datalist id="community-city-options">
          {southAfricaCities.map((cityName) => (
            <option key={cityName} value={cityName} />
          ))}
        </datalist>
        {fieldErrors.city ? (
          <p className="community-form__error" id="community-city-error" role="alert">{fieldErrors.city}</p>
        ) : null}
      </div>

      <div className="form-field">
        <label htmlFor="community-phone">WhatsApp number <span>optional</span></label>
        <input
          id="community-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          aria-invalid={fieldErrors.phone ? true : undefined}
          aria-describedby={fieldErrors.phone ? 'community-phone-error' : 'community-phone-hint'}
          value={phone}
          onChange={(event) => {
            markStarted()
            setPhone(event.target.value)
            clearFieldError('phone')
          }}
        />
        {fieldErrors.phone ? (
          <p className="community-form__error" id="community-phone-error" role="alert">{fieldErrors.phone}</p>
        ) : (
          <p className="community-form__hint" id="community-phone-hint">
            Optional. Used only for the updates you consent to below.
          </p>
        )}
      </div>

      <fieldset className="community-form__interests">
        <legend>What would you like to hear about? <span>optional</span></legend>
        <div className="community-form__interest-options">
          {interestOptions.map((option) => (
            <label key={option.value} className={interest === option.value ? 'is-active' : undefined}>
              <input
                className="sr-only"
                type="radio"
                name="interest"
                value={option.value}
                checked={interest === option.value}
                onChange={() => {
                  markStarted()
                  setInterest(option.value)
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-field form-field--honeypot" aria-hidden="true">
        <label htmlFor="community-website">Website</label>
        <input
          id="community-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <label className="community-form__consent">
        <input
          className="sr-only"
          type="checkbox"
          checked={consent}
          required
          aria-invalid={fieldErrors.consent ? true : undefined}
          aria-describedby={fieldErrors.consent ? 'community-consent-error' : undefined}
          onChange={(event) => {
            markStarted()
            setConsent(event.target.checked)
            clearFieldError('consent')
          }}
        />
        <span className="community-form__consent-box" aria-hidden="true" />
        <span className="community-form__consent-text">
          I agree to receive updates from Internet Athi and understand that I can unsubscribe at any time.
        </span>
      </label>
      {fieldErrors.consent ? (
        <p className="community-form__error" id="community-consent-error" role="alert">{fieldErrors.consent}</p>
      ) : null}

      <div className="community-form__submit">
        <button type="submit" className="action-link action-link--primary" disabled={submitting}>
          {submitting ? 'Joining…' : 'Join the community'}
        </button>
        {submitError ? (
          <p className="community-form__error community-form__error--submit" role="alert">{submitError}</p>
        ) : null}
      </div>
    </form>
  )
}
