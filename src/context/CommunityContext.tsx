/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { captureCampaignFromLocation } from '../lib/community/campaign'
import type { CommunitySignupContext } from '../lib/community/types'

interface CommunityContextValue {
  isOpen: boolean
  openPanel: (trigger: HTMLElement | null, context: CommunitySignupContext) => void
  closePanel: () => void
  signupContext: CommunitySignupContext
  triggerRef: React.MutableRefObject<HTMLElement | null>
}

const CommunityContext = createContext<CommunityContextValue | null>(null)

export function CommunityProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false)
  const [signupContext, setSignupContext] = useState<CommunitySignupContext>('footer-cta')
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    captureCampaignFromLocation()
  }, [])

  const openPanel = useCallback((trigger: HTMLElement | null, context: CommunitySignupContext) => {
    triggerRef.current = trigger
    setSignupContext(context)
    setIsOpen(true)
  }, [])

  const closePanel = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo<CommunityContextValue>(
    () => ({ isOpen, openPanel, closePanel, signupContext, triggerRef }),
    [isOpen, openPanel, closePanel, signupContext],
  )

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
}

export function useCommunity() {
  const context = useContext(CommunityContext)
  if (!context) throw new Error('useCommunity must be used inside CommunityProvider')
  return context
}
