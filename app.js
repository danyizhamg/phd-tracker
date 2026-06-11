// PhD Tracker — app.js

let allOpportunities = [];
let filtered = [];

const FIELD_MAP = {
  'Data Science': ['Data Science', 'Big Data', 'NLP', 'AI'],
  'Environmental': ['Environmental Science', 'Environmental Economics', 'Climate Policy', 'Sustainability'],
  'Economics': ['Economics', 'Econometrics', 'Political Economy', 'Decision Science'],
  'Sustainability': ['Sustainability', 'Climate Policy', 'Environmental Science'],
};

const FIELD_TAG_CLASS = {
  'Data Science': 'tag-data-science',
  'Big Data': 'tag-data-science',
  'NLP': 'tag-nlp',
  'AI': 'tag-ai',
  'Environmental Science': 'tag-environmental',
  'Environmental Economics': 'tag-environmental',
  'Climate Policy': 'tag-environmental',
  'Sustainability': 'tag-sustainability',
  'Economics': 'tag-economics',
  'Econometrics': 'tag-economics',
  'Political Economy': 'tag-economics',
  'Decision Science': 'tag-default',
  'Computer Science': 'tag-data-science',
  'Regional Science': 'tag-default',
};

// ── Load Data ──────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('./data/opportunities.json');
    allOpportunities = await res.json();
    updateStats();
    applyFilters();
  } catch (e) {
    document.getElementById('cards-grid').innerHTML =
      '<div class="no-results"><p>⚠️ Could not load opportunities.</p><small>' + e.message + '</small></div>';
  }
}

// ── Stats ──────────────────────────────────────────────────
function updateStats() {
  document.getElementById('total-count').textContent =
    allOpportunities.length + ' positions tracked';
  const dates = allOpportunities.map(o => o.added_date).sort().reverse();
  document.getElementById('last-updated').textContent =
    'Updated ' + (dates[0] || 'today');
}

// ── Deadline helpers ───────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0,0,0,0);
  return Math.ceil((d - now) / 86400000);
}

function deadlineBadge(opp) {
  if (opp.deadline_type === 'rolling') {
    return `<span class="deadline-badge deadline-rolling">Rolling</span>`;
  }
  if (opp.status === 'upcoming') {
    return `<span class="deadline-badge deadline-upcoming">Opens Soon</span>`;
  }
  const days = daysUntil(opp.deadline);
  if (days < 0) return `<span class="deadline-badge deadline-rolling">Closed</span>`;
  if (days <= 14) return `<span class="deadline-badge deadline-urgent">⚡ ${days}d left</span>`;
  if (days <= 30) return `<span class="deadline-badge deadline-soon">🟠 ${days}d left</span>`;
  const d = new Date(opp.deadline);
  const label = d.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
  return `<span class="deadline-badge deadline-ok">${label}</span>`;
}

function deadlineSortVal(opp) {
  if (opp.deadline_type === 'rolling') return 8000;
  if (opp.status === 'upcoming') return 7000;
  return daysUntil(opp.deadline);
}

// ── Field tag HTML ─────────────────────────────────────────
function fieldTags(fields) {
  return fields.slice(0,3).map(f => {
    const cls = FIELD_TAG_CLASS[f] || 'tag-default';
    return `<span class="field-tag ${cls}">${f}</span>`;
  }).join('');
}

