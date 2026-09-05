interface CommunitySuccessProps {
  firstName: string
  isDuplicate: boolean
  onClose: () => void
}

export function CommunitySuccess({ firstName, isDuplicate, onClose }: CommunitySuccessProps) {
  return (
    <div className="community-success">
      <p className="index-label">Internet Athi community</p>
      <h2 className="community-success__headline">
        {isDuplicate ? "You're already in." : "You're in."}
      </h2>
      <p className="community-success__welcome">
        Welcome to the Internet Athi community, {firstName}.
      </p>
      <p className="community-success__body">
        We&rsquo;ll let you know when something worth hearing, seeing or experiencing is coming your way.
      </p>
      <button type="button" className="action-link community-success__close" onClick={onClose}>
        Back to Internet Athi
      </button>
    </div>
  )
}
