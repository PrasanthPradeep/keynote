import { useState, useCallback, useEffect } from 'react';
import { APP_STATUS } from './constants/limits.js';
import Recorder      from './components/Recorder.jsx';
import AudioUploader from './components/AudioUploader.jsx';
import AudioPreview  from './components/AudioPreview.jsx';
import LoadingState  from './components/LoadingState.jsx';
import ErrorMessage  from './components/ErrorMessage.jsx';
import WordCloud     from './components/WordCloud.jsx';
import AnalysisPanel from './components/AnalysisPanel.jsx';
import HistoryPanel  from './components/HistoryPanel.jsx';
import { analyzeAudio } from './lib/api.js';
import { loadHistory, saveAnalysis, deleteAnalysis, clearHistory } from './lib/history.js';
import './index.css';

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('keynote-theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  return 'light';
}

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
  const [theme, setTheme] = useState(getInitialTheme);
  const [removedWords, setRemovedWords] = useState(() => new Set());
  const [historyEntries, setHistoryEntries] = useState(loadHistory);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('keynote-theme', theme); } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // ── Removed words ──────────────────────────────────────────────────────────
  const handleRemoveWord = useCallback((word) => {
    setRemovedWords((prev) => new Set(prev).add(word));
  }, []);

  const handleRestoreWord = useCallback((word) => {
    setRemovedWords((prev) => {
      const next = new Set(prev);
      next.delete(word);
      return next;
    });
  }, []);

  // ── History ────────────────────────────────────────────────────────────────
  const refreshHistory = useCallback(() => {
    setHistoryEntries(loadHistory());
  }, []);

  const handleLoadHistory = useCallback((entry) => {
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    setState({
      ...INITIAL_STATE,
      status:     APP_STATUS.SUCCESS,
      transcript: entry.transcript,
      topics:     entry.topics,
      fileName:   entry.fileName,
    });
    setRemovedWords(new Set());
  }, [state.audioUrl]);

  const handleDeleteHistory = useCallback((id) => {
    deleteAnalysis(id);
    refreshHistory();
  }, [refreshHistory]);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    refreshHistory();
  }, [refreshHistory]);

  const patch = useCallback((partial) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

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

      // Save to history
      saveAnalysis({
        fileName:   state.fileName ?? 'recording',
        topics:     result.topics,
        transcript: result.transcript,
      });
      refreshHistory();
    } catch (err) {
      const message =
        err?.userMessage ??
        "We couldn't analyse this recording right now. Please try again in a moment.";
      patch({ status: APP_STATUS.ERROR, error: message });
    }
  }, [state.audioBlob, state.fileName, patch]);

  const handleDiscard = useCallback(() => {
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    setState(INITIAL_STATE);
    setRemovedWords(new Set());
  }, [state.audioUrl]);

  const handleRetry = useCallback(() => {
    patch({
      status:     APP_STATUS.READY,
      transcript: null,
      topics:     null,
      error:      null,
    });
  }, [patch]);

  const isIdle      = state.status === APP_STATUS.IDLE;
  const isRecording = state.status === APP_STATUS.RECORDING;
  const isReady     = state.status === APP_STATUS.READY;
  const isAnalyzing = state.status === APP_STATUS.ANALYZING;
  const isSuccess   = state.status === APP_STATUS.SUCCESS;
  const isError     = state.status === APP_STATUS.ERROR;
  const showInputs  = isIdle || isRecording;
  const showPreview = isReady || isError;
  const showResults = isSuccess;

  return (
    <div className="app-layout">
      <header className="app-nav">
        <div className="app-nav-inner">
          <div className="app-nav-brand">
            <img src="/logo.jpeg" width="22" height="22" alt="Keynote logo" aria-hidden="true" style={{ display: 'block', borderRadius: '5px' }} />
            Keynote
          </div>
          <div className="flex items-center gap-3">
            <span className="app-nav-tagline">Session Word Cloud</span>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-container">
          <section className="hero animate-fade-in">
            <div className="hero-badge badge badge-primary">
              <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
                <circle cx="4" cy="4" r="4" />
              </svg>
              AI-Powered
            </div>
            <h1 className="hero-title">
              Turn mentoring sessions<br />
              into <span className="hero-highlight">key insights</span>
            </h1>
            <p className="hero-subtitle">
              Record or upload a session audio. Keynote extracts the most
              meaningful topics and renders them as a word cloud.
            </p>
          </section>

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

          {isAnalyzing && (
            <LoadingState />
          )}

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

          {isError && state.error && (
            <ErrorMessage
              message={state.error}
              onRetry={handleRetry}
              onDiscard={handleDiscard}
            />
          )}

          {showResults && (
            <AnalysisPanel
              topics={state.topics}
              transcript={state.transcript}
              fileName={state.fileName}
              onDiscard={handleDiscard}
              removedWords={removedWords}
              onRemoveWord={handleRemoveWord}
              onRestoreWord={handleRestoreWord}
            />
          )}

          {/* ── History ── */}
          {historyEntries.length > 0 && !showResults && (
            <HistoryPanel
              entries={historyEntries}
              onLoad={handleLoadHistory}
              onDelete={handleDeleteHistory}
              onClearAll={handleClearHistory}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <span className="app-footer-text">
            Built by{' '}
            <a
              href="https://prasanthp.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="app-footer-link"
            >
              Prasanth P
            </a>
          </span>
          <span className="app-footer-dot">•</span>
          <a
            href="https://github.com/PrasanthPradeep"
            target="_blank"
            rel="noopener noreferrer"
            className="app-footer-link"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
