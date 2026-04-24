import {
  openAppDb,
  requestToPromise,
  transactionDone,
  type StoreName,
} from '../lib/db/indexedDb'
import {
  applyAnswerResult,
  applyStudyRating,
  getNextReviewAt,
} from '../services/mastery'
import {
  DEFAULT_SETTINGS,
  type AnswerRecord,
  type AppSettings,
  type DeckProgress,
  type FamiliarityRating,
  type SessionRecord,
  type SortMode,
  type StoredSetting,
  type ThemeMode,
  type WordProgress,
} from '../types'

interface TestAnswerInput {
  sessionId: string
  deckId: string
  wordId: string
  userAnswer: string | null
  isCorrect: boolean
  responseMs: number | null
}

function createId(prefix: string) {
  if (typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function defaultDeckProgress(deckId: string): DeckProgress {
  return {
    deckId,
    lastStudiedAt: 0,
    lastTestedAt: 0,
    totalStudied: 0,
    totalCorrect: 0,
    totalAnswered: 0,
  }
}

function defaultWordProgress(deckId: string, wordId: string): WordProgress {
  return {
    deckId,
    wordId,
    familiarity: 0,
    correctCount: 0,
    wrongCount: 0,
    lastAnsweredAt: null,
    nextReviewAt: null,
    lastResult: null,
  }
}

async function getRecord<T>(storeName: StoreName, key: IDBValidKey) {
  const db = await openAppDb()
  const transaction = db.transaction(storeName, 'readonly')
  const done = transactionDone(transaction)
  const store = transaction.objectStore(storeName)
  const result = await requestToPromise<T | undefined>(store.get(key))
  await done
  return result
}

async function getAllRecords<T>(storeName: StoreName) {
  const db = await openAppDb()
  const transaction = db.transaction(storeName, 'readonly')
  const done = transactionDone(transaction)
  const store = transaction.objectStore(storeName)
  const result = await requestToPromise<T[]>(store.getAll())
  await done
  return result
}

async function getAllByIndex<T>(
  storeName: StoreName,
  indexName: string,
  key: IDBValidKey,
) {
  const db = await openAppDb()
  const transaction = db.transaction(storeName, 'readonly')
  const done = transactionDone(transaction)
  const store = transaction.objectStore(storeName)
  const result = await requestToPromise<T[]>(store.index(indexName).getAll(key))
  await done
  return result
}

async function putRecord<T>(storeName: StoreName, value: T) {
  const db = await openAppDb()
  const transaction = db.transaction(storeName, 'readwrite')
  const done = transactionDone(transaction)
  const store = transaction.objectStore(storeName)
  await requestToPromise(store.put(value))
  await done
}

async function putMany<T>(storeName: StoreName, values: T[]) {
  const db = await openAppDb()
  const transaction = db.transaction(storeName, 'readwrite')
  const done = transactionDone(transaction)
  const store = transaction.objectStore(storeName)

  await Promise.all(values.map((value) => requestToPromise(store.put(value))))
  await done
}

async function refreshDeckStudyCount(
  deckId: string,
  patch: Partial<DeckProgress>,
) {
  const current = (await getDeckProgress(deckId)) ?? defaultDeckProgress(deckId)
  const wordProgress = await getWordProgressForDeck(deckId)
  const next: DeckProgress = {
    ...current,
    ...patch,
    totalStudied: wordProgress.filter((item) => item.lastAnsweredAt !== null)
      .length,
  }

  await putRecord('deckProgress', next)
  return next
}

function normalizeSortMode(value: unknown): SortMode {
  if (
    value === 'review' ||
    value === 'random' ||
    value === 'weak' ||
    value === 'unlearned'
  ) {
    return value
  }

  return DEFAULT_SETTINGS.sortMode
}

function normalizeThemeMode(value: unknown): ThemeMode {
  if (value === 'system' || value === 'light' || value === 'dark') {
    return value
  }

  return DEFAULT_SETTINGS.theme
}

function normalizeQuestionsPerTest(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SETTINGS.questionsPerTest
  }

  return Math.max(1, Math.min(50, Math.round(value)))
}

export async function getDeckProgress(deckId: string) {
  return getRecord<DeckProgress>('deckProgress', deckId)
}

export async function getAllDeckProgress() {
  return getAllRecords<DeckProgress>('deckProgress')
}

export async function getDeckProgressMap() {
  const records = await getAllDeckProgress()
  return new Map(records.map((record) => [record.deckId, record]))
}

export async function getWordProgress(deckId: string, wordId: string) {
  return getRecord<WordProgress>('wordProgress', [deckId, wordId])
}

export async function getWordProgressForDeck(deckId: string) {
  return getAllByIndex<WordProgress>('wordProgress', 'deckId', deckId)
}

export async function getAllWordProgress() {
  return getAllRecords<WordProgress>('wordProgress')
}

export async function recordStudyRating(
  deckId: string,
  wordId: string,
  rating: FamiliarityRating,
) {
  const now = Date.now()
  const current =
    (await getWordProgress(deckId, wordId)) ?? defaultWordProgress(deckId, wordId)
  const familiarity = applyStudyRating(current.familiarity, rating)
  const next: WordProgress = {
    ...current,
    familiarity,
    lastAnsweredAt: now,
    nextReviewAt: getNextReviewAt(familiarity, now),
    lastResult: 'skip',
  }

  await putRecord('wordProgress', next)
  await refreshDeckStudyCount(deckId, { lastStudiedAt: now })

  return next
}

export async function createTestSession(deckId: string, total: number) {
  const session: SessionRecord = {
    sessionId: createId('session'),
    deckId,
    mode: 'test',
    startedAt: Date.now(),
    finishedAt: null,
    total,
    correct: 0,
    wrong: 0,
  }

  await putRecord('sessions', session)
  return session
}

export async function recordTestAnswer(input: TestAnswerInput) {
  const now = Date.now()
  const current =
    (await getWordProgress(input.deckId, input.wordId)) ??
    defaultWordProgress(input.deckId, input.wordId)
  const familiarity = applyAnswerResult(current.familiarity, input.isCorrect)
  const wordProgress: WordProgress = {
    ...current,
    familiarity,
    correctCount: current.correctCount + (input.isCorrect ? 1 : 0),
    wrongCount: current.wrongCount + (input.isCorrect ? 0 : 1),
    lastAnsweredAt: now,
    nextReviewAt: getNextReviewAt(familiarity, now),
    lastResult: input.isCorrect ? 'correct' : 'wrong',
  }
  const answer: AnswerRecord = {
    answerId: createId('answer'),
    sessionId: input.sessionId,
    deckId: input.deckId,
    wordId: input.wordId,
    userAnswer: input.userAnswer,
    isCorrect: input.isCorrect,
    answeredAt: now,
    responseMs: input.responseMs,
  }

  await putRecord('wordProgress', wordProgress)
  await putRecord('answers', answer)

  const deckProgress =
    (await getDeckProgress(input.deckId)) ?? defaultDeckProgress(input.deckId)
  await refreshDeckStudyCount(input.deckId, {
    lastTestedAt: now,
    totalCorrect: deckProgress.totalCorrect + (input.isCorrect ? 1 : 0),
    totalAnswered: deckProgress.totalAnswered + 1,
  })

  return { answer, wordProgress }
}

export async function finishSession(
  sessionId: string,
  correct: number,
  wrong: number,
) {
  const session = await getSession(sessionId)

  if (!session) {
    return null
  }

  const next: SessionRecord = {
    ...session,
    finishedAt: Date.now(),
    correct,
    wrong,
  }

  await putRecord('sessions', next)
  return next
}

export async function getSession(sessionId: string) {
  return getRecord<SessionRecord>('sessions', sessionId)
}

export async function getRecentSessions(limit = 20) {
  const sessions = await getAllRecords<SessionRecord>('sessions')

  return sessions
    .filter((session) => session.finishedAt !== null)
    .sort((left, right) => right.startedAt - left.startedAt)
    .slice(0, limit)
}

export async function getAnswersForSession(sessionId: string) {
  const answers = await getAllByIndex<AnswerRecord>(
    'answers',
    'sessionId',
    sessionId,
  )

  return answers.sort((left, right) => left.answeredAt - right.answeredAt)
}

export async function getSettings() {
  const stored = await getAllRecords<StoredSetting>('settings')
  const values = new Map(stored.map((item) => [item.key, item.value]))

  return {
    questionsPerTest: normalizeQuestionsPerTest(values.get('questionsPerTest')),
    sortMode: normalizeSortMode(values.get('sortMode')),
    theme: normalizeThemeMode(values.get('theme')),
  } satisfies AppSettings
}

export async function saveSettings(settings: AppSettings) {
  const records: StoredSetting[] = [
    { key: 'questionsPerTest', value: settings.questionsPerTest },
    { key: 'sortMode', value: settings.sortMode },
    { key: 'theme', value: settings.theme },
  ]

  await putMany('settings', records)
}

export async function resetLearningData() {
  const db = await openAppDb()
  const stores: StoreName[] = [
    'deckProgress',
    'wordProgress',
    'sessions',
    'answers',
  ]
  const transaction = db.transaction(stores, 'readwrite')
  const done = transactionDone(transaction)

  await Promise.all(
    stores.map((storeName) =>
      requestToPromise(transaction.objectStore(storeName).clear()),
    ),
  )
  await done
}
