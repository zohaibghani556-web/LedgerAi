// ============================================================
// LEDGERAI — ANOMALY EXPLAINER v1.0
// AI-powered plain-English anomaly explanations
// Accounting rationale · Risk severity scoring
// Remediation playbooks · Precedent matching
// GAAS / CAS sampling integration
// ============================================================

(function () {
'use strict';

// ── ANOMALY TAXONOMY ──────────────────────────────────────────
const ANOMALY_DEFINITIONS = {
  amount_spike: {
    title:       'Unusual Transaction Amount',
    accountingRef: 'CAS 240 / ISA 240 — Fraud Risk Assessment',
    riskArea:    'Financial Reporting Integrity',
    defaultSeverity: 'high',
    template: (a) => `This transaction of ${a.amount ? fmt(a.amount) : 'this amount'} is statistically unusual for its category. It falls ${a.zScore ? (a.zScore.toFixed(1)+'σ') : 'well'} above the expected range for "${a.category || 'this account'}". Under GAAS/CAS, transactions materially outside expected ranges require additional audit scrutiny to confirm appropriate authorization, supporting documentation, and proper period allocation.`,
    remediation: [
      'Obtain purchase order or authorization form',
      'Confirm goods/services were received (three-way match)',
      'Verify allocation to correct period (cut-off test)',
      'Cross-reference to approved budget or capital plan',
    ],
  },
  threshold_gaming: {
    title:       'Potential Approval Threshold Circumvention',
    accountingRef: 'IIA Standard 2120 — Internal Controls',
    riskArea:    'Fraud Prevention / Internal Control',
    defaultSeverity: 'high',
    template: (a) => `Transaction amount of ${a.amount ? fmt(a.amount) : 'this amount'} falls just below a common approval threshold ($5,000, $10,000, or $25,000). Split billing and threshold gaming are among the most common expense fraud patterns identified by the ACFE. This does not indicate fraud — but it is a red-flag indicator that warrants a second reviewer.`,
    remediation: [
      'Require second approver regardless of amount',
      'Review other transactions from same vendor in period',
      'Confirm no other invoices from same vendor within 30 days',
      'Document business purpose and verify no splitting occurred',
    ],
  },
  round_number: {
    title:       'Large Round-Number Transaction',
    accountingRef: 'Benford\'s Law — Digit Frequency Analysis',
    riskArea:    'Data Quality / Authorization',
    defaultSeverity: 'low',
    template: (a) => `Exact round amounts (${a.amount ? fmt(a.amount) : 'like this'}) occur less frequently in natural business transactions than Benford's Law predicts. While this may simply reflect a fixed-fee contract, it can also indicate an estimated rather than actual amount. Auditors apply Benford's Law analysis to identify potentially fictitious transactions.`,
    remediation: [
      'Confirm this is an actual invoice amount (not estimated)',
      'Retain original vendor invoice for working paper file',
      'Verify GST/HST amount on invoice is correct',
    ],
  },
  rapid_charges: {
    title:       'Multiple Charges from Same Vendor — Short Window',
    accountingRef: 'Duplicate Payment Control',
    riskArea:    'Accounts Payable / Cash Disbursements',
    defaultSeverity: 'medium',
    template: (a) => `Multiple charges from "${a.description || 'this vendor'}" within a 3-day window may indicate: (1) legitimate multiple deliveries, (2) a billing error requiring credit, or (3) a duplicate payment that has not yet been reversed. Duplicate payments are estimated to affect 0.5–2% of invoices and represent a significant cash leakage risk.`,
    remediation: [
      'Match each charge to a unique invoice number',
      'Confirm each delivery/service was separate and distinct',
      'Request credit note from vendor for any confirmed duplicate',
      'Update vendor master file if billing frequency is inconsistent',
    ],
  },
  vendor_inconsistency: {
    title:       'Inconsistent Billing Pattern from Vendor',
    accountingRef: 'Contract Compliance Testing',
    riskArea:    'Contract Management / Vendor Risk',
    defaultSeverity: 'low',
    template: (a) => `Charges from "${a.description || 'this vendor'}" vary significantly across transactions — which may indicate unauthorized price changes, scope creep on a fixed-fee contract, or variable overage billing. Contract pricing audits commonly identify 3–8% billing variances from agreed rates.`,
    remediation: [
      'Review master service agreement for pricing terms',
      'Request itemized billing breakdown from vendor',
      'Compare to approved purchase order amounts',
      'Flag for vendor performance review if pattern continues',
    ],
  },
  concentration_risk: {
    title:       'High Expense Concentration in Single Category',
    accountingRef: 'Going Concern / Budget Variance Analysis',
    riskArea:    'Business Risk / Strategic',
    defaultSeverity: 'medium',
    template: (a) => `"${a.description || 'This category'}" represents over 45% of total expenses. High concentration in a single expense category (outside of payroll/COGS) can signal: over-dependence on a single function, budget control failures, or a business model vulnerability. Management should review whether this concentration is intentional and sustainable.`,
    remediation: [
      'Document rationale for this concentration level',
      'Set category-level budget cap and monitoring trigger',
      'Assess whether diversification is operationally feasible',
      'Include in management letter for board awareness',
    ],
  },
  ghost_vendor: {
    title:       'Missing or Incomplete Vendor Identification',
    accountingRef: 'ACFE Fraud Tree — Ghost Vendor Scheme',
    riskArea:    'Fraud Prevention / Vendor Management',
    defaultSeverity: 'critical',
    template: (a) => `Transaction of ${a.amount ? fmt(a.amount) : 'this amount'} has an incomplete or missing vendor description. Ghost vendor fraud — where payments are made to non-existent vendors — is one of the most costly occupational fraud schemes (median loss $150,000 per ACFE 2024 Report). This requires immediate investigation to confirm the payee is a legitimate registered business.`,
    remediation: [
      'Identify the actual payee from bank records',
      'Verify vendor is in the approved vendor master list',
      'Confirm vendor registration number (CRA BN or IRS EIN)',
      'Require invoices for all payments regardless of amount',
      'Report to management immediately if payee cannot be identified',
    ],
  },
  payroll_ratio: {
    title:       'Unusual Payroll Tax Ratio',
    accountingRef: 'CRA Payroll Compliance / IRS Publication 15',
    riskArea:    'Payroll Tax Compliance',
    defaultSeverity: 'high',
    template: (a) => `The ratio of payroll taxes to gross wages appears outside the expected 8–22% range (Canadian combined employer CPP + EI + EHT). This may indicate: miscoded payroll tax remittances, missed employer contributions, or payroll processing errors. CRA and IRS both conduct payroll compliance audits focused on this ratio.`,
    remediation: [
      'Run payroll tax reconciliation against payroll register',
      'Verify CPP/EI rates are set correctly in payroll system',
      'Confirm Ontario EHT (if applicable) is being calculated',
      'Match payroll remittances to PD7A/941 filings',
      'Engage payroll accountant if variance exceeds 3 percentage points',
    ],
  },
  me_exposure: {
    title:       'High Meals & Entertainment Ratio',
    accountingRef: 'CRA IC73-21R9 / IRS Publication 463',
    riskArea:    'Tax Compliance / CRA Audit Risk',
    defaultSeverity: 'medium',
    template: (a) => `Meals & entertainment at ${a.description || 'elevated levels'} of total expenses is a known CRA and IRS audit trigger. CRA scrutinizes M&E claims heavily — particularly when: (1) amounts are large, (2) entertainment category is used, or (3) expenses are claimed as 100% deductible when only 50% qualifies. All M&E receipts must document date, attendees, business purpose, and location.`,
    remediation: [
      'Confirm business purpose documented on every receipt',
      'List attendees and business relationship for each meal',
      'Split any personal component from business amount',
      'Apply 50% limitation before claiming deduction',
      'Retain receipts for 6 years (CRA) or 7 years (IRS)',
    ],
  },
  t4a_filing: {
    title:       'T4A / 1099-NEC Filing Obligation',
    accountingRef: 'ITA Section 200 (CRA) / IRC Section 6041A (IRS)',
    riskArea:    'Information Return Compliance',
    defaultSeverity: 'high',
    template: (a) => `Contractors paid above the T4A threshold ($500 CRA / $600 IRS) require information slips by February 28 (T4A) or January 31 (1099-NEC). Missing these filings can result in penalties of $100–$7,500 per slip (CRA) or $50–$580 per form (IRS), plus potential exposure on the underlying payments if worker classification is questioned.`,
    remediation: [
      'Collect SIN/SBN or SSN/EIN from each contractor',
      'Prepare T4A/1099-NEC for all payees over threshold',
      'File electronically with CRA/IRS by deadline',
      'Issue copy to contractor by same deadline',
      'Retain worker classification documentation',
    ],
  },
  itc_opportunity: {
    title:       'Potential Unclaimed Input Tax Credits',
    accountingRef: 'ETA Section 169 (CRA GST/HST)',
    riskArea:    'Tax Optimization',
    defaultSeverity: 'info',
    template: (a) => `Significant HST-eligible expenses detected. ITCs reduce your net HST remittance and are a key cash flow management tool. To claim ITCs, every supporting invoice must show: supplier's GST/HST registration number, date, total amount, and HST amount. Estimated ITCs are being left on the table without proper documentation.`,
    remediation: [
      'Ensure all vendor invoices show HST registration number',
      'Separate HST amount on all receipts',
      'Claim ITCs on next GST34 return',
      'Review prior unclaimed periods (4-year lookback)',
    ],
  },
};

function fmt(v) {
  const sym = typeof currencySymbol !== 'undefined' ? currencySymbol() : '$';
  return sym + parseFloat(v||0).toLocaleString('en-CA', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// ── EXPLAIN ANOMALY (local) ────────────────────────────────────
function explainAnomaly(anomaly) {
  const def = ANOMALY_DEFINITIONS[anomaly.type];
  if (!def) {
    return {
      title:         anomaly.message || 'Unknown Anomaly',
      explanation:   anomaly.insight || 'Review this item with your accountant.',
      remediation:   [],
      severity:      anomaly.severity || 'medium',
      accountingRef: '',
      riskArea:      '',
    };
  }
  return {
    title:         def.title,
    explanation:   def.template(anomaly),
    remediation:   def.remediation,
    severity:      anomaly.severity || def.defaultSeverity,
    accountingRef: def.accountingRef,
    riskArea:      def.riskArea,
  };
}

// ── AI-ENHANCED EXPLANATION (calls Claude) ─────────────────────
async function explainAnomalyWithAI(anomaly, companyContext) {
  const local = explainAnomaly(anomaly);
  try {
    const prompt = `You are a CPA with 15 years audit experience. Explain this accounting anomaly in 2-3 concise sentences, focusing on the specific risk and what action the business owner should take. Be direct and practical, no jargon.

Anomaly: ${anomaly.type}
Description: ${anomaly.description || anomaly.message}
Amount: ${anomaly.amount ? fmt(anomaly.amount) : 'unknown'}
Category: ${anomaly.category || 'unknown'}
Date: ${anomaly.date || 'unknown'}
${companyContext ? `Company context: ${companyContext}` : ''}

Respond ONLY with a plain-English explanation paragraph. No headers, no bullet points.`;

    const resp = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role:'user', content:prompt }],
      }),
    });
    if (!resp.ok) throw new Error('API failed');
    const data = await resp.json();
    const aiText = data.content?.[0]?.text?.trim();
    if (aiText) return { ...local, explanation: aiText, source: 'ai' };
  } catch (e) {
    console.warn('[AnomalyAI] Falling back to local explanation:', e.message);
  }
  return { ...local, source: 'local' };
}

