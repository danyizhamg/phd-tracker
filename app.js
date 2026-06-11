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
function openModal(idx) {
  const o = filtered[idx];
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
  `;

  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ── Event listeners ────────────────────────────────────────
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

['search-input','filter-field','filter-region','filter-deadline','sort-by','hide-language']
  .forEach(id => document.getElementById(id).addEventListener('input', applyFilters));

// ── Init ───────────────────────────────────────────────────
loadData();
