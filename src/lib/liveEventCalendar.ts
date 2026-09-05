import type { LiveEvent } from '../content/types'
import { fallbackDuration } from './liveEvents'

function escapeCalendarText(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll(',', '\\,').replaceAll(';', '\\;').replaceAll('\n', '\\n')
}

function toCalendarDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function downloadLiveEventCalendar(event: LiveEvent) {
  const endDate = event.endDateTime
    ?? new Date(Date.parse(event.startDateTime) + fallbackDuration).toISOString()
  const location = `${event.venue}, ${event.city}, ${event.country}`
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
    `SUMMARY:${escapeCalendarText(`Internet Athi at ${event.title}`)}`,
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
