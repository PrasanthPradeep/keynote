/**
 * LoadingState.jsx
 *
 * Multi-stage loading indicator shown during AI analysis.
 * Uses a timed sequence to show realistic stage labels
 * even though we don't get granular progress from the API.
 */

import { useState, useEffect } from 'react';

const STAGES = [
  { label: 'Uploading audio',        duration: 2500 },
  { label: 'Analysing speech',       duration: 4000 },
  { label: 'Finding key topics',     duration: 4000 },
  { label: 'Preparing word cloud',   duration: 99999 }, // stays until done
];

export default function LoadingState() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    let timeoutIds = [];
    let cumulative = 0;

    STAGES.forEach((stage, i) => {
      if (i === 0) return; // start at 0
      cumulative += STAGES[i - 1].duration;
      const id = setTimeout(() => {
        setStageIndex(i);
      }, cumulative);
      timeoutIds.push(id);
    });

    return () => timeoutIds.forEach(clearTimeout);
  }, []);

  return (
    <div className="loading-panel card animate-scale-in" role="status" aria-live="polite" aria-label="Analysing recording">
      {/* Spinner */}
      <div className="loading-spinner-wrap" aria-hidden="true">
        <div className="spinner spinner-lg" />
      </div>

      <h3 className="loading-title">Analysing recording…</h3>
      <p className="loading-subtitle text-muted">
        Keynote AI is transcribing and extracting key topics.
        This may take up to 30 seconds.
      </p>

      {/* Stage steps */}
      <ol className="loading-stages" aria-label="Analysis progress">
        {STAGES.map((stage, i) => {
          const isDone    = i < stageIndex;
          const isCurrent = i === stageIndex;
          return (
            <li
              key={stage.label}
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
              <span className="loading-stage-label">{stage.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
