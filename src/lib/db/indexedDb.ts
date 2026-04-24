export type StoreName =
  | 'deckProgress'
  | 'wordProgress'
  | 'sessions'
  | 'answers'
  | 'settings'

const DB_NAME = 'word-learning-app-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

export function openAppDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains('deckProgress')) {
        db.createObjectStore('deckProgress', { keyPath: 'deckId' })
      }

      if (!db.objectStoreNames.contains('wordProgress')) {
        const store = db.createObjectStore('wordProgress', {
          keyPath: ['deckId', 'wordId'],
        })
        store.createIndex('deckId', 'deckId')
        store.createIndex('nextReviewAt', 'nextReviewAt')
        store.createIndex('familiarity', 'familiarity')
      }

      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'sessionId' })
        store.createIndex('deckId', 'deckId')
        store.createIndex('startedAt', 'startedAt')
        store.createIndex('finishedAt', 'finishedAt')
      }

      if (!db.objectStoreNames.contains('answers')) {
        const store = db.createObjectStore('answers', { keyPath: 'answerId' })
        store.createIndex('sessionId', 'sessionId')
        store.createIndex('deckId', 'deckId')
        store.createIndex('wordId', 'wordId')
        store.createIndex('answeredAt', 'answeredAt')
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
  })

  return dbPromise
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}
