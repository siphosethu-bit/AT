import { useEffect, useRef } from 'react'
import { useCommunity } from '../../context/CommunityContext'
import { trackEvent } from '../../lib/analytics'
import type { CommunitySignupContext } from '../../lib/community/types'
import { useRouter } from '../../lib/router'
import { ArrowIcon } from '../MenuIcons'

interface CommunityCTAProps {
  /** 'band' is the dark, sitewide footer treatment. 'inline' sits inside a light-background section. */
  variant?: 'band' | 'inline'
  signupContext?: CommunitySignupContext
  heading?: string
}

export function CommunityCTA({ variant = 'band', signupContext = 'footer-cta', heading }: CommunityCTAProps) {
  const { openPanel } = useCommunity()
  const { pathname } = useRouter()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const hasTrackedView = useRef(false)

  useEffect(() => {
    hasTrackedView.current = false
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasTrackedView.current) return
        hasTrackedView.current = true
        trackEvent('community_cta_viewed', { page: pathname, source: signupContext })
        observer.disconnect()
      },
      { threshold: 0.4 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [pathname, signupContext])

  const handleClick = () => {
    trackEvent('community_cta_clicked', { page: pathname, source: signupContext })
    openPanel(buttonRef.current, signupContext)
  }

  return (
    <section
      ref={sectionRef}
      className={variant === 'inline' ? 'community-cta community-cta--inline' : 'community-cta'}
      aria-labelledby="community-cta-heading"
    >
      <div className="community-cta__copy">
        <p className="index-label">Internet Athi community</p>
        <p id="community-cta-heading" className="community-cta__heading">
          {heading ?? 'Stay connected beyond the music.'}
        </p>
      </div>
      <button
        ref={buttonRef}
        type="button"
        className="action-link action-link--primary community-cta__button"
        onClick={handleClick}
      >
        <span>Join the community</span>
        <ArrowIcon className="community-cta__arrow" />
      </button>
    </section>
  )
}