// ── Filters ───────────────────────────────────────────────
function applyFilters() {
  const q       = document.getElementById('search-input').value.toLowerCase().trim();
  const field   = document.getElementById('filter-field').value;
  const region  = document.getElementById('filter-region').value;
  const deadline= document.getElementById('filter-deadline').value;
  const sort    = document.getElementById('sort-by').value;
  const hideLang= document.getElementById('hide-language').checked;

  filtered = allOpportunities.filter(o => {
    // Language filter
    if (hideLang && o.other_language_required) return false;

    // Search
    if (q) {
      const hay = [o.title, o.university, o.country, o.description,
                   ...(o.field || []), ...(o.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }

    // Field
    if (field !== 'all') {
      const targets = FIELD_MAP[field] || [field];
      if (!o.field.some(f => targets.includes(f))) return false;
    }

    // Region
    if (region !== 'all' && o.region !== region) return false;

    // Deadline
    if (deadline !== 'all') {
      if (o.deadline_type === 'rolling' || o.status === 'upcoming') {
        // rolling/upcoming only show under "all"
        if (deadline !== 'all') return false;
      } else {
        const d = daysUntil(o.deadline);
        if (deadline === 'urgent' && d > 14) return false;
        if (deadline === 'month' && d > 31) return false;
        if (deadline === '3months' && d > 92) return false;
      }
    }

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sort === 'deadline') return deadlineSortVal(a) - deadlineSortVal(b);
    if (sort === 'added') return b.added_date.localeCompare(a.added_date);
    if (sort === 'country') return a.country.localeCompare(b.country);
    return 0;
  });

  renderCards();
}

// ── Render ─────────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById('cards-grid');
  document.getElementById('results-count').textContent =
    `Showing ${filtered.length} of ${allOpportunities.length} positions`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-results">
      <p>No positions match your filters.</p>
      <small>Try broadening your search or clearing some filters.</small>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map((o, i) => `
    <div class="card" onclick="openModal(${i})" data-idx="${i}">
      ${o.status === 'upcoming' ? '<span class="status-upcoming">Upcoming</span>' : ''}
      <div class="card-top">
        <div class="card-flag">${o.flag}</div>
        <div class="card-header-text">
          <div class="card-university">${o.university} · ${o.country}</div>
          <div class="card-title">${o.title}</div>
        </div>
      </div>

      <div class="field-tags">${fieldTags(o.field)}</div>

      <div class="card-meta">
        <span class="stipend">💰 ${o.stipend}</span>
        ${deadlineBadge(o)}
      </div>

      ${o.other_language_required ? `
        <div>
          <span class="lang-warning">⚠️ ${o.other_language_note}</span>
        </div>` : ''}

      <div class="card-footer">
        <span class="added-date">Added ${o.added_date}</span>
        <a class="btn-view" href="${o.url}" target="_blank" rel="noopener"
           onclick="event.stopPropagation()">View Position →</a>
      </div>
    </div>
  `).join('');
}

// ── Modal ──────────────────────────────────────────────────
let currentModalOpp = null;

