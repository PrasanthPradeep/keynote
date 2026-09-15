/**
 * api.js — Frontend API client
 *
 * Wraps the POST /api/analyze endpoint.
 * Components talk to this; they never know about the AI provider directly.
 *
 * Returns:
 *  { transcript: string, topics: Array<{ word: string, weight: number }> }
 *
 * Throws errors with a .userMessage property for display.
 */

/**
 * Analyse an audio blob/file via the backend.
 *
 * @param {Blob|File} audioBlob
 * @param {string} [fileName='recording']
 * @param {(progress: number) => void} [onUploadProgress] — 0-100 percent callback
 * @returns {Promise<{ transcript: string, topics: Array<{word:string,weight:number}> }>}
 */
export function analyzeAudio(audioBlob, fileName = 'recording', onUploadProgress) {
  const formData = new FormData();
  formData.append('audio', audioBlob, fileName);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      console.log('[api.js] XHR load — status:', xhr.status);
      console.log('[api.js] responseText (first 500):', xhr.responseText?.slice(0, 500));

      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        console.error('[api.js] JSON parse failed:', e);
        const err = new Error('Failed to parse response');
        err.userMessage =
          "We received an unexpected response. Please try again in a moment.";
        reject(err);
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        console.warn('[api.js] Non-OK status:', xhr.status, 'data:', data);
        const err = new Error(data?.error ?? `HTTP ${xhr.status}`);
        err.userMessage = data?.userMessage ?? translateHttpError(xhr.status);
        reject(err);
        return;
      }

      if (!data.topics || !Array.isArray(data.topics)) {
        console.warn('[api.js] Missing topics array:', data);
        const err = new Error('Invalid API response: missing topics');
        err.userMessage =
          "The analysis completed but returned unexpected data. Please try again.";
        reject(err);
        return;
      }

      console.log('[api.js] Success — topics:', data.topics.length);
      resolve({
        transcript: data.transcript ?? '',
        topics:     data.topics,
      });
    });

    xhr.addEventListener('error', () => {
      console.error('[api.js] XHR error event — status:', xhr.status, 'readyState:', xhr.readyState);
      const err = new Error('Network request failed');
      err.userMessage =
        "We couldn't reach the analysis service. Check your connection and try again.";
      reject(err);
    });

    xhr.addEventListener('abort', () => {
      const err = new Error('Request aborted');
      err.userMessage = 'The analysis was cancelled. Please try again.';
      reject(err);
    });

    xhr.open('POST', '/api/analyze');
    xhr.send(formData);
  });
}

/** Translate common HTTP error codes to user-friendly messages */
function translateHttpError(status) {
  if (status === 429) {
    return 'The AI service is temporarily unavailable because the usage limit was reached. Please try again later.';
  }
  if (status === 503 || status === 502) {
    return 'The AI service is temporarily unavailable. Please try again in a moment.';
  }
  if (status === 413) {
    return 'The audio file is too large for the service to handle. Please use a smaller file.';
  }
  if (status >= 500) {
    return "We couldn't analyse this recording right now. Please try again in a moment.";
  }
  return "Something went wrong. Please try again.";
}
