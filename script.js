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

let resumeText = '';
let radarInstance = null;
let radarData = {};

const skillDomains = {
  "Authentication & Authorization": [
    "Multi-Factor Authentication", "Single Sign-On", "OAuth 2.0", "SAML", "Zero Trust", "Identity Federation"
  ],
  "Data Protection & Privacy": [
    "Data Encryption", "Field-Level Encryption", "Data Loss Prevention", "Privacy Impact Assessment", "Tokenization"
  ],
  "Risk Management & Governance": [
    "Risk Assessment", "Compliance Audit", "Risk Mitigation", "Control Frameworks", "Third-Party Risk Management"
  ],
  "Security Operations & Monitoring": [
    "Event Monitoring", "SIEM Integration", "Threat Detection", "Audit Logging", "Security Incident Response"
  ],
  "Compliance Frameworks": [
    "NIST 800-53", "HIPAA", "ISO 27001", "SOC 2", "GDPR", "PCI-DSS"
  ],
  "Integration Security": [
    "OAuth-secured APIs", "Secure Integration Patterns", "Cross-Domain Integration Risks", "Integration Authentication"
  ]
};

darkModeToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark-mode', darkModeToggle.checked);
  if (radarData && Object.keys(radarData).length) {
    generateRadarChart(radarData);
  }
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (file) {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });

      previewCanvas.height = viewport.height;
      previewCanvas.width = viewport.width;

      await page.render({ canvasContext: previewCanvas.getContext('2d'), viewport }).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const pg = await pdf.getPage(i);
        const content = await pg.getTextContent();
        fullText += content.items.map(item => item.str).join(' ') + ' ';
      }
      resumeText = fullText;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        resumeText = e.target.result;
      };
      reader.readAsText(file);
    }
  }
});

analyzeButton.addEventListener('click', () => {
  if (!resumeText) {
    alert("Please upload a resume first.");
    return;
  }

  const selectedFramework = frameworkSelect.value;
  const keywordResults = {};
  const totalMatches = [];

  Object.entries(skillDomains).forEach(([domain, keywords]) => {
    let domainKeywords = keywords;

    if (selectedFramework && domain === "Compliance Frameworks") {
      domainKeywords = keywords.filter(kw => kw === selectedFramework);
    }

    const matched = domainKeywords.filter(kw => resumeText.toLowerCase().includes(kw.toLowerCase()));
    keywordResults[domain] = {
      matched,
      unmatched: domainKeywords.filter(kw => !matched.includes(kw))
    };

    totalMatches.push((matched.length / domainKeywords.length) * 100);
  });

  radarData = {};
  Object.entries(keywordResults).forEach(([domain, result]) => {
    radarData[domain] = Math.round((result.matched.length / (result.matched.length + result.unmatched.length)) * 100) || 0;
  });

  generateRadarChart(radarData);

  const overallScore = Math.round(totalMatches.reduce((a, b) => a + b, 0) / totalMatches.length);
  scoreBar.style.width = `${overallScore}%`;
  scoreText.innerText = `Overall Coverage: ${overallScore}%`;

  missingKeywords.innerHTML = '';
  Object.entries(keywordResults).forEach(([domain, result]) => {
    const container = document.createElement('div');
    container.innerHTML = `<h3>${domain}</h3><ul>${result.unmatched.map(k => `<li>${k}</li>`).join('')}</ul>`;
    missingKeywords.appendChild(container);
  });

  // SMARTER SUGGESTIONS BELOW:
  suggestionsContainer.innerHTML = '';

  const actionVerbs = ["Implemented", "Engineered", "Established", "Led", "Developed", "Optimized", "Enhanced", "Integrated"];
  const domainPhrases = {
    "Authentication & Authorization": "strengthened authentication and authorization mechanisms",
    "Data Protection & Privacy": "enhanced data protection and privacy controls",
    "Risk Management & Governance": "advanced risk management and governance programs",
    "Security Operations & Monitoring": "improved security operations and real-time monitoring capabilities",
    "Compliance Frameworks": "ensured compliance with major regulatory frameworks",
    "Integration Security": "secured system integrations and API communications"
  };

  Object.entries(keywordResults).forEach(([domain, result]) => {
    const box = document.createElement('div');
    box.className = 'suggestion-box';
    
    box.innerHTML = `
      <h3>${domain}</h3>
      ${result.unmatched.length ? `
        <p class="suggestion-header">Suggested Resume Enhancements:</p>
        <ul>
          ${result.unmatched.map(k => {
            const verb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
            const phrase = domainPhrases[domain] || "enhanced technical controls";
            return `<li>${verb} ${k} to ${phrase}.</li>`;
          }).join('')}
        </ul>
      ` : `<p>No additional suggestions needed for this domain.</p>`}
    `;

    suggestionsContainer.appendChild(box);
  });

  matrixTable.innerHTML = '';
  Object.entries(radarData).forEach(([domain, percent]) => {
    const row = matrixTable.insertRow();
    row.innerHTML = `
      <td>${domain}</td>
      <td>${percent}%</td>
      <td>${percent >= 80 ? 'Excellent' : percent >= 50 ? 'Good' : 'Needs Work'}</td>
      <td>${skillDomains[domain].filter(k => skillDomains["Compliance Frameworks"].includes(k)).join(', ')}</td>
    `;
  });

  summaryContainer.innerHTML = `
    <p>This resume shows ${overallScore >= 80 ? 'strong' : overallScore >= 50 ? 'moderate' : 'limited'} coverage across critical security skill domains. Focus on ${Object.entries(radarData).filter(([_, v]) => v < 50).map(([d]) => d).join(', ') || 'maintaining your strengths'} to enhance technical alignment.</p>
  `;

  document.getElementById('analysisResults').style.display = 'block';
});

function generateRadarChart(data) {
  if (radarInstance) radarInstance.destroy();
  radarInstance = new Chart(radarChartCtx, {
    type: 'radar',
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: 'Coverage %',
        data: Object.values(data),
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        pointBackgroundColor: 'rgba(54, 162, 235, 1)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          angleLines: { color: '#ccc' },
          grid: { color: '#888' },
          pointLabels: { color: '#fff' },
          ticks: { color: '#fff', backdropColor: 'transparent' }
        }
      },
      plugins: {
        legend: { labels: { color: '#fff' } }
      }
    }
  });
}


