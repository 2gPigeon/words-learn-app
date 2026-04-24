export function formatDateTime(timestamp: number | null | undefined) {
  if (!timestamp) {
    return '-'
  }

  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function formatPercent(correct: number, total: number) {
  if (total === 0) {
    return '0%'
  }

  return `${Math.round((correct / total) * 100)}%`
}
