import type {
  DiscographyRelease,
  MusicVideo,
  PressItem,
  Release,
  SocialProfile,
} from './types'

export const artist = {
  name: 'Internet Athi',
  descriptor: 'Cape Town singer-songwriter and live performer.',
  location: 'Cape Town, South Africa',
  generalEmail: 'info@internetathi.com',
  bookingEmail: 'bookings@internetathi.com',
  teamEmail: 'team@internetathi.com',
}

export const polymorphism: Release = {
  title: 'Polymorphism',
  artist: 'Internet Athi',
  releaseDate: '2026-04-27',
  year: 2026,
  artwork: '/assets/polymorphism-cover.jpg',
  trackCount: 11,
  duration: '39 min 41 sec',
  platforms: [
    {
      label: 'Spotify',
      url: 'https://open.spotify.com/album/2pduDMmEcftxkrJNIgZYS3',
    },
    {
      label: 'Apple Music',
      url: 'https://music.apple.com/mw/album/polymorphism/1892317237',
    },
    {
      label: 'YouTube',
      url: 'https://www.youtube.com/channel/UCNb78W5Cg8_NPR6gSsEp7fA',
    },
  ],
  tracks: [
    { number: 1, title: 'Dlokovela', duration: '1:08' },
    { number: 2, title: 'Cetyana', duration: '5:51' },
    { number: 3, title: 'sudo', duration: '1:27' },
    { number: 4, title: 'Mna', duration: '6:14', youtubeId: 'OOw-SHzXUl8' },
    {
      number: 5,
      title: 'Undithembisile',
      duration: '4:36',
      credit: 'feat. Mthokozisi Ngcobo',
      youtubeId: 'c46WMI1NR8o',
    },
    { number: 6, title: 'T(K)hetha, Pt. 1', duration: '3:09', youtubeId: 'LJGKc8d48UQ' },
    { number: 7, title: 'Nguwe', duration: '5:09', youtubeId: 'te8yGYWmy2I' },
    { number: 8, title: 'uncumo lwam', duration: '2:12' },
    { number: 9, title: 'Wena', duration: '4:31', youtubeId: 'auutUpy8DUc' },
    { number: 10, title: 'I can morph (do better)', duration: '2:32' },
    { number: 11, title: 'Khawuphinde uzame nanamhlanje.', duration: '2:51' },
  ],
}

export const discographyReleases: DiscographyRelease[] = [
  {
    id: '2pduDMmEcftxkrJNIgZYS3',
    title: 'Polymorphism',
    releaseType: 'Album',
    year: 2026,
    image: '/assets/polymorphism-cover.jpg',
    spotifyUrl: 'https://open.spotify.com/album/2pduDMmEcftxkrJNIgZYS3?si=i2-u9yUSSxuRwpdx-ccqmA',
    alt: 'Polymorphism cover artwork showing an adult holding a baby',
    accent: '#8f583f',
  },
  {
    id: '5OHGpGAwjRjp4R1EcVnpGr',
    title: 'Undithembisile',
    releaseType: 'Single',
    year: 2025,
    image: '/assets/undithembisile-cover.jpg',
    spotifyUrl: 'https://open.spotify.com/album/5OHGpGAwjRjp4R1EcVnpGr?si=YIHGVBxTRdqeCW4dS9-yyQ',
    alt: 'Undithembisile cover artwork showing a black-and-white portrait of Internet Athi in a textured knitted sweater',
    accent: '#77736e',
  },
  {
    id: '1lbVmXMwuOaR7IGh4V47cQ',
    title: 'Nguwe',
    releaseType: 'Single',
    year: 2025,
    image: '/assets/nguwe-cover.jpg',
    spotifyUrl: 'https://open.spotify.com/album/1lbVmXMwuOaR7IGh4V47cQ?si=tRXqCMhsRsyCbYYlE_L1rQ',
    alt: 'Nguwe cover artwork showing a warm brown side-profile portrait of Internet Athi in a textured hat',
    accent: '#8b4d2e',
  },
  {
    id: '0EcfvhqnPSeJnKyeoVSypt',
    title: 'Wena',
    releaseType: 'Single',
    year: 2024,
    image: '/assets/wena-cover.jpg',
    spotifyUrl: 'https://open.spotify.com/album/0EcfvhqnPSeJnKyeoVSypt?si=emFWYvV4RyGOnWZHzH19RA',
    alt: 'Wena cover artwork showing a front-facing portrait of Internet Athi with layered faces in the background',
    accent: '#573025',
  },
]

export const musicVideos: MusicVideo[] = [
  {
    id: 'te8yGYWmy2I',
    title: 'Nguwe',
    credit: 'Internet Athi',
    thumbnail: '/assets/video-te8yGYWmy2I.jpg',
    youtubeUrl: 'https://youtu.be/te8yGYWmy2I',
  },
  {
    id: 'auutUpy8DUc',
    title: 'Wena',
    credit: 'Internet Athi',
    thumbnail: '/assets/video-auutUpy8DUc.jpg',
    youtubeUrl: 'https://youtu.be/auutUpy8DUc',
  },
  {
    id: 'OOw-SHzXUl8',
    title: 'Mna',
    credit: 'Internet Athi',
    thumbnail: '/assets/video-OOw-SHzXUl8.jpg',
    youtubeUrl: 'https://youtu.be/OOw-SHzXUl8',
  },
  {
    id: 'LJGKc8d48UQ',
    title: 'T(K)hetha, Pt. 1',
    credit: 'Internet Athi',
    thumbnail: '/assets/video-LJGKc8d48UQ.jpg',
    youtubeUrl: 'https://youtu.be/LJGKc8d48UQ',
  },
  {
    id: 'c46WMI1NR8o',
    title: 'Undithembisile',
    credit: 'Internet Athi feat. Mthokozisi Ngcobo',
    thumbnail: '/assets/video-c46WMI1NR8o.jpg',
    youtubeUrl: 'https://youtu.be/c46WMI1NR8o',
  },
]

export { liveEvents } from './liveEvents'

export const socialProfiles: SocialProfile[] = [
  { label: 'Instagram', url: 'https://instagram.com/internetathi' },
  { label: 'Spotify', url: 'https://open.spotify.com/artist/5ycDBJECG7YqvqtkstSFaa' },
  { label: 'Apple Music', url: 'https://music.apple.com/us/artist/internet-athi/1687103076' },
  { label: 'YouTube', url: 'https://www.youtube.com/channel/UCNb78W5Cg8_NPR6gSsEp7fA' },
  { label: 'SoundCloud', url: 'https://soundcloud.com/user-361955638' },
]

export const pressItems: PressItem[] = [
  {
    publication: 'GQ South Africa',
    title: 'Internet Athi on purpose, vulnerability, and the making of Polymorphism',
    date: '27 Feb 2026',
    url: 'https://gq.co.za/culture/entertainment/2026-02-27-internet-athi-on-purpose-vulnerability-and-the-making-of-his-debut-album-polymorphism/',
  },
  {
    publication: 'Glamour South Africa',
    title: 'Internet Athi releases soulful new single Nguwe',
    date: '29 Aug 2025',
    url: 'https://www.glamour.co.za/lifestyle/entertainment/new-music-friday-internet-athi-releases-soulful-new-single-nguwe-79b33945-9243-4957-9e79-3f4b7b213351',
  },
]
