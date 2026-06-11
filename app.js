// PhD Tracker — app.js (v2: multi-user with profile)

// ── Constants ─────────────────────────────────────────────
const STORAGE_KEY = 'phd_tracker_profile';
const CACHE_KEY   = 'phd_tracker_materials';

const ALL_FIELDS = [
  'Data Science', 'Big Data', 'NLP', 'AI', 'Machine Learning',
  'Environmental Science', 'Environmental Economics', 'Climate Policy',
  'Sustainability', 'Economics', 'Econometrics', 'Political Economy',
  'Finance', 'Digital Economy', 'Public Policy', 'Computer Science',
  'Statistics', 'Decision Science', 'Regional Science', 'Social Science',
];

const FIELD_TAG_CLASS = {
  'Data Science': 'tag-data-science', 'Big Data': 'tag-data-science',
  'NLP': 'tag-nlp', 'AI': 'tag-nlp', 'Machine Learning': 'tag-nlp',
  'Environmental Science': 'tag-environmental', 'Environmental Economics': 'tag-environmental',
  'Climate Policy': 'tag-environmental', 'Sustainability': 'tag-sustainability',
  'Economics': 'tag-economics', 'Econometrics': 'tag-economics',
  'Political Economy': 'tag-economics', 'Finance': 'tag-economics',
  'Digital Economy': 'tag-economics', 'Computer Science': 'tag-data-science',
};

// ── State ──────────────────────────────────────────────────
let allOpportunities = [];
let filtered         = [];
let userProfile      = null;
let filterMineOnly   = false;
let currentModalOpp  = null;
const MATERIALS_CACHE = {};

// ── Profile ────────────────────────────────────────────────
function loadProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }
  catch { return null; }
}

function saveProfile(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function getProfile() { return userProfile; }

// ── Interest tags (in profile modal) ──────────────────────
let interestTags = [];

function renderInterestTags() {
  const list = document.getElementById('interest-tag-list');
  list.innerHTML = interestTags.map((t, i) => `
    <span class="itag">
      ${t}
      <button onclick="removeInterestTag(${i})" class="itag-remove">×</button>
    </span>
  `).join('');
}

function addInterestTag(val) {
  const v = val.trim();
  if (v && !interestTags.includes(v)) {
    interestTags.push(v);
    renderInterestTags();
  }
}

function removeInterestTag(i) {
  interestTags.splice(i, 1);
  renderInterestTags();
}

// ── Profile Modal ──────────────────────────────────────────
function openProfileModal() {
  const p = userProfile;
  interestTags = p ? [...(p.interests || [])] : [];

  document.getElementById('p-name').value    = p?.name    || '';
  document.getElementById('p-email').value   = p?.email   || '';
  document.getElementById('p-degree').value  = p?.degree  || '';
  document.getElementById('p-degree2').value = p?.degree2 || '';
  document.getElementById('p-skills').value  = p?.skills  || '';
  document.getElementById('p-research').value= p?.research|| '';
  document.getElementById('p-work').value    = p?.work    || '';
  document.getElementById('p-lang').value    = p?.lang    || '';
  document.getElementById('p-refs').value    = p?.refs    || '';
  // Restore original documents
  document.getElementById('p-cv-text').value = p?.cvText  || '';
  document.getElementById('p-ps-text').value = p?.psText  || '';
  document.getElementById('p-rp-text').value = p?.rpText  || '';
  updateCharCount('p-cv-text', 'cv-count');
  updateCharCount('p-ps-text', 'ps-count');
  updateCharCount('p-rp-text', 'rp-count');

  renderInterestTags();
  document.getElementById('profile-overlay').classList.add('open');
}

function closeProfileModal() {
  document.getElementById('profile-overlay').classList.remove('open');
}

function collectAndSaveProfile() {
  const p = {
    name:     document.getElementById('p-name').value.trim(),
    email:    document.getElementById('p-email').value.trim(),
    degree:   document.getElementById('p-degree').value.trim(),
    degree2:  document.getElementById('p-degree2').value.trim(),
    interests: interestTags,
    skills:   document.getElementById('p-skills').value.trim(),
    research: document.getElementById('p-research').value.trim(),
    work:     document.getElementById('p-work').value.trim(),
    lang:     document.getElementById('p-lang').value.trim(),
    refs:     document.getElementById('p-refs').value.trim(),
    cvText:   document.getElementById('p-cv-text').value.trim(),
    psText:   document.getElementById('p-ps-text').value.trim(),
    rpText:   document.getElementById('p-rp-text').value.trim(),
  };
  saveProfile(p);
  userProfile = p;
  closeProfileModal();
  applyUserProfile();
  applyFilters();
}

// ── Document upload helpers ────────────────────────────────────────────────────────────────
function setupDocUpload(inputId, textareaId, countId) {
  document.getElementById(inputId).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const textarea = document.getElementById(textareaId);
    const countEl  = document.getElementById(countId);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        // PDF: read as ArrayBuffer, extract text layer if readable
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        // Simple extraction: grab readable ASCII runs from PDF
        let raw = '';
        for (let i = 0; i < bytes.length; i++) {
          const c = bytes[i];
          if (c >= 32 && c < 127) raw += String.fromCharCode(c);
          else if (c === 10 || c === 13) raw += '\n';
        }
        // Extract text between BT and ET markers (PDF text blocks)
        const btMatches = raw.match(/BT\s+([\s\S]*?)ET/g) || [];
        if (btMatches.length > 0) {
          text = btMatches
            .map(block => {
              const strMatches = block.match(/\(([^)]{2,})\)/g) || [];
              return strMatches.map(s => s.slice(1,-1)).join(' ');
            })
            .join('\n')
            .replace(/\s{3,}/g, '\n')
            .trim();
        }
        if (!text || text.length < 100) {
          // Fallback: just grab readable text runs
          text = raw.replace(/[^\x20-\x7E\n]/g, ' ').replace(/ {4,}/g, '\n').trim();
        }
        if (!text || text.length < 50) {
          textarea.value = '';
          countEl.textContent = '⚠️ PDF text could not be extracted automatically. Please paste the text manually.';
          countEl.style.color = '#e8334a';
          return;
        }
      } else {
        // Plain text / markdown
        text = await file.text();
      }
      textarea.value = text;
      updateCharCount(textareaId, countId);
      countEl.style.color = '#38a169';
      setTimeout(() => { countEl.style.color = ''; }, 2000);
    } catch (err) {
      countEl.textContent = '⚠️ Upload failed: ' + err.message;
      countEl.style.color = '#e8334a';
    }
    // Reset file input so same file can be re-uploaded
    e.target.value = '';
  });

  document.getElementById(textareaId).addEventListener('input', () =>
    updateCharCount(textareaId, countId)
  );
}

