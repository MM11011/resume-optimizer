// script.js

// ─── DOM REFERENCES ─────────────────────────────────────────────────────────
const industrySelect       = document.getElementById('industrySelect');
const frameworkContainer   = document.getElementById('frameworkContainer');
const frameworkSelect      = document.getElementById('frameworkSelect');
const fileInput            = document.getElementById('fileInput');
const analyzeButton        = document.getElementById('analyzeButton');
const darkModeToggle       = document.getElementById('darkModeToggle');

const scoreBar             = document.getElementById('scoreBar');
const scoreText            = document.getElementById('scoreText');
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
// Three supported fields: Cyber Security, Web Development, Finance
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

// ─── PROFESSIONAL SUGGESTIONS BANK ─────────────────────────────────────────
const proSuggestions = {
  cyber: {
    "Authentication & Authorization": [
      "Architected a Zero Trust framework leveraging SAML/OAuth2, reducing unauthorized access by 90%.",
      "Led RBAC policy design to enforce least-privilege for 500+ users across multi-cloud."
    ],
    // …and so on for each cyber domain…
  },
  webdev: {
    "Front-End": [
      "Optimized React bundle via code-splitting, speeding load by 50%.",
      "Built WCAG 2.1 AA accessible components, boosting usability."
    ],
    // …etc…
  },
  finance: {
    "Financial Analysis": [
      "Performed variance analysis on monthly P&L, uncovering 8% cost savings.",
      "Built dynamic Excel models with macros for scenario planning."
    ],
    // …etc…
  }
};

// ─── UTILITY FUNCTIONS ─────────────────────────────────────────────────────

// Read text from PDF / DOCX / TXT
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
  // fallback: plain text
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsText(file);
  });
}

// Compute matched vs missing, return per-domain %
function analyzeKeywords(text, domains) {
  const lower = text.toLowerCase();
  const results = {};
  let sum = 0;
  const count = Object.keys(domains).length;

  for (const [domain, keywords] of Object.entries(domains)) {
    const matched = keywords.filter(k =>
      lower.includes(k.toLowerCase())
    );
    const pct = Math.round((matched.length / keywords.length) * 100);
    sum += pct;
    results[domain] = {
      matched,
      missing: keywords.filter(k => !matched.includes(k)),
      matchPercent: pct
    };
  }

  return {
    results,
    overall: Math.round(sum / count)
  };
}

function getRating(pct) {
  if (pct >= 80) return "Excellent";
  if (pct >= 60) return "Good";
  if (pct >= 40) return "Fair";
  return "Needs Work";
}

// ─── RENDERING FUNCTIONS ──────────────────────────────────────────────────

// Draw radar chart with fixed height & appropriate colors
function renderRadar(data) {
  // enforce container height
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
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            color: getComputedStyle(document.body).color
          },
          grid: {
            color: getComputedStyle(document.body).color
          },
          pointLabels: {
            color: getComputedStyle(document.body).color
          }
        }
      },
      plugins: {
        legend: {
          labels: { color: getComputedStyle(document.body).color }
        }
      }
    }
  });
}

// Fill the Skills Matrix table
function buildMatrix(results, domains) {
  matrixTableBody.innerHTML = "";
  for (const [domain, info] of Object.entries(results)) {
    const row = matrixTableBody.insertRow();
    row.insertCell().textContent = domain;
    row.insertCell().textContent = `${info.matchPercent}%`;
    row.insertCell().textContent = getRating(info.matchPercent);
    row.insertCell().textContent = domains[domain].join(", ");
  }
}

// Show missing-keywords cards
function showMissing(results) {
  missingKeywords.innerHTML = "";
  for (const [domain, info] of Object.entries(results)) {
    const box = document.createElement("div");
    box.className = "cards-grid-item";
    box.innerHTML = `
      <h3>${domain}</h3>
      <ul>${info.missing.map(k => `<li>${k}</li>`).join("")}</ul>
    `;
    missingKeywords.appendChild(box);
  }
}

// Show Pro Suggestions (never “N/A”)
function showSuggestions(results) {
  suggestionsContainer.innerHTML = "";
  const sel = industrySelect.value;
  const key = sel === "Cyber Security"
    ? "cyber"
    : sel === "Web Development"
      ? "webdev"
      : "finance";

  for (const domain of Object.keys(results)) {
    const box = document.createElement("div");
    box.className = "suggestion-card";
    const list = proSuggestions[key]?.[domain] || [
      `Consider adding measurable achievements in ${domain}.`
    ];
    box.innerHTML = `
      <h3>${domain}</h3>
      <ul>${list.map(item => `<li>${item}</li>`).join("")}</ul>
    `;
    suggestionsContainer.appendChild(box);
  }
}

// ─── DARK MODE TOGGLE ─────────────────────────────────────────────────────
darkModeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark-mode", darkModeToggle.checked);
  // re-render chart in new colors
  if (radarChart) renderRadar(radarChart.data.datasets[0].data);
});

// ─── MAIN “ANALYZE” HANDLER ───────────────────────────────────────────────
analyzeButton.addEventListener("click", async () => {
  const industry = industrySelect.value;
  const domains  = skillDomains[industry];
  if (!domains) {
    return alert("Please select Cyber Security, Web Development, or Finance.");
  }

  // only Cyber Security uses framework
  frameworkContainer.style.display =
    industry === "Cyber Security" ? "block" : "none";

  if (!fileInput.files.length) {
    return alert("Please upload your resume (.pdf, .docx, .txt).");
  }

  // extract text & analyze
  const txt = await extractText(fileInput.files[0]);
  const { results, overall } = analyzeKeywords(txt, domains);

  // chart + summary + scores
  renderRadar(results && Object.fromEntries(
    Object.entries(results).map(([d,i]) => [d,i.matchPercent])
  ));

  scoreBar.style.width = `${overall}%`;
  scoreText.textContent = `Overall Coverage: ${overall}%`;
  summaryContainer.innerHTML = `
    <p>
      Your resume shows <strong>${overall}%</strong> coverage in <em>${industry}</em>.
      <br/>
      Detailed Breakdown: ${
        Object.entries(results)
          .map(([d,i]) => `${d}: ${i.matchPercent}%`)
          .join(" • ")
      }
    </p>
  `;

  // matrix + missing + suggestions
  buildMatrix(results, domains);
  showMissing(results);
  showSuggestions(results);
});


