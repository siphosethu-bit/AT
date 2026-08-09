import type { LiveEvent } from './types'

const eventData = [
  {
    id: 'eziko-heritage-2026',
    slug: 'eziko-heritage-festival-2026',
    title: 'EZIKO Heritage Festival: Umgidi Wabantu',
    startDateTime: '2026-08-08T14:00:00+02:00',
    endDateTime: '2026-08-08T23:00:00+02:00',
    timezone: 'Africa/Johannesburg',
    venue: 'Hamburg Sports Ground',
    address: 'Hamburg Sports Ground, Hamburg, Eastern Cape, 5641',
    city: 'Hamburg',
    region: 'Eastern Cape',
    country: 'South Africa',
    latitude: -33.29042,
    longitude: 27.4747,
    lineup: ['Dumza Maswana', 'Mandisi Dyantyis', 'The Soil', 'Internet Athi', 'Zawadi Yamungu', 'Joliza'],
    billing: 'Dumza Maswana and friends live concert',
    description: 'The second-day live concert at the inaugural gathering for Indigenous culture, music and community.',
    ticketUrl: 'https://www.webtickets.co.za/v2/event.aspx?itemid=1596790070',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-33.29042%2C27.4747',
    sourceUrl: 'https://www.bandsintown.com/?came_from=281&latitude=-33.29042&longitude=27.4747',
  },
  {
    id: 'heat-festival-2026',
    slug: 'internet-athi-mishy-kope-heat-festival-2026',
    title: 'Internet Athi and Mishy Kope',
    startDateTime: '2026-08-15T19:00:00+02:00',
    endDateTime: '2026-08-15T22:00:00+02:00',
    timezone: 'Africa/Johannesburg',
    venue: 'Central Methodist Mission',
    address: '44 Long Street, Cape Town City Centre, Cape Town, 8000',
    city: 'Cape Town',
    region: 'Western Cape',
    country: 'South Africa',
    latitude: -33.9214068,
    longitude: 18.4202492,
    lineup: ['Internet Athi', 'Mishy Kope'],
    billing: 'Heat Festival x Quiet Life Co',
    description: 'An evening of soul, storytelling and song with full live performances from both artists.',
    ticketUrl: 'https://www.quicket.co.za/events/385409-internet-athi-mishy-kope/',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-33.9214068%2C18.4202492',
    sourceUrl: 'https://www.quicket.co.za/events/385409-internet-athi-mishy-kope/',
  },
  {
    id: 'joy-of-jazz-2026',
    slug: 'standard-bank-joy-of-jazz-2026',
    title: 'Standard Bank Joy of Jazz',
    startDateTime: '2026-09-25T18:30:00+02:00',
    endDateTime: '2026-09-25T23:59:00+02:00',
    timezone: 'Africa/Johannesburg',
    venue: 'Sandton Convention Centre',
    address: '161 Maude Street, Sandown, Sandton, Johannesburg, 2196',
    city: 'Johannesburg',
    region: 'Gauteng',
    country: 'South Africa',
    latitude: -26.1060278,
    longitude: 28.0533611,
    lineup: ['Internet Athi'],
    billing: 'Mbira Stage',
    description: 'Internet Athi joins the 2026 festival programme in Johannesburg.',
    ticketUrl: 'https://www.ticketmaster.co.za/event/432289161?language=en-za',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-26.1060278%2C28.0533611',
    sourceUrl: 'https://www.ticketmaster.co.za/event/432289161?language=en-za',
  },
  {
    id: 'black-power-station-2026',
    slug: 'internet-athi-black-power-station-2026',
    title: 'Internet Athi live at The Black Power Station',
    startDateTime: '2026-04-18T19:00:00+02:00',
    endDateTime: '2026-04-18T23:00:00+02:00',
    timezone: 'Africa/Johannesburg',
    venue: 'The Black Power Station',
    address: 'Industrial Area, Rautenbach Road, Makhanda, 6139',
    city: 'Makhanda',
    region: 'Eastern Cape',
    country: 'South Africa',
    latitude: -33.3154625,
    longitude: 26.4961317,
    lineup: ['Internet Athi'],
    description: 'A full-band Internet Athi performance in Makhanda.',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-33.3154625%2C26.4961317',
    sourceUrl: 'https://www.bandsintown.com/e/108122039?app_id=spt_feed&came_from=281',
  },
  {
    id: 'home-of-sound-2026',
    slug: 'home-of-sound-festival-2026',
    title: 'Home of Sound Festival',
    startDateTime: '2026-03-29T12:00:00+02:00',
    endDateTime: '2026-03-29T23:00:00+02:00',
    timezone: 'Africa/Johannesburg',
    venue: 'The Outlore Base',
    address: '2nd Floor, 80 Hout Street, Cape Town, 8000',
    city: 'Cape Town',
    region: 'Western Cape',
    country: 'South Africa',
    latitude: -33.920785,
    longitude: 18.419329,
    lineup: ['Internet Athi'],
    description: 'Internet Athi on the Home of Sound Festival programme.',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-33.920785%2C18.419329',
    sourceUrl: 'https://www.bandsintown.com/f/210941?came_from=253',
  },
  {
    id: 'soulful-soiree-2026',
    slug: 'soulful-soiree-pacofs-2026',
    title: 'The Soulful Soiree',
    startDateTime: '2026-03-28T18:00:00+02:00',
    endDateTime: '2026-03-28T23:00:00+02:00',
    timezone: 'Africa/Johannesburg',
    venue: 'PACOFS',
    address: '12 First Avenue, Westdene, Bloemfontein, 9301',
    city: 'Bloemfontein',
    region: 'Free State',
    country: 'South Africa',
    latitude: -29.1160445,
    longitude: 26.2128271,
    lineup: ['Internet Athi'],
    description: 'Internet Athi at the Performing Arts Centre of the Free State.',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-29.1160445%2C26.2128271',
    sourceUrl: 'https://www.bandsintown.com/a/15609392-internet-athi?came_from=253',
  },
] satisfies LiveEvent[]

function validateLiveEvents(events: LiveEvent[]) {
  const ids = new Set<string>()
  const slugs = new Set<string>()

  for (const event of events) {
    if (ids.has(event.id) || slugs.has(event.slug)) {
      throw new Error(`Duplicate live event id or slug: ${event.id}`)
    }
    if (!Number.isFinite(Date.parse(event.startDateTime))) {
      throw new Error(`Invalid start date for live event: ${event.id}`)
    }
    if (event.endDateTime && Date.parse(event.endDateTime) < Date.parse(event.startDateTime)) {
      throw new Error(`End date precedes start date for live event: ${event.id}`)
    }
    if (event.latitude < -90 || event.latitude > 90 || event.longitude < -180 || event.longitude > 180) {
      throw new Error(`Invalid coordinates for live event: ${event.id}`)
    }
    try {
      new Intl.DateTimeFormat('en-ZA', { timeZone: event.timezone }).format()
    } catch {
      throw new Error(`Invalid timezone for live event: ${event.id}`)
    }
    ids.add(event.id)
    slugs.add(event.slug)
  }
}

validateLiveEvents(eventData)

export const liveEvents: LiveEvent[] = eventData
