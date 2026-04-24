import { useEffect, useState } from 'react'
import { ErrorState, LoadingState } from '../../components/PageStates'
import { ProgressBar } from '../../components/ProgressBar'
import { RouterLink } from '../../components/RouterLink'
import { fetchDeck } from '../../repositories/deckRepository'
import {
  createTestSession,
  finishSession,
  getSettings,
  getWordProgressForDeck,
  recordTestAnswer,
} from '../../repositories/progressRepository'
import { deckDetailPath, resultPath, studyPath } from '../../routes/router'
import { useNavigation } from '../../routes/NavigationContext'
import { gradeAnswer } from '../../services/grading'
import { selectTestItems } from '../../services/questionSelector'
import type { Deck, WordItem } from '../../types'

type TestState =
  | { status: 'loading' }
  | { status: 'ready'; deck: Deck; questions: WordItem[] }
  | { status: 'error'; message: string }

interface TestPageProps {
  deckId: string
}

interface Feedback {
  sessionId: string
  isCorrect: boolean
  userAnswer: string
  correctAnswer: string
}

export function TestPage({ deckId }: TestPageProps) {
  const { navigate } = useNavigation()
  const [state, setState] = useState<TestState>({ status: 'loading' })
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setState({ status: 'loading' })
      setIndex(0)
      setInput('')
      setSelected(null)
      setFeedback(null)
      setResults([])
      setSessionId(null)
      setStartedAt(Date.now())

      try {
        const [deck, progress, settings] = await Promise.all([
          fetchDeck(deckId),
          getWordProgressForDeck(deckId),
          getSettings(),
        ])
        const questions = selectTestItems(
          deck.items,
          progress,
          Math.min(settings.questionsPerTest, deck.items.length),
          settings.sortMode,
        )

        if (active) {
          setState({ status: 'ready', deck, questions })
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

  if (state.status === 'loading') {
    return <LoadingState label="テストを準備中" />
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    )
  }

  if (state.questions.length === 0) {
    return <ErrorState title="問題がありません" message="単語帳データを確認してください。" />
  }

  const readyState = state
  const current = readyState.questions[index]
  const choices = current.choices && current.choices.length >= 2 ? current.choices : null
  const currentAnswer = choices ? selected ?? '' : input
  const canSubmit = currentAnswer.trim().length > 0 && !feedback && !isSubmitting
  const correctCount = results.filter(Boolean).length

  async function ensureSession() {
    if (sessionId) {
      return sessionId
    }

    const session = await createTestSession(deckId, readyState.questions.length)
    setSessionId(session.sessionId)
    return session.sessionId
  }

  async function handleSubmit() {
    if (!canSubmit) {
      return
    }

    setIsSubmitting(true)

    try {
      const activeSessionId = await ensureSession()
      const userAnswer = currentAnswer.trim()
      const isCorrect = gradeAnswer(userAnswer, current.answer)

      await recordTestAnswer({
        sessionId: activeSessionId,
        deckId,
        wordId: current.id,
        userAnswer,
        isCorrect,
        responseMs: Date.now() - startedAt,
      })

      setResults((value) => [...value, isCorrect])
      setFeedback({
        sessionId: activeSessionId,
        isCorrect,
        userAnswer,
        correctAnswer: current.answer,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleNext() {
    if (!feedback) {
      return
    }

    if (index === readyState.questions.length - 1) {
      const finalCorrect = results.filter(Boolean).length
      await finishSession(
        feedback.sessionId,
        finalCorrect,
        readyState.questions.length - finalCorrect,
      )
      navigate(resultPath(feedback.sessionId))
      return
    }

    setIndex((value) => value + 1)
    setInput('')
    setSelected(null)
    setFeedback(null)
    setStartedAt(Date.now())
  }

  return (
    <section className="page-stack">
      <div className="page-heading page-heading--split">
        <div>
          <p className="eyebrow">Test</p>
          <h1>{readyState.deck.title}</h1>
        </div>
        <div className="action-row">
          <RouterLink className="button button--ghost" to={deckDetailPath(deckId)}>
            詳細
          </RouterLink>
          <RouterLink className="button button--secondary" to={studyPath(deckId)}>
            学習
          </RouterLink>
        </div>
      </div>

      <ProgressBar value={index + 1} max={readyState.questions.length} label="問題" />

      <article className="test-card">
        <div className="test-card__topline">
          <span>
            {index + 1}/{readyState.questions.length}
          </span>
          <strong>
            正解 {correctCount}/{results.length}
          </strong>
        </div>
        <h2>{current.question}</h2>

        {choices ? (
          <div className="choice-grid" aria-label="選択肢">
            {choices.map((choice) => (
              <button
                className={selected === choice ? 'choice-button is-selected' : 'choice-button'}
                type="button"
                key={choice}
                disabled={Boolean(feedback)}
                onClick={() => setSelected(choice)}
              >
                {choice}
              </button>
            ))}
          </div>
        ) : (
          <label className="answer-input">
            <span>回答</span>
            <input
              type="text"
              value={input}
              disabled={Boolean(feedback)}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleSubmit()
                }
              }}
            />
          </label>
        )}

        {feedback ? (
          <div
            className={`feedback ${feedback.isCorrect ? 'is-correct' : 'is-wrong'}`}
            role="status"
          >
            <strong>{feedback.isCorrect ? '正解' : '不正解'}</strong>
            <span>回答: {feedback.userAnswer}</span>
            {!feedback.isCorrect ? <span>正答: {feedback.correctAnswer}</span> : null}
          </div>
        ) : null}

        <div className="action-row action-row--right">
          {feedback ? (
            <button
              className="button button--primary"
              type="button"
              onClick={() => void handleNext()}
            >
              {index === readyState.questions.length - 1 ? '結果を見る' : '次の問題'}
            </button>
          ) : (
            <button
              className="button button--primary"
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
            >
              解答
            </button>
          )}
        </div>
      </article>
    </section>
  )
}
