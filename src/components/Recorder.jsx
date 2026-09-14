/**
 * Recorder.jsx
 *
 * Browser microphone recording via MediaRecorder API.
 *
 * Handles:
 *  - Requesting microphone permission
 *  - NotAllowedError, NotFoundError, NotReadableError — friendly messages
 *  - Live recording timer
 *  - Stop → Blob → validation → onAudioReady
 *
 * Props:
 *  onAudioReady(asset: AudioAsset) — called with validated recording
 *  onRecordingStart()              — called when recording begins
 *  disabled: boolean
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { validateBlob } from '../lib/audioValidation.js';
import { formatDuration } from '../lib/audioMetadata.js';
import { MAX_DURATION_SECONDS } from '../constants/limits.js';

/** Map MediaRecorder error names to friendly messages */
function getMicErrorMessage(err) {
  if (!err) return 'Could not access microphone. Please try again.';
  const name = err.name ?? '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Microphone access was denied. Allow microphone access in your browser settings and try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No microphone was found. Please connect a microphone and try again.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Your microphone is being used by another application. Close it and try again.';
  }
  return `Could not access microphone: ${err.message ?? name}`;
}

/** Choose the best supported MIME type for MediaRecorder */
function getSupportedMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return '';
}

export default function Recorder({ onAudioReady, onRecordingStart, disabled = false }) {
  const [phase, setPhase] = useState('idle');   // idle | requesting | recording | processing
  const [elapsed, setElapsed] = useState(0);    // seconds elapsed during recording
  const [micError, setMicError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const streamRef        = useRef(null);
  const timerRef         = useRef(null);
  const mimeTypeRef      = useRef('');

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── Auto-stop at 10 minutes ────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'recording' && elapsed >= MAX_DURATION_SECONDS) {
      stopRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, phase]);

  // ── Start recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (disabled) return;
    setMicError(null);
    setPhase('requesting');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setMicError(getMicErrorMessage(err));
      setPhase('idle');
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = getSupportedMimeType();
    mimeTypeRef.current = mimeType;

    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    } catch {
      recorder = new MediaRecorder(stream);
    }

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      clearInterval(timerRef.current);
      stream.getTracks().forEach((t) => t.stop());
      setPhase('processing');

      const blob = new Blob(chunksRef.current, {
        type: mimeTypeRef.current || 'audio/webm',
      });

      const result = await validateBlob(blob);
      if (!result.valid) {
        setMicError(result.error);
        setPhase('idle');
        setElapsed(0);
        return;
      }

      setPhase('idle');
      setElapsed(0);

      onAudioReady({
        blob,
        fileName: `Recording ${new Date().toLocaleTimeString()}`,
        fileSize: blob.size,
        duration: result.duration,
        mimeType: blob.type,
      });
    };

    recorder.start(500); // Collect data every 500ms
    setPhase('recording');
    setElapsed(0);
    onRecordingStart?.();

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, [disabled, onAudioReady, onRecordingStart]);

  // ── Stop recording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isRequesting  = phase === 'requesting';
  const isRecording   = phase === 'recording';
  const isProcessing  = phase === 'processing';
  const isIdle        = phase === 'idle';

  return (
    <div className="recorder-panel card">
      <h2 className="panel-title">Record Audio</h2>

      {/* Recording state */}
      {isRecording ? (
        <div className="recorder-active">
          <div className="recorder-indicator">
            <span className="recording-dot" aria-hidden="true" />
            <span className="recording-label">Recording</span>
          </div>
          <div className="recorder-timer" aria-live="polite" aria-label={`Recording time: ${formatDuration(elapsed)}`}>
            {formatDuration(elapsed)}
          </div>
          <div className="recorder-time-remaining text-muted" style={{ fontSize: 'var(--text-xs)' }}>
            {formatDuration(MAX_DURATION_SECONDS - elapsed)} remaining
          </div>
          <button
            className="btn btn-danger w-full"
            onClick={stopRecording}
            aria-label="Stop recording"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
            Stop Recording
          </button>
        </div>
      ) : (
        <div className="recorder-idle">
          {/* Mic icon */}
          <div className={`recorder-icon ${isRequesting || isProcessing ? 'recorder-icon--busy' : ''}`} aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {isRequesting && <p className="text-muted" style={{ fontSize: 'var(--text-sm)', textAlign: 'center' }}>Requesting microphone…</p>}
          {isProcessing && (
            <div className="flex items-center gap-2 justify-center">
              <div className="spinner" />
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Processing recording…</p>
            </div>
          )}

          {isIdle && !micError && (
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)', textAlign: 'center' }}>
              Record directly from your microphone
            </p>
          )}

          {/* Mic error */}
          {micError && (
            <div className="recorder-error" role="alert" aria-live="polite">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{micError}</span>
            </div>
          )}

          <button
            className="btn btn-primary w-full"
            onClick={startRecording}
            disabled={disabled || isRequesting || isProcessing}
            aria-label="Start recording"
            id="btn-start-recording"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
            </svg>
            {isRequesting ? 'Requesting mic…' : isProcessing ? 'Processing…' : 'Start Recording'}
          </button>
        </div>
      )}
    </div>
  );
}
