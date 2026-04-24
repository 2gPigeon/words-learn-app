import { useEffect, useMemo, useState } from 'react'
import { ErrorState, LoadingState } from '../../components/PageStates'
import { RouterLink } from '../../components/RouterLink'
import { formatDateTime, formatPercent } from '../../lib/utils/format'
import { fetchDeck } from '../../repositories/deckRepository'
import {
  getAnswersForSession,
  getSession,
} from '../../repositories/progressRepository'
import { studyPath, testPath } from '../../routes/router'
import type { AnswerRecord, Deck, SessionRecord, WordItem } from '../../types'

type ResultState =
  | { status: 'loading' }
  | {
      status: 'ready'
      session: SessionRecord
      deck: Deck
      answers: AnswerRecord[]
    }
  | { status: 'error'; message: string }

interface ResultPageProps {
  sessionId: string
}

export function ResultPage({ sessionId }: ResultPageProps) {
  const [state, setState] = useState<ResultState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setState({ status: 'loading' })

      try {
        const session = await getSession(sessionId)

        if (!session) {
          throw new Error('テスト結果が見つかりません。')
        }

        const [deck, answers] = await Promise.all([
          fetchDeck(session.deckId),
          getAnswersForSession(sessionId),
        ])

        if (active) {
          setState({ status: 'ready', session, deck, answers })
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
  }, [sessionId, reloadKey])

  const wordMap = useMemo(() => {
    if (state.status !== 'ready') {
      return new Map<string, WordItem>()
    }

    return new Map(state.deck.items.map((item) => [item.id, item]))
  }, [state])

  if (state.status === 'loading') {
    return <LoadingState label="結果を読み込み中" />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    )
  }

  const wrongAnswers = state.answers.filter((answer) => !answer.isCorrect)
  const scoreLabel = `${state.session.correct}/${state.session.total}`

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">{formatDateTime(state.session.finishedAt)}</p>
        <h1>テスト結果</h1>
        <p className="lead">{state.deck.title}</p>
      </div>

      <section className="result-summary" aria-label="テスト結果">
        <div>
          <span>{scoreLabel}</span>
          <small>正答数</small>
        </div>
        <div>
          <span>{formatPercent(state.session.correct, state.session.total)}</span>
          <small>正答率</small>
        </div>
        <div>
          <span>{state.session.wrong}</span>
          <small>不正解</small>
        </div>
      </section>

      <div className="action-row">
        <RouterLink
          className="button button--primary"
          to={testPath(state.session.deckId)}
        >
          再テスト
        </RouterLink>
        <RouterLink
          className="button button--secondary"
          to={studyPath(state.session.deckId)}
        >
          学習に戻る
        </RouterLink>
      </div>

      <section className="panel">
        <div className="section-title">
          <span className="section-kicker">Review</span>
          <h2>間違えた単語</h2>
        </div>
        {wrongAnswers.length > 0 ? (
          <div className="word-list">
            {wrongAnswers.map((answer) => {
              const word = wordMap.get(answer.wordId)

              return (
                <div className="word-row word-row--wide" key={answer.answerId}>
                  <div>
                    <strong>{word?.question ?? answer.wordId}</strong>
                    <span>正答: {word?.answer ?? '-'}</span>
                  </div>
                  <em>回答: {answer.userAnswer ?? '-'}</em>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="empty-text">今回の不正解はありません。</p>
        )}
      </section>
    </section>
  )
}
