/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'

interface TourRequestContextValue {
  isOpen: boolean
  openPanel: (trigger: HTMLElement | null, prefillCity?: string) => void
  closePanel: () => void
  prefillCity: string | null
  triggerRef: React.MutableRefObject<HTMLElement | null>
}

const TourRequestContext = createContext<TourRequestContextValue | null>(null)

/** Query params a QR code / campaign link can use to land directly on a city-focused request, e.g. /live?city=durban. */
const CITY_QUERY_PARAMS = ['city', 'request']

export function TourRequestProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false)
  const [prefillCity, setPrefillCity] = useState<string | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const hasCheckedAutoOpen = useRef(false)

  useEffect(() => {
    if (hasCheckedAutoOpen.current) return
    hasCheckedAutoOpen.current = true
    if (window.location.pathname.replace(/\/+$/, '') !== '/live') return

    const params = new URLSearchParams(window.location.search)
    const rawCity = CITY_QUERY_PARAMS.map((key) => params.get(key)).find(Boolean)
    if (!rawCity) return

    const decoded = decodeURIComponent(rawCity).replace(/[-_]/g, ' ').trim()
    if (!decoded) return

    const normalized = decoded.replace(/\b\w/g, (letter) => letter.toUpperCase())
    setPrefillCity(normalized)
    setIsOpen(true)
  }, [])

  const openPanel = useCallback((trigger: HTMLElement | null, city?: string) => {
    triggerRef.current = trigger
    if (city) setPrefillCity(city)
    setIsOpen(true)
  }, [])

  const closePanel = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo<TourRequestContextValue>(
    () => ({ isOpen, openPanel, closePanel, prefillCity, triggerRef }),
    [isOpen, openPanel, closePanel, prefillCity],
  )

  return <TourRequestContext.Provider value={value}>{children}</TourRequestContext.Provider>
}

export function useTourRequest() {
  const context = useContext(TourRequestContext)
  if (!context) throw new Error('useTourRequest must be used inside TourRequestProvider')
  return context
}
