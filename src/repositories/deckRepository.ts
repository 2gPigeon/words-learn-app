import { IRREGULAR_VERBS_DECK_ID } from '../features/irregular-verbs/constants'
import type { Deck, DeckSummary, WordItem } from '../types'
import { fetchIrregularVerbDeckSummary } from './irregularVerbRepository'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function readWordItem(value: unknown): WordItem {
  if (!isRecord(value)) {
    throw new Error('Invalid deck item payload.')
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.question !== 'string' ||
    typeof value.answer !== 'string'
  ) {
    throw new Error('Deck item fields are invalid.')
  }

  return {
    id: value.id,
    question: value.question,
    answer: value.answer,
    choices: isStringArray(value.choices) ? value.choices : undefined,
    tags: isStringArray(value.tags) ? value.tags : undefined,
    note: typeof value.note === 'string' ? value.note : undefined,
  }
}

function readDeckSummary(value: unknown): DeckSummary {
  if (!isRecord(value)) {
    throw new Error('Invalid deck summary payload.')
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.version !== 'number' ||
    typeof value.itemCount !== 'number'
  ) {
    throw new Error('Deck summary fields are invalid.')
  }

  return {
    id: value.id,
    title: value.title,
    description: value.description,
    version: value.version,
    itemCount: value.itemCount,
  }
}

function readDeck(value: unknown): Deck {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error('Invalid deck payload.')
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.version !== 'number' ||
    typeof value.lang !== 'string'
  ) {
    throw new Error('Deck fields are invalid.')
  }

  return {
    id: value.id,
    title: value.title,
    description:
      typeof value.description === 'string' ? value.description : undefined,
    version: value.version,
    lang: value.lang,
    items: value.items.map(readWordItem),
  }
}

async function fetchJson(path: string) {
  const response = await fetch(path)

  if (!response.ok) {
    throw new Error(`Failed to fetch deck data: ${response.status}`)
  }

  return response.json() as Promise<unknown>
}

export async function fetchDeckSummaries() {
  const [data, irregularVerbSummary] = await Promise.all([
    fetchJson('/decks/index.json'),
    fetchIrregularVerbDeckSummary(IRREGULAR_VERBS_DECK_ID),
  ])

  if (!Array.isArray(data)) {
    throw new Error('Deck summaries payload is invalid.')
  }

  return [...data.map(readDeckSummary), irregularVerbSummary]
}

export async function fetchDeck(deckId: string) {
  const data = await fetchJson(`/decks/${encodeURIComponent(deckId)}.json`)
  return readDeck(data)
}
