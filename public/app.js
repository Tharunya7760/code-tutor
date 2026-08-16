const LANGUAGES = ["Python", "JavaScript", "Java", "C++", "C"];
const EXT = { Python: "py", JavaScript: "js", Java: "java", "C++": "cpp", C: "c" };

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

let state = {
  language: "Python",
  result: null,
  practiceQuestion: null,
};

const els = {
  langPills: document.getElementById("langPills"),
  filename: document.getElementById("filename"),
  lineCount: document.getElementById("lineCount"),
  lineNumbers: document.getElementById("lineNumbers"),
  codeInput: document.getElementById("codeInput"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  exampleBtn: document.getElementById("exampleBtn"),
  topError: document.getElementById("topError"),
  results: document.getElementById("results"),
};

function renderLangPills() {
  els.langPills.innerHTML = "";
  LANGUAGES.forEach((lang) => {
    const btn = document.createElement("button");
    btn.className = "lang-pill" + (lang === state.language ? " active" : "");
    btn.textContent = lang;
    btn.onclick = () => {
      state.language = lang;
      renderLangPills();
      updateFilename();
    };
    els.langPills.appendChild(btn);
  });
}

function updateFilename() {
  els.filename.textContent = `your_code.${EXT[state.language]}`;
}

function updateLineNumbers() {
  const lines = els.codeInput.value.split("\n");
  els.lineNumbers.textContent = lines.map((_, i) => i + 1).join("\n") || "1";
  els.lineCount.textContent = `${lines.length} lines`;
}

function loadExample() {
  els.codeInput.value = EXAMPLES[state.language];
  updateLineNumbers();
  els.results.classList.add("hidden");
  els.results.innerHTML = "";
  els.topError.textContent = "";
}

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function analyze() {
  const code = els.codeInput.value;
  if (!code.trim()) {
    els.topError.textContent = "Paste some code first.";
    return;
  }
  els.topError.textContent = "";
  els.analyzeBtn.disabled = true;
  els.analyzeBtn.innerHTML = "Grading...";
  els.results.classList.add("hidden");

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: state.language, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    state.result = data;
    state.practiceQuestion = data.practiceQuestion;
    renderResults();
  } catch (e) {
    els.topError.textContent = "Couldn't analyze that code. " + e.message;
  } finally {
    els.analyzeBtn.disabled = false;
    els.analyzeBtn.innerHTML = 'Analyze my code <span class="chevron">&rsaquo;</span>';
  }
}

async function newPractice() {
  const btn = document.getElementById("newPracticeBtn");
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin">&#8635;</span> Generating...';
  try {
    const res = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concept: state.result.concept,
        language: state.language,
        previousQuestion: state.practiceQuestion,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    state.practiceQuestion = data.practiceQuestion;
    document.getElementById("practiceText").textContent = state.practiceQuestion;
  } catch (e) {
    els.topError.textContent = "Couldn't generate another question. " + e.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>&#8635;</span> New practice question';
  }
}

