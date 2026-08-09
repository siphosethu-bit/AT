/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type PropsWithChildren,
} from 'react'

interface RouterValue {
  pathname: string
  navigate: (to: string, options?: { replace?: boolean }) => void
}

const RouterContext = createContext<RouterValue | null>(null)

function currentPath() {
  const path = window.location.pathname.replace(/\/+$/, '')
  return path || '/'
}

export function RouterProvider({ children }: PropsWithChildren) {
  const [pathname, setPathname] = useState(currentPath)

  useEffect(() => {
    const handlePopState = () => setPathname(currentPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const value = useMemo<RouterValue>(() => ({
    pathname,
    navigate: (to, options) => {
      const nextPath = to.replace(/\/+$/, '') || '/'
      if (nextPath === currentPath()) return
      window.history[options?.replace ? 'replaceState' : 'pushState']({}, '', nextPath)
      setPathname(nextPath)
    },
  }), [pathname])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter() {
  const context = useContext(RouterContext)
  if (!context) throw new Error('useRouter must be used inside RouterProvider')
  return context
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { children, onClick, target, to, ...props },
  ref,
) {
  const { navigate } = useRouter()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target === '_blank'
    ) return

    event.preventDefault()
    navigate(to)
  }

  return (
    <a ref={ref} href={to} target={target} onClick={handleClick} {...props}>
      {children}
    </a>
  )
})

interface NavLinkProps extends Omit<LinkProps, 'className'> {
  className?: string | ((state: { isActive: boolean }) => string)
}

export function NavLink({ className, to, ...props }: NavLinkProps) {
  const { pathname } = useRouter()
  const isActive = pathname === to
  const resolvedClassName = typeof className === 'function' ? className({ isActive }) : className
  return <Link to={to} className={resolvedClassName} aria-current={isActive ? 'page' : undefined} {...props} />
}
