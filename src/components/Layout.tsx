import { useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { artist, socialProfiles } from '../content/artist'
import { NavLink, useRouter } from '../lib/router'
import { ExternalLink } from './ExternalLink'

const navigation = [
  { to: '/listen', label: 'Listen', index: '01' },
  { to: '/live', label: 'Live', index: '02' },
  { to: '/story', label: 'Story', index: '03' },
  { to: '/book', label: 'Book', index: '04' },
]

export function Layout({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useRouter()
  const menuButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [menuOpen])

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
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

      {menuOpen ? (
        <div className="mobile-menu" id="mobile-navigation">
          <button
            className="mobile-menu__backdrop"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="mobile-menu__panel" aria-label="Mobile navigation">
            <p className="index-label">The polymorphic archive</p>
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} className="mobile-menu__link">
                <span>{item.index}</span>
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/" className="mobile-menu__home">Return home</NavLink>
          </nav>
        </div>
      ) : null}

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer">
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
