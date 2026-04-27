import { useEffect, useMemo, useState } from 'react'
import { ErrorState, LoadingState } from '../../components/PageStates'
import { ProgressBar } from '../../components/ProgressBar'
import { RouterLink } from '../../components/RouterLink'
import { fetchIrregularVerbDeck } from '../../repositories/irregularVerbRepository'
import { getWordProgressForDeck } from '../../repositories/progressRepository'
import { openIrregularVerbPrintableTest } from '../../services/printableTest'
import { testPath } from '../../routes/router'
import type { IrregularVerbDeck, WordProgress } from '../../types'

type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; deck: IrregularVerbDeck; progress: WordProgress[] }
  | { status: 'error'; message: string }

interface IrregularVerbDetailPageProps {
  deckId: string
}

export function IrregularVerbDetailPage({
  deckId,
}: IrregularVerbDetailPageProps) {
  const [state, setState] = useState<DetailState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setState({ status: 'loading' })

      try {
        const [deck, progress] = await Promise.all([
          fetchIrregularVerbDeck(deckId),
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
              error instanceof Error
                ? error.message
                : 'Failed to load irregular verbs.',
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
    return <LoadingState label="Loading irregular verbs" />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    )
  }

  const readyState = state
  const studied = readyState.progress.filter((item) => item.lastAnsweredAt !== null)
    .length
  const weak = readyState.progress.filter(
    (item) => item.wrongCount > 0 && item.familiarity <= 1,
  ).length

  function handleOpenPrintableTest() {
    try {
      openIrregularVerbPrintableTest(readyState.deck)
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : '印刷テストを開けませんでした。',
      )
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Irregular verbs</p>
        <h1>{readyState.deck.title}</h1>
        <p className="lead">{readyState.deck.description}</p>
      </div>

      <section className="detail-layout">
        <div className="panel">
          <ProgressBar value={studied} max={readyState.deck.items.length} label="学習済み" />
          <dl className="detail-stats">
            <div>
              <dt>単語数</dt>
              <dd>{readyState.deck.items.length}</dd>
            </div>
            <div>
              <dt>苦手語</dt>
              <dd>{weak}</dd>
            </div>
            <div>
              <dt>デッキ版</dt>
              <dd>v{readyState.deck.version}</dd>
            </div>
          </dl>
          <div className="action-row">
            <RouterLink className="button button--primary" to={testPath(deckId)}>
              テストする
            </RouterLink>
            <button
              className="button button--ghost"
              type="button"
              onClick={handleOpenPrintableTest}
            >
              印刷テスト
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="section-title">
            <span className="section-kicker">Preview</span>
            <h2>活用プレビュー</h2>
          </div>
          <div className="word-list">
            {readyState.deck.items.slice(0, 12).map((item) => {
              const progress = progressMap.get(item.id)

              return (
                <div className="word-row" key={item.id}>
                  <div>
                    <strong>{item.word}</strong>
                    <span>{item.meaning}</span>
                  </div>
                  <em>
                    {item.past} / {item.pastParticiple}
                    <br />
                    {progress ? `Lv ${progress.familiarity}` : 'New'}
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
