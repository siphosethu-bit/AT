import { useState, type FormEvent } from 'react'
import { ExternalLink } from '../components/ExternalLink'
import { Seo } from '../components/Seo'
import { artist, pressItems } from '../content/artist'

export function BookPage() {
  const [formNotice, setFormNotice] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    if (data.get('website')) return

    const subject = `Booking enquiry: ${String(data.get('eventName') || 'Internet Athi')}`
    const body = [
      `Name: ${data.get('name')}`,
      `Organisation: ${data.get('organisation')}`,
      `Work email: ${data.get('email')}`,
      `Phone: ${data.get('phone') || 'Not supplied'}`,
      '',
      `Event: ${data.get('eventName')}`,
      `Event type: ${data.get('eventType')}`,
      `Event date: ${data.get('eventDate')}`,
      `Venue and city: ${data.get('venue')}`,
      `Estimated audience: ${data.get('audience') || 'Not supplied'}`,
      `Budget range: ${data.get('budget') || 'Not supplied'}`,
      `Performance request: ${data.get('performanceRequest') || 'Not supplied'}`,
      '',
      'Message:',
      String(data.get('message')),
    ].join('\n')

    setFormNotice(`Your email application should open with an enquiry addressed to ${artist.bookingEmail}. Review it, then send it from your email account.`)
    window.location.href = `mailto:${artist.bookingEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <>
      <Seo
        title="Book | Internet Athi"
        description="Booking and press contact for Internet Athi. Prepare an enquiry for festivals, concerts and cultural programmes."
        path="/book"
      />
      <header className="scene-heading scene-heading--book">
        <p className="index-label">Archive 04 / Book</p>
        <h1>Bring the music<br />into the room.</h1>
        <p className="scene-heading__lede">
          Booking, programming, media and collaboration enquiries.
        </p>
      </header>

      <section className="booking-overview" aria-labelledby="booking-overview-title">
        <div className="booking-overview__portrait">
          <img
            src="/assets/athi-balcony.webp"
            alt="Internet Athi leaning on a balcony"
            width="372"
            height="557"
          />
        </div>
        <div className="booking-overview__copy">
          <p className="index-label">Performance format</p>
          <h2 id="booking-overview-title">Live, arranged with care.</h2>
          <p>
            Internet Athi performs with a live ensemble. The format, instrumentation and technical requirements are confirmed for each programme.
          </p>
          <dl>
            <div>
              <dt>Suitable programmes</dt>
              <dd>Festivals, concert programmes and cultural events</dd>
            </div>
            <div>
              <dt>Based in</dt>
              <dd>{artist.location}</dd>
            </div>
            <div>
              <dt>Technical information</dt>
              <dd>Request the current rider and stage information by email</dd>
            </div>
            <div>
              <dt>Booking contact</dt>
              <dd><a href={`mailto:${artist.bookingEmail}`}>{artist.bookingEmail}</a></dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="booking-form-section" aria-labelledby="booking-form-title">
        <div className="booking-form-section__heading">
          <p className="index-label">Enquiry form</p>
          <h2 id="booking-form-title">Prepare your request</h2>
          <p>
            This form prepares an email in your own email application. It does not send or store your information on this website.
          </p>
        </div>
        <form className="booking-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" autoComplete="name" required />
          </div>
          <div className="form-field">
            <label htmlFor="organisation">Organisation</label>
            <input id="organisation" name="organisation" autoComplete="organization" required />
          </div>
          <div className="form-field">
            <label htmlFor="email">Work email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="form-field">
            <label htmlFor="phone">Phone <span>optional</span></label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" />
          </div>
          <div className="form-field">
            <label htmlFor="eventName">Event name</label>
            <input id="eventName" name="eventName" required />
          </div>
          <div className="form-field">
            <label htmlFor="eventType">Event type</label>
            <select id="eventType" name="eventType" required defaultValue="">
              <option value="" disabled>Select an event type</option>
              <option>Festival</option>
              <option>Concert programme</option>
              <option>Cultural programme</option>
              <option>Media appearance</option>
              <option>Collaboration</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="eventDate">Event date</label>
            <input id="eventDate" name="eventDate" type="date" required />
          </div>
          <div className="form-field">
            <label htmlFor="venue">Venue and city</label>
            <input id="venue" name="venue" required />
          </div>
          <div className="form-field">
            <label htmlFor="audience">Estimated audience <span>optional</span></label>
            <input id="audience" name="audience" inputMode="numeric" />
          </div>
          <div className="form-field">
            <label htmlFor="budget">Budget range <span>optional</span></label>
            <input id="budget" name="budget" />
          </div>
          <div className="form-field form-field--wide">
            <label htmlFor="performanceRequest">Performance format or request <span>optional</span></label>
            <input id="performanceRequest" name="performanceRequest" />
          </div>
          <div className="form-field form-field--wide">
            <label htmlFor="message">Message</label>
            <textarea id="message" name="message" rows={6} required />
          </div>
          <div className="form-field form-field--honeypot" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <div className="booking-form__submit">
            <button type="submit" className="action-link action-link--primary">Open booking email</button>
            <p className="form-notice" aria-live="polite">{formNotice}</p>
          </div>
        </form>
      </section>

      <section className="press-contact" aria-labelledby="press-contact-title">
        <div>
          <p className="index-label">Press and media</p>
          <h2 id="press-contact-title">Approved resources</h2>
          <p>
            For current biography copy, approved high-resolution images or interview requests, contact the team directly.
          </p>
          <a className="text-link" href={`mailto:${artist.teamEmail}`}>{artist.teamEmail}</a>
        </div>
        <ol>
          {pressItems.map((item) => (
            <li key={item.url}>
              <ExternalLink href={item.url} showArrow>
                <span>{item.publication}</span>
                <strong>{item.title}</strong>
              </ExternalLink>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