// ── BATCH EXPLAIN ─────────────────────────────────────────────
async function explainAllAnomalies(anomalies, useAI) {
  if (!useAI) return anomalies.map(a => ({ ...a, ...explainAnomaly(a) }));

  const companyCtx = typeof settings !== 'undefined' ? `${settings.company} (${settings.industry})` : '';
  const explained = [];
  for (const a of anomalies.slice(0, 10)) { // cap AI calls at 10
    const exp = await explainAnomalyWithAI(a, companyCtx);
    explained.push({ ...a, ...exp });
    await new Promise(r => setTimeout(r, 400)); // rate limit
  }
  // Remaining ones get local explanations
  anomalies.slice(10).forEach(a => explained.push({ ...a, ...explainAnomaly(a) }));
  return explained;
}

// ── RISK SCORE BREAKDOWN ──────────────────────────────────────
function buildRiskScoreBreakdown(anomalies, transactions) {
  const total = transactions.length || 1;
  const components = [];

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const highCount     = anomalies.filter(a => a.severity === 'high').length;
  const mediumCount   = anomalies.filter(a => a.severity === 'medium').length;

  if (criticalCount > 0) components.push({ label:'Critical anomalies', points: criticalCount * 15, desc:`${criticalCount} critical item${criticalCount>1?'s':''} detected` });
  if (highCount > 0)     components.push({ label:'High-risk items',    points: highCount * 7,     desc:`${highCount} high-priority item${highCount>1?'s':''}` });
  if (mediumCount > 0)   components.push({ label:'Medium-risk items',  points: mediumCount * 3,   desc:`${mediumCount} medium item${mediumCount>1?'s':''}` });

  const flagRate = anomalies.length / total;
  if (flagRate > 0.15) components.push({ label:'High flag rate', points: 10, desc:`${(flagRate*100).toFixed(0)}% of transactions flagged` });

  const uncatCount = transactions.filter(t => !t.category || t.category === 'Miscellaneous').length;
  if (uncatCount > total * 0.1) components.push({ label:'Uncategorized transactions', points: 8, desc:`${uncatCount} transactions uncategorized` });

  const totalScore = Math.min(100, components.reduce((s,c) => s+c.points, 0));
  const riskLabel  = totalScore < 25 ? 'Low Risk' : totalScore < 50 ? 'Moderate' : totalScore < 75 ? 'High Risk' : 'Critical';
  const riskColor  = totalScore < 25 ? 'var(--green)' : totalScore < 50 ? 'var(--gold)' : 'var(--accent)';

  return { score:totalScore, label:riskLabel, color:riskColor, components };
}

