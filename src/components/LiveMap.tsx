import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type SVGProps,
} from 'react'
import type { LiveEvent } from '../content/types'
import { downloadLiveEventCalendar } from '../lib/liveEventCalendar'
import { formatLiveEventDate, formatLiveEventTime, getLiveEventStatus } from '../lib/liveEvents'
import {
  SA_MAP_HEIGHT,
  SA_MAP_WIDTH,
  projectPoint,
  southAfricaPath,
  southAfricaProvinceFeatures,
} from '../lib/southAfricaMap'
import type { CityDemandPoint } from '../lib/tourRequest/types'
import { southAfricaCityLabels } from '../data/southAfricaCityLabels'
import { ExternalLink } from './ExternalLink'

interface LiveMapProps {
  /** Events for the active filter, already sorted by date — this is also the card's hop order. */
  events: LiveEvent[]
  /** Aggregated, non-PII fan demand for cities without a confirmed show yet. */
  demandPoints?: CityDemandPoint[]
  /** Opens the city-request panel prefilled with this city when a demand marker is chosen. */
  onDemandMarkerSelect?: (city: string, trigger: HTMLElement) => void
}

const mapPadding = 44

const CARD_WIDTH = 286
const CARD_GAP = 22
const CARD_EDGE_MARGIN = 8
const CLOSE_TRANSITION_MS = 200

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" {...props}>
      <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon({ direction, ...props }: SVGProps<SVGSVGElement> & { direction: 'left' | 'right' }) {
  const d = direction === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" {...props}>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" {...props}>
      <rect x="2" y="3" width="12" height="11" rx="1" />
      <path d="M2 7h12M5 1.5v3M11 1.5v3" strokeLinecap="round" />
    </svg>
  )
}

function toPercent(value: number, axisLength: number) {
  return (value / axisLength) * 100
}

interface ProjectedMarker {
  event: LiveEvent
  x: number
  y: number
}

type OpenTarget =
  | { type: 'event'; id: string }
  | { type: 'province'; name: string }

// Vertical offsets are tried before horizontal ones so that two markers pulled apart by this
// function land on different label rows instead of different label columns — their labels
// (which read horizontally, out from the dot) then stack instead of colliding.
const declutterAngles = [90, 270, 45, 135, 225, 315]

/** Nudges markers that project to (nearly) the same point apart, just enough that every one of
 * them keeps its own clickable hit area, without moving anything far from its real coordinate. */
function declutter(markers: ProjectedMarker[]): ProjectedMarker[] {
  const placed: { x: number; y: number }[] = []
  return markers.map((marker) => {
    let { x, y } = marker
    let attempt = 0
    while (placed.some((point) => Math.hypot(point.x - x, point.y - y) < 14) && attempt < declutterAngles.length) {
      const angle = (declutterAngles[attempt] * Math.PI) / 180
      x = marker.x + Math.cos(angle) * 14
      y = marker.y + Math.sin(angle) * 14
      attempt += 1
    }
    placed.push({ x, y })
    return { ...marker, x, y }
  })
}

