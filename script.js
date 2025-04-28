// ─── DOM REFERENCES ─────────────────────────────────────────────────────────
const industrySelect       = document.getElementById('industrySelect');
const frameworkContainer   = document.getElementById('frameworkContainer');
const frameworkSelect      = document.getElementById('frameworkSelect');
const jobDescInput         = document.getElementById('jobDescInput');
const fileInput            = document.getElementById('fileInput');
const analyzeButton        = document.getElementById('analyzeButton');
const darkModeToggle       = document.getElementById('darkModeToggle');

const scoreBar             = document.getElementById('scoreBar');
const scoreText            = document.getElementById('scoreText');
const jdScoreBar           = document.getElementById('jdScoreBar');
const jdScoreText          = document.getElementById('jdScoreText');
const summaryContainer     = document.getElementById('executiveSummary');
const missingKeywords      = document.getElementById('missingKeywords');
const suggestionsContainer = document.getElementById('suggestionsContainer');
const matrixTableBody      = document
  .getElementById('skillsMatrix')
  .getElementsByTagName('tbody')[0];

const radarCanvas          = document.getElementById('radarChart');
const radarCtx             = radarCanvas.getContext('2d');
let radarChart             = null;

// ─── SKILL DOMAIN DEFINITIONS ───────────────────────────────────────────────
const skillDomains = {
  "Cyber Security": {
    "Authentication & Authorization": [
      "Multi-Factor Authentication","Single Sign-On","OAuth 2.0","SAML",
      "Zero Trust Architecture","Role-Based Access Control"
    ],
    "Data Protection & Privacy": [
      "Data Encryption at Rest","Data Encryption in Transit",
      "Tokenization","Data Loss Prevention","Privacy Impact Assessment"
    ],
    "Risk Management & Governance": [
      "Risk Assessment","Vulnerability Management",
      "Business Continuity Planning","Incident Response Planning"
    ],
    "Security Operations & Monitoring": [
      "SIEM Integration","Threat Detection",
      "Anomaly Detection","Incident Response"
    ],
    "Compliance Frameworks": [
      "NIST 800-53","ISO 27001","SOC 2","GDPR","HIPAA"
    ],
    "Integration Security": [
      "API Security","Secure Integration Patterns",
      "Cross-Domain Integration Risks","OAuth-secured APIs"
    ]
  },
  "Web Development": {
    "Front-End": ["HTML5","CSS3","JavaScript","React","Angular","Vue.js"],
    "Back-End":  ["Node.js","Express","Python","Django","REST API","SQL"],
    "DevOps":    ["Docker","Kubernetes","CI/CD","Jenkins","AWS","Azure"]
  },
  "Finance": {
    "Financial Analysis":   ["P&L","Forecasting","Variance Analysis","Excel Modeling","KPIs"],
    "Data & Automation":    ["ETL","Python","Tableau","Snowflake","RPA","dbt"],
    "Reporting & Compliance":["SOX","IFRS","GAAP","Audit","Close Process","Dashboards"]
  }
};

// ─── UTILITY FUNCTIONS ─────────────────────────────────────────────────────
async function extractText(file) {
  if (file.type === "application/pdf") {
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let txt = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      txt += content.items.map(item => item.str).join(" ") + " ";
    }
    return txt;
  }
  if (file.name.endsWith(".docx")) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        mammoth.extractRawText({ arrayBuffer: e.target.result })
          .then(r => resolve(r.value));
      };
      reader.readAsArrayBuffer(file);
    });
  }
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsText(file);
  });
}

function analyzeKeywords(text, domains) {
  const lower = text.toLowerCase();
  const results = {};
  let sum = 0;
  const count = Object.keys(domains).length;

  for (const [d, keys] of Object.entries(domains)) {
    const matched = keys.filter(k => lower.includes(k.toLowerCase()));
    const pct = Math.round((matched.length / keys.length) * 100);
    sum += pct;
    results[d] = { matched, missing: keys.filter(k => !matched.includes(k)), matchPercent: pct };
  }
  return { results, overall: Math.round(sum / count) };
}

function analyzeJobDesc(text, domains) {
  const lower = text.toLowerCase();
  const matched = {}, missing = {};
  for (const [d, keys] of Object.entries(domains)) {
    const m = keys.filter(k => lower.includes(k.toLowerCase()));
    matched[d] = m;
    missing[d] = keys.filter(k => !m.includes(k));
  }
  return { matched, missing };
}

function getRating(p) {
  if (p >= 80) return "Excellent";
  if (p >= 60) return "Good";
  if (p >= 40) return "Fair";
  return "Needs Work";
}

