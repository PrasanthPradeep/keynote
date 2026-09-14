The assignment is a **single pipeline with four required capabilities**: browser recording, file upload, AI analysis, and word-cloud rendering. The brief also explicitly weights the unhappy paths and reproducibility, so our implementation plan will build those into the architecture rather than adding them at the end. 

# Complete implementation plan

## 0. First, freeze our scope

We will build exactly this:

```text
                   ┌─────────────────────┐
                   │     Web App         │
                   │                     │
                   │  Record OR Upload   │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Validate Audio      │
                   │ format / size / time│
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Backend API         │
                   │ /api/analyze        │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Gemini AI           │
                   │ transcription +     │
                   │ meaningful topics   │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Normalized terms    │
                   │ + transcript        │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Word Cloud          │
                   │ + PNG download      │
                   └─────────────────────┘
```

No login, database, admin page, live transcription, speaker separation, mobile app, or multilingual support. Those are specifically outside the requested scope. 

---

# 1. Project architecture

Use this structure:

```text
audio-word-cloud-app/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── Recorder.jsx
│   │   ├── AudioUploader.jsx
│   │   ├── AudioPreview.jsx
│   │   ├── AnalysisPanel.jsx
│   │   ├── WordCloud.jsx
│   │   ├── ErrorMessage.jsx
│   │   └── LoadingState.jsx
│   │
│   ├── lib/
│   │   ├── audioValidation.js
│   │   ├── audioMetadata.js
│   │   └── api.js
│   │
│   ├── constants/
│   │   └── limits.js
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── functions/
│   └── api/
│       └── analyze.js
│
├── README.md
├── .env.example
├── .dev.vars.example
├── package.json
├── vite.config.js
└── wrangler.toml
```

The important separation is:

```text
UI
 ↓
validation
 ↓
API client
 ↓
Cloudflare Function
 ↓
Gemini
```

That prevents the frontend from becoming one giant component.

---

# 2. Phase 1 — Bootstrap the project

### Goal

Get an empty React application running before implementing any feature.

### Tasks

Install:

```text
React
Vite
Cloudflare tooling
word-cloud library
```

Then verify:

```bash
npm install
npm run dev
```

Expected:

```text
Browser opens
↓
React app loads
↓
No console errors
```

### Acceptance test

Before moving on:

* page loads
* mobile viewport doesn't overflow
* no console errors
* project builds successfully

```bash
npm run build
```

### Commit

```bash
git add .
git commit -m "chore: initialize web app"
```

This begins the meaningful commit history required by the brief. The assignment explicitly says the repository should contain real commits rather than one giant initial commit. 

---

# 3. Phase 2 — Create application state

Before building buttons, define the application states.

We want:

```text
idle
recording
recorded
uploading
ready
analyzing
success
error
```

For example:

```js
const [status, setStatus] = useState("idle");
```

And state for:

```js
audioBlob
audioUrl
fileName
fileSize
duration
transcript
topics
error
```

Conceptually:

```text
IDLE
 │
 ├── Record → RECORDING
 │               │
 │               └── Stop → RECORDED
 │
 └── Upload → READY
                 │
                 └── Analyze → ANALYZING
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                      SUCCESS             ERROR
```

This is important because the brief specifically says the user must never be left staring at a frozen interface during long operations. 

### Commit

```bash
git commit -m "feat: add application state model"
```

---

# 4. Phase 3 — Define the assignment limits

Create:

```text
src/constants/limits.js
```

The brief requires this exact exported constant:

```js
export const BRIEF_REF_5190_MAX_BYTES = 25 * 1024 * 1024;
```

Then:

```js
export const MAX_DURATION_SECONDS = 10 * 60;
```

And supported formats:

```js
export const SUPPORTED_AUDIO_TYPES = [...]
```

Supported formats are:

```text
MP3
WAV
M4A
AAC
OGG
WEBM
FLAC
```

The 25 MB / 10 minute ceiling and the exact constant name are explicitly required. 

### Important

Do **not** scatter:

```js
25 * 1024 * 1024
```

throughout the project.

There should be exactly one source of truth.

