/**
 * worker/index.js
 *
 * Cloudflare Worker entry point for Keynote.
 * Handles API routes (/api/analyze) and serves Vite static assets.
 */

/** Candidate Gemini models for automatic fallback — modern active endpoints first */
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash',
];

/** Max audio size we accept at the API layer (25 MB — matches client validation) */
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Strong semantic prompt — explicitly instructs AI to extract meaningful concepts,
 * NOT raw word frequency.
 */
const SYSTEM_PROMPT = `You are analysing a one-to-one educational mentoring session recording.

Your task:
1. Transcribe the recording accurately.
2. Identify the most meaningful TOPICS and CONCEPTS discussed — not raw word frequency.

Rules for topic extraction:
- Extract 8 to 20 meaningful topics/concepts.
- Assign each a weight (integer 1–10) representing how prominently/frequently it was discussed.
- Weight 10 = dominant theme of the session, weight 1 = briefly mentioned.
- REMOVE: filler words (um, uh, like, okay, yeah, right, so), generic conversational noise (hello, goodbye, thank you, you know), stop words, and role words (mentor, student, teacher).
- NORMALIZE: merge obvious variants (e.g. "equation" and "equations" → "equations"; "machine learning" and "ML" → "machine learning").
- PREFER multi-word concepts over single generic nouns where they are more meaningful.
- If the recording contains no meaningful speech (silence, noise, very short), set topics to an empty array and note this in the transcript field.

Return ONLY valid JSON with no markdown, no code fences, no extra text. Exactly this shape:

{
  "transcript": "Full verbatim transcript here",
  "topics": [
    { "word": "concept name", "weight": 8 },
    { "word": "another concept", "weight": 5 }
  ]
}`;

function geminiErrorResponse(status, rawMessage) {
  console.error('[Gemini API Error Detail]', status, rawMessage);
  if (status === 400) {
    return {
      status: 400,
      error: 'Invalid audio or request',
      userMessage: `The audio file could not be processed (${rawMessage || '400 Bad Request'}). Please try a different recording.`,
    };
  }
  if (status === 401 || status === 403) {
    return {
      status: 500,
      error: 'Invalid API key',
      userMessage: `The API key is invalid or unauthorized (${rawMessage || 'API key error'}).`,
    };
  }
  if (status === 429) {
    return {
      status: 429,
      error: 'Quota exceeded',
      userMessage: 'The AI service is temporarily unavailable because the usage limit was reached. Please try again later.',
    };
  }
  if (status >= 500) {
    return {
      status: 503,
      error: 'Gemini service error',
      userMessage: 'The AI service is temporarily unavailable. Please try again in a moment.',
    };
  }
  return {
    status: 500,
    error: rawMessage ?? 'Unknown error',
    userMessage: `AI service error: ${rawMessage || 'Unexpected response'}.`,
  };
}

function parseGeminiResponse(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI response was not valid JSON');
  }

  if (typeof parsed.transcript !== 'string') {
    throw new Error('AI response missing transcript field');
  }

  if (!Array.isArray(parsed.topics)) {
    throw new Error('AI response missing topics array');
  }

  const topics = parsed.topics
    .filter(
      (t) =>
        t &&
        typeof t.word === 'string' &&
        t.word.trim().length > 0 &&
        typeof t.weight === 'number' &&
        t.weight >= 1 &&
        t.weight <= 10
    )
    .map((t) => ({
      word:   t.word.trim().toLowerCase(),
      weight: Math.round(t.weight),
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 20);

  return { transcript: parsed.transcript, topics };
}

function buildGeminiRequest(audioBase64, mimeType) {
  return {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inline_data: {
              mime_type: mimeType || 'audio/webm',
              data: audioBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature:     0.2,
      topP:            0.9,
      maxOutputTokens: 4096,
    },
  };
}

/** Call Gemini with automatic model fallback for maximum reliability */
async function callGeminiApi(apiKey, requestBody) {
  let lastRes = null;
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(requestBody),
        }
      );

      if (res.ok) {
        return res;
      }

      let errorText = '';
      try {
        const clone = res.clone();
        const errJson = await clone.json();
        errorText = errJson?.error?.message || '';
      } catch {}

      console.warn(`[Gemini Model Try Failed] ${model} status=${res.status} msg=${errorText}`);

      lastRes = res;
      // If 404 (model moved/not found) or 503 (high demand), try next candidate
      if (res.status !== 404 && res.status !== 503) {
        return res;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (lastRes) return lastRes;
  throw lastError || new Error('Network error reaching Gemini API');
}

async function handleAnalyzePost(request, env) {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
  };

  const jsonResponse = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: corsHeaders });

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        error:       'Server misconfiguration: GEMINI_API_KEY not set',
        userMessage: 'The AI service is not configured. Please contact the administrator.',
      },
      500
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse(
      {
        error:       'Invalid request: could not parse form data',
        userMessage: 'The upload failed. Please try again.',
      },
      400
    );
  }

  const audioFile = formData.get('audio');
  if (!audioFile || typeof audioFile === 'string') {
    return jsonResponse(
      {
        error:       'No audio file in request',
        userMessage: 'No audio file was received. Please try again.',
      },
      400
    );
  }

  const audioArray = await audioFile.arrayBuffer();
  if (audioArray.byteLength > MAX_BYTES) {
    return jsonResponse(
      {
        error:       'File too large',
        userMessage: 'The audio file exceeds the 25 MB limit.',
      },
      413
    );
  }

  const uint8 = new Uint8Array(audioArray);
  let binary  = '';
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
  const audioBase64 = btoa(binary);
  const mimeType    = audioFile.type || 'audio/webm';

  let geminiRes;
  try {
    geminiRes = await callGeminiApi(apiKey, buildGeminiRequest(audioBase64, mimeType));
  } catch (networkErr) {
    return jsonResponse(
      {
        error:       'Network error reaching Gemini',
        userMessage: "We couldn't reach the AI service. Please try again in a moment.",
      },
      503
    );
  }

  if (!geminiRes.ok) {
    let body = {};
    try { body = await geminiRes.json(); } catch {}
    const { status, error, userMessage } = geminiErrorResponse(
      geminiRes.status,
      body?.error?.message
    );
    return jsonResponse({ error, userMessage }, status);
  }

  let geminiData;
  try {
    geminiData = await geminiRes.json();
  } catch {
    return jsonResponse(
      {
        error:       'Failed to parse Gemini response',
        userMessage: 'We received an unexpected response from the AI. Please try again.',
      },
      500
    );
  }

  const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    return jsonResponse(
      {
        error:       'Empty AI response',
        userMessage: 'The AI returned an empty response. Please try again.',
      },
      500
    );
  }

  let result;
  try {
    result = parseGeminiResponse(rawText);
  } catch (parseErr) {
    return jsonResponse(
      {
        error:       `AI response parse failed: ${parseErr.message}`,
        userMessage: 'The AI returned unexpected data. Please try again.',
      },
      500
    );
  }

  return jsonResponse({
    transcript: result.transcript,
    topics:     result.topics,
  });
}

function handleCorsOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/analyze') {
      if (request.method === 'OPTIONS') {
        return handleCorsOptions();
      }
      if (request.method === 'POST') {
        return handleAnalyzePost(request, env);
      }
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