function updateCharCount(textareaId, countId) {
  const len = document.getElementById(textareaId).value.length;
  const el  = document.getElementById(countId);
  el.textContent = len.toLocaleString() + ' characters';
  el.style.color = len > 10000 ? '#e8334a' : len > 0 ? '#38a169' : '';
}

function clearDoc(type) {
  const map = { cv: ['p-cv-text','cv-count'], ps: ['p-ps-text','ps-count'], rp: ['p-rp-text','rp-count'] };
  const [tid, cid] = map[type];
  document.getElementById(tid).value = '';
  document.getElementById(cid).textContent = '0 characters';
  document.getElementById(cid).style.color = '';
}

function clearProfile() {
  localStorage.removeItem(STORAGE_KEY);
  userProfile = null;
  interestTags = [];
  renderInterestTags();
  applyUserProfile();
}

// ── Apply user profile to UI ───────────────────────────────
function applyUserProfile() {
  const p = userProfile;
  const bar = document.getElementById('interests-bar');
  const tagsEl = document.getElementById('interests-tags');
  const fieldSel = document.getElementById('filter-field');

  // Rebuild field filter dropdown
  const interests = p?.interests?.length ? p.interests : ALL_FIELDS;
  fieldSel.innerHTML = '<option value="all">All Fields</option>' +
    interests.map(f => `<option value="${f}">${f}</option>`).join('');

  // Interests bar
  if (p?.interests?.length) {
    bar.style.display = 'flex';
    tagsEl.innerHTML = p.interests.map(t =>
      `<span class="interest-pill">${t}</span>`
    ).join('');
  } else {
    bar.style.display = 'none';
  }
}

// ── Load Data ──────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('./data/opportunities.json?t=' + Date.now());
    allOpportunities = await res.json();
    updateStats();
    applyFilters();
  } catch (e) {
    document.getElementById('cards-grid').innerHTML =
      `<div class="no-results"><p>⚠️ Could not load opportunities.</p><small>${e.message}</small></div>`;
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
  const d = new Date(dateStr), now = new Date();
  now.setHours(0,0,0,0);
  return Math.ceil((d - now) / 86400000);
}

