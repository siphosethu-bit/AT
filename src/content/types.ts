export type Platform = 'Spotify' | 'Apple Music' | 'YouTube' | 'SoundCloud'

export interface PlatformLink {
  label: Platform
  url: string
}

export interface Track {
  number: number
  title: string
  duration: string
  credit?: string
  youtubeId?: string
}

export interface Release {
  title: string
  artist: string
  releaseDate: string
  year: number
  artwork: string
  trackCount: number
  duration: string
  tracks: Track[]
  platforms: PlatformLink[]
}

export interface DiscographyRelease {
  id: string
  title: string
  releaseType: 'Album' | 'Single'
  year: number
  image: string
  spotifyUrl: string
  alt: string
  accent?: string
}

export interface MusicVideo {
  id: string
  title: string
  credit: string
  thumbnail: string
  youtubeUrl: string
}

export interface LiveEvent {
  id: string
  slug: string
  title: string
  startDateTime: string
  endDateTime?: string
  timezone: string
  venue: string
  address?: string
  city: string
  region?: string
  country: string
  latitude: number
  longitude: number
  lineup?: string[]
  billing?: string
  description?: string
  ticketUrl?: string
  rsvpUrl?: string
  directionsUrl?: string
  image?: string
  sourceUrl?: string
}

export interface SocialProfile {
  label: string
  url: string
}

export interface PressItem {
  publication: string
  title: string
  date: string
  url: string
}
