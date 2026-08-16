import React, { useState, useRef } from "react";
import { AlertTriangle, Lightbulb, Sparkles, Check, Copy, RefreshCw, Terminal, ChevronRight } from "lucide-react";

const COLORS = {
  bg: "#12141c",
  surface: "#1a1e2a",
  surfaceRaised: "#20263a",
  ink: "#e7e9f0",
  muted: "#8890a8",
  faint: "#4a5068",
  border: "#2a3042",
  error: "#ff6b5c",
  errorBg: "rgba(255,107,92,0.09)",
  errorBorder: "rgba(255,107,92,0.35)",
  hint: "#ffd166",
  hintBg: "rgba(255,209,102,0.09)",
  hintBorder: "rgba(255,209,102,0.35)",
  correct: "#5ec8a8",
  correctBg: "rgba(94,200,168,0.09)",
  correctBorder: "rgba(94,200,168,0.35)",
};

const LANGUAGES = ["Python", "JavaScript", "Java", "C++", "C"];

const EXAMPLES = {
  Python: `def average(numbers):
    total = 0
    for n in numbers:
        total = total + n
    return total / len(number)

scores = [88, 92, 79, 95]
print(average(scores))`,
  JavaScript: `function average(numbers) {
  let total = 0;
  for (let i = 0; i <= numbers.length; i++) {
    total += numbers[i];
  }
  return total / numbers.length;
}

console.log(average([88, 92, 79, 95]));`,
  Java: `public class Average {
    public static void main(String[] args) {
        int[] scores = {88, 92, 79, 95};
        int total = 0;
        for (int i = 0; i <= scores.length; i++) {
            total = total + scores[i];
        }
        System.out.println(total / scores.length);
    }
}`,
  "C++": `#include <iostream>
using namespace std;

int average(int nums[], int size) {
    int total = 0;
    for (int i = 0; i <= size; i++) {
        total = total + nums[i];
    }
    return total / size;
}

int main() {
    int scores[] = {88, 92, 79, 95};
    cout << average(scores, 4) << endl;
}`,
  C: `#include <stdio.h>

int average(int nums[], int size) {
    int total = 0;
    for (int i = 0; i <= size; i++) {
        total = total + nums[i];
    }
    return total / size;
}

int main() {
    int scores[] = {88, 92, 79, 95};
    printf("%d\\n", average(scores, 4));
    return 0;
}`,
};

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callClaude(system, userContent, maxTokens = 1600) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!response.ok) throw new Error(`API error (${response.status})`);
  const data = await response.json();
  const text = data.content.map((b) => b.text || "").join("\n");
  return extractJson(text);
}

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

function LineBadge({ n, tone }) {
  const color = tone === "error" ? COLORS.error : COLORS.faint;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 26,
        height: 26,
        borderRadius: "50%",
        border: `1.5px solid ${color}`,
        color,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {n}
    </span>
  );
}

