import { useEffect, useMemo, useState } from 'react'
import { ErrorState, LoadingState } from '../../components/PageStates'
import { RouterLink } from '../../components/RouterLink'
import { formatPercent } from '../../lib/utils/format'
import { fetchIrregularVerbDeck } from '../../repositories/irregularVerbRepository'
import {
  getAnswersForSession,
  getSession,
} from '../../repositories/progressRepository'
import {
  parseIrregularVerbAnswer,
} from '../../services/irregularVerbGrading'
import { deckDetailPath, testPath } from '../../routes/router'
import type { AnswerRecord, IrregularVerbDeck, IrregularVerbItem, SessionRecord } from '../../types'

type ResultState =
  | { status: 'loading' }
  | {
      status: 'ready'
      session: SessionRecord
      deck: IrregularVerbDeck
      answers: AnswerRecord[]
    }
  | { status: 'error'; message: string }

interface IrregularVerbResultPageProps {
  sessionId: string
}

export function IrregularVerbResultPage({
  sessionId,
}: IrregularVerbResultPageProps) {
  const [state, setState] = useState<ResultState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setState({ status: 'loading' })

      try {
        const session = await getSession(sessionId)

        if (!session) {
          throw new Error('Test session was not found.')
        }

        const [deck, answers] = await Promise.all([
          fetchIrregularVerbDeck(session.deckId),
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
              error instanceof Error
                ? error.message
                : 'Failed to load irregular verb results.',
          })
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [sessionId, reloadKey])

  const itemMap = useMemo(() => {
    if (state.status !== 'ready') {
      return new Map<string, IrregularVerbItem>()
    }

    return new Map(state.deck.items.map((item) => [item.id, item]))
  }, [state])

  if (state.status === 'loading') {
    return <LoadingState label="Loading irregular verb results" />
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
        <p className="eyebrow">Irregular verbs</p>
        <h1>テスト結果</h1>
        <p className="lead">{state.deck.title}</p>
      </div>

      <section className="result-summary" aria-label="テスト結果">
        <div>
          <span>{scoreLabel}</span>
          <small>正解数</small>
        </div>
        <div>
          <span>{formatPercent(state.session.correct, state.session.total)}</span>
          <small>正解率</small>
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
          もう一度テスト
        </RouterLink>
        <RouterLink
          className="button button--secondary"
          to={deckDetailPath(state.session.deckId)}
        >
          詳細へ戻る
        </RouterLink>
      </div>

      <section className="panel">
        <div className="section-title">
          <span className="section-kicker">Review</span>
          <h2>間違えた問題</h2>
        </div>
        {wrongAnswers.length > 0 ? (
          <div className="word-list">
            {wrongAnswers.map((answer) => {
              const item = itemMap.get(answer.wordId)
              const userAnswer = parseIrregularVerbAnswer(answer.userAnswer)

              return (
                <div className="word-row word-row--wide" key={answer.answerId}>
                  <div>
                    <strong>{item?.meaning ?? answer.wordId}</strong>
                    <span>
                      正答: {item?.word ?? '-'} / {item?.past ?? '-'} /{' '}
                      {item?.pastParticiple ?? '-'}
                    </span>
                  </div>
                  <em>
                    入力: {userAnswer.word || '-'} / {userAnswer.past || '-'} /{' '}
                    {userAnswer.pastParticiple || '-'}
                  </em>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="empty-text">全問正解です。</p>
        )}
      </section>
    </section>
  )
}
