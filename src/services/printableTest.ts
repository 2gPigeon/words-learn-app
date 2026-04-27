import type { Deck, WordItem } from '../types'

const PRINTABLE_ROW_COUNT = 20

function shuffleItems<T>(items: T[]) {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }

  return copy
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function selectPrintableItems(items: WordItem[], count: number) {
  return shuffleItems(items).slice(0, Math.min(count, items.length))
}

function renderRows(items: WordItem[], rowCount: number) {
  return Array.from({ length: rowCount }, (_, index) => {
    const item = items[index]

    return `
      <tr>
        <td class="sheet__prompt">
          ${
            item
              ? `<span class="sheet__number">${index + 1}.</span>${escapeHtml(item.answer)}`
              : ''
          }
        </td>
        <td class="sheet__blank"></td>
      </tr>
    `
  }).join('')
}

function buildPrintableHtml(deck: Deck, items: WordItem[]) {
  const generatedAt = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(deck.title)} Print Test</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 10mm;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        color: #111827;
        font-family:
          "Yu Gothic",
          "Hiragino Kaku Gothic ProN",
          "Noto Sans JP",
          sans-serif;
        background: #ffffff;
      }

      body {
        padding: 10mm;
      }

      .page {
        width: 190mm;
        margin: 0 auto;
      }

      .page__header {
        display: grid;
        gap: 4mm;
        margin-bottom: 5mm;
      }

      .page__title {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8mm;
      }

      h1 {
        margin: 0;
        font-size: 20pt;
      }

      .page__meta {
        color: #4b5563;
        font-size: 10pt;
        text-align: right;
      }

      .page__info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 5mm;
        margin-bottom: 5mm;
      }

      .page__line {
        min-height: 11mm;
        padding: 2.5mm 3mm;
        font-size: 11pt;
        border: 1px solid #9ca3af;
      }

      table {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
      }

      th,
      td {
        border: 1px solid #111827;
      }

      th {
        height: 10mm;
        padding: 2mm 3mm;
        font-size: 11pt;
        text-align: left;
        background: #f3f4f6;
      }

      td {
        height: 10.7mm;
        padding: 2mm 3mm;
        font-size: 11pt;
        vertical-align: middle;
      }

      .sheet__prompt {
        width: 54%;
        font-weight: 700;
      }

      .sheet__blank {
        width: 46%;
      }

      .sheet__number {
        display: inline-block;
        width: 8mm;
        color: #6b7280;
      }

      .page__hint {
        margin-top: 4mm;
        color: #6b7280;
        font-size: 9pt;
      }

      @media print {
        body {
          padding: 0;
        }

        .page {
          width: auto;
        }

        .page__hint {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="page__header">
        <div class="page__title">
          <h1>${escapeHtml(deck.title)}</h1>
          <div class="page__meta">${generatedAt}</div>
        </div>
        <div class="page__info">
          <div class="page__line">Name:</div>
          <div class="page__line">Score:</div>
        </div>
      </header>

      <table aria-label="Printable vocabulary test">
        <thead>
          <tr>
            <th>Japanese meaning</th>
            <th>English</th>
          </tr>
        </thead>
        <tbody>
          ${renderRows(items, PRINTABLE_ROW_COUNT)}
        </tbody>
      </table>

      <p class="page__hint">Use the browser print dialog and choose "Save as PDF" if needed.</p>
    </main>

    <script>
      window.addEventListener('load', () => {
        window.setTimeout(() => window.print(), 150)
      })
    </script>
  </body>
</html>`
}

export function openPrintableTest(deck: Deck) {
  if (deck.items.length === 0) {
    throw new Error('No words are available in this deck.')
  }

  const popup = window.open('', '_blank')

  if (!popup) {
    throw new Error('Unable to open the print preview window.')
  }

  const items = selectPrintableItems(deck.items, PRINTABLE_ROW_COUNT)
  popup.document.open()
  popup.document.write(buildPrintableHtml(deck, items))
  popup.document.close()
}
