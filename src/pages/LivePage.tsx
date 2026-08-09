import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ExternalLink } from '../components/ExternalLink'
import { PerformanceGlobe } from '../components/PerformanceGlobe'
import { Seo } from '../components/Seo'
import { liveEvents } from '../content/artist'
import type { LiveEvent } from '../content/types'
import {
  downloadLiveEventCalendar,
  formatLiveEventDate,
  formatLiveEventTime,
  getLiveEventStatus,
  sortLiveEvents,
  type LiveEventStatus,
} from '../lib/liveEvents'
import { Link } from '../lib/router'

type EventFilter = 'upcoming' | 'past' | 'all'

const filterLabels: Record<EventFilter, string> = {
  upcoming: 'Upcoming',
  past: 'Past',
  all: 'All',
}

function statusLabel(status: LiveEventStatus) {
  if (status === 'ongoing') return 'Happening now'
  return status === 'upcoming' ? 'Upcoming' : 'Past programme'
}

function EventDetail({ event, onClose }: { event: LiveEvent; onClose: () => void }) {
  const status = getLiveEventStatus(event)
  const showBookingActions = status !== 'past'

  return (
    <aside className="programme-detail" aria-labelledby={`event-detail-${event.id}`}>
      <div className="programme-detail__topline">
        <p className="index-label">Selected coordinate / {statusLabel(status)}</p>
        <button type="button" onClick={onClose} aria-label="Close event details" autoFocus>Close</button>
      </div>
      <h2 id={`event-detail-${event.id}`}>{event.title}</h2>
      {event.billing ? <p className="programme-detail__billing">{event.billing}</p> : null}

      <dl className="programme-detail__facts">
        <div>
          <dt>Date</dt>
          <dd><time dateTime={event.startDateTime}>{formatLiveEventDate(event)}</time></dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatLiveEventTime(event)}</dd>
        </div>
        <div>
          <dt>Venue</dt>
          <dd>{event.venue}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{event.address ?? `${event.city}, ${event.country}`}</dd>
        </div>
      </dl>

      {event.description ? <p className="programme-detail__description">{event.description}</p> : null}
      {event.lineup && event.lineup.length > 1 ? (
        <div className="programme-detail__lineup">
          <p className="index-label">Programme includes</p>
          <p>{event.lineup.join(' / ')}</p>
        </div>
      ) : null}

      <div className="programme-detail__actions">
        {showBookingActions && event.ticketUrl ? (
          <ExternalLink className="action-link action-link--primary" href={event.ticketUrl} showArrow>
            Get tickets
          </ExternalLink>
        ) : null}
        {showBookingActions && event.rsvpUrl ? (
          <ExternalLink className="action-link action-link--primary" href={event.rsvpUrl} showArrow>
            RSVP
          </ExternalLink>
        ) : null}
        {showBookingActions ? (
          <button className="action-link action-link--quiet" type="button" onClick={() => downloadLiveEventCalendar(event)}>
            Add to calendar
          </button>
        ) : null}
        {event.directionsUrl ? (
          <ExternalLink className="action-link action-link--quiet" href={event.directionsUrl} showArrow>
            Directions
          </ExternalLink>
        ) : null}
        {event.sourceUrl ? (
          <ExternalLink className="programme-detail__source" href={event.sourceUrl}>
            Verified listing
          </ExternalLink>
        ) : null}
      </div>
    </aside>
  )
}

