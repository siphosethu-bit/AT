import { useEffect, useState } from 'react'

const INTRO_KEY = 'internet-athi-intro-seen'

function shouldShowIntro() {
  if (typeof window === 'undefined') return false
  if (window.innerWidth < 780) return false
  if (window.matchMedia('(pointer: coarse)').matches) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return window.sessionStorage.getItem(INTRO_KEY) !== 'true'
}

export function Intro() {
  const [visible, setVisible] = useState(shouldShowIntro)

  useEffect(() => {
    if (!visible) return

    const timeout = window.setTimeout(() => {
      window.sessionStorage.setItem(INTRO_KEY, 'true')
      setVisible(false)
    }, 1050)

    return () => window.clearTimeout(timeout)
  }, [visible])

  if (!visible) return null

  const skip = () => {
    window.sessionStorage.setItem(INTRO_KEY, 'true')
    setVisible(false)
  }

  return (
    <div className="intro" aria-label="Opening Internet Athi archive">
      <span className="intro__mark">IA</span>
      <div className="intro__portrait intro__portrait--one" aria-hidden="true" />
      <div className="intro__portrait intro__portrait--two" aria-hidden="true" />
      <p className="intro__title" aria-hidden="true">
        POLYMORPHISM
      </p>
      <button className="intro__skip" type="button" onClick={skip}>
        Enter archive
      </button>
    </div>
  )
}
