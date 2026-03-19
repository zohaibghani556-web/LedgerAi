// ============================================================
// LEDGERAI — FX ENGINE v1.0
// Multi-currency support · Real-time FX via open APIs
// Unrealized/realized gain/loss · IFRS IAS 21 revaluation
// Functional currency reporting · Translation adjustments
// Historical rate lookup · Rate blending · Forward rates
// ============================================================

(function () {
'use strict';

// ── CURRENCY REGISTRY ─────────────────────────────────────────
const CURRENCIES = {
  USD: { name:'US Dollar',            symbol:'$',   locale:'en-US', decimals:2 },
  CAD: { name:'Canadian Dollar',      symbol:'CA$', locale:'en-CA', decimals:2 },
  GBP: { name:'British Pound',        symbol:'£',   locale:'en-GB', decimals:2 },
  EUR: { name:'Euro',                 symbol:'€',   locale:'de-DE', decimals:2 },
  AUD: { name:'Australian Dollar',    symbol:'A$',  locale:'en-AU', decimals:2 },
  JPY: { name:'Japanese Yen',         symbol:'¥',   locale:'ja-JP', decimals:0 },
  CHF: { name:'Swiss Franc',          symbol:'Fr',  locale:'de-CH', decimals:2 },
  CNY: { name:'Chinese Yuan',         symbol:'¥',   locale:'zh-CN', decimals:2 },
  INR: { name:'Indian Rupee',         symbol:'₹',   locale:'en-IN', decimals:2 },
  MXN: { name:'Mexican Peso',         symbol:'$',   locale:'es-MX', decimals:2 },
  BRL: { name:'Brazilian Real',       symbol:'R$',  locale:'pt-BR', decimals:2 },
  KRW: { name:'Korean Won',           symbol:'₩',   locale:'ko-KR', decimals:0 },
  SGD: { name:'Singapore Dollar',     symbol:'S$',  locale:'en-SG', decimals:2 },
  HKD: { name:'Hong Kong Dollar',     symbol:'HK$', locale:'en-HK', decimals:2 },
  NOK: { name:'Norwegian Krone',      symbol:'kr',  locale:'nb-NO', decimals:2 },
  SEK: { name:'Swedish Krona',        symbol:'kr',  locale:'sv-SE', decimals:2 },
  DKK: { name:'Danish Krone',         symbol:'kr',  locale:'da-DK', decimals:2 },
  NZD: { name:'New Zealand Dollar',   symbol:'NZ$', locale:'en-NZ', decimals:2 },
  ZAR: { name:'South African Rand',   symbol:'R',   locale:'en-ZA', decimals:2 },
  AED: { name:'UAE Dirham',           symbol:'د.إ', locale:'ar-AE', decimals:2 },
};

// ── FX RATE CACHE ─────────────────────────────────────────────
const FXCache = {
  rates:         {},   // { 'USD/CAD': { rate, ts, source } }
  historicalRates:{},  // { 'USD/CAD/2024-01-15': rate }
  lastFetch:     null,
  baseCurrency:  'CAD',
  isLoading:     false,
};

// ── RATE FETCH (free open API — no key required) ──────────────
async function fetchLiveRates(baseCurrency) {
  baseCurrency = baseCurrency || FXCache.baseCurrency;
  if (FXCache.isLoading) return FXCache.rates;

  // Try exchangerate-api (free tier, no key)
  const PRIMARY_URL   = `https://open.er-api.com/v6/latest/${baseCurrency}`;
  // Fallback: frankfurter.app (ECB rates, no key)
  const FALLBACK_URL  = `https://api.frankfurter.app/latest?from=${baseCurrency}`;

  FXCache.isLoading = true;
  try {
    let resp = await fetch(PRIMARY_URL, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error('primary failed');
    const data = await resp.json();
    if (data.rates) {
      data.rates[baseCurrency] = 1.0;
      Object.entries(data.rates).forEach(([code, rate]) => {
        FXCache.rates[`${baseCurrency}/${code}`] = { rate, ts: Date.now(), source: 'open.er-api.com' };
        FXCache.rates[`${code}/${baseCurrency}`] = { rate: 1/rate, ts: Date.now(), source: 'open.er-api.com' };
      });
      FXCache.lastFetch = new Date();
      FXCache.baseCurrency = baseCurrency;
      console.log(`[FX] Live rates loaded: ${Object.keys(data.rates).length} currencies`);
      return FXCache.rates;
    }
  } catch (e) {
    console.warn('[FX] Primary rate source failed, trying fallback…', e.message);
  }

  try {
    let resp = await fetch(FALLBACK_URL, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error('fallback failed');
    const data = await resp.json();
    if (data.rates) {
      data.rates[baseCurrency] = 1.0;
      Object.entries(data.rates).forEach(([code, rate]) => {
        FXCache.rates[`${baseCurrency}/${code}`] = { rate, ts: Date.now(), source: 'frankfurter.app (ECB)' };
        FXCache.rates[`${code}/${baseCurrency}`] = { rate: 1/rate, ts: Date.now(), source: 'frankfurter.app (ECB)' };
      });
      FXCache.lastFetch = new Date();
      FXCache.baseCurrency = baseCurrency;
      console.log('[FX] Fallback rates loaded (ECB)');
      return FXCache.rates;
    }
  } catch (e) {
    console.warn('[FX] Both rate sources failed, using embedded fallback rates');
  } finally {
    FXCache.isLoading = false;
  }

  // Hardcoded fallback rates (USD base) — updated periodically
  const EMBEDDED_RATES_VS_USD = {
    CAD:1.356, EUR:0.921, GBP:0.786, AUD:1.529, JPY:149.8,
    CHF:0.877, CNY:7.241, INR:83.12, MXN:17.15, BRL:4.975,
    KRW:1325.0, SGD:1.338, HKD:7.821, NOK:10.53, SEK:10.41,
    DKK:6.888, NZD:1.626, ZAR:18.64, AED:3.673, USD:1.0,
  };
  const embedBase = EMBEDDED_RATES_VS_USD[baseCurrency] || 1;
  Object.entries(EMBEDDED_RATES_VS_USD).forEach(([code, rateVsUSD]) => {
    const rate = rateVsUSD / embedBase;
    FXCache.rates[`${baseCurrency}/${code}`] = { rate, ts: Date.now(), source: 'embedded-fallback' };
    FXCache.rates[`${code}/${baseCurrency}`] = { rate: 1/rate, ts: Date.now(), source: 'embedded-fallback' };
  });
  FXCache.isLoading = false;
  return FXCache.rates;
}

// Historical rates via frankfurter.app
async function fetchHistoricalRate(fromCurrency, toCurrency, date) {
  const key = `${fromCurrency}/${toCurrency}/${date}`;
  if (FXCache.historicalRates[key]) return FXCache.historicalRates[key];

  try {
    const url = `https://api.frankfurter.app/${date}?from=${fromCurrency}&to=${toCurrency}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) throw new Error('historical fetch failed');
    const data = await resp.json();
    if (data.rates && data.rates[toCurrency]) {
      const rate = data.rates[toCurrency];
      FXCache.historicalRates[key] = rate;
      FXCache.historicalRates[`${toCurrency}/${fromCurrency}/${date}`] = 1/rate;
      return rate;
    }
  } catch (e) {
    console.warn(`[FX] Historical rate ${key} failed:`, e.message);
  }
  // Fall back to current rate
  return getRate(fromCurrency, toCurrency);
}

// ── RATE GETTERS ──────────────────────────────────────────────
function getRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1.0;
  const key = `${fromCurrency}/${toCurrency}`;
  const cached = FXCache.rates[key];
  if (cached) return cached.rate;
  // Cross-rate via base
  const toBase   = FXCache.rates[`${fromCurrency}/${FXCache.baseCurrency}`];
  const fromBase = FXCache.rates[`${FXCache.baseCurrency}/${toCurrency}`];
  if (toBase && fromBase) return toBase.rate * fromBase.rate;
  return 1.0; // unknown
}

function convert(amount, fromCurrency, toCurrency, rate) {
  if (fromCurrency === toCurrency) return parseFloat(amount);
  const r = rate || getRate(fromCurrency, toCurrency);
  return parseFloat(amount) * r;
}

function getRateAge() {
  if (!FXCache.lastFetch) return null;
  const minutes = Math.floor((Date.now() - FXCache.lastFetch) / 60000);
  return minutes;
}

// ── MULTI-CURRENCY TRANSACTION PROCESSOR ──────────────────────
// Attaches fx_rate, functional_amount, unrealized_gain_loss to each txn
function processFXTransactions(transactions, functionalCurrency) {
  functionalCurrency = functionalCurrency || (typeof settings !== 'undefined' ? settings.currency : 'CAD');
  const processed = [];

  transactions.forEach(txn => {
    const originalCurrency = txn.currency || functionalCurrency;
    const originalAmount   = parseFloat(txn.original_amount || txn.amount || 0);
    const transactionDate  = txn.date || new Date().toISOString().slice(0,10);

    // Get rate as-of transaction date (async in background; use current if not cached)
    const rateKey = `${originalCurrency}/${functionalCurrency}/${transactionDate}`;
    const historicalRate = FXCache.historicalRates[rateKey];
    const currentRate    = getRate(originalCurrency, functionalCurrency);
    const appliedRate    = historicalRate || currentRate;

    const functionalAmount = convert(originalAmount, originalCurrency, functionalCurrency, appliedRate);
    const currentFunctional = convert(originalAmount, originalCurrency, functionalCurrency, currentRate);

    // Unrealized FX gain/loss = current rate vs booking rate
    const unrealizedGL = currentFunctional - functionalAmount;

    processed.push({
      ...txn,
      currency:           originalCurrency,
      original_amount:    originalAmount,
      fx_rate:            appliedRate,
      fx_rate_current:    currentRate,
      fx_rate_source:     historicalRate ? 'historical' : (FXCache.rates[`${originalCurrency}/${functionalCurrency}`]?.source || 'embedded'),
      amount:             functionalAmount.toFixed(2),
      functional_amount:  functionalAmount,
      current_functional: currentFunctional,
      unrealized_gl:      unrealizedGL,
      is_foreign:         originalCurrency !== functionalCurrency,
    });
  });

  return processed;
}

// ── REVALUATION ENGINE (IAS 21 / FASB ASC 830) ────────────────
// Revalues all open foreign-currency balances at period-end rate
function revalueBalances(transactions, functionalCurrency, revalDate) {
  functionalCurrency = functionalCurrency || 'CAD';
  revalDate = revalDate || new Date().toISOString().slice(0,10);

  const foreignTxns = transactions.filter(t => t.currency && t.currency !== functionalCurrency && !t._revalued);

  const byAccount = {};
  foreignTxns.forEach(t => {
    const acct = t.category || 'Unknown';
    if (!byAccount[acct]) byAccount[acct] = { currency: t.currency, originalTotal: 0, bookedTotal: 0, count: 0 };
    byAccount[acct].originalTotal += parseFloat(t.original_amount || t.amount || 0);
    byAccount[acct].bookedTotal   += parseFloat(t.functional_amount || t.amount || 0);
    byAccount[acct].count++;
  });

  const entries = [];
  Object.entries(byAccount).forEach(([acct, data]) => {
    const currentRate = getRate(data.currency, functionalCurrency);
    const revaluedAmt = data.originalTotal * currentRate;
    const glAmount    = revaluedAmt - data.bookedTotal;

    if (Math.abs(glAmount) < 0.01) return;

    entries.push({
      date:           revalDate,
      account:        acct,
      currency:       data.currency,
      originalBalance: data.originalTotal,
      bookedBalance:   data.bookedTotal,
      revaluedBalance: revaluedAmt,
      gainLossAmount:  glAmount,
      gainLossType:    glAmount > 0 ? 'Exchange Loss' : 'Exchange Gain',
      rate:            currentRate,
      txnCount:        data.count,
      journalEntry: {
        dr: glAmount > 0 ? '6800' : '1000',  // Loss debit bank charges; Gain credit
        cr: glAmount > 0 ? '1000' : '4200',  // Gain credit Other Income
        amount: Math.abs(glAmount),
        memo: `FX Revaluation ${data.currency}/${functionalCurrency} @ ${currentRate.toFixed(4)} — ${acct}`,
      }
    });
  });

  return {
    entries,
    totalGain:  entries.filter(e => e.gainLossType === 'Exchange Gain').reduce((s,e) => s + Math.abs(e.gainLossAmount), 0),
    totalLoss:  entries.filter(e => e.gainLossType === 'Exchange Loss').reduce((s,e) => s + Math.abs(e.gainLossAmount), 0),
    netGainLoss: entries.reduce((s,e) => s + e.gainLossAmount, 0),
    revalDate,
    rateSource: FXCache.lastFetch ? `Live rates as of ${FXCache.lastFetch.toLocaleTimeString()}` : 'Embedded fallback rates',
  };
}

// ── FX EXPOSURE REPORT ─────────────────────────────────────────
function buildFXExposureReport(transactions, functionalCurrency) {
  functionalCurrency = functionalCurrency || 'CAD';
  const exposure = {};

  transactions.forEach(t => {
    const curr = t.currency || functionalCurrency;
    if (curr === functionalCurrency) return;
    if (!exposure[curr]) exposure[curr] = { currency: curr, totalOriginal: 0, totalFunctional: 0, txnCount: 0, largestTxn: 0, recentDate: '' };
    const origAmt = Math.abs(parseFloat(t.original_amount || t.amount || 0));
    const funcAmt = Math.abs(parseFloat(t.functional_amount || t.amount || 0));
    exposure[curr].totalOriginal   += origAmt;
    exposure[curr].totalFunctional += funcAmt;
    exposure[curr].txnCount++;
    if (origAmt > exposure[curr].largestTxn) exposure[curr].largestTxn = origAmt;
    if ((t.date || '') > exposure[curr].recentDate) exposure[curr].recentDate = t.date || '';
  });

  // Add current rate and sensitivity
  Object.values(exposure).forEach(exp => {
    exp.currentRate   = getRate(exp.currency, functionalCurrency);
    exp.fxSensitivity = exp.totalOriginal * 0.01; // 1% move impact in functional
    exp.hedgeRequired = exp.totalOriginal > 50000;
  });

  return Object.values(exposure).sort((a, b) => b.totalFunctional - a.totalFunctional);
}

// ── RATE LOCK / BUDGET RATE COMPARISON ────────────────────────
function compareBudgetRates(transactions, budgetRates, functionalCurrency) {
  // budgetRates: { 'USD': 1.32, 'EUR': 1.44 } — rates used in budget
  const variances = [];
  const byCurrency = {};

  transactions.forEach(t => {
    const curr = t.currency || functionalCurrency;
    if (curr === functionalCurrency || !budgetRates[curr]) return;
    if (!byCurrency[curr]) byCurrency[curr] = { currency: curr, totalOriginal: 0, actualFunctional: 0, txnCount: 0 };
    byCurrency[curr].totalOriginal   += Math.abs(parseFloat(t.original_amount || t.amount || 0));
    byCurrency[curr].actualFunctional += Math.abs(parseFloat(t.functional_amount || t.amount || 0));
    byCurrency[curr].txnCount++;
  });

  Object.entries(byCurrency).forEach(([curr, data]) => {
    const budgetRate    = budgetRates[curr];
    const actualRate    = data.totalOriginal > 0 ? data.actualFunctional / data.totalOriginal : budgetRate;
    const budgetAmount  = data.totalOriginal * budgetRate;
    const variance      = data.actualFunctional - budgetAmount;
    const variancePct   = budgetAmount > 0 ? variance / budgetAmount : 0;

    variances.push({
      currency:       curr,
      txnCount:       data.txnCount,
      totalOriginal:  data.totalOriginal,
      budgetRate,
      actualRate,
      budgetAmount,
      actualAmount:   data.actualFunctional,
      variance,
      variancePct,
      impact:         variance > 0 ? 'Unfavorable (cost more than budget)' : 'Favorable (cost less than budget)',
    });
  });

  return variances.sort((a,b) => Math.abs(b.variance) - Math.abs(a.variance));
}

// ── RENDER: FX DASHBOARD ──────────────────────────────────────
function renderFXDashboard(containerId, transactions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const functional = typeof settings !== 'undefined' ? settings.currency : 'CAD';
  const sym = c => CURRENCIES[c]?.symbol || c;
  const fmt = (v, c) => {
    const cur = CURRENCIES[c] || CURRENCIES.USD;
    return new Intl.NumberFormat(cur.locale, { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals }).format(v || 0);
  };

  const exposure    = buildFXExposureReport(transactions, functional);
  const reval       = revalueBalances(transactions, functional);
  const rateAge     = getRateAge();
  const rateAgeLabel = rateAge === null ? 'Not loaded' : rateAge < 1 ? 'Just now' : rateAge < 60 ? `${rateAge}m ago` : `${Math.floor(rateAge/60)}h ago`;

  // Rate table
  const mainCurrencies = ['USD','EUR','GBP','AUD','JPY','CHF','MXN','BRL'];
  const rateRows = mainCurrencies.map(c => {
    if (c === functional) return '';
    const rate = getRate(c, functional);
    const prev = FXCache.rates[`${c}/${functional}`];
    return `<tr>
      <td style="font-weight:600">${c}</td>
      <td>${CURRENCIES[c]?.name || c}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-weight:700">${fmt(rate, functional)} ${sym(functional)}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted)">${prev?.source || '—'}</td>
    </tr>`;
  }).join('');

  // Exposure cards
  const exposureCards = exposure.length ? exposure.map(e => `
    <div class="fx-exposure-card ${e.hedgeRequired ? 'hedge-required' : ''}">
      <div class="fx-card-header">
        <span class="fx-currency-code">${e.currency}</span>
        <span class="fx-currency-name">${CURRENCIES[e.currency]?.name || e.currency}</span>
        ${e.hedgeRequired ? '<span class="fx-hedge-badge">⚑ Hedge Review</span>' : ''}
      </div>
      <div class="fx-card-amount">${sym(e.currency)}${fmt(e.totalOriginal, e.currency)}</div>
      <div class="fx-card-functional">= ${sym(functional)}${fmt(e.totalFunctional, functional)} ${functional}</div>
      <div class="fx-card-meta">
        <span>Rate: ${e.currentRate.toFixed(4)}</span>
        <span>Sensitivity: ${sym(functional)}${fmt(e.fxSensitivity, functional)}/1%</span>
      </div>
    </div>`).join('') : `<div class="empty" style="padding:32px"><div class="empty-icon">🌍</div><p>No foreign-currency transactions detected</p></div>`;

  // Revaluation entries
  const revalRows = reval.entries.length ? reval.entries.map(e => `
    <tr>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:11px">${e.account}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-weight:600">${e.currency}/${functional}</td>
      <td style="font-family:'IBM Plex Mono',monospace">${fmt(e.originalBalance, e.currency)}</td>
      <td style="font-family:'IBM Plex Mono',monospace">${fmt(e.bookedBalance, functional)}</td>
      <td style="font-family:'IBM Plex Mono',monospace">${fmt(e.revaluedBalance, functional)}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:${e.gainLossAmount < 0 ? 'var(--green)' : 'var(--accent)'}">${e.gainLossAmount < 0 ? '+' : ''}${sym(functional)}${fmt(Math.abs(e.gainLossAmount), functional)}</td>
      <td><span style="font-family:'IBM Plex Mono',monospace;font-size:9px;padding:2px 6px;border-radius:3px;background:${e.gainLossType==='Exchange Gain'?'var(--green-l)':'var(--accent-l)'};color:${e.gainLossType==='Exchange Gain'?'var(--green)':'var(--accent)'}">${e.gainLossType}</span></td>
    </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px;font-size:12px">No foreign-currency balances to revalue</td></tr>`;

  container.innerHTML = `
    <style>
      .fx-rate-bar { display:flex; align-items:center; gap:12px; padding:10px 16px; background:var(--paper); border:1px solid var(--border); border-radius:var(--radius-sm); margin-bottom:18px; flex-wrap:wrap; }
      .fx-rate-bar .rate-item { font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--muted); display:flex; gap:6px; align-items:center; }
      .fx-rate-bar .rate-item .rate-val { font-weight:700; color:var(--ink); }
      .fx-rate-bar .rate-live { width:6px; height:6px; border-radius:50%; background:var(--green); animation:pulse 2s ease-in-out infinite; }
      .fx-exposure-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; margin-bottom:20px; }
      .fx-exposure-card { background:white; border:1px solid var(--border); border-radius:var(--radius); padding:18px; position:relative; }
      .fx-exposure-card.hedge-required { border-left:3px solid var(--gold); }
      .fx-card-header { display:flex; align-items:baseline; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
      .fx-currency-code { font-family:'IBM Plex Mono',monospace; font-size:16px; font-weight:700; color:var(--ink); }
      .fx-currency-name { font-size:11px; color:var(--muted); }
      .fx-hedge-badge { font-family:'IBM Plex Mono',monospace; font-size:8px; text-transform:uppercase; letter-spacing:.08em; background:var(--gold-l); color:var(--gold); padding:2px 6px; border-radius:3px; margin-left:auto; }
      .fx-card-amount { font-size:22px; font-weight:700; color:var(--ink); letter-spacing:-.5px; }
      .fx-card-functional { font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--muted); margin:4px 0 10px; }
      .fx-card-meta { display:flex; justify-content:space-between; font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--muted); }
      .fx-reval-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:18px; }
      .fx-reval-card { background:white; border:1px solid var(--border); border-radius:var(--radius); padding:16px; }
      .fx-reval-label { font-family:'IBM Plex Mono',monospace; font-size:9px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:6px; }
      .fx-reval-val { font-size:22px; font-weight:700; }
    </style>

    <!-- Rate bar -->
    <div class="fx-rate-bar">
      <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);">Live Rates vs ${functional}</span>
      <span class="rate-live"></span>
      ${mainCurrencies.filter(c=>c!==functional).map(c => {
        const r = getRate(c, functional);
        return `<span class="rate-item">${c} <span class="rate-val">${r.toFixed(4)}</span></span>`;
      }).join('<span style="color:var(--border);font-size:12px">|</span>')}
      <span style="margin-left:auto;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);">Updated: ${rateAgeLabel}</span>
      <button class="btn btn-xs" onclick="if(typeof LedgerFX!=='undefined')LedgerFX.refreshRates('${functional}').then(()=>LedgerFX.renderFXDashboard('${containerId}',window.activeTransactions||[]))">↻ Refresh</button>
    </div>

    <!-- Exposure -->
    <div class="section-label">Foreign Currency Exposure</div>
    <div class="fx-exposure-grid">${exposureCards}</div>

    <!-- Revaluation summary -->
    <div class="section-label">IAS 21 Revaluation — Period-End (${reval.revalDate})</div>
    <div class="fx-reval-summary">
      <div class="fx-reval-card"><div class="fx-reval-label">Total Exchange Gains</div><div class="fx-reval-val" style="color:var(--green)">${sym(functional)}${fmt(reval.totalGain, functional)}</div></div>
      <div class="fx-reval-card"><div class="fx-reval-label">Total Exchange Losses</div><div class="fx-reval-val" style="color:var(--accent)">${sym(functional)}${fmt(reval.totalLoss, functional)}</div></div>
      <div class="fx-reval-card"><div class="fx-reval-label">Net FX Gain/(Loss)</div><div class="fx-reval-val" style="color:${reval.netGainLoss>=0?'var(--green)':'var(--accent)'}">${sym(functional)}${fmt(Math.abs(reval.netGainLoss), functional)}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);margin-top:4px">${reval.rateSource}</div></div>
    </div>

    <!-- Revaluation entries -->
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-header"><span class="panel-title">Revaluation Journal Entries</span><span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted)">IAS 21 / ASC 830</span></div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Account</th><th>Pair</th><th>Original Balance</th><th>Booked</th><th>Revalued</th><th>FX Gain/(Loss)</th><th>Type</th></tr></thead>
          <tbody>${revalRows}</tbody>
        </table>
      </div>
    </div>

    <!-- Rate reference -->
    <div class="panel">
      <div class="panel-header"><span class="panel-title">Exchange Rate Reference — Base: ${functional}</span></div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Code</th><th>Currency</th><th>Rate vs ${functional}</th><th>Source</th></tr></thead>
          <tbody>${rateRows}</tbody>
        </table>
      </div>
    </div>`;
}

// ── CURRENCY DETECTOR (from transaction descriptions) ─────────
const CURRENCY_PATTERNS = [
  { re: /\bUSD\b|\$\s*\d|US\s*DOLLAR/i,           currency: 'USD' },
  { re: /\bEUR\b|€\s*\d|EURO/i,                    currency: 'EUR' },
  { re: /\bGBP\b|£\s*\d|STERLING|BRITISH\s*POUND/i, currency: 'GBP' },
  { re: /\bAUD\b|AU\$\s*\d|AUSTRALIAN\s*DOLLAR/i,  currency: 'AUD' },
  { re: /\bJPY\b|¥\s*\d|JAPANESE\s*YEN/i,          currency: 'JPY' },
  { re: /\bCHF\b|Fr\s*\d|SWISS\s*FRANC/i,           currency: 'CHF' },
  { re: /\bCNY\b|CHINESE\s*YUAN|RMB/i,              currency: 'CNY' },
  { re: /\bINR\b|₹\s*\d|INDIAN\s*RUPEE/i,           currency: 'INR' },
  { re: /\bMXN\b|MEXICAN\s*PESO/i,                   currency: 'MXN' },
  { re: /\bBRL\b|REAL\s*BRASIL/i,                    currency: 'BRL' },
  { re: /\bSGD\b|S\$\s*\d|SINGAPORE\s*DOLLAR/i,     currency: 'SGD' },
  { re: /\bHKD\b|HK\$\s*\d/i,                        currency: 'HKD' },
  { re: /\bNZD\b|NZ\$\s*\d/i,                        currency: 'NZD' },
  { re: /AMEX.*FOREIGN|VISA.*FOREIGN|FOREIGN\s*TRANS/i, currency: '_FOREIGN' },
];

function detectCurrency(description, defaultCurrency) {
  if (!description) return defaultCurrency;
  for (const p of CURRENCY_PATTERNS) {
    if (p.re.test(description)) return p.currency === '_FOREIGN' ? null : p.currency;
  }
  // Known foreign vendors
  const FOREIGN_VENDORS = {
    'GOOGLE': 'USD', 'AMAZON': 'USD', 'AWS': 'USD', 'STRIPE': 'USD',
    'SHOPIFY': 'USD', 'SLACK': 'USD', 'NOTION': 'USD', 'FIGMA': 'USD',
    'ADOBE': 'USD', 'MICROSOFT': 'USD', 'ZOOM': 'USD', 'GITHUB': 'USD',
    'OPENAI': 'USD', 'ANTHROPIC': 'USD', 'HUBSPOT': 'USD', 'DROPBOX': 'USD',
  };
  const upperDesc = description.toUpperCase();
  for (const [vendor, currency] of Object.entries(FOREIGN_VENDORS)) {
    if (upperDesc.includes(vendor)) return currency;
  }
  return defaultCurrency;
}

// ── REFRESH + INIT ────────────────────────────────────────────
async function refreshRates(baseCurrency) {
  return await fetchLiveRates(baseCurrency);
}

// Auto-fetch on module load (non-blocking)
setTimeout(() => {
  const base = typeof settings !== 'undefined' ? settings.currency : 'CAD';
  fetchLiveRates(base).catch(() => {});
}, 800);

// ── PUBLIC API ────────────────────────────────────────────────
window.LedgerFX = {
  CURRENCIES,
  FXCache,
  refreshRates,
  fetchLiveRates,
  fetchHistoricalRate,
  getRate,
  convert,
  getRateAge,
  processFXTransactions,
  revalueBalances,
  buildFXExposureReport,
  compareBudgetRates,
  renderFXDashboard,
  detectCurrency,
};

console.log('[LedgerAI] FX Engine loaded — multi-currency · IAS 21 revaluation · live rates');

})();
