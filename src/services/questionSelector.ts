import type { SortMode, WordItem, WordProgress } from '../types'

function shuffleItems(items: WordItem[]) {
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
    return shuffleItems(items).slice(0, count)
  }

  const progressMap = getProgressMap(progress)
  const now = Date.now()

  return [...items]
    .sort((left, right) => {
      return (
        scoreItem(right, progressMap, sortMode, now) -
        scoreItem(left, progressMap, sortMode, now)
      )
    })
    .slice(0, count)
}
