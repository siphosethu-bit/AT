import {
  geoGraticule10,
  geoOrthographic,
  geoPath,
} from 'd3'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { LiveEvent } from '../content/types'
import { worldLandDots } from '../data/worldLandDots'

type Rotation = [number, number, number]

interface MarkerPosition {
  event: LiveEvent
  x: number
  y: number
  visible: boolean
}

interface DragState {
  pointerId: number
  pointerType: string
  startX: number
  startY: number
  startRotation: Rotation
  horizontalIntent: boolean
}

interface RotationTransition {
  from: Rotation
  to: Rotation
  startedAt: number
  duration: number
  notifyWhenComplete: boolean
}

interface PerformanceGlobeProps {
  events: LiveEvent[]
  selectedEventId: string | null
  highlightedEventId: string | null
  onSelect: (eventId: string, trigger: HTMLElement) => void
  onHighlight: (eventId: string | null) => void
  onOrientationComplete: (eventId: string) => void
}

const southAfricaRotation: Rotation = [-24.2, 30.4, 0]
const graticule = geoGraticule10()

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function shortestAngle(from: number, to: number) {
  return from + ((((to - from) % 360) + 540) % 360 - 180)
}

function targetRotation(event: LiveEvent): Rotation {
  return [-event.longitude, -event.latitude, 0]
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2
}

function isPointVisible(longitude: number, latitude: number, centre: [number, number]) {
  const radians = Math.PI / 180
  const pointLatitude = latitude * radians
  const centreLatitude = centre[1] * radians
  const longitudeDifference = (longitude - centre[0]) * radians

  return (
    Math.sin(pointLatitude) * Math.sin(centreLatitude)
    + Math.cos(pointLatitude) * Math.cos(centreLatitude) * Math.cos(longitudeDifference)
  ) > 0.012
}