function deadlineBadge(opp) {
  if (opp.deadline_type === 'rolling')
    return `<span class="deadline-badge deadline-rolling">Rolling</span>`;
  if (opp.status === 'upcoming')
    return `<span class="deadline-badge deadline-upcoming">Opens Soon</span>`;
  const days = daysUntil(opp.deadline);
  if (days < 0) return `<span class="deadline-badge deadline-rolling">Closed</span>`;
  if (days <= 14) return `<span class="deadline-badge deadline-urgent">⚡ ${days}d left</span>`;
  if (days <= 30) return `<span class="deadline-badge deadline-soon">🟠 ${days}d left</span>`;
  const label = new Date(opp.deadline).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});
  return `<span class="deadline-badge deadline-ok">${label}</span>`;
}

function deadlineSortVal(opp) {
  if (opp.deadline_type === 'rolling') return 8000;
  if (opp.status === 'upcoming') return 7000;
  return daysUntil(opp.deadline);
}

function fieldTags(fields) {
  return (fields || []).slice(0,3).map(f => {
    const cls = FIELD_TAG_CLASS[f] || 'tag-default';
    return `<span class="field-tag ${cls}">${f}</span>`;
  }).join('');
}

// ── Match score against user interests ────────────────────
function matchScore(opp) {
  const p = userProfile;
  if (!p?.interests?.length) return 0;
  const haystack = [opp.title, opp.description, ...(opp.field||[]), ...(opp.tags||[])]
    .join(' ').toLowerCase();
  return p.interests.filter(i => haystack.includes(i.toLowerCase())).length;
}

