interface ProgressBarProps {
  value: number
  max: number
  label: string
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0

  return (
    <div className="progress" aria-label={label}>
      <div className="progress__label">
        <span>{label}</span>
        <strong>
          {value}/{max}
        </strong>
      </div>
      <div className="progress__track">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
