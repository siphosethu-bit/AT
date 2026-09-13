import { CommunityCTA } from '../components/community/CommunityCTA'
import { ExternalLink } from '../components/ExternalLink'
import { Seo } from '../components/Seo'
import { artist, polymorphism } from '../content/artist'
import { useSiteContent } from '../context/SiteContentContext'
import { formatLiveEventDate, getLiveEventStatus, sortLiveEvents } from '../lib/liveEvents'
import { Link } from '../lib/router'

const SPOTIFY_ALBUM_URL = 'https://open.spotify.com/album/2pduDMmEcftxkrJNIgZYS3'
const NGUWE_VIDEO_URL = 'https://www.youtube.com/watch?v=te8yGYWmy2I'

function DiagonalArrow() {
  return (
    <svg className="signature-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 12.5 12.5 3.5M5.75 3.5h6.75v6.75"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function HomePage() {
  const { shows: liveEvents } = useSiteContent()
  const nextEvent = sortLiveEvents(
    liveEvents.filter((event) => getLiveEventStatus(event) !== 'past'),
  )[0]

  return (
    <>
      <Seo
        title="Internet Athi | Polymorphism"
        description="Enter Internet Athi's living archive. Listen to the debut album Polymorphism, watch, view live dates, and make a booking enquiry."
        path="/"
      />
      <section className="signature-stage" aria-labelledby="home-title">
        <p className="signature-stage__tagline">Music from South Africa.</p>

        <figure className="signature-art">
          <img
            src="/assets/athi-paper-landing.png"
            alt="A monochrome portrait of Internet Athi, his brush-lettered signature and a fine red thread on warm paper."
            width="1672"
            height="941"
            fetchPriority="high"
          />
          <div className="signature-art__portrait" role="img" aria-label="Internet Athi in a knitted hat, head bowed." />
          <div className="signature-art__brush" aria-hidden="true" />
          <svg className="signature-art__thread" viewBox="0 0 400 520" preserveAspectRatio="none" aria-hidden="true">
            <path d="M405 -65 C370 20 295 50 235 100 M300 280 C380 355 405 382 365 465" />
            <circle cx="365" cy="465" r="4" />
          </svg>
        </figure>

        <h1 id="home-title" className="signature-name">
          <span className="signature-name__prefix">internet</span>
          <span className="sr-only">athi</span>
        </h1>

        <div className="signature-actions">
          <p className="signature-actions__eyebrow">
            {polymorphism.title}
            <span aria-hidden="true" />
          </p>
          <ExternalLink className="signature-actions__primary" href={SPOTIFY_ALBUM_URL}>
            <span>Listen to the record</span>
            <DiagonalArrow />
          </ExternalLink>
          <ExternalLink className="signature-actions__secondary" href={NGUWE_VIDEO_URL}>
            <span>Watch Nguwe</span>
            <DiagonalArrow />
          </ExternalLink>
        </div>

        <p className="signature-stage__location">{artist.location}.</p>
      </section>

      <section className="home-afterword" aria-labelledby="next-programme-title">
        <div className="home-afterword__intro">
          <p className="index-label">The polymorphic archive</p>
          <h2>One artist.<br />Many forms.</h2>
        </div>
        <p className="home-afterword__copy">
          Polymorphism explores love through its romantic, familial, communal and transforming forms.
          The archive follows that same idea through recordings, performance, writing and image.
        </p>
        {nextEvent ? (
          <article className="next-programme">
            <p className="index-label" id="next-programme-title">Next in the live programme</p>
            <p className="next-programme__date">{formatLiveEventDate(nextEvent)}</p>
            <h3>{nextEvent.title}</h3>
            <p>{nextEvent.venue}, {nextEvent.city}</p>
            <Link className="text-link" to="/live">View live programme →</Link>
          </article>
        ) : (
          <article className="next-programme">
            <p className="index-label" id="next-programme-title">Live programme</p>
            <h3>No public dates are currently listed.</h3>
            <Link className="text-link" to="/book">Request a show →</Link>
          </article>
        )}

        <CommunityCTA variant="inline" signupContext="home-afterword-cta" />
      </section>
    </>
  )
}
