import { ExternalLink } from '../components/ExternalLink'
import { Seo } from '../components/Seo'
import { liveEvents, polymorphism } from '../content/artist'
import { usePolymorphicDrift } from '../hooks/usePolymorphicDrift'
import { formatLiveEventDate, getLiveEventStatus, sortLiveEvents } from '../lib/liveEvents'
import { Link } from '../lib/router'

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
        <div className="home-stage__ambient" aria-hidden="true" />
        <div className="home-stage__grid" aria-hidden="true" />

        <div className="home-stage__coordinates index-label" aria-hidden="true">
          CPT / 33.9249° S / 18.4241° E
        </div>

        <figure className="portrait-fragment portrait-fragment--left" aria-hidden="true">
          <img src="/assets/athi-balcony.webp" alt="" width="372" height="557" />
        </figure>
        <figure className="portrait-fragment portrait-fragment--right" aria-hidden="true">
          <img src="/assets/athi-wide.webp" alt="" width="712" height="251" />
        </figure>
        <div className="home-stage__contrast" aria-hidden="true" />

        <div className="home-stage__identity">
          <p className="eyebrow">Internet Athi</p>
          <p>{'Cape Town singer-songwriter'}<br />{'and live performer.'}</p>
        </div>

        <figure className="home-stage__portrait">
          <img
            src="/assets/athi-front.webp"
            alt="Internet Athi wearing a dark flat cap and brown corduroy shirt"
            width="548"
            height="552"
            fetchPriority="high"
          />
          <figcaption className="index-label">Portrait / form 01</figcaption>
        </figure>

        <div className="home-stage__release">
          <p className="index-label">Current release / {polymorphism.year}</p>
          <h1 id="home-title">Polymorphism</h1>
          <p className="release-status">Out now</p>
          <div className="home-stage__actions">
            <Link className="action-link action-link--primary" to="/listen">
              Listen to Polymorphism
            </Link>
            <ExternalLink
              className="action-link action-link--quiet"
              href="https://youtu.be/te8yGYWmy2I"
              showArrow
            >
              Watch Nguwe
            </ExternalLink>
          </div>
        </div>

        <div className="home-stage__routes" aria-label="More destinations">
          <Link to="/live">Live dates</Link>
          <span aria-hidden="true">/</span>
          <Link to="/story">The story</Link>
          <span aria-hidden="true">/</span>
          <Link to="/book">Book Athi</Link>
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
