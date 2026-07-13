import { useEffect, useState } from 'react'
import { ErrorState, LoadingState } from '../../components/PageStates'
import { RouterLink } from '../../components/RouterLink'
import { isIrregularVerbDeckId } from '../../features/irregular-verbs/constants'
import { formatDateTime, formatPercent } from '../../lib/utils/format'
import { fetchDeck, fetchDeckSummaries } from '../../repositories/deckRepository'
import { fetchIrregularVerbDeck } from '../../repositories/irregularVerbRepository'
import { getDeckProgressMap } from '../../repositories/progressRepository'
import { deckDetailPath, studyPath, testPath } from '../../routes/router'
import {
  openPrintableTestWindow,
  renderIrregularVerbPrintableTest,
  renderPrintableTest,
  showPrintableTestError,
} from '../../services/printableTest'
import type { DeckProgress, DeckSummary } from '../../types'

type DecksState =
  | { status: 'loading' }
  | {
      status: 'ready'
      decks: DeckSummary[]
      progressMap: Map<string, DeckProgress>
    }
  | { status: 'error'; message: string }

function getLastActivity(progress: DeckProgress | undefined) {
  if (!progress) {
    return 0
  }

  return Math.max(progress.lastStudiedAt, progress.lastTestedAt)
}

export function DecksPage() {
  const [state, setState] = useState<DecksState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [printingDeckIds, setPrintingDeckIds] = useState<Set<string>>(
    () => new Set(),
  )

  useEffect(() => {
    let active = true

    async function load() {
      setState({ status: 'loading' })

      try {
        const [decks, progressMap] = await Promise.all([
          fetchDeckSummaries(),
          getDeckProgressMap(),
        ])

        if (active) {
          setState({ status: 'ready', decks, progressMap })
        }
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'デッキを読み込めませんでした。',
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
    return <LoadingState label="デッキを読み込み中" />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    )
  }

  const totals = state.decks.reduce(
    (summary, deck) => {
      const progress = state.progressMap.get(deck.id)
      return {
        words: summary.words + deck.itemCount,
        studied: summary.studied + (progress?.totalStudied ?? 0),
        correct: summary.correct + (progress?.totalCorrect ?? 0),
        answered: summary.answered + (progress?.totalAnswered ?? 0),
      }
    },
    { words: 0, studied: 0, correct: 0, answered: 0 },
  )
  const recentDeck = [...state.decks].sort(
    (left, right) =>
      getLastActivity(state.progressMap.get(right.id)) -
      getLastActivity(state.progressMap.get(left.id)),
  )[0]

  async function handleOpenPrintableTest(deck: DeckSummary) {
    setPrintingDeckIds((current) => new Set(current).add(deck.id))
    let popup: Window | null = null

    try {
      popup = openPrintableTestWindow()

      if (isIrregularVerbDeckId(deck.id)) {
        const printableDeck = await fetchIrregularVerbDeck(deck.id)
        renderIrregularVerbPrintableTest(popup, printableDeck)
      } else {
        const printableDeck = await fetchDeck(deck.id)
        renderPrintableTest(popup, printableDeck)
      }
    } catch (error) {
      if (popup) {
        showPrintableTestError(popup)
      } else {
        window.alert(
          error instanceof Error
            ? error.message
            : '印刷ページを開けませんでした。',
        )
      }
    } finally {
      setPrintingDeckIds((current) => {
        const next = new Set(current)
        next.delete(deck.id)
        return next
      })
    }
  }

  return (
    <section className="page-stack">
      <div className="hero-band">
        <div>
          <p className="eyebrow">Local first vocabulary trainer</p>
          <h1>単語帳</h1>
          <p className="lead">
            通常単語と不規則動詞の両方を、この端末に進捗保存しながら学習できます。
          </p>
        </div>
        <div className="hero-metrics" aria-label="全体の学習状況">
          <div>
            <span>{state.decks.length}</span>
            <small>デッキ数</small>
          </div>
          <div>
            <span>
              {totals.studied}/{totals.words}
            </span>
            <small>学習済み</small>
          </div>
          <div>
            <span>{formatPercent(totals.correct, totals.answered)}</span>
            <small>正解率</small>
          </div>
        </div>
      </div>

      {recentDeck && getLastActivity(state.progressMap.get(recentDeck.id)) > 0 ? (
        <section className="resume-strip" aria-label="最近の学習">
          <div>
            <span className="section-kicker">Recent</span>
            <strong>{recentDeck.title}</strong>
            <small>
              {formatDateTime(getLastActivity(state.progressMap.get(recentDeck.id)))}
            </small>
          </div>
          <div className="action-row">
            {isIrregularVerbDeckId(recentDeck.id) ? (
              <>
                <RouterLink
                  className="button button--ghost"
                  to={deckDetailPath(recentDeck.id)}
                >
                  詳細
                </RouterLink>
                <RouterLink
                  className="button button--primary"
                  to={studyPath(recentDeck.id)}
                >
                  学習
                </RouterLink>
              </>
            ) : (
              <RouterLink
                className="button button--primary"
                to={studyPath(recentDeck.id)}
              >
                学習
              </RouterLink>
            )}
            <RouterLink className="button button--secondary" to={testPath(recentDeck.id)}>
              テスト
            </RouterLink>
          </div>
        </section>
      ) : null}

      <section className="deck-grid" aria-label="デッキ一覧">
        {state.decks.map((deck) => {
          const progress = state.progressMap.get(deck.id)
          const accuracy = formatPercent(
            progress?.totalCorrect ?? 0,
            progress?.totalAnswered ?? 0,
          )

          return (
            <article className="deck-card" key={deck.id}>
              <div className="deck-card__body">
                <span className="deck-version">v{deck.version}</span>
                <h2>{deck.title}</h2>
                <p>{deck.description}</p>
                <dl className="mini-stats">
                  <div>
                    <dt>語数</dt>
                    <dd>{deck.itemCount}</dd>
                  </div>
                  <div>
                    <dt>学習済み</dt>
                    <dd>{progress?.totalStudied ?? 0}</dd>
                  </div>
                  <div>
                    <dt>正解率</dt>
                    <dd>{accuracy}</dd>
                  </div>
                </dl>
              </div>
              <div className="deck-card__actions">
                <RouterLink
                  className="button button--ghost deck-card__wide-action"
                  to={deckDetailPath(deck.id)}
                >
                  詳細
                </RouterLink>
                <RouterLink className="button button--primary" to={studyPath(deck.id)}>
                  学習
                </RouterLink>
                <RouterLink className="button button--secondary" to={testPath(deck.id)}>
                  テスト
                </RouterLink>
                <button
                  className="button button--print deck-card__wide-action"
                  type="button"
                  disabled={printingDeckIds.has(deck.id)}
                  onClick={() => void handleOpenPrintableTest(deck)}
                >
                  {printingDeckIds.has(deck.id) ? '準備中…' : '印刷'}
                </button>
              </div>
            </article>
          )
        })}
      </section>
    </section>
  )
}
