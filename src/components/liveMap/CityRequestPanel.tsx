import { useRef, useState } from 'react'
import { useTourRequest } from '../../context/TourRequestContext'
import { trackEvent } from '../../lib/analytics'
import type { TourRequestResponse } from '../../lib/tourRequest/types'
import { useRouter } from '../../lib/router'
import { Overlay } from '../overlay/Overlay'
import { CityRequestForm } from './CityRequestForm'
import { CityRequestSuccess } from './CityRequestSuccess'

export function CityRequestPanel() {
  const { isOpen, closePanel, prefillCity, triggerRef } = useTourRequest()
  const { pathname } = useRouter()
  const [result, setResult] = useState<TourRequestResponse | null>(null)
  const [notifyRequested, setNotifyRequested] = useState(false)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const handleSuccess = (response: TourRequestResponse, notifyOnAnnouncement: boolean) => {
    trackEvent(
      response.status === 'existing_show'
        ? 'city_request_existing_event_conversion'
        : response.status === 'duplicate'
          ? 'city_request_duplicate'
          : 'city_request_success',
      { page: pathname, source: 'live-map-city-request', city: response.city },
    )
    setNotifyRequested(notifyOnAnnouncement)
    setResult(response)
  }

  return (
    <Overlay
      isOpen={isOpen}
      onClose={closePanel}
      triggerRef={triggerRef}
      initialFocusRef={firstFieldRef}
      labelledBy="city-request-panel-title"
      onExitComplete={() => {
        setResult(null)
        setNotifyRequested(false)
      }}
    >
      {result ? (
        <CityRequestSuccess response={result} notifyRequested={notifyRequested} onClose={closePanel} />
      ) : (
        <>
          <p className="index-label">No show near you?</p>
          <h2 id="city-request-panel-title" className="overlay-panel__title">
            Bring Internet Athi<br />to my city.
          </h2>
          <p className="overlay-panel__lede">
            Tell us where you&rsquo;d like to see Athi next. If a show near you is already confirmed, we&rsquo;ll show you that instead.
          </p>
          <CityRequestForm
            prefillCity={prefillCity}
            firstFieldRef={firstFieldRef}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </Overlay>
  )
}
