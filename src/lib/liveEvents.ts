import type { LiveEvent } from '../content/types'

export type LiveEventStatus = 'upcoming' | 'ongoing' | 'past'

const fallbackDuration = 2 * 60 * 60 * 1000

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

function escapeCalendarText(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll(',', '\\,').replaceAll(';', '\\;').replaceAll('\n', '\\n')
}

function toCalendarDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function downloadLiveEventCalendar(event: LiveEvent) {
  const endDate = event.endDateTime
    ?? new Date(Date.parse(event.startDateTime) + fallbackDuration).toISOString()
  const location = event.address ?? `${event.venue}, ${event.city}, ${event.country}`
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Internet Athi//Live Programme//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-TIMEZONE:${event.timezone}`,
    'BEGIN:VEVENT',
    `UID:${event.id}@internetathi.com`,
    `DTSTAMP:${toCalendarDate(new Date().toISOString())}`,
    `DTSTART:${toCalendarDate(event.startDateTime)}`,
    `DTEND:${toCalendarDate(endDate)}`,
    `SUMMARY:${escapeCalendarText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeCalendarText(event.description)}` : '',
    `LOCATION:${escapeCalendarText(location)}`,
    event.ticketUrl ? `URL:${event.ticketUrl}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${event.slug}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
