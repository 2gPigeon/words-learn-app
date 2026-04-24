import type { Familiarity, FamiliarityRating } from '../types'

const REVIEW_INTERVAL_DAYS: Record<Familiarity, number> = {
  0: 1,
  1: 2,
  2: 4,
  3: 7,
  4: 14,
  5: 30,
}

const DAY_MS = 24 * 60 * 60 * 1000

export const familiarityLabels: Record<Familiarity, string> = {
  0: '未着手',
  1: '低い',
  2: '確認中',
  3: '標準',
  4: '安定',
  5: '定着',
}

export function clampFamiliarity(value: number): Familiarity {
  return Math.max(0, Math.min(5, Math.round(value))) as Familiarity
}

export function getNextReviewAt(familiarity: Familiarity, now = Date.now()) {
  return now + REVIEW_INTERVAL_DAYS[familiarity] * DAY_MS
}

export function applyStudyRating(
  current: Familiarity,
  rating: FamiliarityRating,
): Familiarity {
  if (rating === 'remembered') {
    return clampFamiliarity(current + 1)
  }

  if (rating === 'hard') {
    return clampFamiliarity(current - 1)
  }

  return current
}

export function applyAnswerResult(
  current: Familiarity,
  isCorrect: boolean,
): Familiarity {
  return clampFamiliarity(current + (isCorrect ? 1 : -1))
}
