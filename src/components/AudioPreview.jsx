/**
 * AudioPreview.jsx
 *
 * Shared audio preview component — works identically for uploaded files
 * and microphone recordings. Displays metadata + native playback controls.
 *
 * Props:
 *  audioUrl:  string  — Object URL for <audio>
 *  fileName:  string
 *  fileSize:  number  — bytes
 *  duration:  number  — seconds
 *  onDiscard: () => void
 *  onAnalyse: () => void
 *  disabled:  boolean — disables analyse button during analysis
 */

import { formatFileSize, formatDuration } from '../lib/audioMetadata.js';

export default function AudioPreview({
  audioUrl,
  fileName,
  fileSize,
  duration,
  onDiscard,
  onAnalyse,
  disabled = false,
}) {
  return (
    <div className="preview-panel card animate-fade-in">
      {/* Header */}
      <div className="preview-header">
        <div className="preview-file-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div className="preview-file-info">
          <p className="preview-file-name" title={fileName}>{fileName}</p>
          <div className="preview-meta">
            {duration > 0 && (
              <span className="preview-meta-item">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {formatDuration(duration)}
              </span>
            )}
            {fileSize > 0 && (
              <span className="preview-meta-item">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {formatFileSize(fileSize)}
              </span>
            )}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm preview-discard"
          onClick={onDiscard}
          aria-label="Discard recording"
          id="btn-discard-audio"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Discard
        </button>
      </div>

      {/* Native audio player */}
      <audio
        src={audioUrl}
        controls
        className="preview-audio-player"
        aria-label={`Audio preview: ${fileName}`}
      />

      {/* Analyse button */}
      <button
        className="btn btn-primary btn-lg w-full"
        onClick={onAnalyse}
        disabled={disabled}
        id="btn-analyse-audio"
        aria-label="Analyse audio with AI"
      >
        {disabled ? (
          <>
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} aria-hidden="true" />
            Analysing…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Analyse Audio
          </>
        )}
      </button>
    </div>
  );
}
