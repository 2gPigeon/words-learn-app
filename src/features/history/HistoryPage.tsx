import { useEffect, useState } from 'react'
import { ErrorState, LoadingState } from '../../components/PageStates'
import { RouterLink } from '../../components/RouterLink'
import { formatDateTime, formatPercent } from '../../lib/utils/format'
import { fetchDeck, fetchDeckSummaries } from '../../repositories/deckRepository'
import {
  getAllDeckProgress,
  getAllWordProgress,
  getRecentSessions,
} from '../../repositories/progressRepository'
import { familiarityLabels } from '../../services/mastery'
import { deckDetailPath, testPath } from '../../routes/router'
import type {
  DeckProgress,
  DeckSummary,
  SessionRecord,
  WordItem,
  WordProgress,
} from '../../types'

type HistoryState =
  | { status: 'loading' }
  | {
      status: 'ready'
      decks: DeckSummary[]
      deckProgress: DeckProgress[]
      wordProgress: WordProgress[]
      sessions: SessionRecord[]
      wordLookup: Map<string, WordItem>
    }
  | { status: 'error'; message: string }

function wordLookupKey(deckId: string, wordId: string) {
  return `${deckId}::${wordId}`
}

export function HistoryPage() {
  const [state, setState] = useState<HistoryState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setState({ status: 'loading' })

      try {
        const [decks, deckProgress, wordProgress, sessions] = await Promise.all([
          fetchDeckSummaries(),
          getAllDeckProgress(),
          getAllWordProgress(),
          getRecentSessions(30),
        ])
        const weakDeckIds = [
          ...new Set(
            wordProgress
              .filter((item) => item.wrongCount > 0 && item.familiarity <= 1)
              .map((item) => item.deckId),
          ),
        ]
        const loadedDecks = await Promise.all(
          weakDeckIds.map((deckId) =>
            fetchDeck(deckId).catch(() => {
              return null
            }),
          ),
        )
        const wordLookup = new Map<string, WordItem>()

        loadedDecks.forEach((deck) => {
          deck?.items.forEach((item) => {
            wordLookup.set(wordLookupKey(deck.id, item.id), item)
          })
        })

        if (active) {
          setState({
            status: 'ready',
            decks,
            deckProgress,
            wordProgress,
            sessions,
            wordLookup,
          })
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
    return <LoadingState label="履歴を読み込み中" />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    )
  }

  const deckProgressMap = new Map(
    state.deckProgress.map((progress) => [progress.deckId, progress]),
  )
  const deckTitleMap = new Map(state.decks.map((deck) => [deck.id, deck.title]))
  const totals = state.deckProgress.reduce(
    (summary, progress) => ({
      correct: summary.correct + progress.totalCorrect,
      answered: summary.answered + progress.totalAnswered,
      studied: summary.studied + progress.totalStudied,
    }),
    { correct: 0, answered: 0, studied: 0 },
  )
  const masteryCounts = [0, 1, 2, 3, 4, 5].map((level) => ({
    level,
    count: state.wordProgress.filter((item) => item.familiarity === level)
      .length,
  }))
  const maxMasteryCount = Math.max(1, ...masteryCounts.map((item) => item.count))
  const weakWords = state.wordProgress
    .filter((item) => item.wrongCount > 0 && item.familiarity <= 1)
    .sort((left, right) => {
      return (
        right.wrongCount - left.wrongCount ||
        left.familiarity - right.familiarity
      )
    })
    .slice(0, 12)

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">History</p>
        <h1>学習履歴</h1>
        <p className="lead">このブラウザに保存された進捗です。</p>
      </div>

      <section className="result-summary" aria-label="学習サマリー">
        <div>
          <span>{totals.studied}</span>
          <small>学習済み</small>
        </div>
        <div>
          <span>{totals.answered}</span>
          <small>回答数</small>
        </div>
        <div>
          <span>{formatPercent(totals.correct, totals.answered)}</span>
          <small>正答率</small>
        </div>
      </section>

      <section className="history-grid">
        <div className="panel">
          <div className="section-title">
            <span className="section-kicker">Decks</span>
            <h2>単語帳ごとの進捗</h2>
          </div>
          <div className="word-list">
            {state.decks.map((deck) => {
              const progress = deckProgressMap.get(deck.id)

              return (
                <div className="word-row word-row--wide" key={deck.id}>
                  <div>
                    <strong>{deck.title}</strong>
                    <span>
                      学習済み {progress?.totalStudied ?? 0}/{deck.itemCount}
                    </span>
                  </div>
                  <RouterLink className="text-link" to={deckDetailPath(deck.id)}>
                    開く
                  </RouterLink>
                </div>
              )
            })}
          </div>
        </div>

        <div className="panel">
          <div className="section-title">
            <span className="section-kicker">Mastery</span>
            <h2>習熟度分布</h2>
          </div>
          <div className="mastery-chart">
            {masteryCounts.map((item) => (
              <div className="mastery-row" key={item.level}>
                <span>{familiarityLabels[item.level as 0 | 1 | 2 | 3 | 4 | 5]}</span>
                <div>
                  <i style={{ width: `${(item.count / maxMasteryCount) * 100}%` }} />
                </div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="history-grid">
        <div className="panel">
          <div className="section-title">
            <span className="section-kicker">Weak</span>
            <h2>苦手語</h2>
          </div>
          {weakWords.length > 0 ? (
            <div className="word-list">
              {weakWords.map((progress) => {
                const word = state.wordLookup.get(
                  wordLookupKey(progress.deckId, progress.wordId),
                )

                return (
                  <div
                    className="word-row word-row--wide"
                    key={wordLookupKey(progress.deckId, progress.wordId)}
                  >
                    <div>
                      <strong>{word?.question ?? progress.wordId}</strong>
                      <span>{deckTitleMap.get(progress.deckId) ?? progress.deckId}</span>
                    </div>
                    <em>誤答 {progress.wrongCount}</em>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="empty-text">苦手語はまだありません。</p>
          )}
        </div>

        <div className="panel">
          <div className="section-title">
            <span className="section-kicker">Tests</span>
            <h2>テスト履歴</h2>
          </div>
          {state.sessions.length > 0 ? (
            <div className="word-list">
              {state.sessions.map((session) => (
                <div className="word-row word-row--wide" key={session.sessionId}>
                  <div>
                    <strong>{deckTitleMap.get(session.deckId) ?? session.deckId}</strong>
                    <span>{formatDateTime(session.finishedAt)}</span>
                  </div>
                  <RouterLink className="text-link" to={testPath(session.deckId)}>
                    {formatPercent(session.correct, session.total)}
                  </RouterLink>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">テスト履歴はまだありません。</p>
          )}
        </div>
      </section>
    </section>
  )
}