// ─── RENDERING ──────────────────────────────────────────────────────────────
function renderRadar(data) {
  const labelColor = darkModeToggle.checked ? "#ffffff" : "#111827";
  radarCanvas.parentElement.style.height = "300px";
  if (radarChart) radarChart.destroy();

  radarChart = new Chart(radarCtx, {
    type: "radar",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Coverage %",
        data: Object.values(data),
        fill: true,
        borderColor: darkModeToggle.checked ? "#82aaff" : "#3b82f6",
        backgroundColor: darkModeToggle.checked
          ? "rgba(130,170,255,0.3)"
          : "rgba(59,130,246,0.3)"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { stepSize: 20, color: labelColor },
          grid: { color: labelColor },
          pointLabels: { color: labelColor }
        }
      },
      plugins: {
        legend: { labels: { color: labelColor } }
      }
    }
  });
}

function buildMatrix(results, domains) {
  matrixTableBody.innerHTML = "";
  for (const [d,i] of Object.entries(results)) {
    const row = matrixTableBody.insertRow();
    row.insertCell().textContent = d;
    row.insertCell().textContent = `${i.matchPercent}%`;
    row.insertCell().textContent = getRating(i.matchPercent);
    row.insertCell().textContent = domains[d].join(", ");
  }
}

function showMissing(results) {
  missingKeywords.innerHTML = "";
  for (const [d,i] of Object.entries(results)) {
    const c = document.createElement("div");
    c.innerHTML = `<h3>${d}</h3><ul>${i.missing.map(k=>`<li>${k}</li>`).join("")}</ul>`;
    missingKeywords.appendChild(c);
  }
}

function showSuggestions(res, jobDesc) {
  suggestionsContainer.innerHTML = "";
  for (const [d,i] of Object.entries(res)) {
    const lines = [];
    const focus = jobDesc.matched[d][0] || jobDesc.missing[d][0] || null;

    i.missing.forEach(k => {
      if (focus) {
        lines.push(`Highlight your ${k} experience to support the job description’s focus on "${focus}". For example: “Implemented ${k} to strengthen ${focus} across projects.”`);
      } else {
        lines.push(`Include a measurable example of ${k}—e.g. “Developed ${k} process that….”`);
      }
    });

    if (!lines.length && jobDesc.missing[d].length) {
      lines.push(`Great coverage! You could still mention how you delivered "${jobDesc.missing[d][0]}".`);
    }

    if (!lines.length) {
      lines.push(`Your resume already shows strong expertise in ${d}.`);
    }

    const box = document.createElement("div");
    box.innerHTML = `<h3>${d}</h3><ul>${lines.map(l=>`<li>${l}</li>`).join("")}</ul>`;
    suggestionsContainer.appendChild(box);
  }
}

// ─── DARK MODE TOGGLE ─────────────────────────────────────────────────────
darkModeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark-mode", darkModeToggle.checked);
  if (radarChart) {
    const data = radarChart.data.datasets[0].data.reduce((o,v,i) => {
      o[radarChart.data.labels[i]] = v; return o;
    }, {});
    renderRadar(data);
  }
});

// ─── MAIN ANALYZE HANDLER ──────────────────────────────────────────────────
analyzeButton.addEventListener("click", async () => {
  const industry = industrySelect.value;
  const domains  = skillDomains[industry];
  if (!domains) {
    return alert("Please select Cyber Security, Web Development, or Finance.");
  }

  // show/hide framework
  frameworkContainer.classList.toggle("hidden", industry !== "Cyber Security");

  if (!fileInput.files.length) {
    return alert("Please upload your resume (.pdf, .docx, .txt).");
  }

  // extract texts
  const resumeText = await extractText(fileInput.files[0]);
  const jdText     = jobDescInput.value.trim();
  const jobDesc    = analyzeJobDesc(jdText || "", domains);

  // analyze resume vs. domains
  const { results, overall } = analyzeKeywords(resumeText, domains);

  // analyze job description coverage
  const jdPercents = Object.entries(jobDesc.matched)
    .map(([d,arr]) =>
      Math.round((arr.length / domains[d].length) * 100)
    );
  const jdOverall = Math.round(jdPercents.reduce((a,b)=>a+b,0) / jdPercents.length);

  // render radar
  renderRadar(Object.fromEntries(
    Object.entries(results).map(([d,i]) => [d,i.matchPercent])
  ));

  // update resume health
  scoreBar.style.width  = `${overall}%`;
  scoreText.textContent  = `Overall Coverage: ${overall}%`;

  // update job description match
  jdScoreBar.style.width  = `${jdOverall}%`;
  jdScoreText.textContent = `Job Description Coverage: ${jdOverall}%`;

  // summary
  summaryContainer.innerHTML = `
    <p>Your resume shows <strong>${overall}%</strong> domain coverage in <em>${industry}</em>.</p>
    <p>Your resume matches <strong>${jdOverall}%</strong> of the key terms in your pasted job description.</p>
  `;

  // fill tables & cards
  buildMatrix(results, domains);
  showMissing(results);
  showSuggestions(results, jobDesc);

  document.getElementById("analysisResults").classList.remove("hidden");
});