export function PerformanceGlobe({
  events,
  selectedEventId,
  highlightedEventId,
  onSelect,
  onHighlight,
  onOrientationComplete,
}: PerformanceGlobeProps) {
  const descriptionId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const markerButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const markerPositionsRef = useRef<MarkerPosition[]>([])
  const eventsRef = useRef(events)
  const selectedEventIdRef = useRef(selectedEventId)
  const highlightedEventIdRef = useRef(highlightedEventId)
  const onHighlightRef = useRef(onHighlight)
  const onOrientationCompleteRef = useRef(onOrientationComplete)
  const rotationRef = useRef<Rotation>([...southAfricaRotation])
  const zoomRef = useRef(1)
  const dragRef = useRef<DragState | null>(null)
  const isDraggingRef = useRef(false)
  const pointerInsideRef = useRef(false)
  const focusInsideRef = useRef(false)
  const explicitPauseRef = useRef(false)
  const reducedMotionRef = useRef(false)
  const visibleRef = useRef(true)
  const pageVisibleRef = useRef(!document.hidden)
  const resumeAfterRef = useRef(0)
  const transitionRef = useRef<RotationTransition | null>(null)
  const scheduleFrameRef = useRef<() => void>(() => undefined)
  const scheduleResumeRef = useRef<(delay: number) => void>(() => undefined)
  const [rotationPaused, setRotationPaused] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [canvasFailed, setCanvasFailed] = useState(false)
  const highlightedEvent = highlightedEventId
    ? events.find((event) => event.id === highlightedEventId) ?? null
    : null

  eventsRef.current = events
  selectedEventIdRef.current = selectedEventId
  highlightedEventIdRef.current = highlightedEventId
  onHighlightRef.current = onHighlight
  onOrientationCompleteRef.current = onOrientationComplete

  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const context = canvas.getContext('2d')
    if (!context) {
      setCanvasFailed(true)
      return
    }

    const projection = geoOrthographic().clipAngle(90).precision(0.4)
    const path = geoPath(projection, context)
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const size = { width: 0, height: 0, dpr: 1 }
    let frameId = 0
    let resumeTimer = 0
    let lastFrameAt = performance.now()

    const shouldAutoRotate = (now: number) => (
      !explicitPauseRef.current
      && !selectedEventIdRef.current
      && !isDraggingRef.current
      && !pointerInsideRef.current
      && !focusInsideRef.current
      && !reducedMotionRef.current
      && visibleRef.current
      && pageVisibleRef.current
      && now >= resumeAfterRef.current
    )

    const draw = () => {
      if (!size.width || !size.height) return

      const radius = Math.min(size.width, size.height) * 0.405 * zoomRef.current
      const centreX = size.width / 2
      const centreY = size.height / 2
      projection
        .translate([centreX, centreY])
        .scale(radius)
        .rotate(rotationRef.current)

      context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
      context.clearRect(0, 0, size.width, size.height)

      const gradient = context.createRadialGradient(
        centreX - radius * 0.28,
        centreY - radius * 0.34,
        radius * 0.05,
        centreX,
        centreY,
        radius,
      )
      gradient.addColorStop(0, 'rgba(34, 31, 27, 0.96)')
      gradient.addColorStop(0.72, 'rgba(16, 15, 13, 0.98)')
      gradient.addColorStop(1, 'rgba(6, 6, 5, 1)')
      context.beginPath()
      context.arc(centreX, centreY, radius, 0, Math.PI * 2)
      context.fillStyle = gradient
      context.fill()
      context.strokeStyle = 'rgba(236, 225, 209, 0.34)'
      context.lineWidth = 1
      context.stroke()

      context.beginPath()
      path(graticule)
      context.strokeStyle = 'rgba(236, 225, 209, 0.09)'
      context.lineWidth = 0.7
      context.stroke()

      const centre = projection.invert?.([centreX, centreY]) ?? [24.2, -30.4]
      context.fillStyle = 'rgba(224, 211, 192, 0.52)'
      for (const [longitude, latitude] of worldLandDots) {
        if (!isPointVisible(longitude, latitude, centre)) continue
        const projected = projection([longitude, latitude])
        if (!projected) continue
        context.beginPath()
        context.arc(projected[0], projected[1], size.width < 520 ? 0.72 : 0.92, 0, Math.PI * 2)
        context.fill()
      }

      const positions: MarkerPosition[] = []
      for (const event of eventsRef.current) {
        const visible = isPointVisible(event.longitude, event.latitude, centre)
        const projected = visible ? projection([event.longitude, event.latitude]) : null
        const button = markerButtonRefs.current.get(event.id)

        if (!projected || !visible) {
          if (button) {
            button.style.visibility = 'hidden'
            button.tabIndex = -1
            button.dataset.visible = 'false'
          }
          positions.push({ event, x: 0, y: 0, visible: false })
          continue
        }

        const [x, y] = projected
        const selected = event.id === selectedEventIdRef.current
        const highlighted = event.id === highlightedEventIdRef.current
        const markerRadius = selected ? 6.2 : highlighted ? 5.4 : 4.2

        context.beginPath()
        context.arc(x, y, markerRadius + (selected || highlighted ? 5.5 : 3.2), 0, Math.PI * 2)
        context.fillStyle = selected
          ? 'rgba(219, 111, 59, 0.2)'
          : highlighted
            ? 'rgba(236, 225, 209, 0.17)'
            : 'rgba(219, 111, 59, 0.11)'
        context.fill()

        context.beginPath()
        context.arc(x, y, markerRadius, 0, Math.PI * 2)
        context.fillStyle = selected ? '#f1dfc8' : '#d66d3b'
        context.fill()
        context.strokeStyle = '#0a0908'
        context.lineWidth = 1.2
        context.stroke()

        positions.push({ event, x, y, visible: true })
      }

      const hitPositions = positions
        .filter((position) => position.visible)
        .map((position) => ({ ...position, hitX: position.x, hitY: position.y }))

      for (let pass = 0; pass < 4; pass += 1) {
        for (let firstIndex = 0; firstIndex < hitPositions.length; firstIndex += 1) {
          for (let secondIndex = firstIndex + 1; secondIndex < hitPositions.length; secondIndex += 1) {
            const first = hitPositions[firstIndex]
            const second = hitPositions[secondIndex]
            const deltaX = second.hitX - first.hitX
            const deltaY = second.hitY - first.hitY
            const distance = Math.hypot(deltaX, deltaY)
            if (distance >= 40) continue

            const angle = distance > 0.1
              ? Math.atan2(deltaY, deltaX)
              : (secondIndex * 1.9 + firstIndex) % (Math.PI * 2)
            const correction = (40 - distance) / 2
            const shiftX = Math.cos(angle) * correction
            const shiftY = Math.sin(angle) * correction
            first.hitX -= shiftX
            first.hitY -= shiftY
            second.hitX += shiftX
            second.hitY += shiftY
          }
        }
      }

      for (const position of hitPositions) {
        position.hitX = clamp(position.hitX, 22, size.width - 22)
        position.hitY = clamp(position.hitY, 22, size.height - 22)
        const displacement = Math.hypot(position.hitX - position.x, position.hitY - position.y)
        if (displacement > 3) {
          context.beginPath()
          context.moveTo(position.x, position.y)
          context.lineTo(position.hitX, position.hitY)
          context.strokeStyle = 'rgba(214, 109, 59, 0.5)'
          context.lineWidth = 0.7
          context.stroke()
          context.beginPath()
          context.arc(position.hitX, position.hitY, 2.7, 0, Math.PI * 2)
          context.fillStyle = '#d66d3b'
          context.fill()
        }

        const button = markerButtonRefs.current.get(position.event.id)
        if (button) {
          button.style.visibility = 'visible'
          button.style.transform = `translate3d(${position.hitX}px, ${position.hitY}px, 0) translate(-50%, -50%)`
          button.tabIndex = 0
          button.dataset.visible = 'true'
        }
      }

      markerPositionsRef.current = positions
      canvas.dataset.rotation = rotationRef.current.map((value) => value.toFixed(3)).join(',')
      canvas.dataset.visibleMarkers = String(positions.filter((position) => position.visible).length)
    }

    const frame = (now: number) => {
      frameId = 0
      const elapsed = Math.min(now - lastFrameAt, 48)
      lastFrameAt = now
      const transition = transitionRef.current

      if (transition) {
        const progress = clamp((now - transition.startedAt) / transition.duration, 0, 1)
        const eased = easeInOutCubic(progress)
        rotationRef.current = transition.from.map((value, index) => (
          value + (transition.to[index] - value) * eased
        )) as Rotation
        if (progress >= 1) {
          transitionRef.current = null
          if (transition.notifyWhenComplete && selectedEventIdRef.current) {
            onOrientationCompleteRef.current(selectedEventIdRef.current)
          }
        }
      } else if (shouldAutoRotate(now)) {
        rotationRef.current = [rotationRef.current[0] + elapsed * 0.00145, rotationRef.current[1], 0]
      }

      canvas.dataset.rotationState = transitionRef.current || shouldAutoRotate(now) ? 'moving' : 'paused'
      draw()

      if (transitionRef.current || shouldAutoRotate(now)) {
        frameId = window.requestAnimationFrame(frame)
      }
    }

    const scheduleFrame = () => {
      if (!frameId && visibleRef.current && pageVisibleRef.current) {
        lastFrameAt = performance.now()
        frameId = window.requestAnimationFrame(frame)
      }
    }

    const scheduleResume = (delay: number) => {
      window.clearTimeout(resumeTimer)
      resumeAfterRef.current = performance.now() + delay
      resumeTimer = window.setTimeout(scheduleFrame, delay + 24)
      scheduleFrame()
    }

    const resize = () => {
      const bounds = wrapper.getBoundingClientRect()
      size.width = Math.max(1, bounds.width)
      size.height = Math.max(1, bounds.height)
      size.dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(size.width * size.dpr)
      canvas.height = Math.round(size.height * size.dpr)
      canvas.style.width = `${size.width}px`
      canvas.style.height = `${size.height}px`
      canvas.dataset.dpr = String(size.dpr)
      scheduleFrame()
    }

    const onVisibilityChange = () => {
      pageVisibleRef.current = !document.hidden
      if (!pageVisibleRef.current && frameId) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      } else {
        scheduleFrame()
      }
    }

    const onMotionPreferenceChange = () => {
      reducedMotionRef.current = mediaQuery.matches
      scheduleFrame()
    }

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting
      if (!entry.isIntersecting && frameId) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      } else {
        scheduleFrame()
      }
    }, { rootMargin: '120px' })
    const resizeObserver = new ResizeObserver(resize)

    reducedMotionRef.current = mediaQuery.matches
    scheduleFrameRef.current = scheduleFrame
    scheduleResumeRef.current = scheduleResume
    resizeObserver.observe(wrapper)
    intersectionObserver.observe(wrapper)
    document.addEventListener('visibilitychange', onVisibilityChange)
    mediaQuery.addEventListener('change', onMotionPreferenceChange)
    resize()

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      window.clearTimeout(resumeTimer)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      mediaQuery.removeEventListener('change', onMotionPreferenceChange)
      scheduleFrameRef.current = () => undefined
      scheduleResumeRef.current = () => undefined
    }
  }, [])

  useEffect(() => {
    scheduleFrameRef.current()
  }, [events, highlightedEventId])

  useEffect(() => {
    const event = eventsRef.current.find((item) => item.id === selectedEventId)
    if (!event) {
      transitionRef.current = null
      if (!selectedEventId) scheduleResumeRef.current(1200)
      return
    }

    const to = targetRotation(event)
    const from: Rotation = [...rotationRef.current]
    to[0] = shortestAngle(from[0], to[0])

    if (reducedMotionRef.current) {
      rotationRef.current = to
      scheduleFrameRef.current()
      window.setTimeout(() => onOrientationCompleteRef.current(event.id), 0)
      return
    }

    transitionRef.current = {
      from,
      to,
      startedAt: performance.now(),
      duration: 860,
      notifyWhenComplete: true,
    }
    scheduleFrameRef.current()
  }, [selectedEventId])

  const startRotationTransition = useCallback((to: Rotation) => {
    const from: Rotation = [...rotationRef.current]
    to[0] = shortestAngle(from[0], to[0])
    if (reducedMotionRef.current) {
      rotationRef.current = to
      scheduleFrameRef.current()
      return
    }
    transitionRef.current = {
      from,
      to,
      startedAt: performance.now(),
      duration: 720,
      notifyWhenComplete: false,
    }
    scheduleFrameRef.current()
  }, [])

  const finishPointer = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!isDraggingRef.current) {
      const bounds = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      const target = markerPositionsRef.current.find((position) => (
        position.visible && Math.hypot(position.x - x, position.y - y) <= 24
      ))
      if (target) onSelect(target.event.id, event.currentTarget)
    }

    dragRef.current = null
    isDraggingRef.current = false
    scheduleResumeRef.current(1200)
  }, [onSelect])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: [...rotationRef.current],
      horizontalIntent: event.pointerType !== 'touch',
    }
    isDraggingRef.current = false
    if (event.pointerType !== 'touch') event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY

    if (!drag.horizontalIntent && Math.hypot(deltaX, deltaY) > 9) {
      if (Math.abs(deltaY) >= Math.abs(deltaX) * 1.15) return
      drag.horizontalIntent = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (!drag.horizontalIntent || Math.hypot(deltaX, deltaY) < 4) return

    isDraggingRef.current = true
    event.preventDefault()
    rotationRef.current = [
      drag.startRotation[0] + deltaX * 0.24,
      clamp(drag.startRotation[1] - deltaY * 0.2, -72, 72),
      0,
    ]
    scheduleFrameRef.current()
  }, [])

  const handlePointerEnter = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') pointerInsideRef.current = true
  }, [])

  const handlePointerLeave = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return
    pointerInsideRef.current = false
    onHighlightRef.current(null)
    scheduleResumeRef.current(1000)
  }, [])

  const handleFocus = useCallback(() => {
    focusInsideRef.current = true
  }, [])

  const handleBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    focusInsideRef.current = false
    onHighlightRef.current(null)
    scheduleResumeRef.current(1000)
  }, [])

  const toggleRotation = useCallback(() => {
    setRotationPaused((current) => {
      const next = !current
      explicitPauseRef.current = next
      if (!next) scheduleResumeRef.current(0)
      else scheduleFrameRef.current()
      return next
    })
  }, [])

  const changeZoom = useCallback((difference: number) => {
    setZoom((current) => {
      const next = clamp(Number((current + difference).toFixed(2)), 0.72, 1.28)
      zoomRef.current = next
      scheduleFrameRef.current()
      return next
    })
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="performance-globe"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      data-canvas-failed={canvasFailed}
    >
      <canvas
        ref={canvasRef}
        className="performance-globe__canvas"
        aria-label="Interactive globe showing Internet Athi performance locations"
        aria-describedby={descriptionId}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
      />

      <p className="sr-only" id={descriptionId}>
        Select a location marker or use the complete event list beside the globe. Drag horizontally to rotate the globe.
      </p>

      <div className="performance-globe__markers" aria-label="Performance location markers">
        {events.map((event) => (
          <button
            key={event.id}
            ref={(node) => {
              if (node) markerButtonRefs.current.set(event.id, node)
              else markerButtonRefs.current.delete(event.id)
            }}
            className="performance-globe__marker-hit"
            type="button"
            aria-label={`View ${event.title} at ${event.venue}`}
            aria-pressed={selectedEventId === event.id}
            tabIndex={-1}
            data-visible="false"
            onClick={(clickEvent) => onSelect(event.id, clickEvent.currentTarget)}
            onFocus={() => onHighlight(event.id)}
            onMouseEnter={() => onHighlight(event.id)}
            onMouseLeave={() => onHighlight(null)}
          />
        ))}
      </div>

      {highlightedEvent ? (
        <div className="performance-globe__tooltip" role="status">
          <strong>{highlightedEvent.title}</strong>
          <span>{highlightedEvent.venue}, {highlightedEvent.city}</span>
        </div>
      ) : null}

      <div className="performance-globe__controls" aria-label="Globe controls">
        <button type="button" onClick={toggleRotation} aria-pressed={rotationPaused}>
          {rotationPaused ? 'Resume rotation' : 'Pause rotation'}
        </button>
        <button type="button" onClick={() => changeZoom(0.1)} disabled={zoom >= 1.28}>
          Zoom in
        </button>
        <button type="button" onClick={() => changeZoom(-0.1)} disabled={zoom <= 0.72}>
          Zoom out
        </button>
        <button type="button" onClick={() => startRotationTransition([...southAfricaRotation])}>
          Focus South Africa
        </button>
      </div>

      {canvasFailed ? (
        <p className="performance-globe__fallback" role="status">
          The globe could not be drawn. The complete event list remains available.
        </p>
      ) : null}
    </div>
  )
}
