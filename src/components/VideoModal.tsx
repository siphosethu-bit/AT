import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { MusicVideo } from '../content/types'
import { ExternalLink } from './ExternalLink'

interface VideoModalProps {
  video: MusicVideo
  onClose: () => void
}

export function VideoModal({ video, onClose }: VideoModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const dialog = dialogRef.current
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'button, a[href], iframe, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.[0]?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !focusable?.length) return

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
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [onClose])

  return createPortal(
    <div className="video-modal" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="video-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="video-modal__header">
          <div>
            <p className="index-label">Now viewing</p>
            <h2 id="video-modal-title">{video.title}</h2>
          </div>
          <button type="button" className="video-modal__close" onClick={onClose}>
            Close <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="video-modal__frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
            title={`${video.title} by ${video.credit}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <ExternalLink className="text-link" href={video.youtubeUrl} showArrow>
          Watch directly on YouTube
        </ExternalLink>
      </div>
    </div>,
    document.body,
  )
}
