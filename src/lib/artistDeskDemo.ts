import type { BookingEnquiry } from './booking'

// Fictional examples. Never merge these into responses from the private booking API.
export const sampleEnquiries: BookingEnquiry[] = [
  { id: 'demo-1', reference: 'SAMPLE-001', status: 'new', created_at: '2026-09-11T10:20:00Z', updated_at: '2026-09-11T10:20:00Z', private_notes: '', details: {
    who: 'Lerato · The Listening Room (sample)', email: 'lerato@example.com', venue: 'The Listening Room', city: 'Johannesburg', date: '24 October 2026', format: 'live ensemble', audience: '180', room: 'An intimate evening of music and conversation. A seated audience, warm lighting and room for a full ensemble. Please share the technical rider and an indicative fee.',
  } },
  { id: 'demo-2', reference: 'SAMPLE-002', status: 'new', created_at: '2026-09-10T13:00:00Z', updated_at: '2026-09-10T13:00:00Z', private_notes: '', details: {
    who: 'Sam · Common Ground (sample)', email: 'sam@example.com', venue: 'Common Ground Festival', city: 'Durban', date: '14 November 2026', format: 'festival set', audience: '1,200', room: 'A 45-minute sunset set on the garden stage. Production and backline provided by the festival.',
  } },
  { id: 'demo-3', reference: 'SAMPLE-003', status: 'reviewing', created_at: '2026-09-08T09:00:00Z', updated_at: '2026-09-09T09:00:00Z', private_notes: 'Sample note: request the room dimensions before quoting.', details: {
    who: 'Naledi · Studio Sundays (sample)', email: 'naledi@example.com', venue: 'Studio Sundays', city: 'Cape Town', date: '08 November 2026', format: 'cultural programme', audience: '90', room: 'A listening session for a community arts programme. Flexible dates in early November.',
  } },
  { id: 'demo-4', reference: 'SAMPLE-004', status: 'confirmed', created_at: '2026-09-02T09:00:00Z', updated_at: '2026-09-05T09:00:00Z', private_notes: 'Fictional booking for the interface preview.', details: {
    who: 'Alex · After Hours (sample)', email: 'alex@example.com', venue: 'After Hours', city: 'Cape Town', date: '03 October 2026', format: 'live ensemble', audience: '160', room: 'A full-length listening concert. Doors at 18:30, music from 19:30.',
  } },
]
