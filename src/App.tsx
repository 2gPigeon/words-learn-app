import { useEffect, useMemo, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AppShell } from './app/AppShell'
import { RouterLink } from './components/RouterLink'
import { DeckDetailPage } from './features/decks/DeckDetailPage'
import { DecksPage } from './features/decks/DecksPage'
import { HistoryPage } from './features/history/HistoryPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { StudyPage } from './features/study/StudyPage'
import { ResultPage } from './features/test/ResultPage'
import { TestPage } from './features/test/TestPage'
import { useRoute } from './hooks/useRoute'
import { getSettings } from './repositories/progressRepository'
import { NavigationProvider } from './routes/NavigationContext'
import { decksPath } from './routes/router'
import { DEFAULT_SETTINGS, type AppSettings } from './types'
import './App.css'

function NotFoundPage() {
  return (
    <section className="state-panel">
      <h1>ページが見つかりません</h1>
      <RouterLink className="button button--primary" to={decksPath()}>
        単語帳へ
      </RouterLink>
    </section>
  )
}

function applyTheme(settings: AppSettings) {
  if (settings.theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
    return
  }

  document.documentElement.setAttribute('data-theme', settings.theme)
}

function App() {
  const { route, navigate } = useRoute()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()
  const navigationValue = useMemo(() => ({ navigate }), [navigate])

  useEffect(() => {
    let active = true

    async function loadSettings() {
      const stored = await getSettings()

      if (active) {
        setSettings(stored)
      }
    }

    void loadSettings()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    applyTheme(settings)
  }, [settings])

  function renderRoute() {
    switch (route.name) {
      case 'decks':
        return <DecksPage />
      case 'deckDetail':
        return <DeckDetailPage deckId={route.deckId} />
      case 'study':
        return <StudyPage deckId={route.deckId} />
      case 'test':
        return <TestPage deckId={route.deckId} />
      case 'result':
        return <ResultPage sessionId={route.sessionId} />
      case 'history':
        return <HistoryPage />
      case 'settings':
        return <SettingsPage onSettingsChange={setSettings} />
      case 'notFound':
        return <NotFoundPage />
    }
  }

  return (
    <NavigationProvider value={navigationValue}>
      <AppShell route={route}>{renderRoute()}</AppShell>
      {needRefresh ? (
        <div className="pwa-toast" role="status">
          <span>新しいバージョンがあります。</span>
          <button
            className="button button--primary"
            type="button"
            onClick={() => void updateServiceWorker(true)}
          >
            更新
          </button>
          <button
            className="button button--ghost"
            type="button"
            onClick={() => setNeedRefresh(false)}
          >
            あとで
          </button>
        </div>
      ) : null}
      {offlineReady ? (
        <div className="pwa-toast" role="status">
          <span>オフラインで利用できます。</span>
          <button
            className="button button--ghost"
            type="button"
            onClick={() => setOfflineReady(false)}
          >
            閉じる
          </button>
        </div>
      ) : null}
    </NavigationProvider>
  )
}

export default App
