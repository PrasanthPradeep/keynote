/**
 * LoadingState.jsx
 *
 * Horizontal progress bar with stage checklist shown during AI analysis.
 *
 * Props:
 *  progress:  number 0-100 — overall progress percentage
 *  stage:     number 0-3   — current stage index
 */

import { STAGES } from '../constants/limits.js';

export default function LoadingState({ progress = 0, stage = 0 }) {
  return (
    <div className="loading-panel card animate-scale-in" role="status" aria-live="polite" aria-label="Analysing recording">
      <h3 className="loading-title">Analysing recording…</h3>
      <p className="loading-subtitle text-muted">
        Transcribing and extracting key topics
      </p>

      <div className="progress-bar-wrap" aria-label={`Progress: ${Math.round(progress)}%`}>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className="progress-bar-pct">{Math.round(progress)}%</span>
      </div>

      <ol className="loading-stages" aria-label="Analysis progress">
        {STAGES.map((label, i) => {
          const isDone    = i < stage;
          const isCurrent = i === stage;
          return (
            <li
              key={label}
              className={[
                'loading-stage',
                isDone    ? 'loading-stage--done'    : '',
                isCurrent ? 'loading-stage--current' : '',
              ].filter(Boolean).join(' ')}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="loading-stage-dot" aria-hidden="true">
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isCurrent ? (
                  <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                ) : (
                  <span className="loading-stage-dot-empty" />
                )}
              </span>
              <span className="loading-stage-label">{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