// ── Filters ────────────────────────────────────────────────
function applyFilters() {
  const q        = document.getElementById('search-input').value.toLowerCase().trim();
  const field    = document.getElementById('filter-field').value;
  const region   = document.getElementById('filter-region').value;
  const deadline = document.getElementById('filter-deadline').value;
  const sort     = document.getElementById('sort-by').value;
  const hideLang = document.getElementById('hide-language').checked;
  const p        = userProfile;

  filtered = allOpportunities.filter(o => {
    if (hideLang && o.other_language_required) return false;

    if (filterMineOnly && p?.interests?.length) {
      if (matchScore(o) === 0) return false;
    }

    if (q) {
      const hay = [o.title, o.university, o.country, o.description,
                   ...(o.field||[]), ...(o.tags||[])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (field !== 'all') {
      const hay = [...(o.field||[]), ...(o.tags||[])].join(' ').toLowerCase();
      if (!hay.toLowerCase().includes(field.toLowerCase())) return false;
    }

    if (region !== 'all' && o.region !== region) return false;

    if (deadline !== 'all') {
      if (o.deadline_type === 'rolling' || o.status === 'upcoming') return false;
      const d = daysUntil(o.deadline);
      if (deadline === 'urgent' && d > 14) return false;
      if (deadline === 'month'  && d > 31) return false;
      if (deadline === '3months'&& d > 92) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    // If user has interests, sort by match score first
    if (p?.interests?.length && sort === 'deadline') {
      const ms = matchScore(b) - matchScore(a);
      if (ms !== 0) return ms;
    }
    if (sort === 'deadline') return deadlineSortVal(a) - deadlineSortVal(b);
    if (sort === 'added')    return b.added_date.localeCompare(a.added_date);
    if (sort === 'country')  return a.country.localeCompare(b.country);
    return 0;
  });

  renderCards();
}

// ── Render ─────────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById('cards-grid');
  const p    = userProfile;
  document.getElementById('results-count').textContent =
    `Showing ${filtered.length} of ${allOpportunities.length} positions`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-results">
      <p>No positions match your filters.</p>
      <small>Try broadening your search or clearing some filters.</small>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map((o, i) => {
    const score = matchScore(o);
    const matchBadge = (p?.interests?.length && score > 0)
      ? `<span class="match-badge">⭐ ${score} match${score>1?'es':''}</span>` : '';
    return `
    <div class="card ${score > 0 ? 'card-matched' : ''}" onclick="openModal(${i})" data-idx="${i}">
      ${o.status === 'upcoming' ? '<span class="status-upcoming">Upcoming</span>' : ''}
      ${matchBadge}
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
      ${o.other_language_required ? `<div><span class="lang-warning">⚠️ ${o.other_language_note}</span></div>` : ''}
      <div class="card-footer">
        <span class="added-date">Added ${o.added_date}</span>
        <a class="btn-view" href="${o.url}" target="_blank" rel="noopener"
           onclick="event.stopPropagation()">View Position →</a>
      </div>
    </div>`;
  }).join('');
}

// ── Modal ──────────────────────────────────────────────────
function openModal(idx) {
  const o = filtered[idx];
  currentModalOpp = o;
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  const p = userProfile;
  const hasProfile = p && p.name;

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
        new Date(o.deadline).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})
      }</div>
    </div>
    ${o.supervisor ? `
    <div class="modal-section">
      <div class="modal-label">Supervisor</div>
      <div class="modal-value">${o.supervisor}</div>
    </div>` : ''}
    <div class="modal-section">
      <div class="modal-label">Language</div>
      <div class="modal-value">${o.language_req}${o.other_language_required ? ' · ⚠️ ' + o.other_language_note : ''}</div>
    </div>
    <div class="modal-section">
      <div class="modal-label">Description</div>
      <div class="modal-value">${o.description}</div>
    </div>
    <div class="modal-section">
      <div class="modal-label">Tags</div>
      <div class="modal-tags">${(o.tags||[]).map(t=>`<span class="modal-tag">${t}</span>`).join('')}</div>
    </div>

    <a class="btn-modal-link" href="${o.url}" target="_blank" rel="noopener">
      View Full Position →
    </a>

    ${hasProfile
      ? `<button class="btn-generate" onclick="openGenerator()">
           ✨ Generate Application Materials (CV + Cover Letter + RP)
         </button>`
      : `<button class="btn-generate btn-generate-disabled" onclick="promptProfile()">
           ✨ Generate Materials — Set up your profile first
         </button>`
    }
  `;

  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function promptProfile() {
  closeModal();
  openProfileModal();
}

// ── Materials Generator ────────────────────────────────────
function openGenerator() {
  if (!currentModalOpp) return;
  const o = currentModalOpp;
  closeModal();

  document.getElementById('panel-subtitle').textContent =
    `${o.flag} ${o.university} · ${o.title}`;
  document.getElementById('panel-overlay').classList.add('open');
  switchTab('cv');

  if (MATERIALS_CACHE[o.id]) {
    showMaterials(MATERIALS_CACHE[o.id]);
    return;
  }
  generateMaterials(o);
}

async function generateMaterials(o) {
  document.getElementById('panel-loading').style.display = 'flex';
  document.getElementById('panel-content').style.display = 'none';
  document.getElementById('panel-error').style.display   = 'none';
  document.getElementById('panel-notice').style.display  = 'none';

  try {
    const materials = await generateWithTemplate(o);
    MATERIALS_CACHE[o.id] = materials;
    showMaterials(materials);
  } catch (err) {
    document.getElementById('panel-loading').style.display = 'none';
    document.getElementById('panel-error').style.display   = 'flex';
    document.getElementById('btn-retry').onclick = () => generateMaterials(o);
  }
}

async function generateWithTemplate(o) {
  await new Promise(r => setTimeout(r, 800));
  const p = userProfile || {};
  const name = p.name || 'Applicant';
  const email = p.email || '';
  const degree1 = p.degree || 'MSc, [University]';
  const degree2 = p.degree2 || 'BSc, [University]';
  const skills  = p.skills  || '[List your skills]';
  const researchLines = (p.research || '').split('\n').filter(Boolean);
  const workLines     = (p.work     || '').split('\n').filter(Boolean);
  const refLines      = (p.refs     || '').split('\n').filter(Boolean);
  const lang    = p.lang || 'English (proficient)';
  const fields  = (o.field || []).join(', ');
  const deadline = o.deadline_type === 'rolling' ? 'Rolling / Open'
    : o.status === 'upcoming' ? 'TBD'
    : new Date(o.deadline).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});

  // If user uploaded original docs, use them as base with a tailoring note
  const hasCv = p.cvText && p.cvText.length > 100;
  const hasPs = p.psText && p.psText.length > 100;
  const hasRp = p.rpText && p.rpText.length > 100;

  // ── CV ──
  const cv =
`${name.toUpperCase()}
${email}
${lang}

${'═'.repeat(50)}
EDUCATION
${'═'.repeat(50)}

${degree1}
${degree2}

Skills: ${skills}

${'═'.repeat(50)}
RESEARCH EXPERIENCE
${'═'.repeat(50)}

${researchLines.length
  ? researchLines.map(r => `• ${r}`).join('\n')
  : '• [Add your research experience in your profile]'}

