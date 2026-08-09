import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from 'framer-motion'
import type { DiscographyRelease } from '../content/types'

interface DiscographySurferProps {
  items: DiscographyRelease[]
}

interface SurferCardProps {
  active: boolean
  count: number
  finePointer: boolean
  index: number
  item: DiscographyRelease
  onFocus: (index: number) => void
  progress: MotionValue<number>
  spacing: number
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  ))

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const update = () => setMatches(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [query])

  return matches
}

function useViewportWidth() {
  const [width, setWidth] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth : 1280
  ))

  useEffect(() => {
    const update = () => setWidth(window.innerWidth)
    window.addEventListener('resize', update, { passive: true })
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return width
}

function releaseLabel(item: DiscographyRelease) {
  return `Open ${item.title} ${item.releaseType.toLowerCase()} on Spotify`
}

function StaticReleaseCard({ item, index }: { item: DiscographyRelease; index: number }) {
  return (
    <li className="discography-static-card">
      <a
        href={item.spotifyUrl}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={releaseLabel(item)}
        style={{ '--release-accent': item.accent } as CSSProperties}
      >
        <span className="discography-static-card__artwork">
          <img
            src={item.image}
            alt={item.alt}
            width="640"
            height="640"
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />
        </span>
        <span className="discography-static-card__metadata">
          <strong className={item.title.length > 12 ? 'is-long-title' : undefined}>{item.title}</strong>
          <span>{item.releaseType.toUpperCase()} / {item.year}</span>
          <span className="discography-static-card__action">Open in Spotify <span aria-hidden="true">↗</span></span>
        </span>
      </a>
    </li>
  )
}

function SurferCard({
  active,
  count,
  finePointer,
  index,
  item,
  onFocus,
  progress,
  spacing,
}: SurferCardProps) {
  const position = useTransform(progress, (value) => index - value * Math.max(count - 1, 1))
  const x = useTransform(position, (value) => value * spacing)
  const y = useTransform(position, (value) => (
    value >= 0 ? value * -68 : Math.abs(value) * 145
  ))
  const z = useTransform(position, (value) => (
    -Math.abs(value) * (value >= 0 ? 285 : 190)
  ))
  const rotateY = useTransform(position, (value) => (
    value >= 0 ? -Math.min(24, 12 + value * 5) : Math.min(15, Math.abs(value) * 8)
  ))
  const trackScale = useTransform(position, (value) => (
    1 - Math.min(Math.abs(value) * 0.075, 0.24)
  ))
  const opacity = useTransform(position, (value) => (
    Math.max(0.08, 1 - Math.abs(value) * 0.35)
  ))
  const filter = useTransform(position, (value) => {
    const distance = Math.abs(value)
    const brightness = Math.max(0.42, 1 - distance * 0.18)
    const blur = Math.min(3.5, distance * 1.25)
    return `brightness(${brightness}) contrast(${1 - Math.min(distance * 0.025, 0.08)}) blur(${blur}px)`
  })
  const magneticScaleTarget = useMotionValue(1)
  const magneticXTarget = useMotionValue(0)
  const magneticYTarget = useMotionValue(0)
  const magneticScale = useSpring(magneticScaleTarget, { stiffness: 280, damping: 24, mass: 0.45 })
  const magneticX = useSpring(magneticXTarget, { stiffness: 260, damping: 25, mass: 0.45 })
  const magneticY = useSpring(magneticYTarget, { stiffness: 260, damping: 25, mass: 0.45 })

  useEffect(() => {
    if (active) return
    magneticScaleTarget.set(1)
    magneticXTarget.set(0)
    magneticYTarget.set(0)
  }, [active, magneticScaleTarget, magneticXTarget, magneticYTarget])

  const handlePointerMove = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (!finePointer || !active) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const offsetX = event.clientX - (bounds.left + bounds.width / 2)
    const offsetY = event.clientY - (bounds.top + bounds.height / 2)
    const distance = Math.hypot(offsetX, offsetY)
    const radius = Math.max(bounds.width, bounds.height) * 0.72
    const proximity = 1 - Math.min(distance / radius, 1)
    magneticScaleTarget.set(1 + proximity * 0.08)
    magneticXTarget.set((offsetX / bounds.width) * 8)
    magneticYTarget.set((offsetY / bounds.height) * 8)
  }

  const resetMagnetism = () => {
    magneticScaleTarget.set(1)
    magneticXTarget.set(0)
    magneticYTarget.set(0)
  }

  return (
    <motion.li
      className={active ? 'discography-surfer-card is-active' : 'discography-surfer-card'}
      style={{
        x,
        y,
        z,
        rotateY,
        scale: trackScale,
        opacity,
        zIndex: active ? count + 2 : count - index,
        '--release-accent': item.accent,
      } as MotionStyle & { '--release-accent'?: string }}
    >
      <motion.a
        href={item.spotifyUrl}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={releaseLabel(item)}
        style={{ scale: magneticScale, x: magneticX, y: magneticY }}
        onFocus={() => onFocus(index)}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetMagnetism}
      >
        <span className="discography-surfer-card__index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </span>
        <motion.span className="discography-surfer-card__artwork" style={{ filter }}>
          <img
            src={item.image}
            alt={item.alt}
            width="640"
            height="640"
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />
        </motion.span>
        <span className="discography-surfer-card__metadata" aria-hidden={!active}>
          <strong className={item.title.length > 12 ? 'is-long-title' : undefined}>{item.title}</strong>
          <span className="discography-surfer-card__details">
            {item.releaseType.toUpperCase()} / {item.year}
          </span>
          <span className="discography-surfer-card__action">
            Open in Spotify <span aria-hidden="true">↗</span>
          </span>
        </span>
      </motion.a>
    </motion.li>
  )
}

