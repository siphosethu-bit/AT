import type { LiveEvent } from '../content/types'

export type LiveEventStatus = 'upcoming' | 'ongoing' | 'past'

export const fallbackDuration = 2 * 60 * 60 * 1000

export function getLiveEventStatus(event: LiveEvent, now = Date.now()): LiveEventStatus {
  const start = Date.parse(event.startDateTime)
  const end = event.endDateTime ? Date.parse(event.endDateTime) : start + fallbackDuration

  if (now < start) return 'upcoming'
  if (now <= end) return 'ongoing'
  return 'past'
}

export function sortLiveEvents(events: LiveEvent[], direction: 'asc' | 'desc' = 'asc') {
  return [...events].sort((a, b) => {
    const difference = Date.parse(a.startDateTime) - Date.parse(b.startDateTime)
    return direction === 'asc' ? difference : -difference
  })
}

export interface LiveEventLocationGroup {
  key: string
  city: string
  latitude: number
  longitude: number
  events: LiveEvent[]
}

export function groupLiveEventsByLocation(events: LiveEvent[]): LiveEventLocationGroup[] {
  const groups = new Map<string, LiveEventLocationGroup>()

  for (const event of events) {
    const existing = groups.get(event.city)
    if (existing) {
      existing.events.push(event)
    } else {
      groups.set(event.city, {
        key: event.city,
        city: event.city,
        latitude: event.latitude,
        longitude: event.longitude,
        events: [event],
      })
    }
  }

  return [...groups.values()]
}

function dateParts(value: string, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  })
  return formatter.format(new Date(value))
}

export function formatLiveEventDate(event: LiveEvent) {
  const start = dateParts(event.startDateTime, event.timezone)
  if (!event.endDateTime) return start

  const end = dateParts(event.endDateTime, event.timezone)
  return start === end ? start : `${start} to ${end}`
}

export function formatLiveEventTime(event: LiveEvent) {
  const formatter = new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: event.timezone,
    timeZoneName: 'short',
  })
  const start = formatter.format(new Date(event.startDateTime))
  if (!event.endDateTime) return start

  const end = new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: event.timezone,
  }).format(new Date(event.endDateTime))
  return `${start} to ${end}`
}
