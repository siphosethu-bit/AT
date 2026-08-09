import { liveEvents, polymorphism } from '../content/artist'
import { getLiveEventStatus } from '../lib/liveEvents'

export function SchemaMarkup() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MusicGroup',
        '@id': 'https://internetathi.com/#artist',
        name: 'Internet Athi',
        url: 'https://internetathi.com/',
        image: 'https://internetathi.com/assets/athi-front.png',
        genre: ['South African jazz', 'Neo-soul', 'R&B'],
        sameAs: [
          'https://instagram.com/internetathi',
          'https://open.spotify.com/artist/5ycDBJECG7YqvqtkstSFaa',
          'https://music.apple.com/us/artist/internet-athi/1687103076',
          'https://www.youtube.com/channel/UCNb78W5Cg8_NPR6gSsEp7fA',
        ],
      },
      {
        '@type': 'MusicAlbum',
        name: polymorphism.title,
        byArtist: { '@id': 'https://internetathi.com/#artist' },
        datePublished: polymorphism.releaseDate,
        numTracks: polymorphism.trackCount,
        image: `https://internetathi.com${polymorphism.artwork}`,
        track: polymorphism.tracks.map((track) => ({
          '@type': 'MusicRecording',
          position: track.number,
          name: track.title,
          duration: track.duration,
          byArtist: { '@id': 'https://internetathi.com/#artist' },
        })),
      },
      ...liveEvents.map((event) => {
        const status = getLiveEventStatus(event)
        return {
          '@type': 'MusicEvent',
          name: event.title,
          startDate: event.startDateTime,
          endDate: event.endDateTime,
          location: {
            '@type': 'Place',
            name: event.venue,
            address: event.address ?? `${event.city}, ${event.country}`,
            geo: {
              '@type': 'GeoCoordinates',
              latitude: event.latitude,
              longitude: event.longitude,
            },
          },
          performer: { '@id': 'https://internetathi.com/#artist' },
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          eventStatus: status === 'past'
            ? 'https://schema.org/EventCompleted'
            : 'https://schema.org/EventScheduled',
          ...(event.ticketUrl && status !== 'past'
            ? {
                offers: {
                  '@type': 'Offer',
                  url: event.ticketUrl,
                  availability: 'https://schema.org/InStock',
                },
              }
            : {}),
        }
      }),
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