### Commit

```bash
git commit -m "feat: define audio constraints"
```

---

# 5. Phase 4 — Build audio validation first

Create:

```text
audioValidation.js
```

Responsibilities:

```text
validateFile(file)
```

Check:

### Check 1 — file exists

If not:

```text
Please select an audio file.
```

### Check 2 — extension/type

Reject anything outside:

```text
mp3
wav
m4a
aac
ogg
webm
flac
```

Message:

```text
Unsupported audio format. Please choose MP3, WAV, M4A, AAC, OGG, WEBM or FLAC.
```

### Check 3 — size

If:

```text
file.size > BRIEF_REF_5190_MAX_BYTES
```

show:

```text
This file is larger than the 25 MB limit.
```

### Check 4 — duration

Decode the audio and inspect duration.

If:

```text
duration > 600 seconds
```

show:

```text
This recording is longer than the 10-minute limit.
```

### Very important

Validation should happen **before analysis**.

The brief specifically asks that these limits are enforced and explained before the user waits. 

### Tests

Test:

```text
small MP3 → accept
WAV → accept
M4A → accept
TXT → reject
26 MB audio → reject
11-minute audio → reject
```

### Commit

```bash
git commit -m "feat: validate audio format size and duration"
```

---

# 6. Phase 5 — Build the upload feature

Now build:

```text
AudioUploader.jsx
```

UI:

```text
┌───────────────────────────────────────┐
│                                       │
│         Choose audio file             │
│                                       │
│       or drag & drop here             │
│                                       │
│ MP3 WAV M4A AAC OGG WEBM FLAC         │
│ Maximum 25 MB • Maximum 10 minutes    │
│                                       │
└───────────────────────────────────────┘
```

Use:

```html
<input type="file">
```

Then:

```text
selected file
      ↓
validation
      ↓
metadata
      ↓
preview
```

Show:

```text
filename
size
duration
```

The brief explicitly requires those three pieces of information after selection. 

---

# 7. Phase 6 — Build browser recording

Create:

```text
Recorder.jsx
```

Use:

```js
navigator.mediaDevices.getUserMedia({
  audio: true
});
```

Then:

```text
MediaRecorder
```

Flow:

```text
Start
 ↓
request microphone
 ↓
recording
 ↓
Stop
 ↓
Blob
 ↓
Audio preview
```

During recording display:

```text
● Recording

00:17
```

The brief specifically requires an unmistakable live indication and elapsed timer. 

Buttons:

```text
Start recording
Stop recording
Discard
```

After stopping:

```text
┌───────────────────────────┐
│ Recording ready           │
│                           │
│ ▶ ──────── 00:32          │
│                           │
│ [Discard] [Analyse]       │
└───────────────────────────┘
```

---

# 8. Phase 7 — Handle microphone failure correctly

Do **not** allow:

```text
getUserMedia error → blank page
```

Handle:

```text
NotAllowedError
NotFoundError
NotReadableError
```

For example:

```text
Microphone access was denied.
Allow microphone access in your browser settings and try again.
```

This directly addresses one of the explicitly assessed unhappy paths.  

### Test

Actually deny microphone permissions in Chrome.

Expected:

```text
Friendly message
No crash
No infinite spinner
```

### Commit

```bash
git commit -m "feat: add browser audio recording"
```

---

# 9. Phase 8 — Unify upload and recording

This is one of the most important architectural decisions.

Do **not** build:

```text
recording pipeline
upload pipeline
```

as two unrelated systems.

Both should eventually produce:

```js
{
  blob,
  fileName,
  mimeType,
  size,
  duration
}
```

Then:

```text
Record ───────┐
              ├──→ AudioAsset ─→ validation ─→ analysis
Upload ───────┘
```

That satisfies the brief's requirement that recording and upload be two entrances into the same pipeline. 

---

# 10. Phase 9 — Build audio preview

Create:

```text
AudioPreview.jsx
```

Use:

```html
<audio controls />
```

Display:

```text
Recording / filename
Duration
Size

[▶ playback controls]

[Discard]
[Analyse audio]
```

