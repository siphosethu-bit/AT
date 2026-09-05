import { SupabaseConflictError, supabaseInsert, supabaseSelect, supabaseUpdate } from './supabaseRest'

const TABLE = 'tour_requests'

export interface TourRequestRow {
  id: string
  community_member_id: string
  requested_city: string
  request_count: number
  notify_on_announcement: boolean
}

export async function findTourRequest(memberId: string, city: string): Promise<TourRequestRow | null> {
  const rows = await supabaseSelect<TourRequestRow>(
    TABLE,
    `select=id,community_member_id,requested_city,request_count,notify_on_announcement&community_member_id=eq.${memberId}&requested_city=eq.${encodeURIComponent(city)}&limit=1`,
  )
  return rows[0] ?? null
}

export async function bumpTourRequest(row: TourRequestRow, params: { notifyOnAnnouncement: boolean; nowIso: string }): Promise<void> {
  const patch: Record<string, unknown> = {
    request_count: row.request_count + 1,
    last_requested_at: params.nowIso,
    updated_at: params.nowIso,
  }
  if (params.notifyOnAnnouncement && !row.notify_on_announcement) {
    patch.notify_on_announcement = true
    patch.notify_consent_timestamp = params.nowIso
  }
  await supabaseUpdate(TABLE, `id=eq.${row.id}`, patch)
}

export async function insertTourRequest(record: Record<string, unknown>): Promise<TourRequestRow> {
  return supabaseInsert<TourRequestRow>(TABLE, record)
}

export { SupabaseConflictError }
