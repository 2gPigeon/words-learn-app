import { normalizeAnswer } from './grading'
import type { IrregularVerbItem } from '../types'

export interface IrregularVerbUserAnswer {
  word: string
  past: string
  pastParticiple: string
}

export interface IrregularVerbGrade {
  word: boolean
  past: boolean
  pastParticiple: boolean
  isCorrect: boolean
}

function matchesExpected(userAnswer: string, expected: string) {
  const normalizedUser = normalizeAnswer(userAnswer)

  if (!normalizedUser) {
    return false
  }

  return expected
    .split('/')
    .map((part) => normalizeAnswer(part))
    .filter(Boolean)
    .includes(normalizedUser)
}

export function gradeIrregularVerbAnswer(
  userAnswer: IrregularVerbUserAnswer,
  item: IrregularVerbItem,
): IrregularVerbGrade {
  const word = matchesExpected(userAnswer.word, item.word)
  const past = matchesExpected(userAnswer.past, item.past)
  const pastParticiple = matchesExpected(
    userAnswer.pastParticiple,
    item.pastParticiple,
  )

  return {
    word,
    past,
    pastParticiple,
    isCorrect: word && past && pastParticiple,
  }
}

export function serializeIrregularVerbAnswer(userAnswer: IrregularVerbUserAnswer) {
  return JSON.stringify(userAnswer)
}

export function parseIrregularVerbAnswer(value: string | null): IrregularVerbUserAnswer {
  if (!value) {
    return {
      word: '',
      past: '',
      pastParticiple: '',
    }
  }

  try {
    const parsed = JSON.parse(value) as Partial<IrregularVerbUserAnswer>

    return {
      word: typeof parsed.word === 'string' ? parsed.word : '',
      past: typeof parsed.past === 'string' ? parsed.past : '',
      pastParticiple:
        typeof parsed.pastParticiple === 'string' ? parsed.pastParticiple : '',
    }
  } catch {
    return {
      word: value,
      past: '',
      pastParticiple: '',
    }
  }
}
