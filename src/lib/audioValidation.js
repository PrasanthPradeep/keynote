/**
 * audioValidation.js
 *
 * Validates an audio File before it is sent for analysis.
 * All checks happen client-side before any network request.
 *
 * Checks (in order):
 *  1. File exists
 *  2. Format (MIME type + extension fallback)
 *  3. Size (<= 25 MB)
 *  4. Duration (<= 10 minutes)
 */

import {
  BRIEF_REF_5190_MAX_BYTES,
  MAX_DURATION_SECONDS,
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_EXTENSIONS,
} from '../constants/limits.js';
import { getAudioDuration } from './audioMetadata.js';

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid   - Whether the file passed all checks
 * @property {string}  [error] - Human-readable error message if invalid
 * @property {number}  [duration] - Decoded duration in seconds (only when valid)
 */

/**
 * Validate an audio file.
 * Returns as soon as the first check fails (fast-fail).
 *
 * @param {File} file
 * @returns {Promise<ValidationResult>}
 */
export async function validateFile(file) {
  // ── Check 1: file must exist ────────────────────────────────────────────────
  if (!file) {
    return { valid: false, error: 'Please select an audio file.' };
  }

  // ── Check 2: format ─────────────────────────────────────────────────────────
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mimeOk = SUPPORTED_AUDIO_TYPES.includes(file.type);
  const extOk  = SUPPORTED_EXTENSIONS.includes(extension);

  if (!mimeOk && !extOk) {
    return {
      valid: false,
      error:
        'Unsupported audio format. Please choose MP3, WAV, M4A, AAC, OGG, WEBM or FLAC.',
    };
  }

  // ── Check 3: size ───────────────────────────────────────────────────────────
  if (file.size > BRIEF_REF_5190_MAX_BYTES) {
    return {
      valid: false,
      error: 'This file is larger than the 25 MB limit.',
    };
  }

  // ── Check 4: duration ───────────────────────────────────────────────────────
  let duration = 0;
  try {
    duration = await getAudioDuration(file);
  } catch {
    // If duration check fails entirely, let it through — we've already validated
    // format and size. The server will handle corrupt audio gracefully.
    duration = 0;
  }

  if (duration > MAX_DURATION_SECONDS) {
    return {
      valid: false,
      error: 'This recording is longer than the 10-minute limit.',
    };
  }

  return { valid: true, duration };
}

/**
 * Validate a recorded Blob (from MediaRecorder).
 * Blobs don't have filenames so we skip the extension check.
 *
 * @param {Blob} blob
 * @returns {Promise<ValidationResult>}
 */
export async function validateBlob(blob) {
  if (!blob) {
    return { valid: false, error: 'No recording found.' };
  }

  // Size check
  if (blob.size > BRIEF_REF_5190_MAX_BYTES) {
    return {
      valid: false,
      error: 'This recording exceeds the 25 MB size limit.',
    };
  }

  // Duration check
  let duration = 0;
  try {
    duration = await getAudioDuration(blob);
  } catch {
    duration = 0;
  }

  if (duration > MAX_DURATION_SECONDS) {
    return {
      valid: false,
      error: 'This recording is longer than the 10-minute limit.',
    };
  }

  return { valid: true, duration };
}
