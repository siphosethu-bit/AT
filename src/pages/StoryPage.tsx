import { useRef, useState } from 'react'
import { ExternalLink } from '../components/ExternalLink'
import { Seo } from '../components/Seo'
import { pressItems } from '../content/artist'

const interviewUrl = 'https://youtu.be/85A_6MNthnI'

const storyChapters = [
  {
    index: '01 / Expression',
    title: 'Writing came first.',
    copy: 'Born in Khayelitsha, Athi first found public expression through essays, poetry and performance. Music arrived in stages, carrying the same attention to language into melody and arrangement.',
  },
  {
    index: '02 / The path',
    title: 'The route was never linear.',
    copy: 'Computer science studies and five years working in technology shaped the way he builds. Structure, experimentation and human feeling now sit inside the same creative practice.',
  },
  {
    index: '03 / The name',
    title: 'Internet is a place of connection.',
    copy: 'Athi kept his real name because the songs begin with lived experience. Internet describes how the work travels, and how a community grew through learning, sharing and direct exchange.',
  },
  {
    index: '04 / Polymorphism',
    title: 'Love changes form.',
    copy: 'The album borrows a computer science idea: one entity can exist in many forms. Here, love appears through romance, friendship, family and a wider care for people.',
  },
  {
    index: '05 / Live',
    title: 'The ensemble completes the language.',
    copy: 'Trust and chemistry hold the live band together. Brass, strings, rhythm and voice bring collective energy to songs first shaped through writing and careful arrangement.',
  },
]

