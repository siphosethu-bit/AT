import type { AnchorHTMLAttributes, PropsWithChildren } from 'react'

interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  showArrow?: boolean
}

export function ExternalLink({
  children,
  href,
  showArrow = false,
  ...props
}: PropsWithChildren<ExternalLinkProps>) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
      {children}
      {showArrow ? <span aria-hidden="true"> ↗</span> : null}
    </a>
  )
}
