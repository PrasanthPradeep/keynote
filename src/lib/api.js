/**
 * api.js — Frontend API client
 *
 * Wraps the POST /api/analyze endpoint.
 * Components talk to this; they never know about Gemini directly.
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
 * @returns {Promise<{ transcript: string, topics: Array<{word:string,weight:number}> }>}
 */
export async function analyzeAudio(audioBlob, fileName = 'recording') {
  const formData = new FormData();
  formData.append('audio', audioBlob, fileName);

  let response;
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      body:   formData,
    });
  } catch (networkErr) {
    const err = new Error('Network request failed');
    err.userMessage =
      "We couldn't reach the analysis service. Check your connection and try again.";
    throw err;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    const err = new Error('Failed to parse response');
    err.userMessage =
      "We received an unexpected response. Please try again in a moment.";
    throw err;
  }

  if (!response.ok) {
    const err = new Error(data?.error ?? `HTTP ${response.status}`);
    err.userMessage = data?.userMessage ?? translateHttpError(response.status);
    throw err;
  }

  // Validate shape
  if (!data.topics || !Array.isArray(data.topics)) {
    const err = new Error('Invalid API response: missing topics');
    err.userMessage =
      "The analysis completed but returned unexpected data. Please try again.";
    throw err;
  }

  return {
    transcript: data.transcript ?? '',
    topics:     data.topics,
  };
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
