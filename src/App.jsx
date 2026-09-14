import { useState, useCallback } from 'react';
import { APP_STATUS } from './constants/limits.js';
import './index.css';

/**
 * App.jsx — Root application component.
 *
 * Owns all application state. Child components receive only the slices they need.
 *
 * State machine:
 *   IDLE
 *    ├── Start recording → RECORDING
 *    │       └── Stop → RECORDED
 *    └── Select/drop file → UPLOADING → READY
 *
 *   READY / RECORDED
 *    └── Analyse → ANALYZING
 *                   ├── success → SUCCESS
 *                   └── error   → ERROR
 *
 *   Any state
 *    └── Discard/Reset → IDLE
 */

/** Initial state shape */
const INITIAL_STATE = {
  status:     APP_STATUS.IDLE,
  audioBlob:  null,   // Blob — from recording or uploaded File
  audioUrl:   null,   // Object URL for <audio> preview
  fileName:   null,   // Original filename or 'Recording'
  fileSize:   0,      // Bytes
  duration:   0,      // Seconds (from validation decode)
  transcript: null,   // String from Gemini
  topics:     null,   // Array<{ word, weight }> from Gemini
  error:      null,   // Error message string
};

export default function App() {
  const [state, setState] = useState(INITIAL_STATE);

  // ── State transitions ──────────────────────────────────────────────────────

  /** Merge partial state (like setState in class components) */
  const patch = useCallback((partial) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  /**
   * Called by Recorder or AudioUploader when audio is ready.
   * Validates and moves to READY state.
   *
   * @param {{ blob: Blob, fileName: string, fileSize: number, duration: number, mimeType: string }} asset
   */
  const handleAudioReady = useCallback(
    (asset) => {
      // Revoke any previous object URL to avoid memory leaks
      if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);

      const audioUrl = URL.createObjectURL(asset.blob);

      setState({
        ...INITIAL_STATE,
        status:    APP_STATUS.READY,
        audioBlob: asset.blob,
        audioUrl,
        fileName:  asset.fileName,
        fileSize:  asset.fileSize,
        duration:  asset.duration,
      });
    },
    [state.audioUrl]
  );

  /** Called when recording starts */
  const handleRecordingStart = useCallback(() => {
    // Revoke old URL if any
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    setState({ ...INITIAL_STATE, status: APP_STATUS.RECORDING });
  }, [state.audioUrl]);

  /** Called when user clicks Analyse */
  const handleAnalyzeStart = useCallback(() => {
    patch({ status: APP_STATUS.ANALYZING, error: null });
  }, [patch]);

  /** Called when AI response arrives */
  const handleAnalysisSuccess = useCallback(({ transcript, topics }) => {
    patch({ status: APP_STATUS.SUCCESS, transcript, topics });
  }, [patch]);

  /** Called when analysis fails */
  const handleAnalysisError = useCallback((errorMessage) => {
    patch({ status: APP_STATUS.ERROR, error: errorMessage });
  }, [patch]);

  /** Reset everything back to IDLE */
  const handleDiscard = useCallback(() => {
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    setState(INITIAL_STATE);
  }, [state.audioUrl]);

  // ── Derived flags ──────────────────────────────────────────────────────────
  const isIdle      = state.status === APP_STATUS.IDLE;
  const isRecording = state.status === APP_STATUS.RECORDING;
  const isReady     = state.status === APP_STATUS.READY || state.status === APP_STATUS.RECORDED;
  const isAnalyzing = state.status === APP_STATUS.ANALYZING;
  const isSuccess   = state.status === APP_STATUS.SUCCESS;
  const isError     = state.status === APP_STATUS.ERROR;
  const hasResult   = isSuccess;
  const hasAudio    = isReady || isAnalyzing || isSuccess || isError;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-layout">
      {/* ── Navigation ── */}
      <header className="app-nav">
        <div className="app-nav-inner">
          <div className="app-nav-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="currentColor"
                opacity="0.9"
              />
            </svg>
            <span>Keynote</span>
          </div>
          <span className="app-nav-tagline">Session Word Cloud</span>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="app-main">
        <div className="app-container">
          {/* Hero */}
          <section className="hero animate-fade-in">
            <div className="hero-badge badge badge-primary">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
                <circle cx="4" cy="4" r="4" />
              </svg>
              AI-Powered Analysis
            </div>
            <h1 className="hero-title">
              Turn mentoring sessions<br />
              into <span className="hero-highlight">key insights</span>
            </h1>
            <p className="hero-subtitle">
              Record or upload a session audio file. Keynote uses Gemini AI to extract
              the most meaningful topics and render them as a beautiful word cloud.
            </p>
          </section>

          {/* ── DEBUG: Status indicator (dev only, removed later) ── */}
          {import.meta.env.DEV && (
            <div className="dev-status-bar">
              <span className="badge badge-primary">
                DEV · Status: <strong>{state.status}</strong>
              </span>
            </div>
          )}

          {/* ── Input section (Recorder + Uploader) ── */}
          {(isIdle || isRecording) && (
            <div className="input-grid animate-slide-up">
              {/* Recorder and Uploader will be placed here in Phase 4/5 */}
              <div className="placeholder-panel card">
                <div className="placeholder-inner">
                  <div className="placeholder-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="placeholder-label">Record Audio</p>
                  <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Coming in Phase 5</p>
                </div>
              </div>
              <div className="placeholder-panel card">
                <div className="placeholder-inner">
                  <div className="placeholder-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="placeholder-label">Upload Audio</p>
                  <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Coming in Phase 4</p>
                </div>
              </div>
            </div>
          )}

          {/* Audio preview + Analyse button — shown once audio is loaded */}
          {hasAudio && (
            <div className="audio-ready-section card animate-slide-up">
              <div className="audio-ready-header">
                <div className="audio-ready-info">
                  <p className="audio-ready-name">{state.fileName ?? 'Recording'}</p>
                  <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                    Audio loaded · Analysis panel coming in Phase 9
                  </p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleDiscard}
                  aria-label="Discard audio"
                >
                  ✕ Discard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span className="text-subtle" style={{ fontSize: 'var(--text-xs)' }}>
          Keynote · Powered by Gemini AI
        </span>
      </footer>
    </div>
  );
}
