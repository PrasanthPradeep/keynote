/**
 * ErrorMessage.jsx
 *
 * Displays user-friendly error messages with retry and discard actions.
 *
 * Props:
 *  message:   string
 *  onRetry:   () => void  — try again with the same audio
 *  onDiscard: () => void  — discard and start over
 */

export default function ErrorMessage({ message, onRetry, onDiscard }) {
  return (
    <div
      className="error-panel card animate-scale-in"
      role="alert"
      aria-live="assertive"
    >
      <div className="error-icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeWidth="2.5" />
        </svg>
      </div>

      <h3 className="error-title">Something went wrong</h3>
      <p className="error-message">{message}</p>

      <div className="error-actions">
        {onRetry && (
          <button
            className="btn btn-primary"
            onClick={onRetry}
            id="btn-retry-analysis"
            aria-label="Try analysing again"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeLinecap="round" />
            </svg>
            Try Again
          </button>
        )}
        <button
          className="btn btn-ghost"
          onClick={onDiscard}
          id="btn-discard-after-error"
          aria-label="Start over with a new recording"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
