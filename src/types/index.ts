export type Familiarity = 0 | 1 | 2 | 3 | 4 | 5

export type FamiliarityRating = 'remembered' | 'unsure' | 'hard'

export type LastResult = 'correct' | 'wrong' | 'skip' | null

export type SortMode = 'review' | 'random' | 'weak' | 'unlearned'

export type ThemeMode = 'system' | 'light' | 'dark'

export interface DeckSummary {
  id: string
  title: string
  description: string
  version: number
  itemCount: number
}

export interface WordItem {
  id: string
  question: string
  answer: string
  choices?: string[]
  tags?: string[]
  note?: string
}

export interface Deck {
  id: string
  title: string
  description?: string
  version: number
  lang: string
  items: WordItem[]
}

export interface DeckProgress {
  deckId: string
  lastStudiedAt: number
  lastTestedAt: number
  totalStudied: number
  totalCorrect: number
  totalAnswered: number
}

export interface WordProgress {
  deckId: string
  wordId: string
  familiarity: Familiarity
  correctCount: number
  wrongCount: number
  lastAnsweredAt: number | null
  nextReviewAt: number | null
  lastResult: LastResult
}

export interface SessionRecord {
  sessionId: string
  deckId: string
  mode: 'study' | 'test'
  startedAt: number
  finishedAt: number | null
  total: number
  correct: number
  wrong: number
}

export interface AnswerRecord {
  answerId: string
  sessionId: string
  deckId: string
  wordId: string
  userAnswer: string | null
  isCorrect: boolean
  answeredAt: number
  responseMs: number | null
}

export interface StoredSetting {
  key: string
  value: unknown
}

export interface AppSettings {
  questionsPerTest: number
  sortMode: SortMode
  theme: ThemeMode
}

export const DEFAULT_SETTINGS: AppSettings = {
  questionsPerTest: 10,
  sortMode: 'review',
  theme: 'system',
}
