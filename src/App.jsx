import { useState, useCallback } from 'react';
import { APP_STATUS } from './constants/limits.js';
import Recorder      from './components/Recorder.jsx';
import AudioUploader from './components/AudioUploader.jsx';
import AudioPreview  from './components/AudioPreview.jsx';
import LoadingState  from './components/LoadingState.jsx';
import ErrorMessage  from './components/ErrorMessage.jsx';
import WordCloud     from './components/WordCloud.jsx';
import AnalysisPanel from './components/AnalysisPanel.jsx';
import { analyzeAudio } from './lib/api.js';
import './index.css';

/**
 * App.jsx — Root application component.
 *
 * State machine:
 *   IDLE
 *    ├── Start recording → RECORDING → (stop) → READY
 *    └── Select/drop file → READY
 *
 *   READY
 *    └── Analyse → ANALYZING
 *                   ├── success → SUCCESS
 *                   └── error   → ERROR
 *
 *   Any state → Discard/Reset → IDLE
 */

const INITIAL_STATE = {
  status:     APP_STATUS.IDLE,
  audioBlob:  null,
  audioUrl:   null,
  fileName:   null,
  fileSize:   0,
  duration:   0,
  transcript: null,
  topics:     null,
  error:      null,
};

export default function App() {
  const [state, setState] = useState(INITIAL_STATE);

  const patch = useCallback((partial) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  // ── Audio ready (from Recorder or Uploader) ────────────────────────────────
  const handleAudioReady = useCallback(
    (asset) => {
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

  const handleRecordingStart = useCallback(() => {
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    setState({ ...INITIAL_STATE, status: APP_STATUS.RECORDING });
  }, [state.audioUrl]);

  // ── Analyse ────────────────────────────────────────────────────────────────
  const handleAnalyse = useCallback(async () => {
    if (!state.audioBlob) return;
    patch({ status: APP_STATUS.ANALYZING, error: null });

    try {
      const result = await analyzeAudio(state.audioBlob, state.fileName ?? 'recording');

      if (!result.topics?.length) {
        patch({
          status: APP_STATUS.ERROR,
          error:
            "We couldn't find enough speech to analyse in this recording. Try recording again with clearer audio.",
        });
        return;
      }

      patch({
        status:     APP_STATUS.SUCCESS,
        transcript: result.transcript,
        topics:     result.topics,
      });
    } catch (err) {
      const message =
        err?.userMessage ??
        "We couldn't analyse this recording right now. Please try again in a moment.";
      patch({ status: APP_STATUS.ERROR, error: message });
    }
  }, [state.audioBlob, state.fileName, patch]);

  // ── Discard ────────────────────────────────────────────────────────────────
  const handleDiscard = useCallback(() => {
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    setState(INITIAL_STATE);
  }, [state.audioUrl]);

  // ── Retry (keep audio, clear results) ─────────────────────────────────────
  const handleRetry = useCallback(() => {
    patch({
      status:     APP_STATUS.READY,
      transcript: null,
      topics:     null,
      error:      null,
    });
  }, [patch]);

  // ── Derived flags ──────────────────────────────────────────────────────────
  const isIdle      = state.status === APP_STATUS.IDLE;
  const isRecording = state.status === APP_STATUS.RECORDING;
  const isReady     = state.status === APP_STATUS.READY;
  const isAnalyzing = state.status === APP_STATUS.ANALYZING;
  const isSuccess   = state.status === APP_STATUS.SUCCESS;
  const isError     = state.status === APP_STATUS.ERROR;
  const showInputs  = isIdle || isRecording;
  const showPreview = isReady || isError;
  const showResults = isSuccess;

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

          {/* ── Record + Upload (shown when idle or recording) ── */}
          {showInputs && (
            <div className="input-grid animate-slide-up">
              <Recorder
                onAudioReady={handleAudioReady}
                onRecordingStart={handleRecordingStart}
                disabled={false}
              />
              <AudioUploader
                onAudioReady={handleAudioReady}
                disabled={isRecording}
              />
            </div>
          )}

          {/* ── Analysing loading state ── */}
          {isAnalyzing && (
            <LoadingState />
          )}

          {/* ── Audio preview + Analyse button ── */}
          {showPreview && (
            <AudioPreview
              audioUrl={state.audioUrl}
              fileName={state.fileName}
              fileSize={state.fileSize}
              duration={state.duration}
              onDiscard={handleDiscard}
              onAnalyse={handleAnalyse}
              disabled={false}
            />
          )}

          {/* ── Error message ── */}
          {isError && state.error && (
            <ErrorMessage
              message={state.error}
              onRetry={handleRetry}
              onDiscard={handleDiscard}
            />
          )}

          {/* ── Results: Word Cloud + Transcript ── */}
          {showResults && (
            <AnalysisPanel
              topics={state.topics}
              transcript={state.transcript}
              fileName={state.fileName}
              onDiscard={handleDiscard}
            />
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
