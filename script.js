const fileInput = document.getElementById('fileInput');
const analyzeButton = document.getElementById('analyzeButton');
const frameworkSelect = document.getElementById('frameworkSelect');
const radarChartCtx = document.getElementById('radarChart').getContext('2d');
const previewCanvas = document.getElementById('pdfPreviewAnalysis');
const previewText = document.getElementById('textPreviewAnalysis');
const missingKeywords = document.getElementById('missingKeywords');
const suggestionsContainer = document.getElementById('suggestionsContainer');
const summaryContainer = document.getElementById('executiveSummary');
const scoreBar = document.getElementById('scoreBar');
const scoreText = document.getElementById('scoreText');
const matrixTable = document.getElementById('skillsMatrix').getElementsByTagName('tbody')[0];

const darkModeToggle = document.getElementById('darkModeToggle');
darkModeToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark-mode', darkModeToggle.checked);
});

let chart;

// Skills by Domain
const skillDomains = {
  "Authentication & Authorization": [
    "Multi-Factor Authentication", "Single Sign-On", "OAuth 2.0", "SAML"
  ],
  "Data Protection & Privacy": [
    "Data Encryption", "Data Loss Prevention", "Privacy Impact Assessment"
  ],
  "Risk Management & Governance": [
    "Risk Assessment", "Compliance Audit", "Risk Mitigation"
  ],
  "Security Operations & Monitoring": [
    "Event Monitoring", "SIEM Integration", "Threat Detection"
  ],
  "Compliance Frameworks": [
    "NIST 800-53", "HIPAA", "ISO 27001", "SOC 2", "GDPR", "PCI-DSS"
  ],
  "Integration Security": [
    "OAuth-secured APIs", "Webhooks Security", "Cross-Domain Integration Risks"
  ]
};

// Smart Suggestions per Domain
const smartSuggestions = {
  "Authentication & Authorization": [
    "Highlight experience implementing SSO with SAML or OAuth2.",
    "Add details about Zero Trust Architecture or PAM platforms."
  ],
  "Data Protection & Privacy": [
    "Mention encryption at rest and in transit standards used.",
    "Include data classification or tokenization experience."
  ],
  "Risk Management & Governance": [
    "List prior risk assessment or compliance audit roles.",
    "Include knowledge of frameworks (e.g., ISO 27001, NIST CSF)."
  ],
  "Security Operations & Monitoring": [
    "Mention SIEM platform usage (e.g., Splunk, QRadar).",
    "Describe real-time monitoring or incident response roles."
  ],
  "Compliance Frameworks": [
    "Include certifications or projects with NIST, SOC 2, HIPAA.",
    "Map resume achievements to control domains like AC, AU, etc."
  ],
  "Integration Security": [
    "Note secure API development or OAuth-scoped API integrations.",
    "Highlight cross-domain auth controls or webhook validation."
  ]
};

// Text Extraction Logic
async function extractText(file) {
  if (file.type === 'application/pdf') {
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(i => i.str).join(" ");
      fullText += text + "\n";
    }
    return fullText;
  } else if (file.name.endsWith(".docx")) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => {
        mammoth.extractRawText({ arrayBuffer: e.target.result })
          .then(result => resolve(result.value));
      };
      reader.readAsArrayBuffer(file);
    });
  } else {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsText(file);
    });
  }
}

// Keyword Matching
function analyzeKeywords(text) {
  const lowerText = text.toLowerCase();
  const results = {};
  let totalScore = 0;

  Object.entries(skillDomains).forEach(([domain, keywords]) => {
    const matched = keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
    const matchPercent = Math.round((matched.length / keywords.length) * 100);
    totalScore += matchPercent;
    results[domain] = {
      matched,
      missing: keywords.filter(kw => !matched.includes(kw)),
      matchPercent
    };
  });

  const avgScore = Math.round(totalScore / Object.keys(skillDomains).length);
  return { results, avgScore };
}

// Match Rating
function getRating(percent) {
  if (percent >= 80) return "Excellent";
  if (percent >= 60) return "Good";
  if (percent >= 40) return "Fair";
  return "Needs Work";
}

// Radar Chart Render
function renderRadar(data) {
  if (chart) chart.destroy();
  chart = new Chart(radarChartCtx, {
    type: 'radar',
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: 'Coverage %',
        data: Object.values(data).map(d => d.matchPercent),
        fill: true,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.3)"
      }]
    },
    options: {
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 10 }
        }
      }
    }
  });
}

// Resume Preview Image
async function renderPDFPreview(file) {
  const canvas = previewCanvas;
  const context = canvas.getContext('2d');
  const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.25 });
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context, viewport }).promise;
  canvas.style.display = 'block';
  previewText.style.display = 'none';
}

// Matrix Table
function buildMatrix(results) {
  matrixTable.innerHTML = "";
  Object.entries(results).forEach(([domain, data]) => {
    const row = matrixTable.insertRow();
    row.insertCell().textContent = domain;
    row.insertCell().textContent = `${data.matchPercent}%`;
    row.insertCell().textContent = getRating(data.matchPercent);
    row.insertCell().textContent = skillDomains["Compliance Frameworks"].join(", ");
  });
}

// Keyword Cards
function displayMissingKeywords(results) {
  missingKeywords.innerHTML = "";
  Object.entries(results).forEach(([domain, data]) => {
    const card = document.createElement("div");
    card.innerHTML = `
      <h3>${domain}</h3>
      <ul>${data.missing.map(k => `<li>${k}</li>`).join("")}</ul>
    `;
    missingKeywords.appendChild(card);
  });
}

// Smart Suggestions
function displaySuggestions(results) {
  suggestionsContainer.innerHTML = "";
  Object.entries(results).forEach(([domain, data]) => {
    if (data.matchPercent < 80 && smartSuggestions[domain]) {
      const suggestionCard = document.createElement("div");
      suggestionCard.className = "suggestion-card";
      suggestionCard.innerHTML = `
        <h3>${domain}</h3>
        <ul>${smartSuggestions[domain].map(s => `<li>${s}</li>`).join("")}</ul>
      `;
      suggestionsContainer.appendChild(suggestionCard);
    }
  });
}

// Executive Summary
function generateSummary(avgScore) {
  if (avgScore >= 80) return "Your resume demonstrates strong alignment to security frameworks. Consider applying now!";
  if (avgScore >= 50) return "You're on the right track. Enhance coverage in key domains to strengthen your alignment.";
  return "Significant opportunities exist to align your resume with industry standards. Focus on integrating domain-relevant language.";
}

// Event Handler
analyzeButton.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Please upload a resume.");

  document.getElementById("statusMessage").textContent = "Parsing file...";
  const text = await extractText(file);
  await renderPDFPreview(file);

  const { results, avgScore } = analyzeKeywords(text);
  renderRadar(results);
  buildMatrix(results);
  displayMissingKeywords(results);
  displaySuggestions(results);

  scoreBar.style.width = `${avgScore}%`;
  scoreText.textContent = `Overall Coverage: ${avgScore}%`;
  summaryContainer.textContent = generateSummary(avgScore);

  document.getElementById("analysisResults").style.display = "block";
  document.getElementById("statusMessage").textContent = "Parsing complete!";
});
