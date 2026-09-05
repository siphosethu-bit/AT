import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowIcon } from '../components/MenuIcons'
import { ExternalLink } from '../components/ExternalLink'
import { Seo } from '../components/Seo'
import { artist, pressItems } from '../content/artist'
import { isValidEmail } from '../lib/community/validation'

const formatOptions = ['live ensemble', 'festival set', 'cultural programme', 'solo session', 'collaboration']

const posterWave = [6, 14, 9, 20, 5, 16, 11, 22, 7, 13, 9, 18, 6, 12]

const VENUE_PLACEHOLDER = 'A room of your choosing'
const CITY_PLACEHOLDER = 'Somewhere in South Africa'

interface BriefErrors {
  venue?: string
  date?: string
  email?: string
}

function fieldSize(placeholder: string, value: string, min = 3) {
  return Math.max(placeholder.length, value.length, min)
}

const STAMP_MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
]

function formatStampDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = STAMP_MONTHS[date.getMonth()]
  return `${day} ${month} ${date.getFullYear()}`
}

export function BookPage() {
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [date, setDate] = useState('')
  const [format, setFormat] = useState('')
  const [audience, setAudience] = useState('')
  const [email, setEmail] = useState('')
  const [room, setRoom] = useState('')
  const [who, setWho] = useState('')

  const [errors, setErrors] = useState<BriefErrors>({})
  const [sentAt, setSentAt] = useState<Date | null>(null)
  const [venuePulsing, setVenuePulsing] = useState(false)

  const venuePulseTimeout = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(venuePulseTimeout.current), [])

  const clearFieldError = (field: keyof BriefErrors) => {
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleVenueChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVenue(event.target.value)
    clearFieldError('venue')
    setVenuePulsing(true)
    window.clearTimeout(venuePulseTimeout.current)
    venuePulseTimeout.current = window.setTimeout(() => setVenuePulsing(false), 160)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: BriefErrors = {}
    if (!venue.trim()) nextErrors.venue = 'Add a venue'
    if (!date.trim()) nextErrors.date = 'Add a date'
    if (!email.trim()) {
      nextErrors.email = 'Add an email we can reply to'
    } else if (!isValidEmail(email)) {
      nextErrors.email = "That email address doesn't look right"
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const subject = `Booking enquiry: ${venue.trim()} / ${date.trim()}`
    const body = [
      `Venue: ${venue.trim()}`,
      `City: ${city.trim() || 'Not supplied'}`,
      `Proposed date: ${date.trim()}`,
      `Format: ${format || 'Not specified'}`,
      `Expected audience: ${audience.trim() || 'Not supplied'}`,
      `Reply email: ${email.trim()}`,
      '',
      `About the room: ${room.trim() || 'Not supplied'}`,
      `Who's asking: ${who.trim() || 'Not supplied'}`,
    ].join('\n')

    window.location.href = `mailto:${artist.bookingEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSentAt(new Date())
  }

  const sent = sentAt !== null

  return (
    <>
      <Seo
        title="Book Internet Athi"
        description="Send Internet Athi's booking desk a one-sentence brief for a live performance, festival set, cultural programme or collaboration."
        path="/book"
      />

      <section className="booking-brief" aria-labelledby="booking-brief-title">
        <div className="booking-brief__copy">
          <p className="booking-brief__kicker">Archive 04 / Booking desk</p>
          <h1 id="booking-brief-title">Bring the room<br />to Internet Athi.</h1>
          <p className="booking-brief__lede">
            One sentence is enough to start. As you fill it in, the poster on the right takes shape — that's the
            brief the team reads, and it's what we'll reply to within three working days.
          </p>

          <form className="booking-brief__form" onSubmit={handleSubmit} noValidate>
            <p className="booking-brief__sentence">
              We'd like Internet Athi to play at
              <input
                id="brief-venue"
                type="text"
                placeholder="the venue"
                size={fieldSize('the venue', venue)}
                aria-label="Venue"
                aria-invalid={errors.venue ? true : undefined}
                aria-describedby={errors.venue ? 'brief-error-venue' : undefined}
                value={venue}
                onChange={handleVenueChange}
              />
              in
              <input
                id="brief-city"
                type="text"
                placeholder="the city"
                size={fieldSize('the city', city)}
                aria-label="City"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
              on
              <input
                id="brief-date"
                type="text"
                placeholder="a date"
                size={fieldSize('a date', date)}
                aria-label="Proposed date"
                aria-invalid={errors.date ? true : undefined}
                aria-describedby={errors.date ? 'brief-error-date' : undefined}
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                  clearFieldError('date')
                }}
              />
              , as a
              <select
                id="brief-format"
                aria-label="Format"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                <option value="">kind of set</option>
                {formatOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              for about
              <input
                id="brief-audience"
                className="is-numeric"
                type="text"
                inputMode="numeric"
                placeholder="200"
                size={fieldSize('200', audience)}
                aria-label="Expected audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
              />
              people. Reply to
              <input
                id="brief-email"
                className="is-email"
                type="email"
                placeholder="you@promoter.co.za"
                size={fieldSize('you@promoter.co.za', email)}
                aria-label="Your email"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'brief-error-email' : undefined}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  clearFieldError('email')
                }}
              />
            </p>

            {Object.keys(errors).length > 0 ? (
              <ul className="booking-brief__errors" role="alert">
                {errors.venue ? <li id="brief-error-venue">{errors.venue}</li> : null}
                {errors.date ? <li id="brief-error-date">{errors.date}</li> : null}
                {errors.email ? <li id="brief-error-email">{errors.email}</li> : null}
              </ul>
            ) : null}

            <div className="booking-brief__notes">
              <div className="booking-brief__field">
                <label htmlFor="brief-room">About the room</label>
                <textarea
                  id="brief-room"
                  rows={3}
                  placeholder="Capacity, stage, backline, the mood you're after."
                  value={room}
                  onChange={(event) => setRoom(event.target.value)}
                />
              </div>
              <div className="booking-brief__field">
                <label htmlFor="brief-who">Who's asking</label>
                <input
                  id="brief-who"
                  type="text"
                  placeholder="Your name and organisation"
                  value={who}
                  onChange={(event) => setWho(event.target.value)}
                />
              </div>
            </div>

            <div className="booking-brief__actions">
              <button className="action-link action-link--primary booking-brief__submit" type="submit">
                Send the brief
              </button>
              {sent ? (
                <p className="booking-brief__ok" role="status">Brief sent. Watch your inbox.</p>
              ) : (
                <p className="booking-brief__hint">
                  Not a confirmed booking. We'll come back with availability, fee and next steps.
                </p>
              )}
            </div>
          </form>
        </div>

        <aside className="booking-brief__poster-wrap" aria-label="Live poster preview">
          <div className="booking-poster">
            <img className="booking-poster__image" src="/assets/book-cello-motion.jpg" alt="" />
            <div className="booking-poster__veil" aria-hidden="true" />
            <div className="booking-poster__dots" aria-hidden="true" />
            <div className="booking-poster__grain" aria-hidden="true" />
            <div className="booking-poster__frame" aria-hidden="true" />
            <svg className="booking-poster__marks" viewBox="0 0 300 400" aria-hidden="true">
              <g transform="translate(13, 13)">
                <circle r="5" />
                <line x1="-8" y1="0" x2="8" y2="0" />
                <line x1="0" y1="-8" x2="0" y2="8" />
              </g>
              <g transform="translate(287, 387)">
                <circle r="5" />
                <line x1="-8" y1="0" x2="8" y2="0" />
                <line x1="0" y1="-8" x2="0" y2="8" />
              </g>
            </svg>

            <div className="booking-poster__top">
              <span>INTERNET ATHI</span>
              <span>2026 SEASON</span>
            </div>

            <div className={`booking-poster__stamp ${sent ? 'is-sent' : ''}`}>
              {sentAt ? (
                <>BRIEF SENT<br />{formatStampDate(sentAt)}</>
              ) : (
                <>PROPOSED<br />NOT YET CONFIRMED</>
              )}
            </div>

            <div className="booking-poster__main">
              <p className="booking-poster__live">LIVE AT</p>
              <p className={`booking-poster__venue ${venuePulsing ? 'is-updating' : ''}`}>
                {venue.trim() || VENUE_PLACEHOLDER}
              </p>
              <p className="booking-poster__city">{city.trim() || CITY_PLACEHOLDER}</p>
              <div className="booking-poster__date">
                {date.trim() ? <b>{date.trim().toUpperCase()}</b> : 'DATE TO BE PROPOSED'}
                {format ? <>{'  /  '}{format.toUpperCase()}</> : null}
              </div>
            </div>

            <div className="booking-poster__foot">
              <span>POLYMORPHISM TOUR</span>
              <span className="booking-poster__wave" aria-hidden="true">
                {posterWave.map((height, index) => (
                  <span key={`${height}-${index}`} style={{ height: `${height}px` }} />
                ))}
              </span>
            </div>
          </div>
          <p className="booking-poster__caption">
            <span>Your poster, drafted as you type</span>
            <span>Preview</span>
          </p>
        </aside>
      </section>

      <section className="press-contact" aria-labelledby="booking-support-title">
        <p className="section-index">Booking support</p>
        <div>
          <h2 id="booking-support-title">Need a direct conversation?</h2>
          <p>
            For programming, media and collaboration enquiries, write directly to the booking team. Press materials are available below.
          </p>
        </div>
        <address>
          <ExternalLink href={`mailto:${artist.bookingEmail}`}>{artist.bookingEmail}</ExternalLink>
          {pressItems.map((item) => (
            <ExternalLink href={item.url} key={item.url}>
              {item.publication}: {item.title} <ArrowIcon className="press-contact__icon" />
            </ExternalLink>
          ))}
        </address>
      </section>
    </>
  )
}