export function LiveMap({ events, demandPoints = [], onDemandMarkerSelect }: LiveMapProps) {
  const descriptionId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const markerRefs = useRef(new Map<string, HTMLButtonElement>())
  const provinceRefs = useRef(new Map<string, SVGPathElement>())
  const closeTimeoutRef = useRef<number | undefined>(undefined)
  const [revealed, setRevealed] = useState(false)
  const [openTarget, setOpenTarget] = useState<OpenTarget | null>(null)
  const [cardVisible, setCardVisible] = useState(false)
  const [cardStyle, setCardStyle] = useState<{ left: number; top: number; transformOrigin: string } | null>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setRevealed(true)
        observer.disconnect()
      }
    }, { threshold: 0.2 })

    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  const provincePaths = useMemo(() => (
    southAfricaProvinceFeatures.map((feature) => {
      const [x, y] = southAfricaPath.centroid(feature)
      return {
        name: feature.properties.name,
        d: southAfricaPath(feature) ?? '',
        x,
        y,
      }
    })
  ), [])

  // Shows currently in view (respecting the Upcoming/Past/All filter), grouped by province, so a
  // province click can list everything happening there without needing each pin found and tapped.
  const provinceEvents = useMemo(() => {
    const map = new Map<string, LiveEvent[]>()
    for (const event of events) {
      if (!event.region) continue
      const list = map.get(event.region)
      if (list) list.push(event)
      else map.set(event.region, [event])
    }
    return map
  }, [events])

  const cityLabels = useMemo(() => (
    southAfricaCityLabels.map((city) => {
      const point = projectPoint(city.longitude, city.latitude)
      return point ? { ...city, x: point[0], y: point[1] } : null
    }).filter((value): value is typeof southAfricaCityLabels[number] & { x: number, y: number } => value !== null)
  ), [])

  const markers = useMemo(() => {
    const projected = events.map((event) => {
      const point = projectPoint(event.longitude, event.latitude)
      return point ? { event, x: point[0], y: point[1] } : null
    }).filter((value): value is ProjectedMarker => value !== null)

    const decluttered = declutter(projected)

    // Two events in the same named city (e.g. two Cape Town shows) would otherwise print the
    // same label twice right next to each other — show the venue on every repeat instead so
    // each marker still reads as distinct.
    const seenCityNames = new Set<string>()
    const withLabelText = decluttered.map((marker) => {
      const cityKey = marker.event.city.trim().toLowerCase()
      const labelText = seenCityNames.has(cityKey) ? marker.event.venue : marker.event.city
      seenCityNames.add(cityKey)
      return { ...marker, labelText }
    })

    // A marker's label can also collide with the map's static, event-less city labels (e.g.
    // Stellenbosch sitting right next to Cape Town), so those count as crowding too.
    const staticLabelPoints = cityLabels.map((city) => ({ x: city.x, y: city.y }))

    return withLabelText.map((marker) => {
      const nearRightEdge = marker.x > SA_MAP_WIDTH - mapPadding * 3
      const crowdedFromTheRight = [
        ...withLabelText.filter((other) => other.event.id !== marker.event.id),
        ...staticLabelPoints,
      ].some((other) => (
        other.x > marker.x
        && other.x - marker.x < 140
        && Math.abs(other.y - marker.y) < 42
      ))
      const side: 'left' | 'right' = nearRightEdge || crowdedFromTheRight ? 'left' : 'right'
      return { ...marker, side }
    })
  }, [events, cityLabels])

  const demandMarkers = useMemo(() => (
    demandPoints.map((demand) => {
      const point = projectPoint(demand.longitude, demand.latitude)
      return point ? { demand, x: point[0], y: point[1] } : null
    }).filter((value): value is { demand: CityDemandPoint, x: number, y: number } => value !== null)
  ), [demandPoints])

  const openEvent = openTarget?.type === 'event' ? events.find((event) => event.id === openTarget.id) ?? null : null
  const openProvinceName = openTarget?.type === 'province' ? openTarget.name : null
  const openProvinceEvents = openProvinceName ? provinceEvents.get(openProvinceName) ?? [] : []
  const cardHeadingId = openTarget
    ? openTarget.type === 'event'
      ? `live-map-card-title-${openTarget.id}`
      : `live-map-card-province-${openTarget.name.replace(/\s+/g, '-').toLowerCase()}`
    : undefined

  const reposition = useCallback(() => {
    const wrapper = wrapperRef.current
    const card = cardRef.current
    if (!wrapper || !card || !openTarget) return

    const anchor = openTarget.type === 'event'
      ? markers.find((item) => item.event.id === openTarget.id)
      : provincePaths.find((item) => item.name === openTarget.name)
    if (!anchor) return

    const rect = wrapper.getBoundingClientRect()
    const scaleX = rect.width / SA_MAP_WIDTH
    const scaleY = rect.height / SA_MAP_HEIGHT
    const px = anchor.x * scaleX
    const py = anchor.y * scaleY
    const cardWidth = card.offsetWidth || CARD_WIDTH
    const cardHeight = card.offsetHeight || 200

    let left = px + CARD_GAP
    let origin = 'left'
    if (left + cardWidth > rect.width - CARD_EDGE_MARGIN) {
      left = px - CARD_GAP - cardWidth
      origin = 'right'
    }
    left = Math.max(CARD_EDGE_MARGIN, Math.min(left, rect.width - cardWidth - CARD_EDGE_MARGIN))
    const top = Math.min(Math.max(py - cardHeight / 2, CARD_EDGE_MARGIN), rect.height - cardHeight - CARD_EDGE_MARGIN)

    setCardStyle({ left, top, transformOrigin: `${origin} ${Math.round(py - top)}px` })
  }, [openTarget, markers, provincePaths])

  useLayoutEffect(() => {
    if (openTarget === null) return
    reposition()
  }, [openTarget, reposition])

  useEffect(() => {
    if (openTarget === null || cardVisible) return
    const raf = window.requestAnimationFrame(() => setCardVisible(true))
    return () => window.cancelAnimationFrame(raf)
  }, [openTarget, cardVisible])

  useEffect(() => {
    if (openTarget === null) return
    window.addEventListener('resize', reposition)
    return () => window.removeEventListener('resize', reposition)
  }, [openTarget, reposition])

  // Close the card if the currently open event drops out of the active filter. A province stays
  // open across filter changes instead — its list just reflects however many shows remain (or an
  // empty state), since the province itself never leaves the map.
  useEffect(() => {
    if (openTarget?.type === 'event' && !events.some((event) => event.id === openTarget.id)) {
      window.clearTimeout(closeTimeoutRef.current)
      setOpenTarget(null)
      setCardVisible(false)
    }
  }, [events, openTarget])

  useEffect(() => () => window.clearTimeout(closeTimeoutRef.current), [])

  const openEventCard = useCallback((event: LiveEvent) => {
    window.clearTimeout(closeTimeoutRef.current)
    if (openTarget === null) setCardVisible(false)
    setOpenTarget({ type: 'event', id: event.id })
  }, [openTarget])

  const openProvinceCard = useCallback((name: string) => {
    window.clearTimeout(closeTimeoutRef.current)
    if (openTarget === null) setCardVisible(false)
    setOpenTarget({ type: 'province', name })
  }, [openTarget])

  const closeCard = useCallback(() => {
    if (openTarget === null) return
    const trigger = openTarget.type === 'event'
      ? markerRefs.current.get(openTarget.id)
      : provinceRefs.current.get(openTarget.name)
    setCardVisible(false)
    window.clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = window.setTimeout(() => setOpenTarget(null), CLOSE_TRANSITION_MS)
    window.requestAnimationFrame(() => trigger?.focus())
  }, [openTarget])

  const hop = useCallback((direction: number) => {
    setOpenTarget((current) => {
      if (current === null || current.type !== 'event' || events.length === 0) return current
      const index = events.findIndex((event) => event.id === current.id)
      if (index === -1) return current
      return { type: 'event', id: events[(index + direction + events.length) % events.length].id }
    })
  }, [events])

  useEffect(() => {
    if (openTarget === null) return
    const handleKeyDown = (domEvent: KeyboardEvent) => {
      if (domEvent.key === 'Escape') closeCard()
      else if (domEvent.key === 'ArrowRight') hop(1)
      else if (domEvent.key === 'ArrowLeft') hop(-1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openTarget, closeCard, hop])

  return (
    <div
      ref={wrapperRef}
      className="live-map"
      role="group"
      aria-label="Map of South Africa showing performance locations"
      aria-describedby={descriptionId}
      data-reveal-state={revealed ? 'revealed' : 'pending'}
      onClick={() => { if (openTarget !== null) closeCard() }}
    >
      <svg
        className="live-map__frame"
        viewBox={`0 0 ${SA_MAP_WIDTH} ${SA_MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="live-map-stipple" patternUnits="userSpaceOnUse" width="7" height="7">
            <circle cx="1" cy="1.5" r="0.5" fill="var(--clay)" opacity="0.5" />
            <circle cx="4.5" cy="0.8" r="0.4" fill="var(--clay)" opacity="0.4" />
            <circle cx="2.5" cy="3.8" r="0.55" fill="var(--clay)" opacity="0.45" />
            <circle cx="6" cy="4.2" r="0.4" fill="var(--clay)" opacity="0.35" />
            <circle cx="0.5" cy="5.8" r="0.45" fill="var(--clay)" opacity="0.4" />
            <circle cx="4" cy="6.2" r="0.5" fill="var(--clay)" opacity="0.5" />
          </pattern>
          <filter id="live-map-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <clipPath id="live-map-landmass">
            {provincePaths.map((province) => (
              <path key={province.name} d={province.d} />
            ))}
          </clipPath>
        </defs>

        <g className="live-map__provinces">
          {provincePaths.map((province) => {
            const eventsHere = provinceEvents.get(province.name) ?? []
            const isSelected = openTarget?.type === 'province' && openTarget.name === province.name
            const isDimmed = openTarget?.type === 'province' && openTarget.name !== province.name
            const label = eventsHere.length === 0
              ? `${province.name}, no confirmed shows in view`
              : `${province.name}, ${eventsHere.length} ${eventsHere.length === 1 ? 'show' : 'shows'} in view`

            return (
              <path
                key={province.name}
                ref={(element) => {
                  if (element) provinceRefs.current.set(province.name, element)
                  else provinceRefs.current.delete(province.name)
                }}
                className={[
                  'live-map__province',
                  eventsHere.length > 0 ? 'has-events' : '',
                  isSelected ? 'is-selected' : '',
                  isDimmed ? 'is-dimmed' : '',
                ].filter(Boolean).join(' ')}
                d={province.d}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={isSelected}
                onClick={(domEvent) => {
                  domEvent.stopPropagation()
                  openProvinceCard(province.name)
                }}
                onKeyDown={(domEvent) => {
                  if (domEvent.key !== 'Enter' && domEvent.key !== ' ') return
                  domEvent.preventDefault()
                  domEvent.stopPropagation()
                  openProvinceCard(province.name)
                }}
              />
            )
          })}
        </g>

        <rect
          className="live-map__grain"
          aria-hidden="true"
          x={mapPadding}
          y={mapPadding}
          width={SA_MAP_WIDTH - mapPadding * 2}
          height={SA_MAP_HEIGHT - mapPadding * 2}
          filter="url(#live-map-grain)"
          clipPath="url(#live-map-landmass)"
        />
      </svg>

      <p className="sr-only" id={descriptionId}>
        Filled markers show verified upcoming performances; hollow markers show past ones. Select a marker to open
        its brief, use the left and right arrow keys or the card&rsquo;s hop buttons to move between shows, and
        press Escape to close it. Select a province outline to see every show scheduled there. Dashed ring markers
        show cities fans have asked Internet Athi to visit; select one to add your own city request.
      </p>

      <div className="live-map__overlay">
        {cityLabels.map((city) => (
          <span
            key={city.name}
            className={`live-map__city-label${city.labelAlign === 'left' ? ' live-map__city-label--left' : ''}`}
            aria-hidden="true"
            style={{
              left: `${toPercent(city.x, SA_MAP_WIDTH)}%`,
              top: `${toPercent(city.y, SA_MAP_HEIGHT)}%`,
            }}
          >
            {city.name}
          </span>
        ))}

        {markers.map(({ event, x, y, side, labelText }, index) => {
          const isPast = getLiveEventStatus(event) === 'past'
          const isOpen = openTarget?.type === 'event' && event.id === openTarget.id
          const isDimmedByProvince = openTarget?.type === 'province' && event.region !== openTarget.name

          return (
            <button
              key={event.id}
              ref={(element) => {
                if (element) markerRefs.current.set(event.id, element)
                else markerRefs.current.delete(event.id)
              }}
              type="button"
              className={[
                'live-map__marker',
                isPast ? 'is-past' : 'is-upcoming',
                isOpen ? 'is-open' : '',
                isDimmedByProvince ? 'is-dimmed' : '',
                side === 'left' ? 'live-map__marker--label-left' : '',
              ].filter(Boolean).join(' ')}
              style={{
                left: `${toPercent(x, SA_MAP_WIDTH)}%`,
                top: `${toPercent(y, SA_MAP_HEIGHT)}%`,
                animationDelay: `${index * 60}ms`,
              }}
              aria-label={`${event.city}, ${event.title}, ${formatLiveEventDate(event)}`}
              aria-pressed={isOpen}
              onClick={(domEvent) => {
                domEvent.stopPropagation()
                openEventCard(event)
              }}
            >
              <span className="live-map__marker-ring" aria-hidden="true" />
              <span className="live-map__marker-dot" aria-hidden="true" />
              <span className="live-map__marker-label" aria-hidden="true">{labelText}</span>
            </button>
          )
        })}

        {demandMarkers.map(({ demand, x, y }, index) => (
          <button
            key={demand.city}
            type="button"
            className="live-map__marker is-demand"
            style={{
              left: `${toPercent(x, SA_MAP_WIDTH)}%`,
              top: `${toPercent(y, SA_MAP_HEIGHT)}%`,
              animationDelay: `${(markers.length + index) * 60}ms`,
            }}
            aria-label={`${demand.requesterCount} ${demand.requesterCount === 1 ? 'fan has' : 'fans have'} asked for a show in ${demand.city}. Add your city request.`}
            onClick={(domEvent) => {
              domEvent.stopPropagation()
              onDemandMarkerSelect?.(demand.city, domEvent.currentTarget)
            }}
          >
            <span className="live-map__marker-ring" aria-hidden="true" />
            <span className="live-map__marker-label" aria-hidden="true">{demand.city}</span>
            <span className="live-map__marker-count" aria-hidden="true">{demand.requesterCount}</span>
          </button>
        ))}
      </div>

      {openTarget ? (
        <div className={`live-map__scrim${cardVisible ? ' is-visible' : ''}`} aria-hidden="true" />
      ) : null}

      {openTarget ? (
        <div
          ref={cardRef}
          className={`live-map__card${cardVisible ? ' is-visible' : ''}`}
          style={{
            left: cardStyle?.left ?? 0,
            top: cardStyle?.top ?? 0,
            transformOrigin: cardStyle?.transformOrigin ?? 'center',
            visibility: cardStyle ? 'visible' : 'hidden',
          }}
          role="dialog"
          aria-modal="false"
          aria-labelledby={cardHeadingId}
          onClick={(domEvent) => domEvent.stopPropagation()}
        >
          <span className="live-map__card-corner live-map__card-corner--tl" aria-hidden="true" />
          <span className="live-map__card-corner live-map__card-corner--br" aria-hidden="true" />
          <button type="button" className="live-map__card-close" onClick={closeCard} aria-label="Close">
            <CloseIcon />
          </button>

          {openTarget.type === 'event' && openEvent ? (
            (() => {
              const isPast = getLiveEventStatus(openEvent) === 'past'
              return (
                <>
                  <p className={`live-map__card-when${isPast ? ' live-map__card-when--past' : ''}`}>
                    {formatLiveEventDate(openEvent)} / {formatLiveEventTime(openEvent)}
                    {isPast ? <span className="live-map__card-when-past"> / PAST</span> : null}
                  </p>
                  <h2 id={cardHeadingId} className="live-map__card-title">
                    {openEvent.title}
                  </h2>
                  <p className="live-map__card-venue">{openEvent.venue}</p>
                  <p className="live-map__card-city">{openEvent.city}</p>
                  <p className="live-map__card-tickets">
                    {isPast ? (
                      'This one has passed.'
                    ) : openEvent.ticketUrl ? (
                      <ExternalLink href={openEvent.ticketUrl}>Get tickets</ExternalLink>
                    ) : openEvent.rsvpUrl ? (
                      <ExternalLink href={openEvent.rsvpUrl}>RSVP</ExternalLink>
                    ) : (
                      'Booking details to follow.'
                    )}
                  </p>
                </>
              )
            })()
          ) : (
            <>
              <p className="live-map__card-when">Province</p>
              <h2 id={cardHeadingId} className="live-map__card-title">{openProvinceName}</h2>
              <p className="live-map__card-province-count">
                {openProvinceEvents.length === 0
                  ? 'No shows in the current view.'
                  : `${openProvinceEvents.length} ${openProvinceEvents.length === 1 ? 'show' : 'shows'} in view`}
              </p>
              {openProvinceEvents.length > 0 ? (
                <ul className="live-map__card-province-list">
                  {openProvinceEvents.map((event) => {
                    const isPast = getLiveEventStatus(event) === 'past'
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          className="live-map__card-province-item"
                          onClick={() => openEventCard(event)}
                        >
                          <span className={`live-map__card-province-item-when${isPast ? ' is-past' : ''}`}>
                            {formatLiveEventDate(event)}
                          </span>
                          <span className="live-map__card-province-item-title">{event.title}</span>
                          <span className="live-map__card-province-item-venue">{event.venue} · {event.city}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="live-map__card-province-empty">
                  No confirmed Internet Athi shows here yet — check back soon.
                </p>
              )}
            </>
          )}

          {openTarget.type === 'event' && openEvent ? (
            <div className="live-map__card-row">
              <button
                type="button"
                className="live-map__card-cal"
                onClick={() => downloadLiveEventCalendar(openEvent)}
              >
                <CalendarIcon />
                Add to calendar
              </button>
              <div className="live-map__card-hop">
                <button type="button" onClick={() => hop(-1)} disabled={events.length < 2} aria-label="Previous show">
                  <ChevronIcon direction="left" />
                </button>
                <button type="button" onClick={() => hop(1)} disabled={events.length < 2} aria-label="Next show">
                  <ChevronIcon direction="right" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
