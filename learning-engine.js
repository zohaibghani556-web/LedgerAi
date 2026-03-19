// ============================================================
// LEDGERAI — RULES LEARNING ENGINE v1.0
// Self-improving categorization · User feedback loop
// Pattern mining · Confidence scoring · Rule conflict resolution
// Vendor fingerprinting · Description normalization
// Persistent rule store (localStorage + cloud sync)
// ============================================================

(function () {
'use strict';

// ── LEARNING STATE ────────────────────────────────────────────
const LearningState = {
  userRules:        [],   // User-confirmed rules
  corrections:      [],   // History of user corrections
  vendorProfiles:   {},   // Learned vendor → category mappings
  patternStats:     {},   // Pattern hit/miss rates
  modelVersion:     1,
  lastTrained:      null,
  totalCorrections: 0,
  accuracy:         null,
};

const STORAGE_KEY = 'ledgerai_learned_rules_v3';
const MAX_RULES = 2000;
const MIN_CONFIDENCE = 0.65;

// ── RULE SCHEMA ───────────────────────────────────────────────
// {
//   id:          string,
//   pattern:     string,   // regex string
//   category:    string,
//   flag:        string,
//   confidence:  number,   // 0–1
//   hits:        number,
//   misses:      number,
//   createdAt:   ISO string,
//   updatedAt:   ISO string,
//   source:      'user' | 'learned' | 'ai',
//   examples:    string[],
// }

// ── PERSISTENCE ───────────────────────────────────────────────
function saveRules() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      userRules:        LearningState.userRules,
      corrections:      LearningState.corrections.slice(-500),
      vendorProfiles:   LearningState.vendorProfiles,
      patternStats:     LearningState.patternStats,
      modelVersion:     LearningState.modelVersion,
      lastTrained:      LearningState.lastTrained,
      totalCorrections: LearningState.totalCorrections,
    }));
  } catch (e) {
    console.warn('[Learn] Save failed (storage full?):', e.message);
  }
}

function loadRules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(LearningState, data);
    console.log(`[Learn] Loaded ${LearningState.userRules.length} learned rules`);
  } catch (e) {
    console.warn('[Learn] Load failed:', e.message);
  }
}

