import { ExternalLink } from '../components/ExternalLink'
import { Seo } from '../components/Seo'
import { artist, liveEvents, polymorphism } from '../content/artist'
import { usePolymorphicDrift } from '../hooks/usePolymorphicDrift'
import { formatLiveEventDate, getLiveEventStatus, sortLiveEvents } from '../lib/liveEvents'
import { Link } from '../lib/router'

const SPOTIFY_ALBUM_URL = 'https://open.spotify.com/album/2pduDMmEcftxkrJNIgZYS3'
const NGUWE_VIDEO_URL = 'https://www.youtube.com/watch?v=te8yGYWmy2I'

export function HomePage() {
  const { stageRef, entranceState } = usePolymorphicDrift()
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
      <section
        ref={stageRef}
        className="home-stage"
        aria-labelledby="home-title"
        data-motion-state="running"
        data-entrance-state={entranceState}
      >
        <picture className="home-artwork" aria-hidden="true">
          <source
            media="(max-width: 1023px) and (orientation: portrait)"
            srcSet="/assets/internet-athi-hero-mobile.png"
          />
          <img
            className="home-artwork__image"
            src="/assets/internet-athi-hero-desktop.png"
            alt=""
            width="1672"
            height="941"
            fetchPriority="high"
          />
        </picture>
        <div className="home-stage__readability" aria-hidden="true" />

        <div className="home-stage__interface">
          <div className="landing-release">
            <p className="landing-release__eyebrow">Current release / {polymorphism.year}</p>
            <h1 id="home-title">
              <span className="sr-only">Polymorphism</span>
              <span className="landing-release__line" aria-hidden="true">
                <span>POLY</span>
              </span>
              <span className="landing-release__line" aria-hidden="true">
                <span>MORPHISM</span>
              </span>
            </h1>
          </div>

          <div className="release-actions" aria-label="Polymorphism release links">
            <ExternalLink className="release-actions__primary" href={SPOTIFY_ALBUM_URL}>
              Listen now
            </ExternalLink>
            <ExternalLink className="release-actions__secondary" href={NGUWE_VIDEO_URL}>
              Watch Nguwe
            </ExternalLink>
          </div>

          <div className="artist-introduction">
            <p>{artist.name}</p>
            <p>Cape Town singer-songwriter<br />and live performer.</p>
          </div>

          <div className="release-indicator">
            <span className="sr-only">Release 1 of 4</span>
            <p className="release-indicator__count" aria-hidden="true">
              <span>01</span><span>/</span><span>04</span>
            </p>
            <span className="release-indicator__track" aria-hidden="true">
              <span />
            </span>
          </div>
        </div>
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
      </section>
    </>
  )
}
