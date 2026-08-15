import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { LiveEventLocationGroup } from '../lib/liveEvents'
import {
  SA_MAP_HEIGHT,
  SA_MAP_WIDTH,
  projectPoint,
  southAfricaPath,
  southAfricaProvinceFeatures,
} from '../lib/southAfricaMap'
import { southAfricaCityLabels } from '../data/southAfricaCityLabels'

export interface LiveMapLocationGroup extends LiveEventLocationGroup {
  isPast: boolean
}

interface LiveMapProps {
  locationGroups: LiveMapLocationGroup[]
  selectedEventId: string | null
  highlightedEventId: string | null
  featuredEventId: string | null
  onSelect: (eventId: string, trigger: HTMLElement) => void
  onHighlight: (eventId: string | null) => void
}

const tickLongitudes = [16, 20, 24, 28, 32]
const tickLatitudes = [-22, -26, -30, -34]
const mapPadding = 44
const midLatitude = -28
const midLongitude = 25

/** Cities close enough to a neighbour that the default right-hand label would collide. */
const markerLabelPlacement: Record<string, 'below'> = {
  'Cape Town': 'below',
}

function toPercent(value: number, axisLength: number) {
  return (value / axisLength) * 100
}

export function LiveMap({
  locationGroups,
  selectedEventId,
  highlightedEventId,
  featuredEventId,
  onSelect,
  onHighlight,
}: LiveMapProps) {
  const descriptionId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

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
    southAfricaProvinceFeatures.map((feature) => ({
      name: feature.properties.name,
      d: southAfricaPath(feature) ?? '',
    }))
  ), [])

  const meridians = useMemo(() => (
    tickLongitudes.map((longitude) => {
      const point = projectPoint(longitude, midLatitude)
      return point ? { longitude, x: point[0] } : null
    }).filter((value): value is { longitude: number, x: number } => value !== null)
  ), [])

  const parallels = useMemo(() => (
    tickLatitudes.map((latitude) => {
      const point = projectPoint(midLongitude, latitude)
      return point ? { latitude, y: point[1] } : null
    }).filter((value): value is { latitude: number, y: number } => value !== null)
  ), [])

  const cityLabels = useMemo(() => (
    southAfricaCityLabels.map((city) => {
      const point = projectPoint(city.longitude, city.latitude)
      return point ? { ...city, x: point[0], y: point[1] } : null
    }).filter((value): value is typeof southAfricaCityLabels[number] & { x: number, y: number } => value !== null)
  ), [])

  const markers = useMemo(() => (
    locationGroups.map((group) => {
      const point = projectPoint(group.longitude, group.latitude)
      return point ? { group, x: point[0], y: point[1] } : null
    }).filter((value): value is { group: LiveMapLocationGroup, x: number, y: number } => value !== null)
  ), [locationGroups])

  const highlightedGroup = highlightedEventId
    ? locationGroups.find((group) => group.events.some((event) => event.id === highlightedEventId))
    : null
  const highlightedEvent = highlightedGroup
    ? highlightedGroup.events.find((event) => event.id === highlightedEventId) ?? highlightedGroup.events[0]
    : null

  const visualSelectedEventId = selectedEventId ?? featuredEventId

  return (
    <div
      ref={wrapperRef}
      className="live-map"
      role="group"
      aria-label="Map of South Africa showing performance locations"
      aria-describedby={descriptionId}
      data-reveal-state={revealed ? 'revealed' : 'pending'}
    >
      <svg
        className="live-map__frame"
        viewBox={`0 0 ${SA_MAP_WIDTH} ${SA_MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
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
        </defs>

        <g className="live-map__provinces">
          {provincePaths.map((province) => (
            <path key={province.name} className="live-map__province" d={province.d} />
          ))}
        </g>

        <rect
          className="live-map__grain"
          x={mapPadding}
          y={mapPadding}
          width={SA_MAP_WIDTH - mapPadding * 2}
          height={SA_MAP_HEIGHT - mapPadding * 2}
          filter="url(#live-map-grain)"
        />

        <g className="live-map__graticule">
          {meridians.map(({ longitude, x }) => (
            <line key={longitude} x1={x} y1={mapPadding} x2={x} y2={SA_MAP_HEIGHT - mapPadding} />
          ))}
          {parallels.map(({ latitude, y }) => (
            <line key={latitude} x1={mapPadding} y1={y} x2={SA_MAP_WIDTH - mapPadding} y2={y} />
          ))}
        </g>

        <g className="live-map__ticks">
          {meridians.map(({ longitude, x }) => (
            <text key={longitude} x={x} y={mapPadding - 12} textAnchor="middle">{Math.abs(longitude)}°E</text>
          ))}
          {parallels.map(({ latitude, y }) => (
            <text key={latitude} x={mapPadding - 12} y={y + 4} textAnchor="end">{Math.abs(latitude)}°S</text>
          ))}
        </g>

        <rect
          className="live-map__border"
          x={mapPadding}
          y={mapPadding}
          width={SA_MAP_WIDTH - mapPadding * 2}
          height={SA_MAP_HEIGHT - mapPadding * 2}
        />

        <g className="live-map__registration-marks">
          {[
            [mapPadding, mapPadding],
            [SA_MAP_WIDTH - mapPadding, mapPadding],
            [mapPadding, SA_MAP_HEIGHT - mapPadding],
            [SA_MAP_WIDTH - mapPadding, SA_MAP_HEIGHT - mapPadding],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x}, ${y})`}>
              <circle r="7" />
              <line x1="-11" y1="0" x2="11" y2="0" />
              <line x1="0" y1="-11" x2="0" y2="11" />
            </g>
          ))}
        </g>

        <g className="live-map__compass" transform={`translate(${mapPadding + 36}, ${mapPadding + 44})`}>
          <circle r="22" />
          <line x1="0" y1="-22" x2="0" y2="22" />
          <line x1="-22" y1="0" x2="22" y2="0" />
          <path d="M 0 -16 L 5 0 L 0 16 L -5 0 Z" />
          <text y="-30" textAnchor="middle">N</text>
        </g>

        <text
          className="live-map__scale"
          x={SA_MAP_WIDTH - mapPadding + 16}
          y={SA_MAP_HEIGHT / 2}
          textAnchor="middle"
          transform={`rotate(90, ${SA_MAP_WIDTH - mapPadding + 16}, ${SA_MAP_HEIGHT / 2})`}
        >
          Scale 1:4 500 000
        </text>
      </svg>

      <p className="sr-only" id={descriptionId}>
        Filled markers show verified performance locations; select one, or use the event list, to view details.
        Cities without a scheduled performance are shown as reference labels only.
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

        {markers.map(({ group, x, y }, index) => {
          const primaryEvent = group.events[0]
          const isSelected = group.events.some((event) => event.id === visualSelectedEventId)
          const isPressed = group.events.some((event) => event.id === selectedEventId)
          const isHighlighted = group.events.some((event) => event.id === highlightedEventId)
          const count = group.events.length
          const label = count > 1
            ? `View ${count} performances in ${group.city}`
            : `View ${primaryEvent.title} at ${primaryEvent.venue}`
          const labelPlacement = markerLabelPlacement[group.city]

          return (
            <button
              key={group.key}
              type="button"
              className={[
                'live-map__marker',
                group.isPast ? 'is-past' : 'is-upcoming',
                isSelected ? 'is-selected' : '',
                isHighlighted ? 'is-highlighted' : '',
                labelPlacement ? `live-map__marker--label-${labelPlacement}` : '',
              ].filter(Boolean).join(' ')}
              style={{
                left: `${toPercent(x, SA_MAP_WIDTH)}%`,
                top: `${toPercent(y, SA_MAP_HEIGHT)}%`,
                animationDelay: `${index * 60}ms`,
              }}
              aria-label={label}
              aria-pressed={isPressed}
              onClick={(event) => onSelect(primaryEvent.id, event.currentTarget)}
              onFocus={() => onHighlight(primaryEvent.id)}
              onBlur={() => onHighlight(null)}
              onMouseEnter={() => onHighlight(primaryEvent.id)}
              onMouseLeave={() => onHighlight(null)}
            >
              <span className="live-map__marker-ring" aria-hidden="true" />
              <span className="live-map__marker-dot" aria-hidden="true" />
              <span className="live-map__marker-label" aria-hidden="true">{group.city}</span>
              {count > 1 ? <span className="live-map__marker-count" aria-hidden="true">{count}</span> : null}
            </button>
          )
        })}
      </div>

      {highlightedEvent ? (
        <div className="live-map__tooltip" role="status">
          <strong>{highlightedEvent.title}</strong>
          <span>{highlightedEvent.venue}, {highlightedEvent.city}</span>
        </div>
      ) : null}
    </div>
  )
}
