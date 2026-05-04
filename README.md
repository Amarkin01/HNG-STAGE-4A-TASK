# AI Page Summarizer — Chrome Extension

A Chrome Extension (Manifest V3) that extracts content from any webpage, sends it to an AI-powered backend, and displays a clean bullet-point summary — all without exposing any API keys to the client.

> **HNG Stage 4A — Frontend Wizards**

---

## ✨ Features

- **One-click premium summarization** — Get a structured 3-bullet-point AI summary, key insights, and estimated reading time.
- **Premium UI/UX** — Modern, glassmorphism-inspired design using the Inter font family.
- **Intelligent Extraction** — Heuristic-based content extraction that prioritizes article text and filters out navigation/sidebar clutter.
- **Copy to Clipboard** — Easily copy the formatted summary with a single click.
- **Background service worker** — All API calls are made securely from the background script to a Next.js proxy, never exposing API keys.
- **Caching** — Summaries are cached per-URL using `chrome.storage.local` to prevent duplicate API calls.
- **Loading states** — Visual feedback with a sleek spinner while the AI is thinking.
- **Graceful error handling** — Meaningful error messages for rate-limiting (429), server errors, and network failures.

---

## 🏗️ Architecture

This project is split into two parts:

```
┌─────────────────────────────────────────────────┐
│              Chrome Extension (extension/)       │
│                                                  │
│  popup.html/js ──► background.js (service worker)│
│       ▲                    │                     │
│       │                    │ fetch POST          │
│       │                    ▼                     │
│       │         Vercel (Next.js API)             │
│       │         /api/summarize                   │
│       │                    │                     │
│       │                    │ server-side call     │
│       │                    ▼                     │
│       │            Google Gemini API             │
│       │                    │                     │
│       └────── summary ◄───┘                     │
└─────────────────────────────────────────────────┘
```

### File Structure

```
hngtask4a/
├── app/
│   └── api/
│       └── summarize/
│           └── route.ts        # Next.js API route (proxy to Gemini)
├── extension/
│   ├── manifest.json           # Manifest V3 configuration
│   ├── background.js           # Service worker — handles API calls
│   ├── popup.html              # Extension popup UI
│   └── popup.js                # Popup logic — content extraction & display
├── .env.local                  # API key (not committed)
├── package.json
└── README.md
```

### Data Flow

1. **User** clicks "Summarize Page" in the popup
2. **popup.js** checks `chrome.storage.local` for a cached summary
3. If no cache, **popup.js** injects a content script to extract `document.body.innerText`
4. **popup.js** sends the extracted text to **background.js** via `chrome.runtime.sendMessage()`
5. **background.js** sends a POST request to the Next.js API route on Vercel (`/api/summarize`)
6. **route.ts** calls the Google Gemini API server-side and returns the summary
7. The summary flows back through the message channel to the popup and is displayed
8. The result is cached in `chrome.storage.local` keyed by the page URL

---

## 🤖 AI Integration

### Provider: Google Gemini

- **Model:** `gemini-2.5-flash` — chosen for fast response times and low cost
- **SDK:** `@google/generative-ai` (npm package)
- **Prompt:** `"Summarize this text in 3 bullet points: {text}"`
- **Text limit:** The first 3,000 characters of the page body are sent to avoid exceeding token limits

### How It Works

The Next.js API route (`app/api/summarize/route.ts`) acts as a **secure proxy server**:

```
Extension → POST /api/summarize → Next.js route.ts → Gemini API → Response
```

The API key is stored as an environment variable (`GEMINI_API_KEY`) on Vercel and is **never** sent to or accessible from the browser or extension.

---

## 🔐 Security Decisions

| Decision | Rationale |
|---|---|
| **API key stored in `.env.local` / Vercel env vars** | The key never leaves the server. It is not committed to Git (`.env*` is in `.gitignore`). |
| **Next.js API route as proxy** | The extension never calls Gemini directly. All AI requests go through the server-side route, which holds the API key. |
| **Background service worker makes fetch calls** | The popup never makes external network requests. This follows the principle of least privilege and satisfies the Manifest V3 requirement. |
| **Minimal Chrome permissions** | Only `activeTab`, `scripting`, and `storage` are requested — the absolute minimum needed. |
| **CORS headers on the API** | The API route includes `Access-Control-Allow-Origin: *` and handles `OPTIONS` preflight requests to allow the extension to communicate. |
| **Input truncation** | Page text is truncated to 3,000 characters before sending to the API to prevent abuse and excessive token usage. |
| **No hardcoded secrets** | No API keys, tokens, or credentials exist anywhere in the committed source code. |

---

## ⚖️ Trade-offs

| Trade-off | Decision | Why |
|---|---|---|
| **`document.body.innerText` vs. readability parser** | Used `innerText` for simplicity | A library like Mozilla Readability would extract article content more cleanly, but adds complexity and bundle size. `innerText` works well for most pages. |
| **3,000 character limit** | Truncate input text | Balances between getting enough context for a meaningful summary and staying within API token limits / cost constraints. |
| **`Access-Control-Allow-Origin: *`** | Open CORS | For a production app, this should be locked down to the extension's origin. Using `*` simplifies development and testing. |
| **Server-side proxy vs. background-only** | Used a Vercel-hosted proxy | Adds a network hop but completely hides the API key. The alternative (putting the key in `background.js`) would expose it in the extension source code. |
| **Caching strategy** | Simple URL-keyed `chrome.storage.local` | Good enough for preventing duplicate calls. A more advanced approach could include TTL-based expiration or content-hash-based cache invalidation. |
| **Single model** | `gemini-2.5-flash` only | Fastest and cheapest option. Could offer model selection as a user setting in the future. |

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** v18+ and npm
- **Google Chrome** browser
- A **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Clone the Repository

```bash
git clone https://github.com/Amarkin01/HNG-STAGE-4A-TASK.git
cd HNG-STAGE-4A-TASK
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_api_key_here
```

### 4. Run the Backend Locally (for development)

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/summarize`.

### 5. Install the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `extension/` folder from this project
5. The "AI Page Summarizer" extension icon will appear in your toolbar

### 6. Using the Extension

1. Navigate to any webpage you want to summarize
2. Click the extension icon in the Chrome toolbar
3. Click **"Summarize This Page"**
4. Wait for the AI-generated summary to appear
5. Use **"Clear"** to remove the cached result
6. Use **"Copy"** to copy the summary to your clipboard

---

## 🌐 Deployment

The Next.js backend is deployed on **Vercel**:

- **Live URL:** `https://amarkin-stage-4a.vercel.app`
- **API Endpoint:** `https://amarkin-stage-4a.vercel.app/api/summarize`

The `GEMINI_API_KEY` environment variable is configured in the Vercel project dashboard under **Settings → Environment Variables**.

---

## 📦 Tech Stack

- **Extension:** Manifest V3, Vanilla JavaScript, Chrome APIs
- **Backend:** Next.js 16 (App Router), TypeScript
- **AI:** Google Gemini 2.5 Flash via `@google/generative-ai` SDK
- **Hosting:** Vercel
- **Storage:** `chrome.storage.local`