function openModal(idx) {
  const o = filtered[idx];
  currentModalOpp = o;
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <div class="modal-flag">${o.flag}</div>
    <div class="modal-university">${o.university} · ${o.country}</div>
    <div class="modal-title">${o.title}</div>

    <div class="modal-section">
      <div class="modal-label">Funding</div>
      <div class="modal-value">${o.stipend}</div>
    </div>

    <div class="modal-section">
      <div class="modal-label">Deadline</div>
      <div class="modal-value">${
        o.deadline_type === 'rolling' ? 'Rolling / Open' :
        o.status === 'upcoming' ? 'Applications not yet open — check website' :
        new Date(o.deadline).toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'})
      }</div>
    </div>

    ${o.supervisor ? `
    <div class="modal-section">
      <div class="modal-label">Supervisor</div>
      <div class="modal-value">${o.supervisor}</div>
    </div>` : ''}

    <div class="modal-section">
      <div class="modal-label">Language Requirement</div>
      <div class="modal-value">${o.language_req}${o.other_language_required ? ' · ⚠️ ' + o.other_language_note : ''}</div>
    </div>

    <div class="modal-section">
      <div class="modal-label">Description</div>
      <div class="modal-value">${o.description}</div>
    </div>

    <div class="modal-section">
      <div class="modal-label">Tags</div>
      <div class="modal-tags">${(o.tags || []).map(t => `<span class="modal-tag">${t}</span>`).join('')}</div>
    </div>

    <a class="btn-modal-link" href="${o.url}" target="_blank" rel="noopener">
      View Full Position →
    </a>

    <button class="btn-generate" onclick="openGenerator()">
      ✨ 一键生成申请材料 (CV + Cover Letter + RP)
    </button>
  `;

  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ── Materials Generator ─────────────────────────────────────────────
const CATHY_PROFILE = {
  name: 'Zhang Danyi',
  education: [
    { degree: 'MSc Environmental Modeling', school: 'UCL', period: '2024-2025', grade: 'Merit' },
    { degree: 'BSc Financial Mathematics', school: 'University of Liverpool', period: '2020-2024' }
  ],
  skills: 'Python (pandas, NumPy, scikit-learn, TensorFlow), R, SQL, Matlab, Java, Stata, SPSS, GIS; ML (SVM, neural networks, HMM, ensemble methods); NLP; time series analysis; stochastic processes; environmental modeling; GIS; quantitative finance',
  research: [
    'Quantitative stock market dynamics modeling — CITIC Securities (SVM, BP neural network, HMM, backtesting)',
    'Market microstructure hidden state modeling — China Merchants Securities (ACMGHMM, ACAP method)',
    'TCM-GPT LLM development — NLP, NER, knowledge graph'
  ],
  experience: [
    'Data Analysis Intern — Cryptoracle Malaysia (crypto trading strategy, factor backtesting)',
    'Algorithm Engineer Intern — iFlytek (NLP, knowledge graphs, judicial NLP)',
    'Risk Consulting Intern — Deloitte China (risk modeling, asset management)'
  ],
  ielts: '8',
  languages: 'English (IELTS 8); Chinese (native); no German or French',
  referees: [
    'Dr. Thais Morcatty, UCL Lecturer, t.morcatty@ucl.ac.uk',
    'Dr. Yankeng Luo, XJTLU, Yankeng.Luo@xjtlu.edu.cn'
  ]
};

const MATERIALS_CACHE = {};
let generatingFor = null;

function openGenerator() {
  if (!currentModalOpp) return;
  const o = currentModalOpp;

  // Close the position modal
  closeModal();

  // Open panel
  const panel = document.getElementById('panel-overlay');
  document.getElementById('panel-subtitle').textContent =
    `${o.flag} ${o.university} · ${o.title}`;
  panel.classList.add('open');

  // Reset tab to CV
  switchTab('cv');

  // Check cache
  if (MATERIALS_CACHE[o.id]) {
    showMaterials(MATERIALS_CACHE[o.id]);
    return;
  }

  generateMaterials(o);
}

async function generateMaterials(o) {
  generatingFor = o.id;

  // Show loading
  document.getElementById('panel-loading').style.display = 'flex';
  document.getElementById('panel-content').style.display = 'none';
  document.getElementById('panel-error').style.display = 'none';
  document.getElementById('panel-notice').style.display = 'none';

  try {
    // Build prompt for the AI via a webhook/message approach
    // Since this is static, we use a pre-generated template engine
    // and show a "request sent" state, then poll or use stored data
    const materials = await generateWithTemplate(o);
    MATERIALS_CACHE[o.id] = materials;
    showMaterials(materials);
  } catch (err) {
    document.getElementById('panel-loading').style.display = 'none';
    document.getElementById('panel-error').style.display = 'flex';
    document.getElementById('btn-retry').onclick = () => generateMaterials(o);
  }
}

async function generateWithTemplate(o) {
  // Simulate a brief loading time for UX
  await new Promise(r => setTimeout(r, 1200));

  const p = CATHY_PROFILE;
  const deadline = o.deadline_type === 'rolling' ? 'Rolling / Open'
    : o.status === 'upcoming' ? 'TBD'
    : new Date(o.deadline).toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'});

  // ── CV ──
  const cv = `ZHANG DANYI
13359485898@163.com | IELTS: 8

═══════════════════════════════════════════
EDUCATION
═══════════════════════════════════════════

MSc Environmental Modeling                              2024–2025
University College London (UCL), UK                    Merit
Relevant Courses: Statistical & Numerical Analysis, Machine Learning
Algorithms, Climate Statistical Modeling, GIS & Spatial Data Analysis,
Environmental Modeling, Land Carbon Modeling
Tools: Python, R, Matlab, SQL, GIS, SPSS

BSc Financial Mathematics                               2020–2024
University of Liverpool, UK
Relevant Courses: Econometrics, Stochastic Processes, Time Series Analysis,
Probability & Statistics, Risk Management, Monte Carlo Methods,
Markov Chains, Macroeconomics, Microeconomics
Tools: Python, R, Matlab, Java, Stata

═══════════════════════════════════════════
RESEARCH EXPERIENCE
═══════════════════════════════════════════

Research Assistant — CITIC Securities                   2022–2023
Quantitative Modeling of Market Dynamics
• Processed large-scale minute-level trading data (2018–2022); extracted
  9 key features; applied SVM and BP neural network for price prediction
• Achieved backtesting NAV 1.71, annualized return 70%, Sharpe ratio 3.79
• Relevance to ${o.title.slice(0,40)}...: large-scale empirical data
  modeling, feature engineering, quantitative performance evaluation

Research Assistant — China Merchants Securities         2023
Market Microstructure & Hidden State Modeling
• Developed Adaptive Continuous Mixture Gaussian Hidden Markov Model
  (ACMGHMM) for latent state transitions in order book dynamics
• Designed Autocorrelation Coefficient Adjusted Prediction (ACAP) method
• Skills directly transferable to ${o.field[0]} research:
  structural regime modeling, non-stationarity, causal inference

Research Contributor — TCM-GPT Project                  2023–2024
Domain-Specific LLM Development
• NLP pipeline: NER, relationship extraction on million-character corpora
• Applicable to ${o.field.slice(0,2).join('/')} research:
  computational text analysis, knowledge graph construction

═══════════════════════════════════════════
PROFESSIONAL EXPERIENCE
═══════════════════════════════════════════

Data Analysis Intern — Cryptoracle (Malaysia)           Jun–Jul 2025
• Multi-factor signal development; time series analysis; factor backtesting

Algorithm Engineer Intern — iFlytek, Suzhou             Jul–Oct 2023
• NLP for knowledge graph; judicial data processing; accuracy 97%

Risk Consulting Intern — Deloitte China, Chongqing      May–Aug 2022
• Risk value modeling; internal control optimization; research reports

═══════════════════════════════════════════
SKILLS
═══════════════════════════════════════════

Programming:  Python, R, SQL, Matlab, Java, Stata, SPSS
ML/Stats:     SVM, neural networks, HMM, ensemble methods, time series,
              stochastic processes, Bayesian inference
Environment:  GIS, spatial data analysis, land carbon modeling,
              climate statistical modeling
Languages:    English (IELTS 8), Chinese (native)

═══════════════════════════════════════════
REFEREES
═══════════════════════════════════════════

Dr. Thais Morcatty, Lecturer, UCL Geography
t.morcatty@ucl.ac.uk

Dr. Yankeng Luo, Teaching & Research Fellow, XJTLU Mathematics
Yankeng.Luo@xjtlu.edu.cn`;

  // ── Cover Letter ──
  const cl = `Zhang Danyi
13359485898@163.com

To: ${o.supervisor ? o.supervisor : 'The PhD Admissions Committee'}
${o.university}

Dear ${o.supervisor ? o.supervisor.replace('Prof.', 'Professor').replace('Dr.', 'Dr') : 'Search Committee'},

I write to apply for the PhD position in ${o.title} at ${o.university}. My interdisciplinary background in Financial Mathematics (BSc, University of Liverpool) and Environmental Modeling (MSc, UCL, Merit) positions me uniquely to contribute to research in ${o.field.join(', ')}.

My research experience demonstrates the quantitative analytical capabilities central to this position. At CITIC Securities, I developed machine learning models (SVM, BP neural networks) on large-scale minute-level trading data, achieving robust performance metrics (Sharpe ratio 3.79, annualized return 70%). At China Merchants Securities, I developed an Adaptive Continuous Mixture Gaussian Hidden Markov Model (ACMGHMM) to model latent structural transitions — a methodology directly applicable to ${o.field[0]} dynamics. At iFlytek, I built NLP pipelines for knowledge graph construction, skills directly transferable to computational analysis in ${o.field.slice(-1)[0]} research.

My MSc in Environmental Modeling at UCL (Merit) provided rigorous training in climate statistical modeling, GIS and spatial data analysis, land carbon modeling, and machine learning applications to environmental systems. This technical foundation, combined with my quantitative finance background, enables me to bridge the ${o.field.join(' and ')} dimensions of your research agenda.

${o.other_language_required ? `Regarding language requirements: I am fully proficient in English. While I do not currently hold formal ${o.other_language_note}, I am committed to developing working competence progressively during the programme.` : `I am fully proficient in English (IELTS 8) and excited to work in an international research environment.`}

I am available to commence in ${o.deadline_type === 'rolling' ? 'the coming months' : 'the upcoming academic cycle'} and am flexible regarding start date. I would welcome the opportunity to discuss how my background can contribute to your research group.

I attach my CV, academic transcripts, and a research proposal as requested.

Yours sincerely,
Zhang Danyi`;

  // ── Research Proposal ──
  const rp = `RESEARCH PROPOSAL

Applicant: Zhang Danyi
Position: ${o.title}
Institution: ${o.university}
${o.supervisor ? `Proposed Supervisor: ${o.supervisor}` : ''}

═══════════════════════════════════════════
I. RESEARCH BACKGROUND
═══════════════════════════════════════════

The intersection of ${o.field.join(', ')} presents one of the most pressing analytical challenges of the current decade. Existing approaches to ${o.field[0]} research often rely on either purely qualitative frameworks or narrowly quantitative models that fail to capture the complex, dynamic interactions between ${o.field.join(' and ')} systems. This proposal outlines a PhD research programme that addresses this gap through rigorous mixed-method and quantitative modeling approaches.

${o.description}

Despite significant advances in ${o.field[0]} scholarship, several critical gaps remain. First, the integration of large-scale data-driven methods — machine learning, time series econometrics, natural language processing — with ${o.field.slice(-1)[0]} analysis is underdeveloped. Second, the quantitative modeling of structural transitions and regime shifts in ${o.field[0]} systems lacks the methodological sophistication applied in adjacent fields such as financial econometrics. Third, cross-disciplinary frameworks that bridge ${o.field.join(', ')} dimensions remain nascent.

═══════════════════════════════════════════
II. RESEARCH OBJECTIVES
═══════════════════════════════════════════

1. To develop and operationalize quantitative frameworks for analyzing
   structural dynamics in ${o.field[0]} systems, integrating machine
   learning, time series econometrics, and domain-specific knowledge.

2. To investigate the empirical relationships between ${o.field.join(' and ')}
   dimensions, with attention to causal mechanisms and policy implications.

3. To apply and extend Hidden Markov Model (HMM) and related latent
   variable methodologies to identify regime transitions and structural
   breaks in ${o.field[0]} data.

4. To generate policy-relevant insights for ${o.country} and international
   governance of ${o.field.slice(-1)[0]}.

═══════════════════════════════════════════
III. THEORETICAL FRAMEWORK
═══════════════════════════════════════════

This research integrates three theoretical traditions:

1. Quantitative modeling of complex systems: Drawing on methods
   developed in financial econometrics (time series analysis, HMM,
   regime-switching models) and applying them to ${o.field[0]} research
   contexts where structural non-stationarity is a central challenge.

2. ${o.field[0]} theory: Engaging with the core conceptual frameworks
   in ${o.field.join(', ')} scholarship to ensure research questions are
   theoretically grounded and empirically tractable.

3. Policy analysis and governance: Connecting empirical findings
   to actionable policy implications for ${o.country} and comparable
   international contexts.

═══════════════════════════════════════════
IV. METHODOLOGY (Mixed Method)
═══════════════════════════════════════════

Phase 1 (Months 1–10): Literature review and framework development
• Systematic review of ${o.field.join(', ')} literature
• Identification of key datasets and data collection strategy
• Operationalization of quantitative parameters and research design

Phase 2 (Months 11–24): Quantitative modeling and empirical analysis
• Machine learning and statistical modeling (Python/R)
• Time series econometrics: HMM, regime-switching, DID/event study
• NLP-based text analysis where applicable (policy documents, reports)
• GIS and spatial analysis (building on UCL Environmental Modeling MSc)

Phase 3 (Months 25–36): Synthesis, policy implications, stakeholder engagement
• Cross-method synthesis and theoretical contribution
• Stakeholder engagement with ${o.country} policy institutions
• Journal article preparation and conference presentations

Phase 4 (Months 30–48): Thesis writing and completion
═══════════════════════════════════════════
V. EXPECTED CONTRIBUTIONS
═══════════════════════════════════════════

Methodological: Novel application of quantitative methods from financial
econometrics to ${o.field[0]} research; advancement of mixed-method
frameworks integrating ML, time series, and domain-specific analysis.

Empirical: First systematic quantitative assessment of [core research
question] in the ${o.country} context, with international comparative
dimensions.

Policy: Actionable insights for ${o.country} and international governance
of ${o.field.slice(-1)[0]}, grounded in rigorous empirical evidence.`;

  return { cv, cl, rp };
}

function showMaterials(materials) {
  document.getElementById('panel-loading').style.display = 'none';
  document.getElementById('panel-content').style.display = 'flex';
  document.getElementById('panel-error').style.display = 'none';
  document.getElementById('panel-notice').style.display = 'block';

  document.getElementById('material-cv').textContent = materials.cv;
  document.getElementById('material-cl').textContent = materials.cl;
  document.getElementById('material-rp').textContent = materials.rp;
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

function copyMaterial(tab) {
  const text = document.getElementById(`material-${tab}`).textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector(`#tab-${tab} .btn-copy`);
    const orig = btn.textContent;
    btn.textContent = '✅ 已复制';
    btn.classList.add('copy-success');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copy-success'); }, 2000);
  });
}

