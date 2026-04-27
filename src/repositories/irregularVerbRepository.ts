import type { DeckSummary, IrregularVerbDeck, IrregularVerbItem } from '../types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readIrregularVerbItem(value: unknown): IrregularVerbItem {
  if (!isRecord(value)) {
    throw new Error('Invalid irregular verb item.')
  }

  if (
    typeof value.id !== 'string' ||
    typeof value['単語'] !== 'string' ||
    typeof value['意味'] !== 'string' ||
    typeof value['過去形'] !== 'string' ||
    typeof value['過去分詞形'] !== 'string'
  ) {
    throw new Error('Irregular verb item fields are invalid.')
  }

  return {
    id: value.id,
    word: value['単語'],
    meaning: value['意味'],
    past: value['過去形'],
    pastParticiple: value['過去分詞形'],
  }
}

function readIrregularVerbDeck(value: unknown): IrregularVerbDeck {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error('Invalid irregular verb deck payload.')
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.version !== 'number'
  ) {
    throw new Error('Irregular verb deck fields are invalid.')
  }

  const items = value.items.map(readIrregularVerbItem)

  return {
    id: value.id,
    title: value.title,
    description:
      typeof value.description === 'string' ? value.description : undefined,
    version: value.version,
    itemCount:
      typeof value.itemCount === 'number' ? value.itemCount : items.length,
    items,
  }
}

async function fetchJson(path: string) {
  const response = await fetch(path)

  if (!response.ok) {
    throw new Error(`Failed to fetch irregular verbs: ${response.status}`)
  }

  return response.json() as Promise<unknown>
}

export async function fetchIrregularVerbDeck(deckId: string) {
  const data = await fetchJson(`/irregular-verbs/${encodeURIComponent(deckId)}.json`)
  return readIrregularVerbDeck(data)
}

export async function fetchIrregularVerbDeckSummary(deckId: string) {
  const deck = await fetchIrregularVerbDeck(deckId)

  const summary: DeckSummary = {
    id: deck.id,
    title: deck.title,
    description: deck.description ?? '',
    version: deck.version,
    itemCount: deck.itemCount,
  }

  return summary
}
