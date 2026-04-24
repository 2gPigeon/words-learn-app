import { useEffect, useMemo, useState } from 'react'
import { ErrorState, LoadingState } from '../../components/PageStates'
import { ProgressBar } from '../../components/ProgressBar'
import { RouterLink } from '../../components/RouterLink'
import { formatDateTime } from '../../lib/utils/format'
import { fetchDeck } from '../../repositories/deckRepository'
import {
  getWordProgressForDeck,
  recordStudyRating,
} from '../../repositories/progressRepository'
import { deckDetailPath, testPath } from '../../routes/router'
import { familiarityLabels } from '../../services/mastery'
import type { Deck, FamiliarityRating, WordProgress } from '../../types'

type StudyState =
  | { status: 'loading' }
  | { status: 'ready'; deck: Deck; progress: WordProgress[] }
  | { status: 'error'; message: string }

interface StudyPageProps {
  deckId: string
}

function mergeProgress(
  progress: WordProgress[],
  updated: WordProgress,
): WordProgress[] {
  const exists = progress.some((item) => item.wordId === updated.wordId)

  if (!exists) {
    return [...progress, updated]
  }

  return progress.map((item) => (item.wordId === updated.wordId ? updated : item))
}

export function StudyPage({ deckId }: StudyPageProps) {
  const [state, setState] = useState<StudyState>({ status: 'loading' })
  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setState({ status: 'loading' })
      setIndex(0)
      setShowAnswer(false)

      try {
        const [deck, progress] = await Promise.all([
          fetchDeck(deckId),
          getWordProgressForDeck(deckId),
        ])

        if (active) {
          setState({ status: 'ready', deck, progress })
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
  }, [deckId, reloadKey])

  const progressMap = useMemo(() => {
    if (state.status !== 'ready') {
      return new Map<string, WordProgress>()
    }

    return new Map(state.progress.map((item) => [item.wordId, item]))
  }, [state])

  if (state.status === 'loading') {
    return <LoadingState label="学習データを読み込み中" />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    )
  }

  if (state.deck.items.length === 0) {
    return <ErrorState title="単語がありません" message="単語帳データを確認してください。" />
  }

  const current = state.deck.items[index]
  const currentProgress = progressMap.get(current.id)
  const studied = state.progress.filter((item) => item.lastAnsweredAt !== null)
    .length

  async function handleRating(rating: FamiliarityRating) {
    if (state.status !== 'ready') {
      return
    }

    setIsSaving(true)

    try {
      const updated = await recordStudyRating(deckId, current.id, rating)
      setState((previous) => {
        if (previous.status !== 'ready') {
          return previous
        }

        return {
          ...previous,
          progress: mergeProgress(previous.progress, updated),
        }
      })
      setShowAnswer(false)
      setIndex((value) => Math.min(value + 1, state.deck.items.length - 1))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading page-heading--split">
        <div>
          <p className="eyebrow">Study</p>
          <h1>{state.deck.title}</h1>
        </div>
        <div className="action-row">
          <RouterLink className="button button--ghost" to={deckDetailPath(deckId)}>
            詳細
          </RouterLink>
          <RouterLink className="button button--secondary" to={testPath(deckId)}>
            テスト
          </RouterLink>
        </div>
      </div>

      <ProgressBar value={index + 1} max={state.deck.items.length} label="表示位置" />

      <article className="study-card">
        <div className="study-card__meta">
          <span>{current.tags?.join(', ') || 'No tag'}</span>
          <strong>{familiarityLabels[currentProgress?.familiarity ?? 0]}</strong>
        </div>
        <h2>{current.question}</h2>
        <div className={`answer-box ${showAnswer ? 'is-open' : ''}`}>
          <span>答え</span>
          <strong>{showAnswer ? current.answer : '••••••'}</strong>
          {showAnswer && current.note ? <p>{current.note}</p> : null}
        </div>
        <button
          className="button button--primary"
          type="button"
          onClick={() => setShowAnswer((value) => !value)}
        >
          {showAnswer ? '答えを隠す' : '答えを見る'}
        </button>
      </article>

      <section className="study-controls" aria-label="自己評価">
        <button
          className="rating-button rating-button--hard"
          type="button"
          disabled={isSaving}
          onClick={() => void handleRating('hard')}
        >
          苦手
        </button>
        <button
          className="rating-button rating-button--unsure"
          type="button"
          disabled={isSaving}
          onClick={() => void handleRating('unsure')}
        >
          あやしい
        </button>
        <button
          className="rating-button rating-button--remembered"
          type="button"
          disabled={isSaving}
          onClick={() => void handleRating('remembered')}
        >
          覚えた
        </button>
      </section>

      <div className="pager-row">
        <button
          className="button button--ghost"
          type="button"
          disabled={index === 0}
          onClick={() => {
            setShowAnswer(false)
            setIndex((value) => Math.max(0, value - 1))
          }}
        >
          前へ
        </button>
        <span>
          学習済み {studied}/{state.deck.items.length}
          {currentProgress?.nextReviewAt
            ? ` / 次回 ${formatDateTime(currentProgress.nextReviewAt)}`
            : ''}
        </span>
        <button
          className="button button--ghost"
          type="button"
          disabled={index === state.deck.items.length - 1}
          onClick={() => {
            setShowAnswer(false)
            setIndex((value) => Math.min(state.deck.items.length - 1, value + 1))
          }}
        >
          次へ
        </button>
      </div>
    </section>
  )
}
