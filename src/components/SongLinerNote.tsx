import { ExternalLink } from './ExternalLink'

export function SongLinerNote() {
  return <section className="song-liner-note" aria-labelledby="liner-note-title">
    <div className="song-liner-note__sleeve" aria-hidden="true">
      <img src="/assets/story/brass-bell-hq.jpg" alt="" loading="lazy" width="736" height="981" />
      <div className="song-liner-note__record"><span>Wena<small>Internet Athi / 2024</small></span></div>
      <span className="song-liner-note__catalogue">Liner notes / No. 01</span>
    </div>
    <div className="song-liner-note__copy"><p className="index-label">Behind the song / Wena</p><h2 id="liner-note-title">Before the room,<br />there was a song.</h2>
      <p>“Wena” was a beginning Athi could stand behind. In his GQ interview, he explained that he wanted to make something he was proud of, rather than chase a viral moment.</p>
      <p>After that first single, he gave himself time to develop his composition, voice and arrangements. The pause was part of the work.</p>
      <ExternalLink className="song-liner-note__listen" href="https://open.spotify.com/album/0EcfvhqnPSeJnKyeoVSypt">Spend a moment with Wena <span aria-hidden="true">↗</span></ExternalLink>
      <p className="song-liner-note__source">Adapted from Athi’s conversation with Sindeka Mandoyi, GQ, 27 February 2026. <ExternalLink href="https://gq.co.za/culture/entertainment/2026-02-27-internet-athi-on-purpose-vulnerability-and-the-making-of-his-debut-album-polymorphism/">Read the interview ↗</ExternalLink></p>
    </div>
  </section>
}