${'═'.repeat(50)}
PROFESSIONAL EXPERIENCE
${'═'.repeat(50)}

${workLines.length
  ? workLines.map(w => `• ${w}`).join('\n')
  : '• [Add your work experience in your profile]'}

${'═'.repeat(50)}
REFEREES
${'═'.repeat(50)}

${refLines.length
  ? refLines.join('\n')
  : '[Add referees in your profile]'}`;

  // ── Cover Letter ──
  const cl =
`${name}
${email}

To: ${o.supervisor ? o.supervisor : 'The PhD Admissions Committee'}
${o.university}

Dear ${o.supervisor ? o.supervisor : 'Search Committee'},

I write to apply for the PhD position in ${o.title} at ${o.university}. My academic background in ${degree1.split(',')[0]} and ${degree2.split(',')[0]} has equipped me with the quantitative and analytical skills central to research in ${fields}.

[Paragraph 2: Describe your most relevant research experience and how it connects to this position's focus on ${fields}. Reference specific methodologies or results.]

${researchLines[0] ? `For instance, ${researchLines[0].toLowerCase().replace(/^•\s*/,'')} — skills directly applicable to the ${o.field[0] || 'core research'} dimensions of this project.` : '[Add a specific research highlight here.]'}

[Paragraph 3: Explain why this specific position at ${o.university} excites you. Mention the supervisor${o.supervisor ? ' (' + o.supervisor + ')' : ''}, the research group, and how your goals align.]

I am available to commence in line with the ${deadline === 'Rolling / Open' ? 'advertised timeline' : deadline + ' cycle'} and am flexible regarding start date.

I attach my CV, academic transcripts, and a research proposal.

Yours sincerely,
${name}`;

  // ── Research Proposal ──
  const rp =
`RESEARCH PROPOSAL

Applicant: ${name}
Position:  ${o.title}
Institution: ${o.university}
${o.supervisor ? 'Proposed Supervisor: ' + o.supervisor : ''}

${'═'.repeat(50)}
I. RESEARCH BACKGROUND
${'═'.repeat(50)}

[Introduce the research problem in ${fields}. Explain why it is significant and what gap your research will address. 2–3 paragraphs.]

${o.description}

${'═'.repeat(50)}
II. RESEARCH OBJECTIVES
${'═'.repeat(50)}

1. To [primary objective — directly related to ${o.field[0] || fields}]
2. To develop quantitative/analytical frameworks for [specific problem]
3. To generate policy-relevant insights for ${o.country} and international contexts

${'═'.repeat(50)}
III. THEORETICAL FRAMEWORK
${'═'.repeat(50)}

[Identify 2–3 theoretical traditions relevant to ${fields} that will underpin your research. Cite key scholars.]

${'═'.repeat(50)}
IV. METHODOLOGY
${'═'.repeat(50)}

Phase 1 (Months 1–10): Literature review, data collection, framework design
Phase 2 (Months 11–24): Empirical analysis — [quantitative methods: e.g. ${skills.split(',').slice(0,3).join(', ')}]
Phase 3 (Months 25–36): Synthesis, stakeholder engagement, policy briefs
Phase 4 (Months 30–48): Thesis writing and journal submissions

${'═'.repeat(50)}
V. EXPECTED CONTRIBUTIONS
${'═'.repeat(50)}

Methodological: [Novel method/framework you will develop]
Empirical:      [First/novel empirical evidence in ${o.country} context]
Policy:         [Actionable insights for ${fields} governance]`;

  // If original docs uploaded, prepend a tailoring instruction banner
  const tailorBanner = (docType, original) => {
    const labels = { CV: 'CV', PS: 'Personal Statement', RP: 'Research Proposal' };
    return `──────────────────────────────────────────────────
★ TAILORING GUIDE FOR: ${labels[docType]}
Target: ${o.flag} ${o.university} · ${o.title}
Field:  ${fields}
Deadline: ${deadline}

Key points to emphasise for this position:
→ ${(o.field||[]).slice(0,2).join(' and ')} focus
→ ${o.supervisor ? 'Align with ' + o.supervisor + '\'s research agenda' : 'Research group alignment'}
→ Highlight quantitative / methodological strengths relevant to ${o.field[0]||fields}
──────────────────────────────────────────────────

YOUR ORIGINAL ${labels[docType]}:
(Edit the text below, guided by the tailoring notes above)

${original}`;
  };

  const finalCv = hasCv ? tailorBanner('CV', p.cvText) : cv;
  const finalCl = hasPs ? tailorBanner('PS', p.psText) : cl;
  const finalRp = hasRp ? tailorBanner('RP', p.rpText) : rp;

  return { cv: finalCv, cl: finalCl, rp: finalRp };
}

function showMaterials(materials) {
  document.getElementById('panel-loading').style.display = 'none';
  document.getElementById('panel-content').style.display = 'flex';
  document.getElementById('panel-error').style.display   = 'none';
  document.getElementById('panel-notice').style.display  = 'block';
  document.getElementById('material-cv').textContent  = materials.cv;
  document.getElementById('material-cl').textContent  = materials.cl;
  document.getElementById('material-rp').textContent  = materials.rp;
}

// ── Tab switching ──────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

// ── Copy & Download ────────────────────────────────────────
function copyMaterial(tab) {
  const text = document.getElementById(`material-${tab}`).textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector(`#tab-${tab} .btn-copy`);
    const orig = btn.textContent;
    btn.textContent = '✅ Copied!';
    btn.classList.add('copy-success');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copy-success'); }, 2000);
  });
}

