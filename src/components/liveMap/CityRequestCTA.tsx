import { useEffect, useRef } from 'react'
import { useTourRequest } from '../../context/TourRequestContext'
import { trackEvent } from '../../lib/analytics'
import { useRouter } from '../../lib/router'

export function CityRequestCTA() {
  const { openPanel } = useTourRequest()
  const { pathname } = useRouter()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const hasTrackedView = useRef(false)

  useEffect(() => {
    hasTrackedView.current = false
    const button = buttonRef.current
    if (!button) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasTrackedView.current) return
        hasTrackedView.current = true
        trackEvent('city_request_cta_viewed', { page: pathname, source: 'live-map-city-request' })
        observer.disconnect()
      },
      { threshold: 0.6 },
    )
    observer.observe(button)
    return () => observer.disconnect()
  }, [pathname])

  const handleClick = () => {
    trackEvent('city_request_cta_clicked', { page: pathname, source: 'live-map-city-request' })
    openPanel(buttonRef.current)
  }

  return (
    <button ref={buttonRef} type="button" className="city-request-cta" onClick={handleClick}>
      <span className="city-request-cta__eyebrow">No show near you?</span>
      <span className="city-request-cta__title">Bring Internet Athi<br />to my city</span>
    </button>
  )
}
