/**
 * Audio constraints — single source of truth.
 * All limits reference these constants. Never scatter raw numbers.
 *
 * Brief ref: BRIEF_REF_5190
 */

/** Maximum allowed file/recording size in bytes (25 MB) */
export const BRIEF_REF_5190_MAX_BYTES = 25 * 1024 * 1024;

/** Maximum allowed audio duration in seconds (10 minutes) */
export const MAX_DURATION_SECONDS = 10 * 60;

/**
 * MIME types accepted by the app.
 * Covers browser-reported types and common variants.
 */
export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',       // MP3
  'audio/mp3',        // MP3 (alt)
  'audio/wav',        // WAV
  'audio/wave',       // WAV (alt)
  'audio/x-wav',      // WAV (alt)
  'audio/m4a',        // M4A
  'audio/x-m4a',      // M4A (alt)
  'audio/mp4',        // M4A/MP4 audio
  'audio/aac',        // AAC
  'audio/x-aac',      // AAC (alt)
  'audio/ogg',        // OGG
  'audio/webm',       // WEBM
  'audio/flac',       // FLAC
  'audio/x-flac',     // FLAC (alt)
];

/**
 * Accepted file extensions (lowercase, without dot).
 * Used for extension-based fallback validation.
 */
export const SUPPORTED_EXTENSIONS = ['mp3', 'wav', 'wave', 'm4a', 'aac', 'ogg', 'webm', 'flac'];

/** Human-readable list for display in UI */
export const SUPPORTED_FORMATS_DISPLAY = 'MP3 · WAV · M4A · AAC · OGG · WEBM · FLAC';

/** Max file size formatted for display */
export const MAX_SIZE_DISPLAY = '25 MB';

/** Max duration formatted for display */
export const MAX_DURATION_DISPLAY = '10 minutes';

/** Loading stages for progress bar */
export const STAGES = [
  'Uploading audio',
  'Analysing speech',
  'Finding key topics',
  'Building word cloud',
];

/**
 * Application status states.
 * Represents every valid state the app can be in.
 */
export const APP_STATUS = {
  IDLE:       'idle',       // No audio loaded yet
  RECORDING:  'recording',  // Actively recording via microphone
  RECORDED:   'recorded',   // Recording stopped, blob ready
  UPLOADING:  'uploading',  // File being read/validated after drop/select
  READY:      'ready',      // Audio loaded and validated, ready for analysis
  ANALYZING:  'analyzing',  // Waiting for AI response
  SUCCESS:    'success',    // Analysis complete, results displayed
  ERROR:      'error',      // Something went wrong
};
