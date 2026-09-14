/**
 * AudioUploader.jsx
 *
 * Drag-and-drop / file-input audio uploader.
 * On selection, validates the file and calls onAudioReady with the AudioAsset.
 *
 * Props:
 *   onAudioReady(asset: AudioAsset) — called when a valid file is selected
 *   disabled: boolean
 */

import { useState, useRef, useCallback, useId } from 'react';
import { validateFile } from '../lib/audioValidation.js';
import { formatFileSize, formatDuration } from '../lib/audioMetadata.js';
import { SUPPORTED_FORMATS_DISPLAY, MAX_SIZE_DISPLAY, MAX_DURATION_DISPLAY } from '../constants/limits.js';

export default function AudioUploader({ onAudioReady, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [localError, setLocalError] = useState(null);
  const inputRef = useRef(null);
  const inputId  = useId();

  const processFile = useCallback(
    async (file) => {
      if (!file || disabled) return;
      setLocalError(null);
      setIsValidating(true);

      const result = await validateFile(file);
      setIsValidating(false);

      if (!result.valid) {
        setLocalError(result.error);
        return;
      }

      onAudioReady({
        blob:     file,
        fileName: file.name,
        fileSize: file.size,
        duration: result.duration,
        mimeType: file.type,
      });
    },
    [disabled, onAudioReady]
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear when leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [disabled, processFile]
  );

  const onInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [processFile]
  );

  return (
    <div className="uploader-panel card">
      <h2 className="panel-title">Upload Audio</h2>

      {/* Drop zone */}
      <label
        htmlFor={inputId}
        className={[
          'drop-zone',
          isDragging    ? 'drop-zone--dragging'   : '',
          isValidating  ? 'drop-zone--validating' : '',
          disabled      ? 'drop-zone--disabled'   : '',
          localError    ? 'drop-zone--error'      : '',
        ].filter(Boolean).join(' ')}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        aria-label="Drop audio file or click to browse"
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac"
          onChange={onInputChange}
          disabled={disabled || isValidating}
          className="drop-zone-input"
          aria-label="Select audio file"
        />

        <div className="drop-zone-content">
          {isValidating ? (
            <>
              <div className="spinner" aria-hidden="true" />
              <p className="drop-zone-label">Checking file…</p>
            </>
          ) : isDragging ? (
            <>
              <div className="drop-zone-icon drop-zone-icon--active" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="drop-zone-label">Release to upload</p>
            </>
          ) : (
            <>
              <div className="drop-zone-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="drop-zone-label">
                <span className="drop-zone-action">Choose audio file</span>
                <br />
                <span className="text-muted">or drag &amp; drop here</span>
              </p>
              <div className="drop-zone-meta">
                <span>{SUPPORTED_FORMATS_DISPLAY}</span>
                <span className="drop-zone-meta-sep">·</span>
                <span>Max {MAX_SIZE_DISPLAY}</span>
                <span className="drop-zone-meta-sep">·</span>
                <span>Max {MAX_DURATION_DISPLAY}</span>
              </div>
            </>
          )}
        </div>
      </label>

      {/* Validation error */}
      {localError && (
        <div className="uploader-error" role="alert" aria-live="polite">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {localError}
        </div>
      )}
    </div>
  );
}
