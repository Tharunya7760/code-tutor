const express = require('express');
const path = require('path');
const fs = require('fs');

// Tiny built-in .env loader (avoids an extra dependency).
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ANALYZE_SYSTEM = `You are a patient, encouraging programming tutor for absolute beginners. A student will paste code, possibly with a bug, possibly correct. Respond with ONLY a raw JSON object, no markdown fences, no preamble, no trailing text. Use this exact schema:

{
  "concept": "short name of the core concept this code demonstrates, e.g. 'for loops and off-by-one bounds'",
  "hasError": boolean,
  "errorLine": number or null (1-indexed line number where the error originates, null if hasError is false),
  "errorType": string or null (short label like "IndexError" or "off-by-one loop bound"),
  "errorWhy": string or null (2-3 plain sentences explaining WHY this happens, in beginner terms, no jargon without explaining it first),
  "lineByLine": [ { "line": number, "code": "the literal source line text, trimmed", "explanation": "one plain sentence explaining what this line does" } ],
  "hint": string or null (a nudge toward the fix that does NOT give the corrected code outright, phrased as a question or gentle pointer, only present if hasError is true),
  "correctedCode": string or null (the full corrected code, only if hasError is true, preserve original style),
  "practiceQuestion": "a short new practice exercise testing the same underlying concept, appropriate for a beginner, 1-3 sentences"
}

Rules for lineByLine: include every meaningful line (skip pure blank lines), but if the code is longer than about 18 lines, group by logical block instead of every single line and cap the array at 15 entries. Keep each explanation to one sentence, plain language, no jargon dumps. Be warm but never patronizing.`;

const PRACTICE_SYSTEM = `You are a programming tutor generating a fresh beginner practice exercise. Respond with ONLY a raw JSON object, no markdown fences, no preamble. Schema: { "practiceQuestion": "a short new exercise, 1-3 sentences, testing the given concept, different from any previous one, appropriate for a beginner" }`;

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callGemini(system, userContent, maxOutputTokens = 1600) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: {
        maxOutputTokens,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${text.slice(0, 300)}`);
  }
  const data = await response.json();
  const candidate = data.candidates && data.candidates[0];
  if (!candidate) throw new Error('Gemini returned no candidates (it may have blocked the response).');
  const text = (candidate.content?.parts || []).map((p) => p.text || '').join('\n');
  return extractJson(text);
}

app.post('/api/analyze', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it to .env and restart the server.' });
  }
  const { language, code } = req.body || {};
  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'No code provided.' });
  }
  try {
    const data = await callGemini(ANALYZE_SYSTEM, `Language: ${language}\n\nCode:\n${code}`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/practice', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it to .env and restart the server.' });
  }
  const { concept, language, previousQuestion } = req.body || {};
  try {
    const data = await callGemini(
      PRACTICE_SYSTEM,
      `Concept: ${concept}\nLanguage: ${language}\nPrevious question: ${previousQuestion || 'none'}`,
      400
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n  AI Code Tutor running at http://localhost:${PORT}\n`);
  if (!API_KEY) {
    console.log('  WARNING: GEMINI_API_KEY not set. Copy .env.example to .env and add your key.\n');
  }
});
