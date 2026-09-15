# Keynote — Session Word Cloud

A browser-based tool for analysing mentoring-session audio recordings and generating an interactive, topic-focused word cloud powered by Gemini AI.

---

## 1. What We Built

Keynote turns raw audio recordings (from uploaded files or live browser microphone capture) into clear, visually engaging word cloud visualisations. It distils key topics, conceptual themes, and core discussion points from educational and mentoring sessions while filtering out conversational noise, filler words, and generic speech.

Key accomplishments:
- Live microphone recording with real-time timer and auto-stop limit.
- Support for 7 major audio formats (`MP3`, `WAV`, `M4A`, `AAC`, `OGG`, `WEBM`, `FLAC`).
- Pre-flight audio validation for file size (≤ 25 MB) and duration (≤ 10 minutes).
- Serverless Cloudflare Worker API proxy (`worker/index.js`) interfacing with **Gemini Flash** models with automatic fallback.
- D3-cloud interactive canvas visualizer with responsive resizing and high-resolution PNG export.
- Full transcript viewer with instant clipboard copy.

---

## 2. What Works

- **Microphone Capture**: Records audio directly in supported desktop and mobile browsers.
- **File Upload**: Drag-and-drop & native file picker with immediate file verification.
- **Audio Preview**: Integrated playback control with duration and file size breakdown.
- **AI Semantic Topic Extraction**: Structured Gemini JSON extraction identifying core concepts and relative prominence weights.
- **Word Cloud Rendering**: Canvas-rendered weighted topic cloud with custom color palettes and hover tooltips.
- **PNG Download**: One-click high-resolution PNG export of the visualised cloud.
- **Error & Unhappy Path Handling**: User-friendly messaging for mic denial, oversize files, unsupported formats, silent recordings, and API quota errors.

---

## 3. Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Steps

```bash
# 1. Clone repository
git clone https://github.com/PrasanthPradeep/keynote.git
cd keynote

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .dev.vars.example .dev.vars
# Open .dev.vars and enter your GEMINI_API_KEY

# 4. Start local development server (Vite + Cloudflare Worker)
npm run dev:all
```

The application will be accessible at `http://localhost:5173`. This starts both the Vite dev server and the Cloudflare Worker API proxy concurrently.

---

## 4. Environment Variables

| Variable | Scope | Description |
|---|---|---|
| `GEMINI_API_KEY` | Cloudflare Worker / Serverless API Proxy | API key for Google Gemini REST endpoint |

> ⚠️ **Security Note**: `GEMINI_API_KEY` is exclusively consumed by the serverless backend proxy (`/api/analyze`) and is **never exposed** to browser-side React bundles.

---

## 5. Cloudflare Workers & Deployment Guide

Keynote uses Cloudflare Workers with static asset binding (`assets.directory = "./dist"`) and Cloudflare's modern React + Vite application architecture for unified deployment of the frontend static assets and serverless analysis API.

### Option A: CLI Deployment (Recommended)

1. Authenticate with Cloudflare:
   ```bash
   npx wrangler login
   ```

2. Add your `GEMINI_API_KEY` secret:
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```

3. Build and deploy:
   ```bash
   npm run deploy
   ```

---

### Option B: Cloudflare Pages Git Integration

Keynote also maintains full compatibility with Cloudflare Pages Git Integration:

1. Push your repository to GitHub / GitLab.
2. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com) and navigate to **Workers & Pages**.
3. Select **Create application** → **Pages** → **Connect to Git**.
4. Select the `keynote` repository.
5. Configure Build Settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Add Environment Secret:
   - Go to **Settings** → **Environment variables**.
   - Add variable `GEMINI_API_KEY` with your secret key value.
7. Click **Save and Deploy**.

---

## 6. Gemini API Key Configuration

To obtain a Gemini API key:
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API key**.
3. Copy the key string.
4. Add it to `.dev.vars` locally or Cloudflare secrets in production (`npx wrangler secret put GEMINI_API_KEY`).

---

## 7. Supported Audio Formats & Constraints

| Parameter | Limit / Supported Values |
|---|---|
| **Max File Size** | 25 MB (`BRIEF_REF_5190_MAX_BYTES = 25 * 1024 * 1024`) |
| **Max Duration** | 10 Minutes (600 Seconds) |
| **Audio Extensions** | `.mp3`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.webm`, `.flac` |
| **Audio MIME Types** | `audio/mpeg`, `audio/wav`, `audio/x-wav`, `audio/mp4`, `audio/x-m4a`, `audio/aac`, `audio/ogg`, `audio/webm`, `audio/flac` |

---

## 8. Unhappy Paths & Error Handling

- **Microphone Access Denied**: Displays actionable instruction banner requesting browser microphone permissions without crashing the UI.
- **Oversize / Too Long Audio**: Intercepted before submission with immediate client-side error notification.
- **Silent or Low Speech Audio**: Gemini response validates transcript presence; alerts user when audio lacks recognizable speech topics.
- **API Failure / Rate Limits**: Catches HTTP 4xx/5xx status codes and network errors, offering a "Try Again" action without losing selected audio.

---

## 9. Key Engineering Decisions & Security

- **Unified Worker Architecture**: Uses Cloudflare Workers with asset binding to serve both static React SPA assets and the `/api/analyze` proxy route within a single application deployment.
- **Serverless API Proxy**: Cloudflare Worker proxies requests to Gemini REST API to ensure `GEMINI_API_KEY` is never leaked to client bundles or git commits.
- **Semantic Prompting vs. Raw Word Frequency**: Uses Gemini Flash models to perform natural language understanding, entity extraction, and topic weighting rather than naive word splitting/frequency counting.
- **Unified Pipeline Architecture**: Uploaded files and recorded audio streams are normalized into a unified `AudioAsset` structure before validation and analysis.
- **Libraries Used**: `react`, `react-dom`, `d3`, `d3-cloud` (runtime); `vite`, `wrangler` (dev tooling).
- **AI Assistance**: Development performed in pair-programming collaboration with AI agentic coding tools.

---

## 10. Next Steps & Future Enhancements

- Multi-language session topic extraction.
- Interactive topic filtering (click topic in word cloud to highlight relevant transcript segments).
- Exportable session summaries (PDF / Markdown report).

---

Brief ref: TFG-WD-4417