export function DiscographySurfer({ items }: DiscographySurferProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const mobileLayout = useMediaQuery('(max-width: 780px), (pointer: coarse)')
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const viewportWidth = useViewportWidth()
  const [activeIndex, setActiveIndex] = useState(0)
  const inView = useInView(sectionRef, { amount: 0.01 })
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.3,
  })
  const instructionOpacity = useTransform(smoothProgress, [0, 0.035, 0.12], [1, 1, 0])
  const staticLayout = Boolean(reducedMotion) || items.length <= 1
  const sceneLayout = !staticLayout && !mobileLayout
  const maxIndex = Math.max(items.length - 1, 0)
  const spacing = Math.min(310, Math.max(205, viewportWidth * 0.205))

  useMotionValueEvent(smoothProgress, 'change', (value) => {
    if (!sceneLayout || !inView || document.visibilityState === 'hidden') return
    const nextIndex = Math.min(maxIndex, Math.max(0, Math.round(value * maxIndex)))
    setActiveIndex((current) => (current === nextIndex ? current : nextIndex))
  })

  useEffect(() => {
    if (sceneLayout) return
    setActiveIndex(0)
  }, [sceneLayout])

  const handleCardFocus = (index: number) => {
    setActiveIndex(index)
    if (!sceneLayout || !sectionRef.current || maxIndex === 0) return
    const section = sectionRef.current
    const sectionTop = window.scrollY + section.getBoundingClientRect().top
    const travel = Math.max(0, section.offsetHeight - window.innerHeight)
    const target = sectionTop + (index / maxIndex) * travel
    if (Math.abs(window.scrollY - target) > 4) {
      window.scrollTo({ top: target, behavior: 'smooth' })
    }
  }

  if (items.length === 0) {
    return (
      <section className="discography-surfer discography-surfer--empty" aria-labelledby="discography-title">
        <div className="discography-surfer__heading">
          <h1 id="discography-title">Discography</h1>
          <p className="index-label">00 releases</p>
        </div>
        <p>No releases are currently listed.</p>
      </section>
    )
  }

  if (staticLayout) {
    return (
      <section
        ref={sectionRef}
        className="discography-surfer discography-surfer--static"
        aria-labelledby="discography-title"
      >
        <div className="discography-surfer__heading">
          <h1 id="discography-title">Discography</h1>
          <p className="index-label">{String(items.length).padStart(2, '0')} releases</p>
        </div>
        <ol className="discography-static-grid">
          {items.map((item, index) => (
            <StaticReleaseCard key={item.id} item={item} index={index} />
          ))}
        </ol>
      </section>
    )
  }

  if (mobileLayout) {
    return (
      <section
        ref={sectionRef}
        className="discography-surfer discography-surfer--mobile"
        aria-labelledby="discography-title"
      >
        <div className="discography-surfer__heading">
          <h1 id="discography-title">Discography</h1>
          <p className="index-label">{String(items.length).padStart(2, '0')} releases</p>
        </div>
        <ol className="discography-mobile-track">
          {items.map((item, index) => (
            <StaticReleaseCard key={item.id} item={item} index={index} />
          ))}
        </ol>
        <p className="discography-surfer__mobile-instruction index-label">Swipe to explore</p>
      </section>
    )
  }

  return (
    <section
      ref={sectionRef}
      className="discography-surfer discography-surfer--scene"
      aria-labelledby="discography-title"
      style={{ height: `${100 + Math.max(items.length - 1, 0) * 105}svh` }}
    >
      <div className="discography-surfer__viewport">
        <div className="discography-surfer__heading">
          <h1 id="discography-title">Discography</h1>
          <p className="index-label">{String(items.length).padStart(2, '0')} releases</p>
        </div>
        <ol className="discography-surfer__stage">
          {items.map((item, index) => (
            <SurferCard
              key={item.id}
              item={item}
              index={index}
              count={items.length}
              active={activeIndex === index}
              progress={smoothProgress}
              spacing={spacing}
              finePointer={finePointer}
              onFocus={handleCardFocus}
            />
          ))}
        </ol>
        <motion.p
          className="discography-surfer__instruction index-label"
          style={{ opacity: instructionOpacity }}
        >
          Scroll to move through the archive
        </motion.p>
      </div>
    </section>
  )
}
