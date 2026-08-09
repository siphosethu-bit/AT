import { useEffect, useRef } from 'react'

const POINTER_SETTLE_EPSILON = 0.0005
const POINTER_EASE = 0.075
const HERO_ENTRANCE_KEY = 'internet-athi-hero-entered'

interface PointerPosition {
  x: number
  y: number
}

function writePointerVariables(element: HTMLElement, position: PointerPosition) {
  element.style.setProperty('--ambient-parallax-x', `${(position.x * 30).toFixed(2)}px`)
  element.style.setProperty('--ambient-parallax-y', `${(position.y * 22).toFixed(2)}px`)
  element.style.setProperty('--left-parallax-x', `${(position.x * 7).toFixed(2)}px`)
  element.style.setProperty('--left-parallax-y', `${(position.y * 5).toFixed(2)}px`)
  element.style.setProperty('--portrait-parallax-x', `${(position.x * -3).toFixed(2)}px`)
  element.style.setProperty('--portrait-parallax-y', `${(position.y * -2).toFixed(2)}px`)
  element.style.setProperty('--right-parallax-x', `${(position.x * -9).toFixed(2)}px`)
  element.style.setProperty('--right-parallax-y', `${(position.y * -6).toFixed(2)}px`)
  element.style.setProperty('--grid-parallax-x', `${(position.x * -3).toFixed(2)}px`)
  element.style.setProperty('--grid-parallax-y', `${(position.y * -2).toFixed(2)}px`)
}

export function usePolymorphicDrift() {
  const stageRef = useRef<HTMLElement>(null)
  const entranceState = useRef<'entering' | 'settled'>(
    typeof window !== 'undefined' && window.sessionStorage.getItem(HERO_ENTRANCE_KEY) === 'true'
      ? 'settled'
      : 'entering',
  )

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const finePointer = window.matchMedia('(pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const target: PointerPosition = { x: 0, y: 0 }
    const current: PointerPosition = { x: 0, y: 0 }
    let animationFrame = 0
    let isIntersecting = true
    let motionActive = false

    const stopPointerFrame = () => {
      if (!animationFrame) return
      window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
    }

    const renderPointer = () => {
      animationFrame = 0
      current.x += (target.x - current.x) * POINTER_EASE
      current.y += (target.y - current.y) * POINTER_EASE
      writePointerVariables(stage, current)

      const stillSettling = (
        Math.abs(target.x - current.x) > POINTER_SETTLE_EPSILON ||
        Math.abs(target.y - current.y) > POINTER_SETTLE_EPSILON
      )
      if (stillSettling && motionActive) {
        animationFrame = window.requestAnimationFrame(renderPointer)
      }
    }

    const requestPointerFrame = () => {
      if (!animationFrame && motionActive) {
        animationFrame = window.requestAnimationFrame(renderPointer)
      }
    }

    const resetPointer = (immediate = false) => {
      target.x = 0
      target.y = 0
      if (immediate) {
        stopPointerFrame()
        current.x = 0
        current.y = 0
        writePointerVariables(stage, current)
        return
      }
      requestPointerFrame()
    }

    const syncMotionState = () => {
      motionActive = (
        isIntersecting &&
        document.visibilityState === 'visible' &&
        !reducedMotion.matches
      )
      stage.dataset.motionState = motionActive ? 'running' : 'paused'
      stage.style.setProperty('--motion-play-state', motionActive ? 'running' : 'paused')
      if (!motionActive) resetPointer(true)
    }

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (!finePointer.matches || !motionActive || event.pointerType === 'touch') return
      const bounds = stage.getBoundingClientRect()
      target.x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2))
      target.y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2))
      requestPointerFrame()
    }

    const handlePointerLeave = () => resetPointer()
    const handleMediaChange = () => {
      if (!finePointer.matches) resetPointer(true)
      syncMotionState()
    }
    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting
      syncMotionState()
    }, { threshold: 0.02 })

    writePointerVariables(stage, current)
    window.sessionStorage.setItem(HERO_ENTRANCE_KEY, 'true')
    stage.addEventListener('pointermove', handlePointerMove, { passive: true })
    stage.addEventListener('pointerleave', handlePointerLeave)
    document.addEventListener('visibilitychange', syncMotionState)
    finePointer.addEventListener('change', handleMediaChange)
    reducedMotion.addEventListener('change', handleMediaChange)
    observer.observe(stage)
    syncMotionState()

    return () => {
      stopPointerFrame()
      observer.disconnect()
      stage.removeEventListener('pointermove', handlePointerMove)
      stage.removeEventListener('pointerleave', handlePointerLeave)
      document.removeEventListener('visibilitychange', syncMotionState)
      finePointer.removeEventListener('change', handleMediaChange)
      reducedMotion.removeEventListener('change', handleMediaChange)
    }
  }, [])

  return { stageRef, entranceState: entranceState.current }
}
