export function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function gradeAnswer(userAnswer: string, correctAnswer: string) {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer)
}
