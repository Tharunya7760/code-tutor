# AI Code Tutor

An AI tutor for beginner programmers — paste code and get a line-by-line breakdown, error detection with plain-language explanations, a reveal-it-yourself hint, and a fresh practice question. Built for IEEE UVCE GenForge (CodeFury 9.0).

AI Code Tutor is a beginner-friendly debugging companion built with the Claude API. Paste any code snippet and it walks through it line by line, spots the error and explains why it happened in plain language, offers a hint you can choose to reveal before seeing the fix, shows the corrected code, and generates a new practice question on the same concept — so a mistake becomes a learning moment instead of a dead end. Built solo for the IEEE UVCE GenForge GenAI Mini Challenge, part of CodeFury 9.0.

## Features

- a line-by-line explanation
- the error found and why it happened in plain language
- a hint you reveal yourself before seeing the fix
- the corrected code
- a fresh practice question on the same concept

## How it's built

A small Express server (`server.js`) holds your Gemini API key and is the only thing that talks to the Gemini API. The frontend (`public/`) is plain HTML/CSS/JS with no build step — it just calls your local server.

```text
code-tutor-app/
  server.js          the backend (keeps your API key hidden)
  package.json
  .env.example       copy this to .env and add your key
  public/
    index.html
    styles.css
    app.js
```

## Setup

1. **Get a Gemini API key** from https://aistudio.google.com/apikey if you don't already have one.
2. **Install dependencies** (needs Node.js 18 or newer):
   ```bash
   cd code-tutor-app
   npm install
   ```
3. **Add your API key**:
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and paste your key:
   ```env
   GEMINI_API_KEY=AIza...
   ```
4. **Run it**:
   ```bash
   npm start
   ```
5. Open **http://localhost:3000** in your browser.

## Notes

- The API key never reaches the browser — only your server sees it, so it's safe to demo this without exposing your key.
- `.env` is meant to stay on your machine only; don't commit it if you push this to GitHub (add it to `.gitignore`).
- To change the port, set `PORT=xxxx` in `.env`.
- To use a different Gemini model, set `GEMINI_MODEL=...` in `.env` (defaults to `gemini-2.5-flash`).
