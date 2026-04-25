import type { SortMode, WordItem, WordProgress } from '../types'

const DEFAULT_CHOICE_COUNT = 4
const MINIMUM_CHOICE_COUNT = 2

function shuffleItems<T>(items: T[]) {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }

  return copy
}

function getProgressMap(progress: WordProgress[]) {
  return new Map(progress.map((item) => [item.wordId, item]))
}

function hasUsableChoices(item: WordItem) {
  return (
    Array.isArray(item.choices) &&
    item.choices.length >= MINIMUM_CHOICE_COUNT &&
    item.choices.includes(item.answer)
  )
}

function buildChoices(item: WordItem, allItems: WordItem[]) {
  if (hasUsableChoices(item)) {
    return item.choices
  }

  const choices: string[] = []
  const seen = new Set<string>()

  for (const choice of item.choices ?? []) {
    if (!choice || seen.has(choice)) {
      continue
    }

    choices.push(choice)
    seen.add(choice)
  }

  if (!seen.has(item.answer)) {
    choices.push(item.answer)
    seen.add(item.answer)
  }

  const distractors = shuffleItems(
    allItems
      .filter((candidate) => candidate.id !== item.id)
      .map((candidate) => candidate.answer),
  )

  for (const distractor of distractors) {
    if (seen.has(distractor)) {
      continue
    }

    choices.push(distractor)
    seen.add(distractor)

    if (choices.length >= DEFAULT_CHOICE_COUNT) {
      break
    }
  }

  if (choices.length < MINIMUM_CHOICE_COUNT) {
    return undefined
  }

  return shuffleItems(choices).slice(0, DEFAULT_CHOICE_COUNT)
}

function attachChoices(items: WordItem[], allItems: WordItem[]) {
  return items.map((item) => ({
    ...item,
    choices: buildChoices(item, allItems),
  }))
}

function scoreItem(
  item: WordItem,
  progressMap: Map<string, WordProgress>,
  sortMode: SortMode,
  now: number,
) {
  const progress = progressMap.get(item.id)
  const familiarity = progress?.familiarity ?? 0
  const due = progress?.nextReviewAt !== null && progress?.nextReviewAt !== undefined
    ? progress.nextReviewAt <= now
    : false
  const unlearned = !progress?.lastAnsweredAt
  const weakScore = (5 - familiarity) * 100 + (progress?.wrongCount ?? 0) * 35
  const dueScore = due ? 1000 : 0
  const randomTie = Math.random()

  if (sortMode === 'weak') {
    return weakScore + dueScore + randomTie
  }

  if (sortMode === 'unlearned') {
    return (unlearned ? 900 : 0) + weakScore + randomTie
  }

  return dueScore + (unlearned ? 500 : 0) + weakScore + randomTie
}

export function selectTestItems(
  items: WordItem[],
  progress: WordProgress[],
  count: number,
  sortMode: SortMode,
) {
  if (sortMode === 'random') {
    return attachChoices(shuffleItems(items).slice(0, count), items)
  }

  const progressMap = getProgressMap(progress)
  const now = Date.now()

  return attachChoices(
    [...items]
    .sort((left, right) => {
      return (
        scoreItem(right, progressMap, sortMode, now) -
        scoreItem(left, progressMap, sortMode, now)
      )
    })
    .slice(0, count),
    items,
  )
}