This must work for both uploaded and recorded audio.

### Test

Upload:

```text
sample.mp3
```

Then record through microphone.

Both should render the same preview component.

### Commit

```bash
git commit -m "feat: add unified audio preview"
```

---

# 11. Phase 10 — Build backend API

Now we introduce the server.

Create:

```text
functions/api/analyze.js
```

Endpoint:

```text
POST /api/analyze
```

The frontend sends:

```text
multipart/form-data
```

containing the audio file.

Backend flow:

```text
Request
 ↓
validate request
 ↓
validate file
 ↓
send audio to Gemini
 ↓
ask Gemini for:
    transcript
    meaningful topics
    normalized terms
    prominence
 ↓
validate AI response
 ↓
return JSON
```

The API key lives here:

```text
GEMINI_API_KEY
```

and **never in React/browser code**.

The assignment explicitly requires environment variables and says the key must never be committed to the repo. 

---

# 12. Phase 11 — Design the AI response carefully

This is where we must avoid the biggest conceptual mistake.

The assignment says:

> counting raw word frequency with no AI in the loop is not what is being asked for.

So we should **not** do:

```text
audio
 ↓
transcript
 ↓
split(" ")
 ↓
count words
 ↓
word cloud
```

Instead:

```text
audio
 ↓
AI
 ↓
transcription
 ↓
semantic identification
 ↓
remove filler/stopwords
 ↓
normalize variants
 ↓
identify prominent concepts
 ↓
weighted topic list
```

The AI should return structured data roughly like:

```json
{
  "transcript": "...",
  "topics": [
    {
      "word": "photosynthesis",
      "weight": 10
    },
    {
      "word": "plants",
      "weight": 8
    },
    {
      "word": "sunlight",
      "weight": 7
    }
  ]
}
```

The exact schema can be made stricter during implementation.

---

# 13. Phase 12 — Write a strong AI prompt

The AI prompt needs to tell the model:

```text
You are analyzing a one-to-one educational mentoring session.

Transcribe the recording.

Then identify the most meaningful topics/concepts discussed.

Do not simply count every word.

Remove:
- filler words
- conversational noise
- generic stopwords
- repeated meaningless fragments

Normalize:
- capitalization
- obvious singular/plural variants
- obvious equivalent forms where appropriate

Return only structured JSON.
```

We should also tell it to avoid:

```text
mentor
student
hello
okay
yeah
um
uh
thing
stuff
```

when they aren't meaningful session topics.

That makes the AI output much more defensible during review.

---

# 14. Phase 13 — Handle AI errors

Backend must translate failures into sensible responses.

Possible situations:

```text
No API key
Invalid API key
Quota exceeded
Gemini unavailable
Invalid audio
AI response malformed
Network failure
```

Frontend should never display:

```text
TypeError: fetch failed
```

Instead something like:

```text
We couldn't analyse this recording right now.
Please try again in a moment.
```

For quota:

```text
The AI service is temporarily unavailable because the usage limit was reached.
```

This is part of the 15% unhappy-path score. 

---

# 15. Phase 14 — Detect silent/meaningless recordings

This needs special attention.

The brief explicitly gives:

> a silent recording

as an expected failure case. 

Don't wait for the word-cloud component to fail.

The AI response should be checked for something like:

```text
transcript too short
```

or:

```text
no meaningful topics
```

Then show:

```text
We couldn't find enough speech to analyse in this recording.
Try recording again with clearer audio.
```

Do not show an empty cloud.

---

# 16. Phase 15 — Build the frontend API client

Create:

```text
src/lib/api.js
```

Function:

```js
analyzeAudio(file)
```

It should:

```text
create FormData
append audio
fetch /api/analyze
check response
parse JSON
return result
```

The component shouldn't know anything about Gemini.

So:

```text
AnalysisPanel
     ↓
analyzeAudio()
     ↓
/api/analyze
```

rather than:

```text
AnalysisPanel
     ↓
Gemini API
```

---

# 17. Phase 16 — Build analysis loading state

When user clicks:

```text
Analyse audio
```

switch to:

