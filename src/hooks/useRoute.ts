import { useCallback, useEffect, useState } from 'react'
import { parseRoute } from '../routes/router'

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname))

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseRoute(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((path: string) => {
    const url = new URL(path, window.location.href)
    window.history.pushState(null, '', url.pathname)
    setRoute(parseRoute(url.pathname))
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  return { route, navigate }
}
