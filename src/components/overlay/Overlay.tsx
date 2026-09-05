import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, type MutableRefObject, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

const EASE = [0.22, 1, 0.36, 1] as const

interface OverlayProps {
  isOpen: boolean
  onClose: () => void
  /** Element that opened the overlay; focus returns here on close. */
  triggerRef: MutableRefObject<HTMLElement | null>
  /** Element focused once the overlay has entered. Defaults to the dialog itself. */
  initialFocusRef?: RefObject<HTMLElement | null>
  labelledBy: string
  onExitComplete?: () => void
  children: ReactNode
}

/**
 * Shared accessible overlay shell: portal, darkened backdrop, focus trap, Escape-to-close, body
 * scroll lock, background inert, and a reduced-motion-aware enter/exit. Desktop renders a
 * centred dialog; mobile becomes a full-screen sheet via the .overlay-panel(--dialog) CSS.
 */
export function Overlay({ isOpen, onClose, triggerRef, initialFocusRef, labelledBy, onExitComplete, children }: OverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!isOpen) return

    const trigger = triggerRef.current
    const root = document.getElementById('root')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root?.setAttribute('inert', '')

    const focusTimer = window.setTimeout(
      () => (initialFocusRef?.current ?? dialogRef.current)?.focus(),
      reducedMotion ? 0 : 260,
    )

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      root?.removeAttribute('inert')
      window.requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus()
      })
    }
  }, [isOpen, onClose, reducedMotion, triggerRef, initialFocusRef])

  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {isOpen ? (
        <motion.div
          className="overlay-panel"
          role="presentation"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.26, ease: EASE }}
        >
          <motion.div
            ref={dialogRef}
            className="overlay-panel__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: reducedMotion ? 0 : 0.36, ease: EASE }}
          >
            <button type="button" className="overlay-panel__close" onClick={onClose}>
              Close <span aria-hidden="true">×</span>
            </button>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
