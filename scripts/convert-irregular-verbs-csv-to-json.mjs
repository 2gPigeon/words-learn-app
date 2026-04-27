import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

function sanitizeDeckId(value) {
  const deckId = value
    .trim()
    .replace(/[^0-9A-Za-z_-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')

  return deckId || 'irregular-verbs'
}

function normalizeCell(value) {
  return value
    .replace(/\ufeff/g, '')
    .replace(/\u3000/g, ' ')
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
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

function getColumnIndexes(header, wordColumn, meaningColumn) {
  const normalizedHeader = header.map((value) => value.replace(/\ufeff/g, '').trim())
  const wordIndex = normalizedHeader.indexOf(wordColumn)
  const meaningIndex = normalizedHeader.indexOf(meaningColumn)

  if (wordIndex === -1 || meaningIndex === -1) {
    throw new Error(
      `Required columns were not found: ${wordColumn}, ${meaningColumn}. ` +
        `Available columns: ${normalizedHeader.join(', ')}`,
    )
  }

  return { wordIndex, meaningIndex }
}

function splitMeaning(rawMeaning, marker, formSeparator, rowNumber) {
  const [meaningPart, formsPart] = rawMeaning.split(marker, 2)

  if (!formsPart) {
    throw new Error(`Row ${rowNumber}: marker "${marker}" was not found in 意味 column.`)
  }

  const meaning = normalizeCell(meaningPart)
  const [pastPart, pastParticiplePart] = formsPart.split(formSeparator, 2)
  const past = normalizeCell(pastPart ?? '')
  const pastParticiple = normalizeCell(pastParticiplePart ?? '')

  if (!meaning || !past || !pastParticiple) {
    throw new Error(
      `Row ${rowNumber}: could not split 意味 into meaning, past, and past participle.`,
    )
  }

  return { meaning, past, pastParticiple }
}

function buildItems(rows, options) {
  if (rows.length === 0) {
    throw new Error('CSV header row was not found.')
  }

  const [header, ...body] = rows
  const { wordIndex, meaningIndex } = getColumnIndexes(
    header,
    options.wordColumn,
    options.meaningColumn,
  )
  const items = []

  body.forEach((rawRow, index) => {
    const word = normalizeCell(rawRow[wordIndex] ?? '')
    const rawMeaning = normalizeCell(rawRow[meaningIndex] ?? '')

    if (!word && !rawMeaning) {
      return
    }

    if (!word || !rawMeaning) {
      throw new Error(`Row ${index + 2}: 単語 or 意味 column is empty.`)
    }

    const { meaning, past, pastParticiple } = splitMeaning(
      rawMeaning,
      options.marker,
      options.formSeparator,
      index + 2,
    )

    items.push({
      id: `${options.deckId}-${String(items.length + 1).padStart(4, '0')}`,
      単語: word,
      意味: meaning,
      過去形: past,
      過去分詞形: pastParticiple,
    })
  })

  return items
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      output: { type: 'string', short: 'o' },
      'deck-id': { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      version: { type: 'string', default: '1' },
      'word-column': { type: 'string', default: '単語' },
      'meaning-column': { type: 'string', default: '意味' },
      marker: { type: 'string', default: '《活用》' },
      'form-separator': { type: 'string', default: '-' },
    },
  })

  const input = positionals[0]

  if (!input) {
    throw new Error(
      'Usage: node scripts/convert-irregular-verbs-csv-to-json.mjs <input.csv> ' +
        '[--output <output.json>]',
    )
  }

  const inputPath = path.resolve(input)
  const outputStem = values.output
    ? path.parse(values.output).name
    : path.parse(inputPath).name
  const deckId = sanitizeDeckId(values['deck-id'] ?? outputStem)
  const outputPath = path.resolve(
    values.output ?? path.join('public', 'irregular-verbs', `${deckId}.json`),
  )
  const title = values.title ?? path.parse(inputPath).name
  const description =
    values.description ?? `${path.basename(inputPath)} から変換した不規則動詞データ`
  const version = Number.parseInt(values.version, 10)

  if (!Number.isInteger(version)) {
    throw new Error(`Invalid version: ${values.version}`)
  }

  const text = await readFile(inputPath, 'utf8')
  const rows = parseCsv(text)
  const items = buildItems(rows, {
    deckId,
    wordColumn: values['word-column'],
    meaningColumn: values['meaning-column'],
    marker: values.marker,
    formSeparator: values['form-separator'],
  })
  const payload = {
    id: deckId,
    title,
    description,
    version,
    itemCount: items.length,
    items,
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(`Converted ${items.length} irregular verbs to ${outputPath}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
