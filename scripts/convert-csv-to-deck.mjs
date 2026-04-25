import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

function sanitizeDeckId(value) {
  const deckId = value.trim().replace(/[^0-9A-Za-z_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '')
  return deckId || 'deck'
}

function normalizeCell(value, separator) {
  return value
    .replace(/\ufeff/g, '')
    .replace(/\u3000/g, ' ')
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(separator)
}

function shuffleItems(items) {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }

  return copy
}

function buildChoices(item, items, choiceCount = 4) {
  const choices = [item.answer]
  const seen = new Set(choices)
  const distractors = shuffleItems(
    items
      .filter((candidate) => candidate.id !== item.id)
      .map((candidate) => candidate.answer),
  )

  for (const distractor of distractors) {
    if (seen.has(distractor)) {
      continue
    }

    choices.push(distractor)
    seen.add(distractor)

    if (choices.length >= choiceCount) {
      break
    }
  }

  return choices.length >= 2 ? shuffleItems(choices) : undefined
}

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      row.push(cell)
      cell = ''
      continue
    }

    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') {
        index += 1
      }
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell)
  rows.push(row)
  return rows
}

function buildDeck(rows, { deckId, title, description, version, lang, questionColumn, answerColumn, separator }) {
  if (rows.length === 0) {
    throw new Error('CSV header row was not found.')
  }

  const [header, ...body] = rows
  const normalizedHeader = header.map((value) => value.replace(/\ufeff/g, '').trim())
  const questionIndex = normalizedHeader.indexOf(questionColumn)
  const answerIndex = normalizedHeader.indexOf(answerColumn)

  if (questionIndex === -1 || answerIndex === -1) {
    throw new Error(
      `Required columns were not found: ${questionColumn}, ${answerColumn}. ` +
        `Available columns: ${normalizedHeader.join(', ')}`
    )
  }

  const items = []

  for (const rawRow of body) {
    const question = normalizeCell(rawRow[questionIndex] ?? '', separator)
    const answer = normalizeCell(rawRow[answerIndex] ?? '', separator)

    if (!question || !answer) {
      continue
    }

    items.push({
      id: `${deckId}-${String(items.length + 1).padStart(4, '0')}`,
      question,
      answer,
    })
  }

  const itemsWithChoices = items.map((item) => ({
    ...item,
    choices: buildChoices(item, items),
  }))

  return {
    id: deckId,
    title,
    description,
    version,
    lang,
    items: itemsWithChoices,
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      output: { type: 'string', short: 'o' },
      'deck-id': { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      lang: { type: 'string', default: 'en-ja' },
      version: { type: 'string', default: '1' },
      'question-column': { type: 'string', default: '単語' },
      'answer-column': { type: 'string', default: '意味' },
      separator: { type: 'string', default: ' / ' },
    },
  })

  const input = positionals[0]

  if (!input) {
    throw new Error('Usage: node scripts/convert-csv-to-deck.mjs <input.csv> [--output <output.json>]')
  }

  const inputPath = path.resolve(input)
  const outputStem = values.output ? path.parse(values.output).name : path.parse(inputPath).name
  const deckId = sanitizeDeckId(values['deck-id'] ?? outputStem)
  const outputPath = path.resolve(values.output ?? path.join('public', 'decks', `${deckId}.json`))
  const title = values.title ?? path.parse(inputPath).name
  const description = values.description ?? `${path.basename(inputPath)} から変換した単語帳`
  const version = Number.parseInt(values.version, 10)

  if (!Number.isInteger(version)) {
    throw new Error(`Invalid version: ${values.version}`)
  }

  const text = await readFile(inputPath, 'utf8')
  const rows = parseCsv(text)
  const deck = buildDeck(rows, {
    deckId,
    title,
    description,
    version,
    lang: values.lang,
    questionColumn: values['question-column'],
    answerColumn: values['answer-column'],
    separator: values.separator,
  })

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(deck, null, 2)}\n`, 'utf8')

  console.log(`Converted ${deck.items.length} items to ${outputPath}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