function downloadMaterial(tab, ext) {
  const o = currentModalOpp || { university: 'PhD', id: 'material' };
  const text = document.getElementById(`material-${tab}`).textContent;
  const names = { cv: 'CV', cl: 'CoverLetter', rp: 'ResearchProposal' };
  const filename = `ZhangDanyi_${names[tab]}_${o.university.replace(/\s/g,'')}`.replace(/[^a-zA-Z0-9_]/g,'');

  if (ext === 'pdf') {
    downloadPDF(tab, text, filename);
    return;
  }

  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.${ext}`;
  a.click();
}

function downloadPDF(tab, text, filename) {
  const o = currentModalOpp || {};
  const labels = { cv: 'Curriculum Vitae', cl: 'Cover Letter', rp: 'Research Proposal' };
  const label = labels[tab] || 'Document';

  // Build a clean printable HTML page
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${label} — Zhang Danyi</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', serif;
    font-size: 11pt;
    line-height: 1.75;
    color: #1a1a1a;
    padding: 0;
  }
  .header {
    background: #1a2744;
    color: white;
    padding: 16px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-label { font-size: 13pt; font-weight: bold; letter-spacing: 1px; }
  .header-name  { font-size: 10pt; opacity: 0.85; }
  .meta {
    background: #f0f4f8;
    padding: 8px 40px;
    font-size: 9pt;
    color: #555;
    border-bottom: 2px solid #e8334a;
  }
  .body {
    padding: 32px 40px;
    white-space: pre-wrap;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    line-height: 1.7;
  }
  @media print {
    .no-print { display: none; }
    body { padding: 0; }
  }
</style>
</head>
<body>
  <div class="header">
    <span class="header-label">${label.toUpperCase()}</span>
    <span class="header-name">Zhang Danyi</span>
  </div>
  <div class="meta">${o.university || ''} &middot; ${(o.title || '').slice(0,80)}</div>
  <div class="body">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
</body>
</html>`;

  // Open in new window and trigger print dialog (Save as PDF)
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  win.focus();
  // Short delay to let fonts render, then print
  setTimeout(() => {
    win.print();
  }, 600);
}

// ── Event listeners ────────────────────────────────────────
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('panel-close').addEventListener('click', () => {
  document.getElementById('panel-overlay').classList.remove('open');
});
document.getElementById('panel-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget)
    document.getElementById('panel-overlay').classList.remove('open');
});
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    document.getElementById('panel-overlay').classList.remove('open');
  }
});

['search-input','filter-field','filter-region','filter-deadline','sort-by','hide-language']
  .forEach(id => document.getElementById(id).addEventListener('input', applyFilters));

// ── Init ───────────────────────────────────────────────────
loadData();
