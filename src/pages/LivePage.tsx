import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CityRequestPanel } from '../components/liveMap/CityRequestPanel'
import { LiveMap } from '../components/LiveMap'
import { Seo } from '../components/Seo'
import { useSiteContent } from '../context/SiteContentContext'
import { SongLinerNote } from '../components/SongLinerNote'
import { useTourRequest } from '../context/TourRequestContext'
import { trackEvent } from '../lib/analytics'
import { getLiveEventStatus, sortLiveEvents } from '../lib/liveEvents'
import { useRouter } from '../lib/router'
import { fetchCityDemand } from '../lib/tourRequest/api'
import type { CityDemandPoint } from '../lib/tourRequest/types'

type EventFilter = 'upcoming' | 'past' | 'all'

const filterOrder: EventFilter[] = ['upcoming', 'past', 'all']
const filterLabels: Record<EventFilter, string> = {
  upcoming: 'Upcoming',
  past: 'Past',
  all: 'All',
}

export function LivePage() {
  const { shows: liveEvents } = useSiteContent()
  const { openPanel } = useTourRequest()
  const { pathname } = useRouter()
  const [filter, setFilter] = useState<EventFilter>('upcoming')
  const [now, setNow] = useState(() => Date.now())
  const [demandPoints, setDemandPoints] = useState<CityDemandPoint[]>([])
  const requestLinkRef = useRef<HTMLButtonElement>(null)
  const hasTrackedRequestView = useRef(false)

  const counts = useMemo(() => (
    liveEvents.reduce((result, event) => {
      const status = getLiveEventStatus(event, now)
      if (status === 'past') result.past += 1
      else result.upcoming += 1
      result.all += 1
      return result
    }, { upcoming: 0, past: 0, all: 0 })
  ), [now, liveEvents])

  const events = useMemo(() => {
    if (filter === 'upcoming') {
      return sortLiveEvents(liveEvents.filter((event) => getLiveEventStatus(event, now) !== 'past'))
    }
    if (filter === 'past') {
      return sortLiveEvents(liveEvents.filter((event) => getLiveEventStatus(event, now) === 'past'), 'desc')
    }
    const upcoming = sortLiveEvents(liveEvents.filter((event) => getLiveEventStatus(event, now) !== 'past'))
    const past = sortLiveEvents(liveEvents.filter((event) => getLiveEventStatus(event, now) === 'past'), 'desc')
    return [...upcoming, ...past]
  }, [filter, now, liveEvents])

  // Confirmed events take visual priority: a city already showing a performance marker doesn't
  // also get a separate demand marker.
  const visibleDemandPoints = useMemo(() => {
    const confirmedCities = new Set(liveEvents.map((event) => event.city.trim().toLowerCase()))
    return demandPoints.filter((point) => !confirmedCities.has(point.city.trim().toLowerCase()))
  }, [demandPoints, liveEvents])

  useEffect(() => {
    let cancelled = false
    fetchCityDemand().then((points) => {
      if (!cancelled) setDemandPoints(points)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const handleRequestClick = useCallback(() => {
    trackEvent('city_request_cta_clicked', { page: pathname, source: 'live-map-city-request' })
    openPanel(requestLinkRef.current)
  }, [openPanel, pathname])

  useEffect(() => {
    hasTrackedRequestView.current = false
    const target = requestLinkRef.current
    if (!target) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || hasTrackedRequestView.current) return
      hasTrackedRequestView.current = true
      trackEvent('city_request_cta_viewed', { page: pathname, source: 'live-map-city-request' })
      observer.disconnect()
    }, { threshold: 0.6 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [pathname])

  return (
    <>
      <Seo
        title="Live | Internet Athi"
        description="A map of Internet Athi's verified live performances across South Africa, upcoming and past."
        path="/live"
      />

      <section className="live-desk" aria-labelledby="live-desk-title">
        <header className="live-desk__header">
          <div>
            <h1 id="live-desk-title">Live</h1>
            <p>Tap a city to see the show.</p>
          </div>
          <div className="live-desk__filters" role="group" aria-label="Filter shows">
            {filterOrder.map((filterName) => (
              <button
                key={filterName}
                type="button"
                aria-pressed={filter === filterName}
                onClick={() => setFilter(filterName)}
              >
                {filterLabels[filterName]}
                <i>{counts[filterName]}</i>
              </button>
            ))}
          </div>
        </header>

        <div className="live-desk__map-wrap">
          <LiveMap
            events={events}
            demandPoints={visibleDemandPoints}
            onDemandMarkerSelect={(city, trigger) => openPanel(trigger, city)}
          />
        </div>

        <footer className="live-desk__footer">
          <p className="live-desk__legend">
            <span><i className="live-desk__legend-dot live-desk__legend-dot--upcoming" aria-hidden="true" />Upcoming</span>
            <span><i className="live-desk__legend-dot live-desk__legend-dot--past" aria-hidden="true" />Past</span>
          </p>
          <p className="live-desk__request">
            No show near you?{' '}
            <button type="button" ref={requestLinkRef} onClick={handleRequestClick}>
              Bring Internet Athi to your city
            </button>
          </p>
        </footer>
      </section>

      <SongLinerNote />
      <CityRequestPanel />
    </>
  )
}