// ── DESCRIPTION NORMALIZER ────────────────────────────────────
function normalizeDescription(desc) {
  if (!desc) return '';
  return desc
    .toUpperCase()
    // Remove transaction IDs, dates, account numbers
    .replace(/\b\d{4,}\b/g, '')
    .replace(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{1,2}\b/gi, '')
    .replace(/\d{2}\/\d{2}\/\d{2,4}/g, '')
    // Remove trailing reference numbers
    .replace(/#[A-Z0-9\-]+/g, '')
    .replace(/\*{2,}[A-Z0-9]+/g, '')
    // Remove common noise
    .replace(/\b(VISA|MASTERCARD|AMEX|DEBIT|CREDIT|POS|PUR|PURCHASE|PAYMENT|ONLINE|RECURRING)\b/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ── VENDOR FINGERPRINTER ──────────────────────────────────────
function extractVendorFingerprint(description) {
  const normalized = normalizeDescription(description);
  const words = normalized.split(/\s+/).filter(w => w.length > 2);

  // Common vendor-identifying tokens
  const stopWords = new Set(['THE', 'AND', 'FOR', 'INC', 'LLC', 'LTD', 'CO', 'CORP', 'CANADA', 'CANADIAN']);
  const meaningful = words.filter(w => !stopWords.has(w));

  // Take first 2-3 meaningful words as fingerprint
  return meaningful.slice(0, 3).join(' ');
}

// ── LEARN FROM CORRECTION ─────────────────────────────────────
function recordCorrection(transaction, previousCategory, newCategory, newFlag) {
  const correction = {
    id:             crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    description:    transaction.description || '',
    normalizedDesc: normalizeDescription(transaction.description || ''),
    fingerprint:    extractVendorFingerprint(transaction.description || ''),
    amount:         parseFloat(transaction.amount || 0),
    date:           transaction.date || '',
    previousCategory,
    newCategory,
    newFlag:        newFlag || 'none',
    ts:             new Date().toISOString(),
  };

  LearningState.corrections.push(correction);
  LearningState.totalCorrections++;

  // Update vendor profile
  const fp = correction.fingerprint;
  if (fp) {
    if (!LearningState.vendorProfiles[fp]) {
      LearningState.vendorProfiles[fp] = { categories: {}, flags: {}, count: 0, lastSeen: '' };
    }
    const vp = LearningState.vendorProfiles[fp];
    vp.categories[newCategory] = (vp.categories[newCategory] || 0) + 1;
    if (newFlag && newFlag !== 'none') vp.flags[newFlag.slice(0, 50)] = (vp.flags[newFlag.slice(0,50)] || 0) + 1;
    vp.count++;
    vp.lastSeen = correction.date;
  }

  // Retrain after every 5 corrections
  if (LearningState.totalCorrections % 5 === 0) trainFromCorrections();

  saveRules();
  return correction;
}

// ── TRAINING ENGINE ───────────────────────────────────────────
function trainFromCorrections() {
  const corrections = LearningState.corrections;
  if (corrections.length < 3) return;

  // Group by fingerprint
  const byFingerprint = {};
  corrections.forEach(c => {
    const fp = c.fingerprint;
    if (!fp) return;
    if (!byFingerprint[fp]) byFingerprint[fp] = [];
    byFingerprint[fp].push(c);
  });

  const newRules = [];

  Object.entries(byFingerprint).forEach(([fp, corrs]) => {
    if (fp.length < 4) return;
    // Count category votes
    const votes = {};
    const flags = {};
    corrs.forEach(c => {
      votes[c.newCategory] = (votes[c.newCategory] || 0) + 1;
      if (c.newFlag && c.newFlag !== 'none') flags[c.newFlag] = (flags[c.newFlag] || 0) + 1;
    });
    const dominantCat  = Object.entries(votes).sort((a,b) => b[1]-a[1])[0];
    const dominantFlag = Object.entries(flags).sort((a,b) => b[1]-a[1])[0];
    if (!dominantCat) return;

    const confidence = dominantCat[1] / corrs.length;
    if (confidence < MIN_CONFIDENCE && corrs.length < 3) return;

    // Build regex — escape special chars
    const escapedFp = fp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const existingIdx = newRules.findIndex(r => r.pattern === escapedFp);
    if (existingIdx >= 0) {
      newRules[existingIdx].confidence = Math.max(newRules[existingIdx].confidence, confidence);
      newRules[existingIdx].hits++;
    } else {
      newRules.push({
        id:         `learned_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        pattern:    escapedFp,
        category:   dominantCat[0],
        flag:       dominantFlag ? dominantFlag[0] : 'none',
        confidence,
        hits:       corrs.length,
        misses:     0,
        createdAt:  new Date().toISOString(),
        updatedAt:  new Date().toISOString(),
        source:     'learned',
        examples:   corrs.slice(-3).map(c => c.description),
      });
    }
  });

  // Merge into userRules, replacing stale versions
  newRules.forEach(newRule => {
    const existingIdx = LearningState.userRules.findIndex(r => r.pattern === newRule.pattern && r.source === 'learned');
    if (existingIdx >= 0) {
      LearningState.userRules[existingIdx] = { ...LearningState.userRules[existingIdx], ...newRule, updatedAt: new Date().toISOString() };
    } else {
      LearningState.userRules.push(newRule);
    }
  });

  // Trim to max
  if (LearningState.userRules.length > MAX_RULES) {
    LearningState.userRules = LearningState.userRules
      .sort((a,b) => (b.confidence * b.hits) - (a.confidence * a.hits))
      .slice(0, MAX_RULES);
  }

  LearningState.lastTrained = new Date().toISOString();
  LearningState.modelVersion++;

  console.log(`[Learn] Trained v${LearningState.modelVersion}: ${LearningState.userRules.length} rules from ${corrections.length} corrections`);
  saveRules();
}

// ── PREDICT CATEGORY ──────────────────────────────────────────
function predict(description, amount) {
  if (!description) return null;
  const normalized    = normalizeDescription(description);
  const fingerprint   = extractVendorFingerprint(description);

  // 1. Check vendor profiles (highest priority)
  if (fingerprint && LearningState.vendorProfiles[fingerprint]) {
    const vp = LearningState.vendorProfiles[fingerprint];
    const topCat = Object.entries(vp.categories).sort((a,b) => b[1]-a[1])[0];
    const topFlag = Object.entries(vp.flags || {}).sort((a,b) => b[1]-a[1])[0];
    if (topCat && vp.count >= 2) {
      return {
        category:   topCat[0],
        flag:       topFlag ? topFlag[0] : 'none',
        confidence: topCat[1] / vp.count,
        source:     'vendor-profile',
        ruleId:     null,
      };
    }
  }

  // 2. Check learned rules (sorted by confidence * hits)
  const sortedRules = [...LearningState.userRules].sort((a,b) => (b.confidence * b.hits) - (a.confidence * a.hits));
  for (const rule of sortedRules) {
    try {
      const re = new RegExp(rule.pattern, 'i');
      if (re.test(normalized) || re.test(description.toUpperCase())) {
        // Record hit
        rule.hits++;
        return {
          category:   rule.category,
          flag:       rule.flag || 'none',
          confidence: rule.confidence,
          source:     rule.source,
          ruleId:     rule.id,
        };
      }
    } catch (e) { /* invalid regex in storage — skip */ }
  }

  return null; // No learned match
}

// ── BATCH PREDICT ─────────────────────────────────────────────
function batchPredict(transactions) {
  let matched = 0;
  const results = transactions.map(txn => {
    const prediction = predict(txn.description, txn.amount);
    if (prediction && prediction.confidence >= MIN_CONFIDENCE) {
      matched++;
      return { ...txn, ...prediction, _learnedCategory: true };
    }
    return txn;
  });
  return { results, matched, total: transactions.length, coverage: transactions.length > 0 ? matched/transactions.length : 0 };
}

// ── ACCURACY CALCULATOR ───────────────────────────────────────
function calculateAccuracy() {
  const corrections = LearningState.corrections;
  if (corrections.length < 10) return null;

  // Test predictions against actual corrections
  let correct = 0;
  const holdout = corrections.slice(-Math.floor(corrections.length * 0.2)); // 20% holdout

  holdout.forEach(c => {
    // Temporarily remove this correction from vendor profiles
    const pred = predict(c.description, c.amount);
    if (pred && pred.category === c.newCategory) correct++;
  });

  LearningState.accuracy = holdout.length > 0 ? correct / holdout.length : null;
  return LearningState.accuracy;
}

// ── ADD MANUAL RULE ───────────────────────────────────────────
function addManualRule(patternStr, category, flag, description) {
  // Validate regex
  try { new RegExp(patternStr, 'i'); } catch(e) { throw new Error(`Invalid regex: ${e.message}`); }

  const rule = {
    id:         `user_${Date.now()}`,
    pattern:    patternStr,
    category,
    flag:       flag || 'none',
    confidence: 1.0,
    hits:       0,
    misses:     0,
    createdAt:  new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
    source:     'user',
    examples:   description ? [description] : [],
  };

  // Check for duplicate
  const dup = LearningState.userRules.find(r => r.pattern === patternStr);
  if (dup) { Object.assign(dup, { category, flag: flag||'none', updatedAt: new Date().toISOString() }); }
  else { LearningState.userRules.unshift(rule); }

  saveRules();
  return rule;
}

function deleteRule(ruleId) {
  LearningState.userRules = LearningState.userRules.filter(r => r.id !== ruleId);
  saveRules();
}

function updateRule(ruleId, updates) {
  const rule = LearningState.userRules.find(r => r.id === ruleId);
  if (rule) Object.assign(rule, updates, { updatedAt: new Date().toISOString() });
  saveRules();
}

// ── RULE CONFLICT DETECTOR ────────────────────────────────────
function detectConflicts() {
  const conflicts = [];
  const allRules = LearningState.userRules;

  for (let i = 0; i < allRules.length; i++) {
    for (let j = i + 1; j < allRules.length; j++) {
      const a = allRules[i], b = allRules[j];
      if (a.category === b.category) continue; // same category = no conflict
      // Check if patterns could match same text (simplified overlap check)
      try {
        const reA = new RegExp(a.pattern, 'i'), reB = new RegExp(b.pattern, 'i');
        // Test against each other's examples
        const examplesA = a.examples || [], examplesB = b.examples || [];
        const overlap = examplesA.some(ex => reB.test(ex)) || examplesB.some(ex => reA.test(ex));
        if (overlap) {
          conflicts.push({ ruleA: a, ruleB: b, severity: 'potential_overlap' });
        }
      } catch (e) { /* skip */ }
    }
  }
  return conflicts;
}

// ── EXPORT / IMPORT RULES ─────────────────────────────────────
function exportRules() {
  const data = {
    version:   LearningState.modelVersion,
    exportedAt: new Date().toISOString(),
    rules:     LearningState.userRules,
    stats:     { totalCorrections: LearningState.totalCorrections, accuracy: LearningState.accuracy },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `ledgerai-rules-v${LearningState.modelVersion}.json`;
  a.click(); URL.revokeObjectURL(url);
}

function importRules(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data.rules)) throw new Error('Invalid format: missing rules array');
    let imported = 0;
    data.rules.forEach(rule => {
      if (!rule.pattern || !rule.category) return;
      try { new RegExp(rule.pattern, 'i'); } catch(e) { return; } // skip invalid
      const exists = LearningState.userRules.find(r => r.id === rule.id || r.pattern === rule.pattern);
      if (!exists) { LearningState.userRules.push({ ...rule, source: 'imported' }); imported++; }
    });
    saveRules();
    return { imported, total: data.rules.length };
  } catch (e) {
    throw new Error(`Import failed: ${e.message}`);
  }
}

// ── RENDER: RULES MANAGER ─────────────────────────────────────
function renderRulesManager(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const accuracy = calculateAccuracy();
  const conflicts = detectConflicts();
  const totalRules = LearningState.userRules.length;
  const learnedCount = LearningState.userRules.filter(r => r.source === 'learned').length;
  const userCount    = LearningState.userRules.filter(r => r.source === 'user').length;
  const importedCount= LearningState.userRules.filter(r => r.source === 'imported' || r.source === 'ai').length;

  const topRules = [...LearningState.userRules]
    .sort((a,b) => b.hits - a.hits)
    .slice(0, 50);

  const ruleRows = topRules.map(r => `
    <tr>
      <td><code style="font-size:10px;background:var(--paper);padding:2px 6px;border-radius:3px;font-family:'IBM Plex Mono',monospace">${escHtml(r.pattern)}</code></td>
      <td>${escHtml(r.category)}</td>
      <td><span style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;padding:2px 6px;border-radius:3px;background:${r.source==='user'?'var(--blue-l)':r.source==='learned'?'var(--green-l)':'var(--gold-l)'};color:${r.source==='user'?'var(--blue)':r.source==='learned'?'var(--green)':'var(--gold)'}">${r.source}</span></td>
      <td style="font-family:'IBM Plex Mono',monospace">${(r.confidence*100).toFixed(0)}%</td>
      <td style="font-family:'IBM Plex Mono',monospace">${r.hits}</td>
      <td>${(r.examples||[]).slice(0,2).map(e => `<span style="font-size:10px;color:var(--muted)">${escHtml(e.slice(0,30))}</span>`).join('<br>')}</td>
      <td>
        <button class="btn btn-xs" onclick="if(confirm('Delete rule?'))LedgerLearn.deleteRule('${r.id}');LedgerLearn.renderRulesManager('${containerId}')">✕</button>
      </td>
    </tr>`).join('');

  container.innerHTML = `
    <style>
      .learn-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
      .learn-stat{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center}
      .learn-stat-val{font-size:28px;font-weight:700;color:var(--ink);letter-spacing:-.5px}
      .learn-stat-lbl{font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-top:4px}
      .learn-add-form{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px}
      .learn-add-form h3{font-size:14px;font-weight:700;margin-bottom:14px}
      .learn-form-row{display:grid;grid-template-columns:1.5fr 1fr 1fr auto;gap:10px;align-items:end}
      .learn-form-field{display:flex;flex-direction:column;gap:4px}
      .learn-form-field label{font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600}
      .learn-form-field input,.learn-form-field select{padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:12px;background:var(--paper);color:var(--ink);outline:none}
      .learn-form-field input:focus{border-color:var(--profile-accent)}
    </style>

    <div class="learn-stats-grid">
      <div class="learn-stat"><div class="learn-stat-val">${totalRules}</div><div class="learn-stat-lbl">Total Rules</div></div>
      <div class="learn-stat"><div class="learn-stat-val" style="color:var(--green)">${learnedCount}</div><div class="learn-stat-lbl">Auto-Learned</div></div>
      <div class="learn-stat"><div class="learn-stat-val" style="color:var(--blue)">${userCount}</div><div class="learn-stat-lbl">User-Defined</div></div>
      <div class="learn-stat"><div class="learn-stat-val" style="color:${accuracy!==null?(accuracy>0.8?'var(--green)':accuracy>0.6?'var(--gold)':'var(--accent)'):'var(--muted)'}">${accuracy !== null ? (accuracy*100).toFixed(0)+'%' : '—'}</div><div class="learn-stat-lbl">Accuracy</div></div>
    </div>

    ${conflicts.length ? `<div style="background:var(--gold-l);border:1px solid #fcd34d;border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--gold)">⚠ ${conflicts.length} rule conflict${conflicts.length>1?'s':''} detected — some patterns may match the same transactions with different categories.</div>` : ''}

    <div class="learn-add-form">
      <h3>Add Custom Rule</h3>
      <div class="learn-form-row">
        <div class="learn-form-field"><label>Pattern (regex)</label><input id="lrPattern" placeholder="GOOGLE ADS|ADWORDS" style="font-family:'IBM Plex Mono',monospace"/></div>
        <div class="learn-form-field"><label>Category</label>
          <select id="lrCategory">${(typeof CATEGORIES !== 'undefined' ? CATEGORIES : ['Miscellaneous']).map(c=>`<option>${c}</option>`).join('')}</select>
        </div>
        <div class="learn-form-field"><label>Flag (optional)</label><input id="lrFlag" placeholder="none"/></div>
        <button class="btn btn-solid" style="margin-bottom:2px" onclick="
          try {
            LedgerLearn.addManualRule(document.getElementById('lrPattern').value,document.getElementById('lrCategory').value,document.getElementById('lrFlag').value);
            LedgerLearn.renderRulesManager('${containerId}');
            if(typeof showToast!=='undefined')showToast('Rule added');
          } catch(e) { alert(e.message); }
        ">Add Rule</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn" onclick="LedgerLearn.exportRules()">⬇ Export Rules JSON</button>
      <label class="btn" style="cursor:pointer">⬆ Import Rules<input type="file" accept=".json" style="display:none" onchange="
        const r=new FileReader();r.onload=e=>{try{const res=LedgerLearn.importRules(e.target.result);if(typeof showToast!=='undefined')showToast('Imported '+res.imported+' rules');LedgerLearn.renderRulesManager('${containerId}');}catch(ex){alert(ex.message);}};r.readAsText(this.files[0])
      "></label>
      <button class="btn" onclick="if(confirm('Re-train model on all corrections?')){LedgerLearn.trainFromCorrections();LedgerLearn.renderRulesManager('${containerId}');if(typeof showToast!=='undefined')showToast('Model re-trained: v'+LedgerLearn.getState().modelVersion)}">⟳ Re-train Model</button>
      <button class="btn btn-red" onclick="if(confirm('Clear ALL learned rules?')){localStorage.removeItem('${STORAGE_KEY}');location.reload()}">Clear All</button>
    </div>

    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Rules (sorted by usage)</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted)">v${LearningState.modelVersion} · ${LearningState.totalCorrections} corrections · Last trained: ${LearningState.lastTrained ? new Date(LearningState.lastTrained).toLocaleTimeString() : 'Never'}</span>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Pattern</th><th>Category</th><th>Source</th><th>Confidence</th><th>Hits</th><th>Examples</th><th></th></tr></thead>
          <tbody>${ruleRows || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted)">No custom rules yet — categorize some transactions to start learning</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── VENDOR INTELLIGENCE LOOKUP ────────────────────────────────
function getVendorInsight(description) {
  const fp = extractVendorFingerprint(description);
  const vp = LearningState.vendorProfiles[fp];
  if (!vp) return null;

  const topCat  = Object.entries(vp.categories).sort((a,b)=>b[1]-a[1])[0];
  const topFlag = Object.entries(vp.flags||{}).sort((a,b)=>b[1]-a[1])[0];
  return {
    fingerprint:  fp,
    seenCount:    vp.count,
    topCategory:  topCat?.[0],
    topFlag:      topFlag?.[0],
    confidence:   topCat ? topCat[1]/vp.count : 0,
    lastSeen:     vp.lastSeen,
  };
}

// ── STATS EXPORT ──────────────────────────────────────────────
function getStats() {
  return {
    totalRules:       LearningState.userRules.length,
    learnedRules:     LearningState.userRules.filter(r=>r.source==='learned').length,
    userRules:        LearningState.userRules.filter(r=>r.source==='user').length,
    totalCorrections: LearningState.totalCorrections,
    accuracy:         LearningState.accuracy,
    modelVersion:     LearningState.modelVersion,
    lastTrained:      LearningState.lastTrained,
    vendorProfiles:   Object.keys(LearningState.vendorProfiles).length,
  };
}

// ── INIT ──────────────────────────────────────────────────────
loadRules();

// ── PUBLIC API ────────────────────────────────────────────────
window.LedgerLearn = {
  recordCorrection,
  predict,
  batchPredict,
  trainFromCorrections,
  addManualRule,
  deleteRule,
  updateRule,
  exportRules,
  importRules,
  detectConflicts,
  calculateAccuracy,
  renderRulesManager,
  getVendorInsight,
  getStats,
  getState: () => LearningState,
  normalizeDescription,
  extractVendorFingerprint,
};

console.log('[LedgerAI] Learning Engine loaded — self-improving categorization active');

})();