function downloadMaterial(tab, ext) {
  const o = currentModalOpp || { university: 'PhD' };
  const text = document.getElementById(`material-${tab}`).textContent;
  const names = { cv: 'CV', cl: 'CoverLetter', rp: 'ResearchProposal' };
  const p = userProfile;
  const safeName = (p?.name || 'Applicant').replace(/\s+/g, '');
  const safeUni  = o.university.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
  const filename = `${safeName}_${names[tab]}_${safeUni}`;

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
  const p = userProfile || {};
  const labels = { cv: 'Curriculum Vitae', cl: 'Cover Letter', rp: 'Research Proposal' };
  const label  = labels[tab] || 'Document';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${label} — ${p.name || 'Applicant'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.75; color: #1a1a1a; }
  .hdr { background: #1a2744; color: white; padding: 16px 40px; display: flex; justify-content: space-between; align-items: center; }
  .hdr-label { font-size: 13pt; font-weight: bold; letter-spacing: 1px; }
  .hdr-name  { font-size: 10pt; opacity: 0.85; }
  .meta { background: #f0f4f8; padding: 8px 40px; font-size: 9pt; color: #555; border-bottom: 2px solid #e8334a; }
  .body { padding: 32px 40px; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 10pt; line-height: 1.7; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="hdr">
    <span class="hdr-label">${label.toUpperCase()}</span>
    <span class="hdr-name">${p.name || 'Applicant'}</span>
  </div>
  <div class="meta">${o.university || ''} · ${(o.title || '').slice(0,80)}</div>
  <div class="body">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

// ── Event Listeners ────────────────────────────────────────
document.getElementById('btn-open-profile').addEventListener('click', openProfileModal);
document.getElementById('profile-close').addEventListener('click', closeProfileModal);
document.getElementById('profile-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeProfileModal();
});
document.getElementById('btn-save-profile').addEventListener('click', collectAndSaveProfile);
document.getElementById('btn-clear-profile').addEventListener('click', clearProfile);

document.getElementById('interest-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addInterestTag(e.target.value);
    e.target.value = '';
  }
});

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

document.getElementById('btn-filter-mine').addEventListener('click', () => {
  filterMineOnly = true;
  document.getElementById('btn-filter-mine').style.display = 'none';
  document.getElementById('btn-filter-all').style.display  = 'inline-flex';
  applyFilters();
});
document.getElementById('btn-filter-all').addEventListener('click', () => {
  filterMineOnly = false;
  document.getElementById('btn-filter-all').style.display  = 'none';
  document.getElementById('btn-filter-mine').style.display = 'inline-flex';
  applyFilters();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeProfileModal();
    document.getElementById('panel-overlay').classList.remove('open');
  }
});

['search-input','filter-field','filter-region','filter-deadline','sort-by','hide-language']
  .forEach(id => document.getElementById(id).addEventListener('input', applyFilters));

// ── Init ───────────────────────────────────────────────────
setupDocUpload('upload-cv', 'p-cv-text', 'cv-count');
setupDocUpload('upload-ps', 'p-ps-text', 'ps-count');
setupDocUpload('upload-rp', 'p-rp-text', 'rp-count');

userProfile = loadProfile();
applyUserProfile();

// First visit — show profile setup
if (!userProfile) {
  setTimeout(openProfileModal, 800);
}

loadData();