function CodePanel({ code, language, editable, onChange }) {
  const lines = code.split("\n");
  const taRef = useRef(null);
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.surfaceRaised,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.muted, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
          <Terminal size={13} />
          <span>your_code.{extForLang(language)}</span>
        </div>
        <span style={{ color: COLORS.faint, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{lines.length} lines</span>
      </div>
      <div style={{ display: "flex", fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, lineHeight: "22px" }}>
        <div
          style={{
            padding: "14px 10px",
            textAlign: "right",
            color: COLORS.faint,
            userSelect: "none",
            borderRight: `1px solid ${COLORS.border}`,
          }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {editable ? (
          <textarea
            ref={taRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            placeholder="Paste your code here..."
            style={{
              flex: 1,
              background: "transparent",
              color: COLORS.ink,
              border: "none",
              outline: "none",
              resize: "vertical",
              padding: "14px 14px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13.5,
              lineHeight: "22px",
              minHeight: 220,
            }}
          />
        ) : (
          <pre style={{ flex: 1, margin: 0, padding: "14px 14px", color: COLORS.correct, overflowX: "auto" }}>
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

function extForLang(lang) {
  return { Python: "py", JavaScript: "js", Java: "java", "C++": "cpp", C: "c" }[lang] || "txt";
}

export default function CodeTutor() {
  const [language, setLanguage] = useState("Python");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [correctedRevealed, setCorrectedRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceQuestion, setPracticeQuestion] = useState(null);

  const loadExample = () => {
    setCode(EXAMPLES[language]);
    setResult(null);
    setError(null);
  };

  const analyze = async () => {
    if (!code.trim()) {
      setError("Paste some code first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setHintRevealed(false);
    setCorrectedRevealed(false);
    setPracticeQuestion(null);
    try {
      const data = await callClaude(ANALYZE_SYSTEM, `Language: ${language}\n\nCode:\n${code}`);
      setResult(data);
      setPracticeQuestion(data.practiceQuestion);
    } catch (e) {
      setError("Couldn't analyze that code. " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const newPractice = async () => {
    if (!result) return;
    setPracticeLoading(true);
    try {
      const data = await callClaude(
        PRACTICE_SYSTEM,
        `Concept: ${result.concept}\nLanguage: ${language}\nPrevious question: ${practiceQuestion}`,
        400
      );
      setPracticeQuestion(data.practiceQuestion);
    } catch (e) {
      setError("Couldn't generate another question. " + e.message);
    } finally {
      setPracticeLoading(false);
    }
  };

  const copyCorrected = () => {
    if (!result?.correctedCode) return;
    navigator.clipboard.writeText(result.correctedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        textarea::placeholder { color: ${COLORS.faint}; }
      `}</style>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px 64px" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: COLORS.hint, letterSpacing: 1.5, marginBottom: 10 }}>
            DEBUG THIS
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, lineHeight: 1.25 }}>Your code, graded like homework.</h1>
          <p style={{ color: COLORS.muted, fontSize: 15, marginTop: 10, maxWidth: 560 }}>
            Paste code below. Get a line-by-line walkthrough, the error spotted and explained, a nudge before the
            answer, and a practice question to lock it in.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${lang === language ? COLORS.hint : COLORS.border}`,
                background: lang === language ? COLORS.hintBg : "transparent",
                color: lang === language ? COLORS.hint : COLORS.muted,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {lang}
            </button>
          ))}
        </div>

        <CodePanel code={code} language={language} editable onChange={setCode} />

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={analyze}
            disabled={loading}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: COLORS.hint,
              color: "#1a1608",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {loading ? "Grading..." : "Analyze my code"}
            {!loading && <ChevronRight size={16} />}
          </button>
          <button
            onClick={loadExample}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: "transparent",
              color: COLORS.muted,
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            Load a buggy example
          </button>
          {error && <span style={{ color: COLORS.error, fontSize: 13.5 }}>{error}</span>}
        </div>

        {result && (
          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 18 }}>
            {result.hasError ? (
              <div
                style={{
                  background: COLORS.errorBg,
                  border: `1px solid ${COLORS.errorBorder}`,
                  borderRadius: 10,
                  padding: "16px 18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <AlertTriangle size={17} color={COLORS.error} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: COLORS.error, fontWeight: 600 }}>
                    Line {result.errorLine} · {result.errorType}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: COLORS.ink }}>{result.errorWhy}</p>
              </div>
            ) : (
              <div
                style={{
                  background: COLORS.correctBg,
                  border: `1px solid ${COLORS.correctBorder}`,
                  borderRadius: 10,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Check size={17} color={COLORS.correct} />
                <span style={{ fontSize: 14.5 }}>No errors found — this runs correctly.</span>
              </div>
            )}

            <div>
              <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>
                LINE BY LINE — {result.concept}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.lineByLine.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <LineBadge n={item.line} tone={result.hasError && item.line === result.errorLine ? "error" : "normal"} />
                    <div style={{ flex: 1, paddingTop: 2 }}>
                      <code
                        style={{
                          display: "block",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 12.5,
                          color: COLORS.faint,
                          marginBottom: 3,
                        }}
                      >
                        {item.code}
                      </code>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: COLORS.ink }}>{item.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.hasError && (
              <div
                style={{
                  background: COLORS.hintBg,
                  border: `1px solid ${COLORS.hintBorder}`,
                  borderRadius: 10,
                  padding: "16px 18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hintRevealed ? 8 : 0 }}>
                  <Lightbulb size={17} color={COLORS.hint} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.hint }}>Hint</span>
                  {!hintRevealed && (
                    <button
                      onClick={() => setHintRevealed(true)}
                      style={{
                        marginLeft: "auto",
                        background: "transparent",
                        border: `1px solid ${COLORS.hintBorder}`,
                        color: COLORS.hint,
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Reveal hint
                    </button>
                  )}
                </div>
                {hintRevealed && <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>{result.hint}</p>}
              </div>
            )}

            {result.hasError && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: COLORS.muted, letterSpacing: 1 }}>
                    CORRECTED APPROACH
                  </div>
                  {!correctedRevealed ? (
                    <button
                      onClick={() => setCorrectedRevealed(true)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${COLORS.correctBorder}`,
                        color: COLORS.correct,
                        borderRadius: 6,
                        padding: "5px 12px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Show corrected code
                    </button>
                  ) : (
                    <button
                      onClick={copyCorrected}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "transparent",
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.muted,
                        borderRadius: 6,
                        padding: "5px 12px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                {correctedRevealed && <CodePanel code={result.correctedCode} language={language} editable={false} />}
              </div>
            )}

            <div
              style={{
                background: COLORS.surfaceRaised,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Sparkles size={16} color={COLORS.hint} />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Practice question</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 14.5, lineHeight: 1.6 }}>{practiceQuestion}</p>
              <button
                onClick={newPractice}
                disabled={practiceLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.muted,
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={13} className={practiceLoading ? "spin" : ""} />
                {practiceLoading ? "Generating..." : "New practice question"}
              </button>
            </div>
          </div>
        )}

        <p style={{ marginTop: 40, fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace", color: COLORS.faint }}>
          explanations generated live — always test your code before submitting it
        </p>
      </div>
    </div>
  );
}