export function LivePage() {
  const [filter, setFilter] = useState<EventFilter>('upcoming')
  const [now, setNow] = useState(() => Date.now())
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)
  const [detailsVisible, setDetailsVisible] = useState(false)
  const lastTriggerRef = useRef<HTMLElement | null>(null)
  const selectionTimerRef = useRef(0)
  const selectedEventIdRef = useRef(selectedEventId)
  selectedEventIdRef.current = selectedEventId

  const counts = useMemo(() => {
    return liveEvents.reduce((result, event) => {
      const status = getLiveEventStatus(event, now)
      if (status === 'past') result.past += 1
      else result.upcoming += 1
      result.all += 1
      return result
    }, { upcoming: 0, past: 0, all: 0 })
  }, [now])

  const events = useMemo(() => {
    if (filter === 'upcoming') {
      return sortLiveEvents(liveEvents.filter((event) => getLiveEventStatus(event, now) !== 'past'))
    }
    if (filter === 'past') {
      return sortLiveEvents(liveEvents.filter((event) => getLiveEventStatus(event, now) === 'past'), 'desc')
    }

    const future = sortLiveEvents(liveEvents.filter((event) => getLiveEventStatus(event, now) !== 'past'))
    const past = sortLiveEvents(liveEvents.filter((event) => getLiveEventStatus(event, now) === 'past'), 'desc')
    return [...future, ...past]
  }, [filter, now])

  const selectedEvent = selectedEventId
    ? liveEvents.find((event) => event.id === selectedEventId) ?? null
    : null

  const closeDetails = useCallback(() => {
    window.clearTimeout(selectionTimerRef.current)
    setDetailsVisible(false)
    setSelectedEventId(null)
    setHighlightedEventId(null)
    const trigger = lastTriggerRef.current
    window.requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus()
    })
  }, [])

  const selectEvent = useCallback((eventId: string, trigger: HTMLElement) => {
    window.clearTimeout(selectionTimerRef.current)
    lastTriggerRef.current = trigger
    setSelectedEventId(eventId)
    setHighlightedEventId(eventId)
    setDetailsVisible(false)
    selectionTimerRef.current = window.setTimeout(() => {
      if (selectedEventIdRef.current === eventId) setDetailsVisible(true)
    }, 980)
  }, [])

  const finishOrientation = useCallback((eventId: string) => {
    if (selectedEventIdRef.current !== eventId) return
    window.clearTimeout(selectionTimerRef.current)
    setDetailsVisible(true)
  }, [])

  const changeFilter = useCallback((nextFilter: EventFilter) => {
    window.clearTimeout(selectionTimerRef.current)
    setSelectedEventId(null)
    setHighlightedEventId(null)
    setDetailsVisible(false)
    setFilter(nextFilter)
  }, [])

  useEffect(() => {
    const statusTimer = window.setInterval(() => setNow(Date.now()), 60_000)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedEventIdRef.current) closeDetails()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearInterval(statusTimer)
      window.clearTimeout(selectionTimerRef.current)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeDetails])

  return (
    <>
      <Seo
        title="Live | Internet Athi"
        description="Explore Internet Athi's verified live programme by date and performance location."
        path="/live"
      />
      <header className="scene-heading scene-heading--live">
        <p className="index-label">Archive 02 / Live</p>
        <h1>Live programme</h1>
        <p className="scene-heading__lede">Performances across the map.</p>
      </header>

      <section
        className={`programme live-map-programme${selectedEvent && detailsVisible ? ' is-detail-open' : ''}`}
        aria-label="Performance programme and location globe"
      >
        <div className="programme__directory-head">
          <div>
            <p className="index-label">Touring coordinates / 2026</p>
            <h2>Dates, rooms and gatherings.</h2>
          </div>
          <p>Choose a date or a marker to bring its location into view.</p>

          <div className="programme__filters" role="group" aria-label="Filter performances">
            {(Object.keys(filterLabels) as EventFilter[]).map((filterName) => (
              <button
                key={filterName}
                type="button"
                className={filter === filterName ? 'is-active' : ''}
                aria-label={filterName === 'past' ? 'Past archive' : filterLabels[filterName]}
                aria-pressed={filter === filterName}
                onClick={() => changeFilter(filterName)}
              >
                {filterLabels[filterName]} <span>{String(counts[filterName]).padStart(2, '0')}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="programme__globe-shell">
          <div className="programme__globe-caption" aria-hidden="true">
            <span>Performance geography</span>
            <span>Drag / select / explore</span>
          </div>
          <PerformanceGlobe
            events={events}
            selectedEventId={selectedEventId}
            highlightedEventId={highlightedEventId}
            onSelect={selectEvent}
            onHighlight={setHighlightedEventId}
            onOrientationComplete={finishOrientation}
          />
          <p className="programme__map-key">
            <span aria-hidden="true" /> Marker / verified public performance location
          </p>
        </div>

        {selectedEvent && detailsVisible ? (
          <EventDetail event={selectedEvent} onClose={closeDetails} />
        ) : null}

        <div className="programme-list-shell" aria-live="polite">
          {events.length ? (
            <ol className="programme-list" aria-label={`${filterLabels[filter]} performances`}>
              {events.map((event, index) => {
                const status = getLiveEventStatus(event)
                const selected = selectedEventId === event.id
                const highlighted = highlightedEventId === event.id
                return (
                  <li
                    className={`programme-entry${selected ? ' is-selected' : ''}${highlighted ? ' is-highlighted' : ''}`}
                    key={event.id}
                  >
                    <button
                      className="programme-entry__select"
                      type="button"
                      aria-expanded={selected && detailsVisible}
                      aria-controls={selected && detailsVisible ? `event-detail-${event.id}` : undefined}
                      onClick={(clickEvent) => selectEvent(event.id, clickEvent.currentTarget)}
                      onFocus={() => setHighlightedEventId(event.id)}
                      onBlur={() => setHighlightedEventId(null)}
                      onMouseEnter={() => setHighlightedEventId(event.id)}
                      onMouseLeave={() => setHighlightedEventId(null)}
                    >
                      <span className="programme-entry__index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="programme-entry__content">
                        <span className="programme-entry__meta">
                          <time dateTime={event.startDateTime}>{formatLiveEventDate(event)}</time>
                          <span>{statusLabel(status)}</span>
                        </span>
                        <strong>{event.title}</strong>
                        <span className="programme-entry__venue">{event.venue}, {event.city}</span>
                      </span>
                      <span className="programme-entry__locate" aria-hidden="true">Locate</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="programme__empty">
              <p className="index-label">No dates in this view</p>
              <h2>No upcoming public shows are currently listed.</h2>
              <p>Past dates remain available in the archive. New verified listings will appear here.</p>
              <button type="button" onClick={() => changeFilter('past')}>View past programme</button>
            </div>
          )}
        </div>

        <div className="programme__request">
          <div>
            <p className="index-label">New performance enquiry</p>
            <p>Bringing Internet Athi to your programme?</p>
          </div>
          <Link className="action-link action-link--primary" to="/book">Request a show</Link>
        </div>
      </section>
    </>
  )
}
