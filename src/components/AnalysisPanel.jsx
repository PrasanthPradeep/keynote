/**
 * AnalysisPanel.jsx
 *
 * Displays the analysis results — word cloud + transcript.
 * The top-level result view shown after successful AI analysis.
 *
 * Props:
 *  topics:     Array<{ word: string, weight: number }>
 *  transcript: string
 *  fileName:   string
 *  onDiscard:  () => void
 */

import { useState } from 'react';
import WordCloud from './WordCloud.jsx';

export default function AnalysisPanel({ topics, transcript, fileName, onDiscard, removedWords, onRemoveWord, onRestoreWord }) {
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [copied, setCopied]                           = useState(false);

  const copyTranscript = () => {
    if (!transcript) return;

    const notifyCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(transcript)
        .then(notifyCopied)
        .catch(() => {
          fallbackCopy(transcript);
          notifyCopied();
        });
    } else {
      fallbackCopy(transcript);
      notifyCopied();
    }
  };

  const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch {}
    document.body.removeChild(textarea);
  };

  return (
    <div className="results-section animate-slide-up">
      {/* ── Header ── */}
      <div className="results-header">
        <div>
          <h2 className="results-title">Key Topics</h2>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            From: <em>{fileName}</em>
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onDiscard}
          id="btn-analyse-new"
          aria-label="Analyse a new recording"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeLinecap="round" />
          </svg>
          Analyse New Recording
        </button>
      </div>

      {/* ── Removed words undo bar ── */}
      {removedWords?.size > 0 && (
        <div className="removed-words-bar animate-fade-in">
          <span className="removed-words-label text-subtle" style={{ fontSize: 'var(--text-xs)' }}>
            Removed:
          </span>
          {[...removedWords].map((word) => (
            <button
              key={word}
              className="removed-word-chip"
              onClick={() => onRestoreWord(word)}
              aria-label={`Restore ${word}`}
            >
              {word}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* ── Word cloud card ── */}
      <div className="card results-cloud-card">
        <WordCloud topics={topics} removedWords={removedWords} onRemoveWord={onRemoveWord} />
      </div>

      {/* ── Topic list ── */}
      <div className="card results-topics-card">
        <h3 className="results-subtitle">Topics by Prominence</h3>
        <ol className="topic-list" aria-label="Topics ranked by prominence">
          {[...topics]
            .sort((a, b) => b.weight - a.weight)
            .map((t, i) => (
              <li key={t.word} className="topic-item">
                <span className="topic-rank text-subtle">#{i + 1}</span>
                <span className="topic-word">{t.word}</span>
                <div className="topic-bar-wrap">
                  <div
                    className="topic-bar"
                    style={{
                      width: `${(t.weight / topics[0]?.weight || 1) * 100}%`,
                    }}
                    role="meter"
                    aria-valuenow={t.weight}
                    aria-label={`Prominence: ${t.weight}`}
                  />
                </div>
                <span className="topic-weight text-subtle">{t.weight}</span>
              </li>
            ))}
        </ol>
      </div>

      {/* ── Transcript ── */}
      {transcript && (
        <div className="card results-transcript-card">
          <div className="transcript-header">
            <h3 className="results-subtitle">Transcript</h3>
            <div className="transcript-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={copyTranscript}
                id="btn-copy-transcript"
                aria-label="Copy transcript to clipboard"
                style={{ transition: 'all 200ms ease' }}
              >
                {copied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setTranscriptExpanded((v) => !v)}
                aria-expanded={transcriptExpanded}
                aria-controls="transcript-body"
                id="btn-toggle-transcript"
              >
                {transcriptExpanded ? 'Collapse' : 'Expand'}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ transform: transcriptExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          </div>
          <p
            id="transcript-body"
            className={`transcript-body ${transcriptExpanded ? 'transcript-body--expanded' : ''}`}
          >
            {transcript}
          </p>
        </div>
      )}
    </div>
  );
}
