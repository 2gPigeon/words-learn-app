import type { ReactNode } from 'react'
import { RouterLink } from '../components/RouterLink'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { decksPath, type AppRoute } from '../routes/router'

interface AppShellProps {
  route: AppRoute
  children: ReactNode
}

function isActive(route: AppRoute, target: 'decks' | 'history' | 'settings') {
  if (target === 'decks') {
    return (
      route.name === 'decks' ||
      route.name === 'deckDetail' ||
      route.name === 'study' ||
      route.name === 'test'
    )
  }

  return route.name === target
}

export function AppShell({ route, children }: AppShellProps) {
  const isOnline = useOnlineStatus()

  return (
    <div className="app-shell">
      <header className="app-header">
        <RouterLink className="brand" to={decksPath()} aria-label="ホーム">
          <span className="brand__mark" aria-hidden="true">
            W
          </span>
          <span>My Words</span>
        </RouterLink>
        <nav className="main-nav" aria-label="主要ナビゲーション">
          <RouterLink
            className={isActive(route, 'decks') ? 'active' : undefined}
            to={decksPath()}
          >
            単語帳
          </RouterLink>
          <RouterLink
            className={isActive(route, 'history') ? 'active' : undefined}
            to="/history"
          >
            履歴
          </RouterLink>
          <RouterLink
            className={isActive(route, 'settings') ? 'active' : undefined}
            to="/settings"
          >
            設定
          </RouterLink>
        </nav>
        <span className={`network-badge ${isOnline ? '' : 'is-offline'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </header>
      <main>{children}</main>
    </div>
  )
}
