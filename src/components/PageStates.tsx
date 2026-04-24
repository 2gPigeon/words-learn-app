interface LoadingStateProps {
  label?: string
}

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function LoadingState({ label = '読み込み中' }: LoadingStateProps) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({
  title = '読み込みに失敗しました',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry ? (
        <button className="button button--primary" type="button" onClick={onRetry}>
          再試行
        </button>
      ) : null}
    </div>
  )
}
