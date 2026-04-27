import { useCallback, useEffect, useState } from 'react'
import { decksPath, parseRoute } from '../routes/router'

function normalizePathname(pathname: string) {
  return pathname === '/' ? decksPath() : pathname
}

export function useRoute() {
  const [route, setRoute] = useState(() => {
    const pathname = normalizePathname(window.location.pathname)

    if (pathname !== window.location.pathname) {
      window.history.replaceState(null, '', pathname)
    }

    return parseRoute(pathname)
  })

  useEffect(() => {
    const handlePopState = () => {
      const pathname = normalizePathname(window.location.pathname)

      if (pathname !== window.location.pathname) {
        window.history.replaceState(null, '', pathname)
      }

      setRoute(parseRoute(pathname))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((path: string) => {
    const url = new URL(path, window.location.href)
    const pathname = normalizePathname(url.pathname)

    window.history.pushState(null, '', pathname)
    setRoute(parseRoute(pathname))
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  return { route, navigate }
}
