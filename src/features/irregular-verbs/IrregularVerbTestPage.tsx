import { useEffect, useState } from 'react'
import { ErrorState, LoadingState } from '../../components/PageStates'
import { ProgressBar } from '../../components/ProgressBar'
import { RouterLink } from '../../components/RouterLink'
import {
  gradeIrregularVerbAnswer,
  serializeIrregularVerbAnswer,
  type IrregularVerbGrade,
  type IrregularVerbUserAnswer,
} from '../../services/irregularVerbGrading'
import { selectIrregularVerbItems } from '../../services/irregularVerbSelector'
import { fetchIrregularVerbDeck } from '../../repositories/irregularVerbRepository'
import {
  createTestSession,
  finishSession,
  getSettings,
  getWordProgressForDeck,
  recordTestAnswer,
} from '../../repositories/progressRepository'
import {
  deckDetailPath,
  irregularVerbResultPath,
  testPath,
} from '../../routes/router'
import { useNavigation } from '../../routes/NavigationContext'
import type { IrregularVerbDeck, IrregularVerbItem } from '../../types'

type TestState =
  | { status: 'loading' }
  | { status: 'ready'; deck: IrregularVerbDeck; questions: IrregularVerbItem[] }
  | { status: 'error'; message: string }

interface Feedback {
  sessionId: string
  grade: IrregularVerbGrade
  userAnswer: IrregularVerbUserAnswer
}

interface IrregularVerbTestPageProps {
  deckId: string
}

export function IrregularVerbTestPage({ deckId }: IrregularVerbTestPageProps) {
  const { navigate } = useNavigation()
  const [state, setState] = useState<TestState>({ status: 'loading' })
  const [index, setIndex] = useState(0)
  const [word, setWord] = useState('')
  const [past, setPast] = useState('')
  const [pastParticiple, setPastParticiple] = useState('')
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
      setWord('')
      setPast('')
      setPastParticiple('')
      setFeedback(null)
      setResults([])
      setSessionId(null)
      setStartedAt(Date.now())

      try {
        const [deck, progress, settings] = await Promise.all([
          fetchIrregularVerbDeck(deckId),
          getWordProgressForDeck(deckId),
          getSettings(),
        ])
        const questions = selectIrregularVerbItems(
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
              error instanceof Error
                ? error.message
                : 'Failed to load irregular verb test.',
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
    return <LoadingState label="Loading irregular verb test" />
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
    return (
      <ErrorState
        title="問題がありません"
        message="不規則動詞データを確認してください。"
      />
    )
  }

  const readyState = state
  const current = readyState.questions[index]
  const canSubmit =
    word.trim().length > 0 &&
    past.trim().length > 0 &&
    pastParticiple.trim().length > 0 &&
    !feedback &&
    !isSubmitting
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
      const userAnswer = {
        word: word.trim(),
        past: past.trim(),
        pastParticiple: pastParticiple.trim(),
      }
      const grade = gradeIrregularVerbAnswer(userAnswer, current)

      await recordTestAnswer({
        sessionId: activeSessionId,
        deckId,
        wordId: current.id,
        userAnswer: serializeIrregularVerbAnswer(userAnswer),
        isCorrect: grade.isCorrect,
        responseMs: Date.now() - startedAt,
      })

      setResults((value) => [...value, grade.isCorrect])
      setFeedback({
        sessionId: activeSessionId,
        grade,
        userAnswer,
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
      navigate(irregularVerbResultPath(feedback.sessionId))
      return
    }

    setIndex((value) => value + 1)
    setWord('')
    setPast('')
    setPastParticiple('')
    setFeedback(null)
    setStartedAt(Date.now())
  }

  return (
    <section className="page-stack">
      <div className="page-heading page-heading--split">
        <div>
          <p className="eyebrow">Irregular verbs</p>
          <h1>{readyState.deck.title}</h1>
        </div>
        <div className="action-row">
          <RouterLink className="button button--ghost" to={deckDetailPath(deckId)}>
            詳細
          </RouterLink>
          <RouterLink className="button button--secondary" to={testPath(deckId)}>
            最初から
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
        <h2>{current.meaning}</h2>

        <div className="irregular-input-grid">
          <label className="field">
            <span>単語</span>
            <input
              type="text"
              value={word}
              disabled={Boolean(feedback)}
              onChange={(event) => setWord(event.target.value)}
            />
          </label>
          <label className="field">
            <span>過去形</span>
            <input
              type="text"
              value={past}
              disabled={Boolean(feedback)}
              onChange={(event) => setPast(event.target.value)}
            />
          </label>
          <label className="field">
            <span>過去分詞形</span>
            <input
              type="text"
              value={pastParticiple}
              disabled={Boolean(feedback)}
              onChange={(event) => setPastParticiple(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleSubmit()
                }
              }}
            />
          </label>
        </div>

        {feedback ? (
          <div
            className={`feedback ${feedback.grade.isCorrect ? 'is-correct' : 'is-wrong'}`}
            role="status"
          >
            <strong>{feedback.grade.isCorrect ? '正解' : '不正解'}</strong>
            <div className="irregular-feedback-list">
              <span>
                単語: {feedback.grade.word ? 'OK' : `NG / ${current.word}`}
              </span>
              <span>
                過去形: {feedback.grade.past ? 'OK' : `NG / ${current.past}`}
              </span>
              <span>
                過去分詞形:{' '}
                {feedback.grade.pastParticiple
                  ? 'OK'
                  : `NG / ${current.pastParticiple}`}
              </span>
            </div>
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
              判定
            </button>
          )}
        </div>
      </article>
    </section>
  )
}
