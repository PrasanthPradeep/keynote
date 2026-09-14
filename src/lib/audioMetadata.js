/**
 * audioMetadata.js
 *
 * Decodes an audio File/Blob using the Web Audio API to extract duration.
 * Falls back gracefully when decoding is not possible.
 */

/**
 * Get the duration of an audio file by decoding it in the browser.
 *
 * @param {File|Blob} file
 * @returns {Promise<number>} Duration in seconds, or Infinity if undeterminable
 */
export async function getAudioDuration(file) {
  return new Promise((resolve) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      // Cannot decode — can't reject valid files, so return 0
      resolve(0);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const ctx = new AudioContext();
      ctx
        .decodeAudioData(e.target.result)
        .then((buffer) => {
          ctx.close();
          resolve(buffer.duration);
        })
        .catch(() => {
          ctx.close();
          // Decoding failed (possibly corrupt) — surface as Infinity to block it
          resolve(Infinity);
        });
    };

    reader.onerror = () => resolve(Infinity);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Format bytes into a human-readable string (e.g. "4.2 MB")
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i >= 2 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format seconds into MM:SS string (e.g. 125 → "2:05")
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatDuration(totalSeconds) {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
