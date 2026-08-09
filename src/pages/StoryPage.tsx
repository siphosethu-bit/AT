import { ExternalLink } from '../components/ExternalLink'
import { Seo } from '../components/Seo'
import { pressItems } from '../content/artist'

const glyphLines = Array.from({ length: 14 }, (_, index) => (
  `${String(index + 1).padStart(2, '0')}  IA / POLY / MORPH / ATHI / FORM / LOVE / `
)).join('\n')

export function StoryPage() {
  return (
    <>
      <Seo
        title="Story | Internet Athi"
        description="Read the verified story behind Internet Athi, the idea of Polymorphism, and his relationship with writing, technology, and live music."
        path="/story"
      />
      <header className="scene-heading scene-heading--story">
        <p className="index-label">Archive 03 / Story</p>
        <h1>A life in<br />multiple forms.</h1>
      </header>

      <section className="story-opening" aria-labelledby="story-introduction">
        <figure className="story-opening__portrait">
          <img
            src="/assets/athi-wide.webp"
            alt="Close portrait of Internet Athi looking toward the camera"
            width="712"
            height="251"
            fetchPriority="high"
          />
          <figcaption className="index-label">Portrait / form 03</figcaption>
        </figure>
        <div className="story-opening__copy">
          <p className="index-label">Khayelitsha to Cape Town</p>
          <h2 id="story-introduction">Writing came first.</h2>
          <p>
            Internet Athi was born in Khayelitsha, Cape Town. Writing, poetry and essays gave him an early route into public expression. He later studied computer science and worked in technology for five years before committing to music full time.
          </p>
          <p>
            That history remains present in the work. Human feeling and careful structure are not opposites here. They are part of the same practice.
          </p>
        </div>
      </section>

      <section className="story-chapters" aria-label="Story chapters">
        <article>
          <p className="index-label">01 / Voice</p>
          <h2>Love as the changing form</h2>
          <p>
            Polymorphism borrows a computer science idea: one entity can exist in different forms. On the album, that entity is love. Romantic love, friendship, family and a wider love for people all reveal different versions of the self.
          </p>
        </article>
        <article>
          <p className="index-label">02 / Live</p>
          <h2>The ensemble is part of the language</h2>
          <p>
            Athi describes trust and chemistry as central to building his band. Live instruments bring intuition and collective energy to music first shaped through writing and arrangement.
          </p>
        </article>
        <article>
          <p className="index-label">03 / Internet</p>
          <h2>A name built through connection</h2>
          <p>
            Athi uses his real name. The Internet reflects how the work travels and how a community formed around it through learning, sharing and direct exchange.
          </p>
        </article>
      </section>

      <section className="glyph-scene" aria-labelledby="glyph-title">
        <div className="glyph-scene__image" aria-hidden="true">
          <pre>{glyphLines}</pre>
        </div>
        <div className="glyph-scene__copy">
          <p className="index-label">Image translated / form 04</p>
          <h2 id="glyph-title">Analog warmth.<br />Digital structure.</h2>
          <p>
            The image remains Athi. Only its surface changes: portrait becomes index, fabric becomes signal, and one identity takes another form.
          </p>
        </div>
      </section>

      <section className="story-quote" aria-label="Internet Athi quote">
        <blockquote>
          “I think of singles as short stories, albums as essays. A live show is the audience's interpretation of that essay.”
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
