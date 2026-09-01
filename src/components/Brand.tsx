export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand${compact ? ' brand--compact' : ''}`} aria-label="Fantasy Assistant">
      <svg className="brand__mark" viewBox="0 0 64 70" aria-hidden="true">
        <path d="M32 3 57 11v20c0 16.5-10.6 28.8-25 36C17.6 59.8 7 47.5 7 31V11L32 3Z" />
        <path className="brand__letter" d="M18 19h29l-3 8H30l-2 7h13l-3 8H25l-5 11H10l8-34Z" />
        <path className="brand__accent" d="m36 19-6 15h11l7-15H36Z" />
      </svg>
      {!compact && (
        <span className="brand__wordmark">
          <span>Fantasy</span>
          <strong>Assistant</strong>
        </span>
      )}
    </div>
  )
}
