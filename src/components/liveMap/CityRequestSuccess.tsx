import { ExternalLink } from '../ExternalLink'
import type { TourRequestResponse } from '../../lib/tourRequest/types'

interface CityRequestSuccessProps {
  response: TourRequestResponse
  notifyRequested: boolean
  onClose: () => void
}

export function CityRequestSuccess({ response, notifyRequested, onClose }: CityRequestSuccessProps) {
  if (response.status === 'existing_show' && response.existingShow) {
    const show = response.existingShow
    return (
      <div className="community-success">
        <p className="index-label">Internet Athi community</p>
        <h2 className="community-success__headline">Athi is already coming to {show.city}.</h2>
        <p className="community-success__welcome">{show.title}</p>
        <p className="community-success__body">
          {show.dateLabel} — {show.venue}
        </p>
        <div className="tour-request-success__actions">
          {show.ticketUrl ? (
            <ExternalLink className="action-link action-link--primary" href={show.ticketUrl}>
              Get tickets
            </ExternalLink>
          ) : null}
          <button type="button" className="action-link community-success__close" onClick={onClose}>
            Back to live programme
          </button>
        </div>
      </div>
    )
  }

  const isDuplicate = response.status === 'duplicate'

  return (
    <div className="community-success">
      <p className="index-label">Internet Athi community</p>
      <h2 className="community-success__headline">
        {isDuplicate ? `You've already put ${response.city} on the map.` : `You put ${response.city} on the map.`}
      </h2>
      <p className="community-success__body">
        {isDuplicate
          ? 'We still know you want Athi there.'
          : 'We now know you want to see Internet Athi there.'}
        {notifyRequested ? " We'll keep you in the loop if something is announced nearby." : ''}
      </p>
      <button type="button" className="action-link community-success__close" onClick={onClose}>
        Back to live programme
      </button>
    </div>
  )
}