// ── RENDER: ANOMALY EXPLAINER PANEL ───────────────────────────
function renderAnomalyExplainer(containerId, anomalies, transactions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!anomalies || !anomalies.length) {
    container.innerHTML = `<div class="empty" style="padding:64px"><div class="empty-icon">✅</div><p>No anomalies detected in this dataset</p></div>`;
    return;
  }

  const sym = typeof currencySymbol !== 'undefined' ? currencySymbol() : '$';
  const explained = anomalies.map(a => ({ ...a, ...explainAnomaly(a) }));
  const riskBreakdown = buildRiskScoreBreakdown(anomalies, transactions || []);

  const sevOrder = { critical:0, high:1, medium:2, low:3, info:4 };
  const sorted = [...explained].sort((a,b) => (sevOrder[a.severity]||3) - (sevOrder[b.severity]||3));

  const sevColor = s => s === 'critical' ? 'var(--accent)' : s === 'high' ? '#d97706' : s === 'medium' ? 'var(--blue)' : s === 'info' ? 'var(--green)' : 'var(--muted)';
  const sevBg    = s => s === 'critical' ? 'var(--accent-l)' : s === 'high' ? 'var(--gold-l)' : s === 'medium' ? 'var(--blue-l)' : s === 'info' ? 'var(--green-l)' : 'var(--paper)';

  const anomalyCards = sorted.map((a, idx) => `
    <div class="aex-card" style="border-left:4px solid ${sevColor(a.severity)}">
      <div class="aex-header">
        <div>
          <div class="aex-severity-badge" style="background:${sevBg(a.severity)};color:${sevColor(a.severity)}">${(a.severity||'medium').toUpperCase()}</div>
          <div class="aex-title">${a.title}</div>
          <div class="aex-meta">
            ${a.date ? `<span>${a.date}</span><span>·</span>` : ''}
            ${a.description ? `<span>${a.description.slice(0,45)}${a.description.length>45?'…':''}</span><span>·</span>` : ''}
            ${a.amount ? `<span style="font-weight:700;color:var(--ink)">${sym}${parseFloat(a.amount).toLocaleString('en-CA',{maximumFractionDigits:0})}</span>` : ''}
          </div>
        </div>
        <div class="aex-header-right">
          ${a.accountingRef ? `<span class="aex-ref-badge">${a.accountingRef.split(' — ')[0]}</span>` : ''}
          ${a.riskArea ? `<span class="aex-risk-area">${a.riskArea}</span>` : ''}
        </div>
      </div>

      <div class="aex-explanation">${a.explanation}</div>

      ${a.remediation && a.remediation.length ? `
        <div class="aex-remediation">
          <div class="aex-remediation-label">Recommended Actions</div>
          <ol class="aex-action-list">
            ${a.remediation.map(r => `<li>${r}</li>`).join('')}
          </ol>
        </div>` : ''}

      <div class="aex-footer">
        ${a.accountingRef ? `<span class="aex-standard-ref">📚 ${a.accountingRef}</span>` : ''}
        <button class="btn btn-xs" style="margin-left:auto" onclick="
          if(typeof LedgerAnomalyExplainer!=='undefined')
            LedgerAnomalyExplainer.explainAnomalyWithAI(${JSON.stringify(a).replace(/"/g,'&quot;')},typeof settings!=='undefined'?settings.company:'')
              .then(exp=>{
                const el=document.getElementById('aex-exp-${idx}');
                if(el)el.textContent=exp.explanation;
              });
        ">🤖 AI Explain</button>
      </div>
      <div id="aex-exp-${idx}" style="display:none;font-size:12px;color:var(--muted);padding:8px 0;border-top:1px solid var(--border);margin-top:8px;font-style:italic"></div>
    </div>`).join('');

  // Risk score breakdown
  const breakdownRows = riskBreakdown.components.map(c => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
      <span>${c.label}</span>
      <span style="font-family:'IBM Plex Mono',monospace;font-size:11px">${c.desc}</span>
      <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent)">+${c.points}</span>
    </div>`).join('');

  container.innerHTML = `
    <style>
      .aex-score-banner{display:flex;align-items:center;gap:24px;background:white;border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:18px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
      .aex-score-num{font-size:52px;font-weight:700;letter-spacing:-2px;line-height:1}
      .aex-score-details{flex:1}
      .aex-score-label{font-size:16px;font-weight:700;margin-bottom:4px}
      .aex-score-sub{font-size:12px;color:var(--muted);font-family:'IBM Plex Mono',monospace}
      .aex-card{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
      .aex-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;flex-wrap:wrap}
      .aex-severity-badge{display:inline-flex;font-family:'IBM Plex Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.1em;padding:2px 7px;border-radius:3px;margin-bottom:6px;font-weight:700}
      .aex-title{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:5px}
      .aex-meta{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);flex-wrap:wrap;font-family:'IBM Plex Mono',monospace}
      .aex-header-right{display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0}
      .aex-ref-badge{font-family:'IBM Plex Mono',monospace;font-size:8px;text-transform:uppercase;background:var(--blue-l);color:var(--blue);padding:2px 7px;border-radius:3px;white-space:nowrap}
      .aex-risk-area{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);text-align:right}
      .aex-explanation{font-size:13px;line-height:1.8;color:var(--ink);margin-bottom:12px}
      .aex-remediation{background:var(--paper);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:10px}
      .aex-remediation-label{font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:8px;font-weight:600}
      .aex-action-list{padding-left:20px;display:flex;flex-direction:column;gap:5px}
      .aex-action-list li{font-size:12px;color:var(--ink);line-height:1.6}
      .aex-footer{display:flex;align-items:center;gap:10px;padding-top:8px;border-top:1px solid var(--border);flex-wrap:wrap}
      .aex-standard-ref{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted)}
    </style>

    <!-- Risk Score Banner -->
    <div class="aex-score-banner">
      <div class="aex-score-num" style="color:${riskBreakdown.color}">${riskBreakdown.score}</div>
      <div class="aex-score-details">
        <div class="aex-score-label" style="color:${riskBreakdown.color}">${riskBreakdown.label}</div>
        <div class="aex-score-sub">${anomalies.length} anomalies detected · ${(transactions||[]).length} transactions analyzed</div>
        <div style="margin-top:8px;height:6px;border-radius:3px;background:var(--border);overflow:hidden;max-width:280px">
          <div style="height:100%;width:${riskBreakdown.score}%;background:${riskBreakdown.color};border-radius:3px;transition:width .8s ease"></div>
        </div>
      </div>
      <div style="min-width:220px">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:8px;font-weight:600">Score Breakdown</div>
        ${breakdownRows || '<div style="font-size:12px;color:var(--muted)">No risk factors detected</div>'}
      </div>
    </div>

    <!-- Anomaly cards -->
    ${anomalyCards}

    <div style="text-align:center;margin-top:16px">
      <button class="btn btn-gold" onclick="
        if(typeof LedgerAnomalyExplainer!=='undefined'&&typeof activeTransactions!=='undefined')
          LedgerAnomalyExplainer.explainAllAnomalies(${JSON.stringify(anomalies.slice(0,5)).replace(/"/g,'&quot;')},true)
            .then(r=>r.forEach((a,i)=>{
              const el=document.getElementById('aex-exp-'+i);
              if(el){el.textContent=a.explanation;el.style.display='block';}
            }));
        if(typeof showToast!=='undefined')showToast('⚡ Running AI explanations on top 5 anomalies…')
      ">⚡ AI Explain All (Top 5)</button>
    </div>`;
}

// ── PUBLIC API ────────────────────────────────────────────────
window.LedgerAnomalyExplainer = {
  explainAnomaly,
  explainAnomalyWithAI,
  explainAllAnomalies,
  buildRiskScoreBreakdown,
  renderAnomalyExplainer,
  ANOMALY_DEFINITIONS,
};

console.log('[LedgerAI] Anomaly Explainer loaded — GAAS/CAS references · AI narrative · remediation playbooks');

})();
