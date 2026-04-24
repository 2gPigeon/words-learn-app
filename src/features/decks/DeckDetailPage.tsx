import { useEffect, useMemo, useState } from 'react'
import { ErrorState, LoadingState } from '../../components/PageStates'
import { ProgressBar } from '../../components/ProgressBar'
import { RouterLink } from '../../components/RouterLink'
import { familiarityLabels } from '../../services/mastery'
import { fetchDeck } from '../../repositories/deckRepository'
import { getWordProgressForDeck } from '../../repositories/progressRepository'
import { studyPath, testPath } from '../../routes/router'
import type { Deck, WordProgress } from '../../types'

type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; deck: Deck; progress: WordProgress[] }
  | { status: 'error'; message: string }

interface DeckDetailPageProps {
  deckId: string
}

export function DeckDetailPage({ deckId }: DeckDetailPageProps) {
  const [state, setState] = useState<DetailState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setState({ status: 'loading' })

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
    return <LoadingState label="単語帳を読み込み中" />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    )
  }

  const studied = state.progress.filter((item) => item.lastAnsweredAt !== null)
    .length
  const weak = state.progress.filter(
    (item) => item.wrongCount > 0 && item.familiarity <= 1,
  ).length

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">{state.deck.lang}</p>
        <h1>{state.deck.title}</h1>
        <p className="lead">{state.deck.description}</p>
      </div>

      <section className="detail-layout">
        <div className="panel">
          <ProgressBar value={studied} max={state.deck.items.length} label="学習済み" />
          <dl className="detail-stats">
            <div>
              <dt>総問題数</dt>
              <dd>{state.deck.items.length}</dd>
            </div>
            <div>
              <dt>苦手語</dt>
              <dd>{weak}</dd>
            </div>
            <div>
              <dt>データ版</dt>
              <dd>v{state.deck.version}</dd>
            </div>
          </dl>
          <div className="action-row">
            <RouterLink className="button button--primary" to={studyPath(deckId)}>
              学習する
            </RouterLink>
            <RouterLink className="button button--secondary" to={testPath(deckId)}>
              テストする
            </RouterLink>
          </div>
        </div>

        <div className="panel">
          <div className="section-title">
            <span className="section-kicker">Words</span>
            <h2>収録単語</h2>
          </div>
          <div className="word-list">
            {state.deck.items.slice(0, 12).map((item) => {
              const progress = progressMap.get(item.id)

              return (
                <div className="word-row" key={item.id}>
                  <div>
                    <strong>{item.question}</strong>
                    <span>{item.answer}</span>
                  </div>
                  <em>
                    {familiarityLabels[progress?.familiarity ?? 0]}
                  </em>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </section>
  )
}
