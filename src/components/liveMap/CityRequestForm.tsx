import { useRef, useState, type FormEvent } from 'react'
import { southAfricaCities } from '../../data/southAfricaCities'
import { getStoredFanIdentity, storeFanIdentity } from '../../lib/community/fanIdentity'
import { getStoredCampaign } from '../../lib/community/campaign'
import { useRouter } from '../../lib/router'
import { trackEvent } from '../../lib/analytics'
import { submitTourRequest, TourRequestError } from '../../lib/tourRequest/api'
import type { TourRequestResponse } from '../../lib/tourRequest/types'
import { hasTourRequestFieldErrors, validateTourRequest, type TourRequestFieldErrors } from '../../lib/tourRequest/validation'

interface CityRequestFormProps {
  prefillCity: string | null
  onSuccess: (response: TourRequestResponse, notifyOnAnnouncement: boolean) => void
  firstFieldRef: React.RefObject<HTMLInputElement | null>
}

const GENERIC_ERROR = "We couldn't put your city on the map right now. Please try again."

export function CityRequestForm({ prefillCity, onSuccess, firstFieldRef }: CityRequestFormProps) {
  const { pathname } = useRouter()
  const storedIdentity = useRef(getStoredFanIdentity())
  const [city, setCity] = useState(prefillCity ?? '')
  const [firstName, setFirstName] = useState(storedIdentity.current?.firstName ?? '')
  const [email, setEmail] = useState(storedIdentity.current?.email ?? '')
  const [usingStoredIdentity, setUsingStoredIdentity] = useState(Boolean(storedIdentity.current))
  const [phone, setPhone] = useState('')
  const [notifyOnAnnouncement, setNotifyOnAnnouncement] = useState(false)
  const [joinCommunity, setJoinCommunity] = useState(false)
  const [website, setWebsite] = useState('')
  const [fieldErrors, setFieldErrors] = useState<TourRequestFieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const startedAt = useRef(Date.now())
  const hasTrackedStart = useRef(false)

  const markStarted = () => {
    if (hasTrackedStart.current) return
    hasTrackedStart.current = true
    trackEvent('city_request_form_started', { page: pathname, source: 'live-map-city-request' })
  }

  const clearFieldError = (field: keyof TourRequestFieldErrors) => {
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

    const errors = validateTourRequest({ firstName, email, city, phone })
    if (hasTourRequestFieldErrors(errors)) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    trackEvent('city_request_submitted', { page: pathname, source: 'live-map-city-request', city: city.trim() })

    try {
      const result = await submitTourRequest({
        firstName: firstName.trim(),
        email,
        phone: phone.trim(),
        city: city.trim(),
        notifyOnAnnouncement,
        joinCommunity,
        website,
        startedAt: startedAt.current,
        sourcePage: pathname,
        signupContext: 'live-map-city-request',
        campaign: getStoredCampaign(),
      })

      storeFanIdentity({ firstName: result.firstName, email: email.trim().toLowerCase() })
      onSuccess(result, notifyOnAnnouncement)
    } catch (error) {
      if (error instanceof TourRequestError) {
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
    <form className="community-form tour-request-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="city-request-city">Where should we go?</label>
        <input
          ref={firstFieldRef}
          id="city-request-city"
          name="city"
          list="city-request-city-options"
          autoComplete="address-level2"
          required
          aria-invalid={fieldErrors.city ? true : undefined}
          aria-describedby={fieldErrors.city ? 'city-request-city-error' : undefined}
          value={city}
          onChange={(event) => {
            markStarted()
            setCity(event.target.value)
            clearFieldError('city')
          }}
        />
        <datalist id="city-request-city-options">
          {southAfricaCities.map((cityName) => (
            <option key={cityName} value={cityName} />
          ))}
        </datalist>
        {fieldErrors.city ? (
          <p className="community-form__error" id="city-request-city-error" role="alert">{fieldErrors.city}</p>
        ) : null}
      </div>

      {usingStoredIdentity ? (
        <div className="tour-request-form__identity">
          <p>
            Continuing as <strong>{firstName}</strong> ({email})
          </p>
          <button type="button" onClick={() => setUsingStoredIdentity(false)}>
            Not you? Use a different email
          </button>
        </div>
      ) : (
        <>
          <div className="form-field">
            <label htmlFor="city-request-first-name">First name</label>
            <input
              id="city-request-first-name"
              name="firstName"
              autoComplete="given-name"
              required
              aria-invalid={fieldErrors.firstName ? true : undefined}
              aria-describedby={fieldErrors.firstName ? 'city-request-first-name-error' : undefined}
              value={firstName}
              onChange={(event) => {
                markStarted()
                setFirstName(event.target.value)
                clearFieldError('firstName')
              }}
            />
            {fieldErrors.firstName ? (
              <p className="community-form__error" id="city-request-first-name-error" role="alert">{fieldErrors.firstName}</p>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="city-request-email">Email address</label>
            <input
              id="city-request-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? 'city-request-email-error' : undefined}
              value={email}
              onChange={(event) => {
                markStarted()
                setEmail(event.target.value)
                clearFieldError('email')
              }}
            />
            {fieldErrors.email ? (
              <p className="community-form__error" id="city-request-email-error" role="alert">{fieldErrors.email}</p>
            ) : null}
          </div>
        </>
      )}

      <div className="form-field">
        <label htmlFor="city-request-phone">WhatsApp number <span>optional</span></label>
        <input
          id="city-request-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          aria-invalid={fieldErrors.phone ? true : undefined}
          aria-describedby={fieldErrors.phone ? 'city-request-phone-error' : undefined}
          value={phone}
          onChange={(event) => {
            markStarted()
            setPhone(event.target.value)
            clearFieldError('phone')
          }}
        />
        {fieldErrors.phone ? (
          <p className="community-form__error" id="city-request-phone-error" role="alert">{fieldErrors.phone}</p>
        ) : null}
      </div>

      <label className="community-form__consent">
        <input
          className="sr-only"
          type="checkbox"
          checked={notifyOnAnnouncement}
          onChange={(event) => {
            markStarted()
            setNotifyOnAnnouncement(event.target.checked)
          }}
        />
        <span className="community-form__consent-box" aria-hidden="true" />
        <span className="community-form__consent-text">
          Let me know if Internet Athi announces a show near this city.
        </span>
      </label>

      <label className="community-form__consent">
        <input
          className="sr-only"
          type="checkbox"
          checked={joinCommunity}
          onChange={(event) => {
            markStarted()
            setJoinCommunity(event.target.checked)
          }}
        />
        <span className="community-form__consent-box" aria-hidden="true" />
        <span className="community-form__consent-text">
          I would also like to receive Internet Athi community updates.
        </span>
      </label>

      <div className="form-field form-field--honeypot" aria-hidden="true">
        <label htmlFor="city-request-website">Website</label>
        <input
          id="city-request-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div className="community-form__submit">
        <button type="submit" className="action-link action-link--primary" disabled={submitting}>
          {submitting ? 'Adding your city…' : 'Put my city on the map'}
        </button>
        {submitError ? (
          <p className="community-form__error community-form__error--submit" role="alert">{submitError}</p>
        ) : null}
      </div>
    </form>
  )
}
