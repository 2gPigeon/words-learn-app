import { createContext, useContext } from 'react'

interface NavigationContextValue {
  navigate: (path: string) => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

export const NavigationProvider = NavigationContext.Provider

export function useNavigation() {
  const value = useContext(NavigationContext)

  if (!value) {
    throw new Error('NavigationProvider が見つかりません。')
  }

  return value
}
