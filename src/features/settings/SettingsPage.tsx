import { useEffect, useState } from 'react'
import { ErrorState, LoadingState } from '../../components/PageStates'
import {
  getSettings,
  resetLearningData,
  saveSettings,
} from '../../repositories/progressRepository'
import type { AppSettings, SortMode, ThemeMode } from '../../types'

type SettingsState =
  | { status: 'loading' }
  | { status: 'ready'; draft: AppSettings; savedAt: number | null }
  | { status: 'error'; message: string }

interface SettingsPageProps {
  onSettingsChange: (settings: AppSettings) => void
}

const sortModeLabels: Record<SortMode, string> = {
  review: '復習優先',
  random: 'ランダム',
  weak: '苦手優先',
  unlearned: '未学習優先',
}

const themeLabels: Record<ThemeMode, string> = {
  system: 'システム',
  light: 'ライト',
  dark: 'ダーク',
}

export function SettingsPage({ onSettingsChange }: SettingsPageProps) {
  const [state, setState] = useState<SettingsState>({ status: 'loading' })
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setState({ status: 'loading' })

      try {
        const settings = await getSettings()

        if (active) {
          setState({ status: 'ready', draft: settings, savedAt: null })
        }
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            message:
              error instanceof Error ? error.message : '不明なエラーです。',
          })
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [reloadKey])

  if (state.status === 'loading') {
    return <LoadingState label="設定を読み込み中" />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    )
  }

  function updateDraft(patch: Partial<AppSettings>) {
    setState((previous) => {
      if (previous.status !== 'ready') {
        return previous
      }

      return {
        ...previous,
        draft: { ...previous.draft, ...patch },
        savedAt: null,
      }
    })
  }

  async function handleSave() {
    if (state.status !== 'ready') {
      return
    }

    setIsSaving(true)

    try {
      await saveSettings(state.draft)
      onSettingsChange(state.draft)
      setState((previous) => {
        if (previous.status !== 'ready') {
          return previous
        }

        return { ...previous, savedAt: Date.now() }
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReset() {
    if (!window.confirm('保存済みの進捗とテスト履歴を削除します。')) {
      return
    }

    setIsResetting(true)

    try {
      await resetLearningData()
      setState((previous) => {
        if (previous.status !== 'ready') {
          return previous
        }

        return { ...previous, savedAt: Date.now() }
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Settings</p>
        <h1>設定</h1>
        <p className="lead">出題と表示の初期値を変更します。</p>
      </div>

      <section className="settings-grid">
        <div className="panel">
          <label className="field">
            <span>出題数</span>
            <input
              type="number"
              min="1"
              max="50"
              value={state.draft.questionsPerTest}
              onChange={(event) =>
                updateDraft({
                  questionsPerTest: Number(event.target.value),
                })
              }
            />
          </label>
          <label className="field">
            <span>出題順</span>
            <select
              value={state.draft.sortMode}
              onChange={(event) =>
                updateDraft({ sortMode: event.target.value as SortMode })
              }
            >
              {Object.entries(sortModeLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>テーマ</span>
            <select
              value={state.draft.theme}
              onChange={(event) =>
                updateDraft({ theme: event.target.value as ThemeMode })
              }
            >
              {Object.entries(themeLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="action-row action-row--right">
            {state.savedAt ? <span className="save-indicator">保存済み</span> : null}
            <button
              className="button button--primary"
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
            >
              保存
            </button>
          </div>
        </div>

        <div className="panel danger-panel">
          <div className="section-title">
            <span className="section-kicker">Data</span>
            <h2>学習履歴リセット</h2>
          </div>
          <p>
            IndexedDB に保存された単語別進捗、テスト結果、回答ログを削除します。
          </p>
          <button
            className="button button--danger"
            type="button"
            disabled={isResetting}
            onClick={() => void handleReset()}
          >
            リセット
          </button>
        </div>
      </section>
    </section>
  )
}