function renderResults() {
  const r = state.result;
  els.results.classList.remove("hidden");
  els.results.innerHTML = "";

  // error / success banner
  const banner = document.createElement("div");
  if (r.hasError) {
    banner.className = "banner error";
    banner.innerHTML = `
      <div class="banner-title error">&#9888; Line ${r.errorLine} &middot; ${escapeHtml(r.errorType || "")}</div>
      <p>${escapeHtml(r.errorWhy || "")}</p>
    `;
  } else {
    banner.className = "banner success";
    banner.innerHTML = `<span>&#10003;</span><span>No errors found &mdash; this runs correctly.</span>`;
  }
  els.results.appendChild(banner);

  // line by line
  const lbWrap = document.createElement("div");
  const lbLabel = document.createElement("div");
  lbLabel.className = "section-label";
  lbLabel.textContent = `LINE BY LINE — ${r.concept}`;
  lbWrap.appendChild(lbLabel);

  (r.lineByLine || []).forEach((item) => {
    const row = document.createElement("div");
    row.className = "line-row";
    const isErrorLine = r.hasError && item.line === r.errorLine;
    row.innerHTML = `
      <span class="line-badge${isErrorLine ? " error" : ""}">${item.line}</span>
      <div>
        <code class="line-code">${escapeHtml(item.code || "")}</code>
        <p class="line-explanation">${escapeHtml(item.explanation || "")}</p>
      </div>
    `;
    lbWrap.appendChild(row);
  });
  els.results.appendChild(lbWrap);

  // hint
  if (r.hasError) {
    const hintCard = document.createElement("div");
    hintCard.className = "card hint-card";
    hintCard.innerHTML = `
      <div class="card-header">
        <span class="card-title hint">&#128161; Hint</span>
        <button class="btn-small hint" id="revealHintBtn" style="margin-left:auto">Reveal hint</button>
      </div>
      <p id="hintText" class="hidden" style="margin-top:8px;">${escapeHtml(r.hint || "")}</p>
    `;
    els.results.appendChild(hintCard);
    hintCard.querySelector("#revealHintBtn").onclick = (e) => {
      hintCard.querySelector("#hintText").classList.remove("hidden");
      e.target.remove();
    };
  }

  // corrected code
  if (r.hasError && r.correctedCode) {
    const wrap = document.createElement("div");
    const header = document.createElement("div");
    header.className = "card-header spaced";
    header.style.marginBottom = "12px";
    header.innerHTML = `
      <div class="section-label" style="margin-bottom:0;">CORRECTED APPROACH</div>
      <button class="btn-small correct" id="showCorrectedBtn">Show corrected code</button>
    `;
    wrap.appendChild(header);
    els.results.appendChild(wrap);

    header.querySelector("#showCorrectedBtn").onclick = () => {
      const panel = document.createElement("div");
      panel.className = "code-panel";
      const lines = r.correctedCode.split("\n");
      panel.innerHTML = `
        <div class="code-body">
          <div class="line-numbers">${lines.map((_, i) => i + 1).join("\n")}</div>
          <pre class="code-readonly"><code>${escapeHtml(r.correctedCode)}</code></pre>
        </div>
      `;
      wrap.appendChild(panel);
      header.querySelector("#showCorrectedBtn").replaceWith(makeCopyButton(r.correctedCode));
    };
  }

  // practice question
  const practiceCard = document.createElement("div");
  practiceCard.className = "card practice-card";
  practiceCard.innerHTML = `
    <div class="card-header" style="margin-bottom:8px;">
      <span>&#10024;</span><span class="card-title">Practice question</span>
    </div>
    <p id="practiceText" style="margin:0 0 12px;font-size:14.5px;line-height:1.6;">${escapeHtml(state.practiceQuestion || "")}</p>
    <button class="btn-small neutral" id="newPracticeBtn"><span>&#8635;</span> New practice question</button>
  `;
  els.results.appendChild(practiceCard);
  practiceCard.querySelector("#newPracticeBtn").onclick = newPractice;
}

function makeCopyButton(code) {
  const btn = document.createElement("button");
  btn.className = "btn-small neutral";
  btn.innerHTML = "&#128203; Copy";
  btn.onclick = () => {
    navigator.clipboard.writeText(code);
    btn.innerHTML = "&#10003; Copied";
    setTimeout(() => (btn.innerHTML = "&#128203; Copy"), 1500);
  };
  return btn;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

els.codeInput.addEventListener("input", updateLineNumbers);
els.codeInput.addEventListener("scroll", () => {
  els.lineNumbers.scrollTop = els.codeInput.scrollTop;
});
els.analyzeBtn.addEventListener("click", analyze);
els.exampleBtn.addEventListener("click", loadExample);

renderLangPills();
updateFilename();
updateLineNumbers();
