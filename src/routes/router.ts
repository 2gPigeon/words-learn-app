export type AppRoute =
  | { name: 'decks' }
  | { name: 'deckDetail'; deckId: string }
  | { name: 'study'; deckId: string }
  | { name: 'test'; deckId: string }
  | { name: 'result'; sessionId: string }
  | { name: 'irregularVerbResult'; sessionId: string }
  | { name: 'history' }
  | { name: 'settings' }
  | { name: 'notFound' }

function compactSegments(pathname: string) {
  return pathname.split('/').filter(Boolean).map(decodeURIComponent)
}

export function parseRoute(pathname: string): AppRoute {
  const segments = compactSegments(pathname)

  if (segments.length === 0) {
    return { name: 'decks' }
  }

  if (segments.length === 1 && segments[0] === 'decks') {
    return { name: 'decks' }
  }

  if (segments.length === 2 && segments[0] === 'decks') {
    return { name: 'deckDetail', deckId: segments[1] }
  }

  if (segments.length === 2 && segments[0] === 'study') {
    return { name: 'study', deckId: segments[1] }
  }

  if (segments.length === 2 && segments[0] === 'test') {
    return { name: 'test', deckId: segments[1] }
  }

  if (segments.length === 2 && segments[0] === 'result') {
    return { name: 'result', sessionId: segments[1] }
  }

  if (
    segments.length === 3 &&
    segments[0] === 'irregular-verbs' &&
    segments[1] === 'result'
  ) {
    return { name: 'irregularVerbResult', sessionId: segments[2] }
  }

  if (segments.length === 1 && segments[0] === 'history') {
    return { name: 'history' }
  }

  if (segments.length === 1 && segments[0] === 'settings') {
    return { name: 'settings' }
  }

  return { name: 'notFound' }
}

export function decksPath() {
  return '/decks'
}

export function deckDetailPath(deckId: string) {
  return `/decks/${encodeURIComponent(deckId)}`
}

export function studyPath(deckId: string) {
  return `/study/${encodeURIComponent(deckId)}`
}

export function testPath(deckId: string) {
  return `/test/${encodeURIComponent(deckId)}`
}

export function resultPath(sessionId: string) {
  return `/result/${encodeURIComponent(sessionId)}`
}

export function irregularVerbResultPath(sessionId: string) {
  return `/irregular-verbs/result/${encodeURIComponent(sessionId)}`
}
