import { useRef, useState } from 'react'
import { useCommunity } from '../../context/CommunityContext'
import type { CommunitySignupStatus } from '../../lib/community/types'
import { Overlay } from '../overlay/Overlay'
import { CommunityForm } from './CommunityForm'
import { CommunitySuccess } from './CommunitySuccess'

export function CommunityPanel() {
  const { isOpen, closePanel, signupContext, triggerRef } = useCommunity()
  const [result, setResult] = useState<{ firstName: string; status: CommunitySignupStatus } | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const handleSuccess = (firstName: string, status: CommunitySignupStatus) => {
    setResult({ firstName, status })
  }

  return (
    <Overlay
      isOpen={isOpen}
      onClose={closePanel}
      triggerRef={triggerRef}
      initialFocusRef={firstFieldRef}
      labelledBy="community-panel-title"
      onExitComplete={() => setResult(null)}
    >
      {result ? (
        <CommunitySuccess
          firstName={result.firstName}
          isDuplicate={result.status === 'duplicate'}
          onClose={closePanel}
        />
      ) : (
        <>
          <p className="index-label">Internet Athi community</p>
          <h2 id="community-panel-title" className="overlay-panel__title">
            Stay connected<br />beyond the music.
          </h2>
          <p className="overlay-panel__lede">
            Join the Internet Athi community for new music, live shows, early announcements and special moments along the journey.
          </p>
          <CommunityForm signupContext={signupContext} onSuccess={handleSuccess} firstFieldRef={firstFieldRef} />
        </>
      )}
    </Overlay>
  )
}
