import { useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { useReducedMotion } from 'framer-motion'
import { artist, socialProfiles } from '../content/artist'
import { Link, NavLink, useRouter } from '../lib/router'
import { ArrowIcon, HomeIcon } from './MenuIcons'
import { ExternalLink } from './ExternalLink'

const navigation = [
  { to: '/listen', label: 'Listen', index: '01', descriptor: 'Music' },
  { to: '/live', label: 'Live', index: '02', descriptor: 'Performances' },
  { to: '/story', label: 'Story', index: '03', descriptor: 'Biography' },
  { to: '/book', label: 'Book', index: '04', descriptor: 'Bookings' },
]

const MENU_CLOSE_DURATION = 320

export function Layout({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuClosing, setMenuClosing] = useState(false)
  const { pathname } = useRouter()
  const menuButton = useRef<HTMLButtonElement>(null)
  const menuPanel = useRef<HTMLElement>(null)
  const wasOpenRef = useRef(false)
  const closeTimeout = useRef<number | undefined>(undefined)
  const reducedMotion = useReducedMotion()
  const isHome = pathname === '/'
  const menuVisible = menuOpen || menuClosing

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    if (menuOpen) {
      window.clearTimeout(closeTimeout.current)
      setMenuClosing(false)
      wasOpenRef.current = true
      return
    }

    if (!wasOpenRef.current) return
    wasOpenRef.current = false

    if (reducedMotion) return
    setMenuClosing(true)
    closeTimeout.current = window.setTimeout(() => setMenuClosing(false), MENU_CLOSE_DURATION)
    return () => window.clearTimeout(closeTimeout.current)
  }, [menuOpen, reducedMotion])

  useEffect(() => {
    if (!menuVisible) return

    const bodyOverflow = document.body.style.overflow
    const main = document.getElementById('main-content')
    const footer = document.querySelector<HTMLElement>('.site-footer')
    document.body.style.overflow = 'hidden'
    main?.setAttribute('inert', '')
    footer?.setAttribute('inert', '')

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButton.current?.focus()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = [
        menuButton.current,
        ...Array.from(menuPanel.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []),
      ].filter((element): element is HTMLElement => Boolean(element))
      const first = focusable[0]
      const last = focusable.at(-1)

      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = bodyOverflow
      main?.removeAttribute('inert')
      footer?.removeAttribute('inert')
    }
  }, [menuVisible])

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className={isHome ? 'site-header site-header--home' : 'site-header'}>
        {isHome ? (
          <Link className="site-wordmark" to="/" tabIndex={menuOpen ? -1 : undefined}>
            Internet Athi
          </Link>
        ) : null}
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
            >
              <span className="nav-link__index" aria-hidden="true">{item.index}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          ref={menuButton}
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
          <span className="menu-toggle__glyph" aria-hidden="true">{menuOpen ? '×' : '+'}</span>
        </button>
      </header>

      {menuVisible ? (
        <nav
          ref={menuPanel}
          id="mobile-navigation"
          className={menuClosing ? 'mobile-menu is-closing' : 'mobile-menu'}
          role="dialog"
          aria-modal="true"
          aria-label="Primary navigation"
        >
          <div className="mobile-menu__artwork" aria-hidden="true" />
          <p className="mobile-menu__eyebrow">The Polymorphic Archive</p>
          <ol className="mobile-menu__list">
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'mobile-menu__link is-active' : 'mobile-menu__link')}
                >
                  <span className="mobile-menu__link-index" aria-hidden="true">{item.index}</span>
                  <span className="mobile-menu__link-title">{item.label}</span>
                  <span className="mobile-menu__link-descriptor">{item.descriptor}</span>
                  <ArrowIcon className="mobile-menu__link-arrow" />
                </NavLink>
              </li>
            ))}
          </ol>
          <NavLink to="/" className="mobile-menu__home">
            <HomeIcon className="mobile-menu__home-icon" />
            <span>Return home</span>
            <span className="mobile-menu__home-line" aria-hidden="true" />
            <ArrowIcon className="mobile-menu__home-arrow" />
          </NavLink>
        </nav>
      ) : null}

      <main id="main-content" tabIndex={-1} aria-hidden={menuVisible || undefined}>
        {children}
      </main>

      <footer className="site-footer" aria-hidden={menuVisible || undefined}>
        <div>
          <p className="site-footer__name">Internet Athi</p>
          <p>{artist.location}</p>
        </div>
        <div className="site-footer__contacts">
          <a href={`mailto:${artist.generalEmail}`}>{artist.generalEmail}</a>
          <a href={`mailto:${artist.bookingEmail}`}>{artist.bookingEmail}</a>
        </div>
        <div className="site-footer__socials" aria-label="Social profiles">
          {socialProfiles.map((profile) => (
            <ExternalLink key={profile.label} href={profile.url}>
              {profile.label}
            </ExternalLink>
          ))}
        </div>
        <p className="site-footer__copyright">
          © {new Date().getFullYear()} Internet Athi
        </p>
      </footer>
    </div>
  )
}
