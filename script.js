const domainKeywords = {
    "Authentication & Authorization": [
      "Multi-Factor Authentication", "Single Sign-On", "Identity Federation", "OAuth 2.0", "SAML",
      "Zero Trust Architecture", "Role-Based Access Control", "Privileged Access Management",
      "Authorization Models", "Directory Services", "LDAP Integration", "Conditional Access", "Least Privilege"
    ],
    "Data Protection & Privacy": [
      "Data Encryption at Rest", "Data Encryption in Transit", "Key Management", "Tokenization",
      "Data Loss Prevention", "Database Security", "Field-Level Security", "End-to-End Encryption",
      "Data Retention Policies", "Data Minimization", "Confidentiality Controls", "Privacy Impact Assessment",
      "GDPR Compliance", "HIPAA Compliance"
    ],
    "Risk Management & Governance": [
      "Risk Assessment", "Vulnerability Management", "Security Risk Scoring", "Business Continuity Planning",
      "Disaster Recovery Planning", "Incident Response Planning", "Threat Modeling", "Third-Party Risk Management",
      "Vendor Risk Assessment", "Compliance Gap Analysis", "Audit Readiness", "Governance, Risk, and Compliance"
    ],
    "Security Operations & Monitoring": [
      "Event Monitoring", "SIEM Integration", "Threat Detection", "Insider Threat Management",
      "Incident Response", "Anomaly Detection", "Real-Time Monitoring", "Alerting & Escalation Procedures",
      "Security Operations Center", "Security Incident Event Management"
    ],
    "Compliance Frameworks": [
      "NIST 800-53", "NIST CSF", "ISO 27001", "SOC 2 Type I", "SOC 2 Type II", "GDPR", "HIPAA",
      "PCI-DSS", "FedRAMP", "CMMC", "SOX Compliance", "Data Classification Standards"
    ],
    "Integration Security": [
      "API Security", "Secure Integration Patterns", "OAuth-secured APIs", "Webhooks Security",
      "Cross-Domain Integration Risks", "Integration Authentication", "System-to-System Encryption"
    ]
  };
  
  const frameworkDomainsMap = {
    "NIST 800-53": ["Authentication & Authorization", "Data Protection & Privacy", "Risk Management & Governance", "Security Operations & Monitoring", "Compliance Frameworks", "Integration Security"],
    "HIPAA": ["Data Protection & Privacy", "Risk Management & Governance", "Compliance Frameworks"],
    "ISO 27001": ["Authentication & Authorization", "Data Protection & Privacy", "Risk Management & Governance", "Security Operations & Monitoring", "Compliance Frameworks"],
    "SOC 2": ["Authentication & Authorization", "Risk Management & Governance", "Security Operations & Monitoring", "Compliance Frameworks"],
    "GDPR": ["Data Protection & Privacy", "Compliance Frameworks"],
    "PCI-DSS": ["Authentication & Authorization", "Data Protection & Privacy", "Integration Security", "Compliance Frameworks"]
  };
  
  let resumeText = "";
  let radarChart = null;
  
  document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;
  
    document.getElementById('statusMessage').textContent = "Parsing file...";
  
    const reader = new FileReader();
    reader.onload = function (e) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === "txt") {
        resumeText = e.target.result;
        afterParsing();
      } else if (ext === "docx") {
        mammoth.extractRawText({ arrayBuffer: e.target.result }).then(result => {
          resumeText = result.value;
          afterParsing();
        });
      } else if (ext === "pdf") {
        const typedarray = new Uint8Array(e.target.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
          const pagePromises = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            pagePromises.push(
              pdf.getPage(i).then(page =>
                page.getTextContent().then(tc =>
                  tc.items.map(item => item.str).join(" ")
                )
              )
            );
          }
          Promise.all(pagePromises).then(pages => {
            resumeText = pages.join(" ");
            afterParsing();
          });
        });
      }
    };
    if (file.name.endsWith(".docx") || file.name.endsWith(".pdf")) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
  
  function afterParsing() {
    document.getElementById('statusMessage').textContent = "Parsing complete!";
    document.getElementById('missingKeywords').innerHTML = '';
    document.getElementById('suggestions').value = '';
  }
  
  document.getElementById('analyzeButton').addEventListener('click', function () {
    if (!resumeText) {
      alert("Please upload and parse a resume first!");
      return;
    }
  
    const selectedFramework = document.getElementById('frameworkSelect').value.trim();
    const missingList = document.getElementById('missingKeywords');
    missingList.innerHTML = '';
    let allSuggestions = [];
  
    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      if (selectedFramework && frameworkDomainsMap[selectedFramework]) {
        if (!frameworkDomainsMap[selectedFramework].includes(domain)) return;
      }
  
      const domainSection = document.createElement('div');
      domainSection.innerHTML = `<h3>${domain}</h3>`;
  
      const foundKeywords = keywords.filter(word =>
        resumeText.toLowerCase().includes(word.toLowerCase())
      );
      const missingKeywords = keywords.filter(word => !foundKeywords.includes(word));
  
      const ul = document.createElement('ul');
      missingKeywords.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        ul.appendChild(li);
        allSuggestions.push(generateSuggestion(word, domain));
      });
  
      domainSection.appendChild(ul);
      missingList.appendChild(domainSection);
      missingList.appendChild(document.createElement('hr'));
    });
  
    document.getElementById('suggestions').value = allSuggestions.join("\n");
  
    // === Resume Health Score Calculation ===
    const totalKeywords = Object.entries(domainKeywords).reduce((sum, [domain, keywords]) => {
      if (selectedFramework && frameworkDomainsMap[selectedFramework]) {
        if (!frameworkDomainsMap[selectedFramework].includes(domain)) return sum;
      }
      return sum + keywords.length;
    }, 0);
  
    const matchedKeywords = Object.entries(domainKeywords).reduce((sum, [domain, keywords]) => {
      if (selectedFramework && frameworkDomainsMap[selectedFramework]) {
        if (!frameworkDomainsMap[selectedFramework].includes(domain)) return sum;
      }
      const matches = keywords.filter(word => resumeText.toLowerCase().includes(word.toLowerCase()));
      return sum + matches.length;
    }, 0);
  
    const scorePercent = Math.round((matchedKeywords / totalKeywords) * 100);
  
    const scoreBar = document.getElementById('scoreBar');
    const scoreText = document.getElementById('scoreText');
    const scoreContainer = document.getElementById('scoreContainer');
  
    scoreContainer.style.display = "block";
    scoreBar.style.width = `${scorePercent}%`;
  
    let scoreLabel = "Needs Work";
    let scoreColor = "#ef4444";
  
    if (scorePercent >= 80) {
      scoreLabel = "Excellent";
      scoreColor = "#10b981";
    } else if (scorePercent >= 50) {
      scoreLabel = "Good";
      scoreColor = "#facc15";
    } else if (scorePercent >= 30) {
      scoreLabel = "Fair";
      scoreColor = "#f97316";
    }
  
    scoreBar.style.backgroundColor = scoreColor;
    scoreText.textContent = `${scorePercent}% match – ${scoreLabel}`;
  
    // === Radar Chart: Domain Coverage Visualization ===
    const chartContainer = document.getElementById("chartContainer");
    const ctx = document.getElementById("radarChart").getContext("2d");
  
    const labels = [];
    const dataPoints = [];
  
    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      if (selectedFramework && frameworkDomainsMap[selectedFramework]) {
        if (!frameworkDomainsMap[selectedFramework].includes(domain)) return;
      }
  
      labels.push(domain);
      const matches = keywords.filter(word =>
        resumeText.toLowerCase().includes(word.toLowerCase())
      );
      const percent = Math.round((matches.length / keywords.length) * 100);
      dataPoints.push(percent);
    });
  
    if (radarChart) radarChart.destroy();
  
    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Keyword Match %',
          data: dataPoints,
          fill: true,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
          pointBackgroundColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            angleLines: { color: '#cbd5e1' },
            grid: { color: '#e2e8f0' },
            suggestedMin: 0,
            suggestedMax: 100,
            pointLabels: {
              color: document.body.classList.contains('dark-mode') ? '#f3f4f6' : '#111827'
            },
            ticks: {
              color: document.body.classList.contains('dark-mode') ? '#f3f4f6' : '#111827'
            }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  
    chartContainer.style.display = "block";
  });
  
  function generateSuggestion(keyword, domain) {
    const templates = {
      "Authentication & Authorization": [
        `Led implementation of ${keyword} to enforce secure access across the enterprise.`,
        `Improved ${keyword} processes to support zero trust and role-based access models.`,
        `Integrated ${keyword} into IAM controls to enhance system security.`,
        `Developed secure ${keyword} mechanisms aligned with authentication best practices.`,
        `Enhanced identity assurance via ${keyword} within federated systems.`
      ],
      "Data Protection & Privacy": [
        `Implemented ${keyword} to strengthen sensitive data handling practices.`,
        `Conducted privacy impact assessments involving ${keyword} across business units.`,
        `Improved encryption posture using ${keyword} techniques for data at rest and in transit.`,
        `Aligned ${keyword} strategy with HIPAA/GDPR compliance goals.`,
        `Assessed and upgraded ${keyword} controls to reduce risk of data exposure.`
      ],
      "Risk Management & Governance": [
        `Performed enterprise-level assessments involving ${keyword} to support compliance readiness.`,
        `Built governance workflows incorporating ${keyword} to manage risk effectively.`,
        `Developed internal audit controls linked to ${keyword} for policy enforcement.`,
        `Created scalable documentation supporting ${keyword} adoption across teams.`,
        `Established controls around ${keyword} to support continuous compliance monitoring.`
      ],
      "Security Operations & Monitoring": [
        `Integrated ${keyword} with security monitoring infrastructure to support incident response.`,
        `Improved threat visibility by embedding ${keyword} into SOC workflows.`,
        `Leveraged ${keyword} to detect anomalies and respond to security events in real-time.`,
        `Configured ${keyword} within SIEM platform to enhance alerting precision.`,
        `Evaluated ${keyword} coverage to close detection gaps in production environments.`
      ],
      "Compliance Frameworks": [
        `Mapped ${keyword} controls to compliance objectives across frameworks like NIST, ISO, SOC 2.`,
        `Integrated ${keyword} into readiness assessment programs and audit prep.`,
        `Correlated ${keyword} efforts with evidence collection for annual audits.`,
        `Reviewed ${keyword} control maturity against regulatory frameworks.`,
        `Contributed to audit success by validating ${keyword} alignment with policy standards.`
      ],
      "Integration Security": [
        `Secured APIs and systems through hardened ${keyword} design patterns.`,
        `Validated ${keyword} to prevent cross-domain vulnerabilities during integration.`,
        `Applied ${keyword} practices to support secure cloud-to-cloud communication.`,
        `Assessed integration points for weaknesses in ${keyword} configurations.`,
        `Established encryption and access policies governing ${keyword} pathways.`
      ]
    };
  
    const options = templates[domain] || [
      `Applied ${keyword} within ${domain} to improve security maturity.`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // Dark Mode Toggle
  document.getElementById('darkModeToggle').addEventListener('change', function () {
    document.body.classList.toggle('dark-mode', this.checked);
  });
  
  
  
  