export function StoryPage() {
  const playerRef = useRef<HTMLIFrameElement>(null)
  const [isMuted, setIsMuted] = useState(true)
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const playerQuery = reducedMotion
    ? 'mute=1&controls=1&playsinline=1&rel=0&cc_load_policy=1&enablejsapi=1'
    : 'autoplay=1&mute=1&controls=1&playsinline=1&rel=0&cc_load_policy=1&enablejsapi=1'

  const sendPlayerCommand = (command: string, args: number[] = []) => {
    playerRef.current?.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func: command,
      args,
    }), '*')
  }

  const toggleSound = () => {
    if (isMuted) {
      sendPlayerCommand('setVolume', [100])
      sendPlayerCommand('unMute')
      sendPlayerCommand('playVideo')
    } else {
      sendPlayerCommand('mute')
    }
    setIsMuted((muted) => !muted)
  }

  return (
    <>
      <Seo
        title="Story | Internet Athi"
        description="Hear Internet Athi tell his story, then explore the writing, live instrumentation, imagery and ideas behind Polymorphism."
        path="/story"
      />

      <section className="story-film" aria-labelledby="story-title">
        <div className="story-film__sticky">
          <div className="story-film__media">
            <iframe
              ref={playerRef}
              src={`https://www.youtube-nocookie.com/embed/85A_6MNthnI?${playerQuery}`}
              title="Internet Athi: Singing of Worlds Worth Inheriting, an interview by iQHAWE Magazine"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="story-film__shade" aria-hidden="true" />
          <div className="story-film__opening">
            <div>
              <p className="index-label">Archive 03 / Story</p>
              <h1 id="story-title">In his<br />own words.</h1>
            </div>
            <div className="story-film__details">
              <p>Internet Athi: Singing of Worlds Worth Inheriting</p>
              <p>Interview by iQHAWE Magazine</p>
              <p>{reducedMotion ? 'Press play to begin' : 'Playing muted. Use the player controls for sound.'}</p>
            </div>
          </div>
          <div className="story-film__edge-note" aria-hidden="true">
            <span>Scroll to read</span>
            <span>Film / 01</span>
          </div>
          <ExternalLink className="story-film__source" href={interviewUrl} showArrow>
            Open interview on YouTube
          </ExternalLink>
          <button
            className={`story-film__sound${isMuted ? '' : ' is-on'}`}
            type="button"
            aria-label={isMuted ? 'Turn interview sound on' : 'Mute interview'}
            aria-pressed={!isMuted}
            onClick={toggleSound}
          >
            <span className="story-film__sound-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>{isMuted ? 'Sound on' : 'Mute'}</span>
          </button>
        </div>

        <div className="story-film__chapters">
          {storyChapters.map((chapter, index) => (
            <article
              className={`story-film__chapter story-film__chapter--${index + 1}`}
              key={chapter.index}
            >
              <p className="index-label">{chapter.index}</p>
              <h2>{chapter.title}</h2>
              <p>{chapter.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="story-portrait-feature" aria-labelledby="portrait-essay-title">
        <header className="story-portrait-feature__copy">
          <p className="index-label">Portrait study / One frame</p>
          <h2 id="portrait-essay-title">The person<br />inside the work.</h2>
          <p>
            Polymorphism does not require every version to appear at once. In one quiet frame, Athi holds still while light, texture and shadow carry the rest of the story.
          </p>
        </header>

        <figure className="story-portrait-feature__figure">
          <div className="story-portrait-feature__image">
            <img src="/assets/story/athi-warm.webp" alt="Internet Athi in a textured brown hat, held in warm side light" width="551" height="551" loading="lazy" />
            <span aria-hidden="true">IA / 01</span>
          </div>
          <figcaption>
            <span>Portrait 01 / Interior light</span>
            <span>Cape Town / South Africa</span>
          </figcaption>
        </figure>
      </section>

      <section className="story-instruments" aria-labelledby="instrument-essay-title">
        <header className="story-instruments__heading">
          <p className="index-label">Material language / Breath, touch, resonance</p>
          <h2 id="instrument-essay-title">Made by<br />many hands.</h2>
          <p>
            The live sound is physical. Air moves through brass. Fingers meet strings. Wood answers touch. Every detail begins with a human gesture.
          </p>
        </header>

        <figure className="instrument-frame instrument-frame--brass">
          <img src="/assets/story/brass-bell-hq.jpg" alt="Looking into the golden bell of a brass instrument" width="736" height="981" loading="lazy" />
          <figcaption>Breath / Brass</figcaption>
        </figure>
        <figure className="instrument-frame instrument-frame--strings-red">
          <img src="/assets/story/strings-red-hq.jpg" alt="A musician's hand pressing dark strings beside a red fingerboard" width="735" height="975" loading="lazy" />
          <figcaption>Touch / Strings</figcaption>
        </figure>
        <figure className="instrument-frame instrument-frame--strings-silver">
          <img src="/assets/story/strings-silver-hq.jpg" alt="A musician's fingers seen along a reflective set of strings" width="736" height="1308" loading="lazy" />
          <figcaption>Resonance / Strings</figcaption>
        </figure>
        <figure className="instrument-frame instrument-frame--oud">
          <img src="/assets/story/oud.jpg" alt="A musician playing the strings of an oud" width="300" height="451" loading="lazy" />
          <figcaption>Rhythm / Oud</figcaption>
        </figure>
      </section>

      <section className="story-quote" aria-label="Internet Athi quote">
        <p className="index-label">On recording and performance</p>
        <blockquote>
          &ldquo;I think of singles as short stories, albums as essays. A live show is the audience&apos;s interpretation of that essay.&rdquo;
        </blockquote>
        <ExternalLink href={pressItems[0].url} showArrow>
          Read the GQ South Africa interview
        </ExternalLink>
      </section>

      <section className="press-index" aria-labelledby="press-index-title">
        <div>
          <p className="index-label">Selected reading</p>
          <h2 id="press-index-title">Press index</h2>
        </div>
        <ol>
          {pressItems.map((item, index) => (
            <li key={item.url}>
              <ExternalLink href={item.url}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span>{item.publication}</span>
                <strong>{item.title}</strong>
                <time>{item.date}</time>
                <span aria-hidden="true">↗</span>
              </ExternalLink>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