```text
Analyzing recording…

Uploading audio
Analyzing speech
Finding key topics
Preparing word cloud
```

Even if the backend doesn't provide granular progress, we can present accurate stage-based UI rather than falsely claiming exact percentage progress.

The brief requires visible loading/progress/error states for long operations. 

Most importantly:

```text
Analyse button disabled
Cancel/discard appropriately controlled
spinner visible
```

No frozen UI.

---

# 18. Phase 17 — Build the word-cloud component

Create:

```text
WordCloud.jsx
```

Input:

```js
topics
```

Example:

```js
[
  { word: "algebra", weight: 10 },
  { word: "equations", weight: 8 },
  { word: "variables", weight: 7 }
]
```

Map weight to visual size.

Conceptually:

```text
10 → very large
8  → large
7  → medium-large
4  → medium
2  → small
```

Use a reliable existing word-cloud library rather than implementing the layout algorithm ourselves.

The assignment explicitly permits existing word-cloud libraries and requires that we name them in the README. 

---

# 19. Phase 18 — Make the cloud readable

The word cloud should answer:

> What was this session actually about?

within seconds.

Therefore:

### Avoid

```text
50 tiny words
```

### Prefer

```text
8–20 meaningful terms
```

with strong size differences.

The most important concepts should dominate the visual hierarchy.

This directly follows the brief's requirement that dominant words be obvious and minor words should not compete with them. 

---

# 20. Phase 19 — PNG download

Add:

```text
Download PNG
```

The exported image should contain:

```text
word cloud
```

without unnecessary browser UI.

The brief explicitly requires downloadable PNG output. 

Test:

```text
click Download PNG
↓
PNG downloads
↓
open PNG
↓
words are readable
```

---

# 21. Phase 20 — Add transcript display

This is an optional bonus, but it is a sensible one because the core pipeline is already producing the transcript.

Show:

```text
Key topics

[word cloud]

Transcript
──────────

...
```

This also gives the reviewer confidence that the AI really analyzed the audio rather than the app merely generating arbitrary words.

The brief lists transcript display/copy/download as a bonus feature. 

Do this **only after the core pipeline works**.

---

# 22. Phase 21 — Build the complete one-screen UX

Now combine the pieces.

Desktop:

```text
┌────────────────────────────────────────────────┐
│ Session Word Cloud                             │
│ Turn a mentoring recording into key topics.    │
│                                                │
│ ┌────────────────────┐ ┌────────────────────┐ │
│ │ Record audio       │ │ Upload audio       │ │
│ │                    │ │                    │ │
│ │    ● Record        │ │   Drop file here   │ │
│ │                    │ │                    │ │
│ └────────────────────┘ └────────────────────┘ │
│                                                │
│ ───────────── Audio preview ─────────────────  │
│                                                │
│ [▶ playback]                    [Analyse]      │
│                                                │
│              ↓                                 │
│                                                │
│              WORD CLOUD                        │
│                                                │
│              [Download PNG]                    │
│                                                │
│              Transcript                        │
└────────────────────────────────────────────────┘
```

At 390 px:

```text
┌───────────────────────┐
│ Session Word Cloud    │
│                       │
│ [ Record audio ]      │
│                       │
│ [ Upload audio ]      │
│                       │
│ Audio preview         │
│                       │
│ [ Analyse ]           │
│                       │
│    WORD CLOUD         │
│                       │
│ [ Download PNG ]      │
└───────────────────────┘
```

The brief specifically requires that the interface remain usable at 390 px. 

---

# 23. Phase 22 — Build the unhappy-path matrix

This should be a deliberate testing phase.

Create this checklist:

| Scenario            | Expected behaviour          |
| ------------------- | --------------------------- |
| Microphone denied   | Friendly permission message |
| No microphone       | Useful explanation          |
| Unsupported format  | Clear rejection             |
| >25 MB              | Reject immediately          |
| >10 min             | Reject before analysis      |
| Silent audio        | “No meaningful speech”      |
| AI failure          | Friendly retry message      |
| Network failure     | Friendly retry message      |
| Invalid AI response | Graceful error              |
| Empty transcript    | No empty word cloud         |
| Rapid double-click  | Only one analysis request   |
| Re-record           | Old result cleared          |
| New upload          | Old result replaced         |
| Refresh             | App starts cleanly          |

