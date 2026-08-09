import { useCallback, useState } from 'react'
import { DiscographySurfer } from '../components/DiscographySurfer'
import { ExternalLink } from '../components/ExternalLink'
import { Seo } from '../components/Seo'
import { VideoModal } from '../components/VideoModal'
import { discographyReleases, musicVideos, polymorphism } from '../content/artist'
import type { MusicVideo } from '../content/types'

export function ListenPage() {
  const [activeTrack, setActiveTrack] = useState(polymorphism.tracks[0])
  const [previewVideo, setPreviewVideo] = useState(musicVideos[0])
  const [selectedVideo, setSelectedVideo] = useState<MusicVideo | null>(null)
  const [spotifyLoaded, setSpotifyLoaded] = useState(false)
  const closeVideo = useCallback(() => setSelectedVideo(null), [])

  return (
    <>
      <Seo
        title="Listen | Internet Athi"
        description="Explore Internet Athi's discography, listen to the album Polymorphism, and watch the official video archive."
        path="/listen"
      />

      <DiscographySurfer items={discographyReleases} />

      <section className="album-scene" aria-labelledby="track-index-title">
        <div className="album-scene__art-column">
          <figure className="album-art-frame">
            <img
              src={polymorphism.artwork}
              alt="Polymorphism album artwork by Internet Athi"
              width="640"
              height="640"
            />
            <figcaption>
              <span>Internet Athi</span>
              <span>{polymorphism.year}</span>
            </figcaption>
          </figure>
          <div className="active-track" aria-live="polite">
            <span className="index-label">Track in focus</span>
            <p>{String(activeTrack.number).padStart(2, '0')} / {activeTrack.title}</p>
          </div>
          <div className="platform-links" aria-label="Listen on music platforms">
            {polymorphism.platforms.map((platform) => (
              <ExternalLink key={platform.label} href={platform.url} showArrow>
                {platform.label}
              </ExternalLink>
            ))}
          </div>
        </div>

        <div className="track-index">
          <div className="track-index__header">
            <h2 id="track-index-title">Track index</h2>
            <p>{polymorphism.trackCount} tracks / {polymorphism.duration}</p>
          </div>
          <ol>
            {polymorphism.tracks.map((track) => {
              const destination = track.youtubeId
                ? `https://youtu.be/${track.youtubeId}`
                : polymorphism.platforms[0].url
              const action = track.youtubeId ? 'Listen on YouTube' : 'Open album on Spotify'

              return (
                <li key={track.number} className={activeTrack.number === track.number ? 'is-active' : ''}>
                  <ExternalLink
                    href={destination}
                    aria-label={`${action}: ${track.title}`}
                    onMouseEnter={() => setActiveTrack(track)}
                    onFocus={() => setActiveTrack(track)}
                  >
                    <span className="track-index__number">{String(track.number).padStart(2, '0')}</span>
                    <span className="track-index__title">
                      {track.title}
                      {track.credit ? <small>{track.credit}</small> : null}
                    </span>
                    <span className="track-index__duration">{track.duration}</span>
                    <span className="track-index__action">{action} ↗</span>
                  </ExternalLink>
                </li>
              )
            })}
          </ol>

          <div className="spotify-gate">
            {!spotifyLoaded ? (
              <button type="button" className="action-link" onClick={() => setSpotifyLoaded(true)}>
                Load Spotify album player
              </button>
            ) : (
              <iframe
                className="spotify-embed"
                title="Polymorphism by Internet Athi on Spotify"
                src="https://open.spotify.com/embed/album/2pduDMmEcftxkrJNIgZYS3?utm_source=generator&theme=0"
                width="100%"
                height="352"
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              />
            )}
            <p>Spotify loads only when requested.</p>
          </div>
        </div>
      </section>

      <section className="video-archive" aria-labelledby="video-archive-title">
        <div className="video-archive__heading">
          <p className="index-label">Moving image / 05 works</p>
          <h2 id="video-archive-title">Video archive</h2>
        </div>

        <figure className="video-archive__preview">
          <img
            src={previewVideo.thumbnail}
            alt=""
            width="1280"
            height="720"
            loading="lazy"
          />
          <figcaption>{previewVideo.title} / {previewVideo.credit}</figcaption>
        </figure>

        <ol className="video-programme">
          {musicVideos.map((video, index) => (
            <li key={video.id}>
              <button
                type="button"
                onMouseEnter={() => setPreviewVideo(video)}
                onFocus={() => setPreviewVideo(video)}
                onClick={() => setSelectedVideo(video)}
                aria-label={`Watch ${video.title}`}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{video.title}</strong>
                <small>{video.credit}</small>
                <span aria-hidden="true">Play ↗</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      {selectedVideo ? <VideoModal video={selectedVideo} onClose={closeVideo} /> : null}
    </>
  )
}
