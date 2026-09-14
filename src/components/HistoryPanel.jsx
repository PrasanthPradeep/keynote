/**
 * HistoryPanel.jsx
 *
 * Displays a list of past analyses stored in localStorage.
 * Users can load a past result or delete entries.
 *
 * Props:
 *  entries:      Array<{ id, fileName, date, topics, transcript }>
 *  onLoad:       (entry) => void  — load a past analysis into results view
 *  onDelete:     (id) => void     — remove an entry
 *  onClearAll:   () => void       — clear all history
 */

import { formatDuration } from '../lib/audioMetadata.js';

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HistoryPanel({ entries, onLoad, onDelete, onClearAll }) {
  if (!entries.length) return null;

  return (
    <div className="history-panel animate-fade-in">
      <div className="history-header">
        <h3 className="history-title">Past Sessions</h3>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onClearAll}
          aria-label="Clear all history"
        >
          Clear all
        </button>
      </div>

      <ul className="history-list" aria-label="Past analysis sessions">
        {entries.map((entry) => (
          <li key={entry.id} className="history-item">
            <button
              className="history-item-load"
              onClick={() => onLoad(entry)}
              aria-label={`Load session: ${entry.fileName}`}
            >
              <div className="history-item-info">
                <span className="history-item-name">{entry.fileName}</span>
                <span className="history-item-meta">
                  {entry.topics.length} topics · {formatDate(entry.date)}
                </span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              className="history-item-delete"
              onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
              aria-label={`Delete session: ${entry.fileName}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