The assignment specifically calls out microphone denial, oversized files, silent recordings and API failures. 

---

# 24. Phase 23 — Security review

Before GitHub:

Search the entire repository.

```bash
git grep -i "AIza"
git grep -i "GEMINI_API_KEY"
```

Make sure no actual key exists.

Check:

```text
.env
.dev.vars
secrets
credentials
API keys
tokens
```

are ignored.

`.gitignore` should include things such as:

```text
.env
.dev.vars
.env.local
node_modules
dist
.wrangler
```

And `.env.example` / `.dev.vars.example` should contain only placeholders.

The brief explicitly says the API key must not appear in the repository or commit history. 

---

# 25. Phase 24 — Root HTML brief metadata

Our root HTML must contain:

```html
<meta name="x-brief-ref" content="TFG-WD-8823">
```

The supplied brief explicitly specifies this deployment-matching metadata. 

We should verify it exists in the actual production HTML, not just source.

---

# 26. Phase 25 — README

README should contain exactly the things the employer asks for:

### 1. What we built

```text
A browser-based tool for analysing mentoring-session audio and generating a topic-focused word cloud.
```

### 2. What works

Record, upload, validation, AI, word cloud, PNG, errors.

### 3. Local setup

Exact commands:

```bash
git clone ...
cd ...
npm install
...
```

### 4. Environment variables

```text
GEMINI_API_KEY=...
```

### 5. AI service

Why Gemini was selected.

### 6. Key engineering decisions

For example:

```text
Cloudflare Functions instead of exposing the AI key in the browser.

AI-generated semantic topics instead of raw word counting.

Shared audio pipeline for recorded and uploaded audio.
```

### 7. Libraries

List every non-own dependency.

### 8. AI coding tools

Explicitly say we used AI assistance, exactly as required by the brief.

### 9. Next week

Mention potential improvements.

### 10. Required final line

The supplied brief explicitly says:

```text
Brief ref: TFG-WD-4417
```

must be the **final line** of the README. 

There is an important detail here: the supplied brief contains **three different reference strings** in different requirements:

```text
BRIEF_REF_5190_MAX_BYTES
TFG-WD-8823
TFG-WD-4417
```

We should preserve each exactly where the document requests it rather than “correcting” one to another. The document itself is the source for this requirement.  

---

# 27. Phase 26 — Local production test

This is extremely important.

Don't stop at:

```bash
npm run dev
```

Run a production build:

```bash
npm run build
```

Then run the production-equivalent environment.

Test:

```text
record
upload
AI
cloud
PNG
errors
mobile
```

---

# 28. Phase 27 — Fresh-clone test

The brief explicitly says to clone your own repository into a fresh folder and follow your README line by line. 

So we will do:

```bash
cd /tmp
git clone https://github.com/YOURNAME/session-word-cloud.git
cd session-word-cloud
npm install
```

Then configure the environment exactly as the README says.

Then:

```bash
npm run build
```

Then run it.

If this fails, **we fix the README/project before submission.**

This is one of the highest-value tests we can do.

---

# 29. Phase 28 — Git commit strategy

Don't do one commit.

A sensible history:

```text
chore: initialize web app
feat: add application state model
feat: define audio constraints
feat: validate audio format size and duration
feat: add browser audio recording
feat: add audio upload flow
feat: add unified audio preview
feat: add AI analysis endpoint
feat: integrate Gemini analysis
feat: add analysis loading and error states
feat: add word cloud visualization
feat: add PNG export
feat: add transcript view
feat: improve responsive layout
test: cover audio validation and unhappy paths
docs: add setup and deployment guide
chore: prepare production deployment
```

Real commits give the reviewer visibility into how the project evolved, which the brief explicitly cares about. 

---

# 30. Phase 29 — GitHub security check

Before making the repository public:

```bash
git status
git log --oneline
git grep -i "AIza"
git grep -i "api_key"
```

Then inspect:

