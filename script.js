// Keyword library organized by domain categories
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
  
  let resumeText = "";
  
  document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
  
    document.getElementById('statusMessage').textContent = "Parsing file...";
  
    if (file.name.endsWith('.docx')) {
      file.arrayBuffer().then(buffer => {
        mammoth.extractRawText({ arrayBuffer: buffer })
          .then(result => {
            resumeText = result.value;
            afterParsing();
          })
          .catch(err => alert('Error parsing DOCX: ' + err.message));
      });
    } else if (file.name.endsWith('.pdf')) {
      const fileReader = new FileReader();
      fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
          let totalText = '';
          const maxPages = pdf.numPages;
          let pagePromises = [];
  
          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            pagePromises.push(
              pdf.getPage(pageNum).then(function(page) {
                return page.getTextContent().then(function(textContent) {
                  const pageText = textContent.items.map(item => item.str).join(' ');
                  totalText += pageText + ' ';
                });
              })
            );
          }
  
          Promise.all(pagePromises).then(function() {
            resumeText = totalText;
            afterParsing();
          });
        });
      };
      fileReader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        resumeText = e.target.result;
        afterParsing();
      };
      reader.readAsText(file);
    } else {
      alert('Unsupported file type. Please upload a .docx, .pdf, or .txt file.');
    }
  });
  
  function afterParsing() {
    document.getElementById('statusMessage').textContent = "Parsing complete!";
    document.getElementById('missingKeywords').innerHTML = '';
    document.getElementById('suggestions').value = '';
  }
  
  document.getElementById('analyzeButton').addEventListener('click', function() {
    if (!resumeText) {
      alert("Please upload and parse a resume first!");
      return;
    }
  
    const missingList = document.getElementById('missingKeywords');
    missingList.innerHTML = '';
  
    let allSuggestions = [];
  
    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      const domainSection = document.createElement('div');
      domainSection.innerHTML = `<h3>${domain}</h3>`;
      const ul = document.createElement('ul');
  
      const foundKeywords = keywords.filter(word => resumeText.toLowerCase().includes(word.toLowerCase()));
      const missingKeywords = keywords.filter(word => !foundKeywords.includes(word));
  
      missingKeywords.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        ul.appendChild(li);
  
        const randomSuggestion = generateSuggestion(word, domain);
        allSuggestions.push(randomSuggestion);
      });
  
      if (missingKeywords.length > 0) {
        domainSection.appendChild(ul);
        missingList.appendChild(domainSection);
        missingList.appendChild(document.createElement('hr'));
      }
    });
  
    document.getElementById('suggestions').value = allSuggestions.join("\n");
  });
  
  function generateSuggestion(keyword, domain) {
    const templates = [
      `Demonstrated expertise in ${keyword} to advance ${domain} initiatives.`,
      `Developed and implemented controls related to ${keyword} within ${domain} practices.`,
      `Strengthened organizational posture through ${keyword} in the area of ${domain}.`,
      `Executed initiatives enhancing ${keyword} for improved ${domain} outcomes.`,
      `Led assessments and improvements in ${keyword} aligned with ${domain} best practices.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  document.getElementById('downloadButton').addEventListener('click', function() {
    const textToSave = document.getElementById('suggestions').value;
    if (!textToSave) {
      alert("No suggestions to download yet!");
      return;
    }
    const blob = new Blob([textToSave], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `resume_suggestions_deep.txt`;
    link.click();
  });
  
  