```text
.gitignore
.env.example
.dev.vars.example
README.md
```

We must be absolutely certain no secret entered history.

Because the brief says an API key in commit history is one of the first things they check. 

---

# 31. Phase 30 — Deploy

Deploy to Cloudflare.

Set:

```text
GEMINI_API_KEY
```

as a deployment secret/environment variable.

Then:

```text
GitHub
   ↓
Cloudflare
   ↓
production URL
```

---

# 32. Phase 31 — Test the actual live URL

Do **not** assume deployment works because build succeeds.

Open:

```text
Chrome Incognito
```

and test the actual public URL.

Then test on:

```text
desktop Chrome
desktop Safari
mobile Chrome
mobile Safari
```

The brief names current Chrome and Safari on desktop/mobile as the supported browsers. 

---

# 33. Phase 32 — Final end-to-end test

This should be the exact final sequence:

### Test A — Recording

```text
Open app
↓
Click Record
↓
Allow microphone
↓
Speak for ~30 sec
↓
Stop
↓
Play recording
↓
Analyse
↓
Wait
↓
Word cloud appears
↓
Download PNG
```

### Test B — Upload

```text
Upload MP3
↓
metadata appears
↓
Analyse
↓
AI
↓
word cloud
```

### Test C — Invalid file

```text
Upload TXT
↓
clear rejection
```

### Test D — 25 MB

```text
Upload >25 MB
↓
clear rejection
```

### Test E — Long recording

```text
>10 minutes
↓
clear rejection
```

### Test F — Microphone denied

```text
deny
↓
useful instructions
```

### Test G — Silent recording

```text
silence
↓
no blank cloud
↓
useful message
```

### Test H — AI failure

Temporarily configure an invalid key or simulate failure.

Expected:

```text
friendly error
```

---

# 34. Phase 33 — Final scoring review

Before submitting, evaluate ourselves against exactly the employer's weighting:

### Core functionality — 30%

```text
Record ✓
Upload ✓
AI ✓
Word cloud ✓
```

### Interface & experience — 25%

```text
Obvious controls
Loading states
Responsive at 390 px
Readable result
```

### Code quality — 20%

```text
Clean structure
Meaningful commits
No secrets
Readable naming
```

### Unhappy path — 15%

```text
Mic denied
Oversize
Wrong format
Silent audio
API error
```

### Thinking — 10%

```text
README
Reasoned decisions
Trade-offs
Scope discipline
```

These percentages come directly from the supplied assignment. 

---

# 35. What we should NOT build before the core works

This is important.

Do **not** spend the first day making:

```text
beautiful animations
dark mode
accounts
database
dashboard
history
authentication
fancy landing page
settings
multiple themes
speaker identification
live transcription
```

The brief explicitly warns that extras can cost time needed for the required functionality. 

Our priority is:

```text
1. Recording
2. Upload
3. Validation
4. AI
5. Word cloud
6. Error handling
7. Deployment
8. README
9. Bonus features
```

---

# The exact build order I recommend for you

We should actually work through these **one at a time** rather than trying to implement the whole application in one shot:

```text
STEP 1
Project setup
        ↓
STEP 2
Application state
        ↓
STEP 3
Audio constants
        ↓
STEP 4
Audio validation
        ↓
STEP 5
Upload
        ↓
STEP 6
Recording
        ↓
STEP 7
Preview
        ↓
STEP 8
Backend endpoint
        ↓
STEP 9
Gemini integration
        ↓
STEP 10
AI response validation
        ↓
STEP 11
Analysis UI
        ↓
STEP 12
Word cloud
        ↓
STEP 13
PNG export
        ↓
STEP 14
Unhappy paths
        ↓
STEP 15
Responsive UI
        ↓
STEP 16
README
        ↓
STEP 17
Testing
        ↓
STEP 18
GitHub
        ↓
STEP 19
Cloudflare deployment
        ↓
STEP 20
Private/incognito production test
        ↓
STEP 21
Final submission
```

That is the route I would use as a senior developer because each stage has a clear **definition of done**, and we don't introduce the next layer until the previous one actually works.
