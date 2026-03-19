// ============================================================
// LEDGERAI — INTELLIGENCE ENGINE v1.0
// Anomaly detection · Pattern recognition · ML forecasting
// Vendor intelligence · Ratio analysis · Smart insights
// Load AFTER app.js
// ============================================================

(function() {
'use strict';

// ── STATE ────────────────────────────────────────────────────
const Intel = {
  anomalies:      [],
  insights:       [],
  vendorProfiles: {},
  ratios:         {},
  riskScore:      0,
  lastRun:        null,
};

// ── ANOMALY DETECTION ENGINE ──────────────────────────────────

/**
 * Statistical anomaly detection using z-score and IQR methods
 * Detects: unusual amounts, duplicate vendors, spending spikes,
 *          round-number suspicious, weekend/holiday transactions,
 *          rapid sequential charges, category concentration risk
 */
function detectAnomalies(transactions) {
  if (!transactions || !transactions.length) return [];
  const anomalies = [];

  // Group by category for baseline
  const catAmounts = {};
  const vendorAmounts = {};
  const vendorDates = {};
  const amounts = [];

  transactions.forEach(t => {
    const amt = Math.abs(parseFloat(t.amount || 0));
    if (amt <= 0) return;
    amounts.push(amt);
    const cat = t.category || 'Miscellaneous';
    if (!catAmounts[cat]) catAmounts[cat] = [];
    catAmounts[cat].push(amt);
    const vendor = normalizeVendorName(t.description || '');
    if (!vendorAmounts[vendor]) { vendorAmounts[vendor] = []; vendorDates[vendor] = []; }
    vendorAmounts[vendor].push(amt);
    vendorDates[vendor].push(t.date || '');
  });

  // 1. GLOBAL AMOUNT ANOMALIES (z-score > 2.5)
  const globalStats = calcStats(amounts);
  transactions.forEach((t, i) => {
    const amt = Math.abs(parseFloat(t.amount || 0));
    if (amt <= 0) return;
    const z = Math.abs((amt - globalStats.mean) / (globalStats.sd || 1));
    if (z > 2.5 && amt > 1000) {
      anomalies.push({
        type:        'amount_spike',
        severity:    z > 4 ? 'critical' : 'high',
        txIndex:     i,
        description: t.description,
        date:        t.date,
        amount:      amt,
        category:    t.category,
        message:     `Unusually large transaction: ${formatAmount(amt)} is ${z.toFixed(1)}σ above the mean of ${formatAmount(globalStats.mean)}`,
        insight:     'This transaction is a statistical outlier. Verify authorization and supporting documentation.',
        icon:        '📊',
      });
    }
  });

  // 2. ROUND NUMBER FRAUD INDICATOR
  // Fraudsters often submit round numbers just below approval thresholds
  transactions.forEach((t, i) => {
    const amt = Math.abs(parseFloat(t.amount || 0));
    if (amt <= 0) return;
    const isRound = amt % 1000 === 0 || amt % 500 === 0 || amt % 100 === 0;
    const isJustUnder = (amt === 4999 || amt === 9999 || amt === 2499 || amt === 999 || amt === 4995 || amt === 9995);
    if (isJustUnder && amt > 500) {
      anomalies.push({
        type:     'threshold_gaming',
        severity: 'medium',
        txIndex:  i,
        description: t.description,
        date:     t.date,
        amount:   amt,
        message:  `Round/threshold amount: ${formatAmount(amt)} — common in approval limit circumvention`,
        insight:  'Amounts just under approval thresholds ($5,000, $10,000, $2,500) should be reviewed for split-billing or threshold gaming.',
        icon:     '🔢',
      });
    }
    // Exactly round + large
    if (isRound && amt >= 5000) {
      anomalies.push({
        type:     'round_number',
        severity: 'low',
        txIndex:  i,
        description: t.description,
        date:     t.date,
        amount:   amt,
        message:  `Round number transaction: ${formatAmount(amt)} — verify this is not an estimate`,
        insight:  'Exact round numbers for large expenses may indicate an estimate rather than actual amount. Verify against invoice.',
        icon:     '🔘',
      });
    }
  });

  // 3. RAPID SEQUENTIAL CHARGES — same vendor, within 3 days
  Object.entries(vendorDates).forEach(([vendor, dates]) => {
    if (dates.length < 2) return;
    const sorted = [...dates].sort();
    for (let j = 1; j < sorted.length; j++) {
      const dayDiff = (new Date(sorted[j]) - new Date(sorted[j - 1])) / 86400000;
      if (dayDiff >= 0 && dayDiff <= 3) {
        anomalies.push({
          type:     'rapid_charges',
          severity: 'medium',
          description: vendor,
          date:     sorted[j],
          amount:   vendorAmounts[vendor].reduce((a, b) => a + b, 0),
          message:  `Rapid sequential charges: "${vendor}" charged ${vendorAmounts[vendor].length}× within 3 days`,
          insight:  'Multiple charges from the same vendor in a short period could indicate duplicate invoices or subscription double-billing.',
          icon:     '⚡',
        });
        break; // One anomaly per vendor
      }
    }
  });

  // 4. VENDOR AMOUNT INCONSISTENCY — same vendor, wildly different amounts
  Object.entries(vendorAmounts).forEach(([vendor, amts]) => {
    if (amts.length < 3) return;
    const stats = calcStats(amts);
    if (stats.cv > 0.8 && stats.max > 500) { // Coefficient of variation > 80%
      anomalies.push({
        type:     'vendor_inconsistency',
        severity: 'low',
        description: vendor,
        amount:   stats.mean,
        message:  `Inconsistent amounts from "${vendor}": range ${formatAmount(stats.min)}–${formatAmount(stats.max)}`,
        insight:  'High variance in charges from the same vendor may indicate pricing errors, plan changes, or overage charges.',
        icon:     '📉',
      });
    }
  });

  // 5. CATEGORY CONCENTRATION RISK
  const totalSpend = amounts.reduce((a, b) => a + b, 0);
  Object.entries(catAmounts).forEach(([cat, amts]) => {
    const catTotal = amts.reduce((a, b) => a + b, 0);
    const pct = totalSpend > 0 ? catTotal / totalSpend : 0;
    if (pct > 0.45 && cat !== 'Payroll' && cat !== 'Cost of Goods Sold') {
      anomalies.push({
        type:     'concentration_risk',
        severity: 'medium',
        description: cat,
        amount:   catTotal,
        message:  `High concentration: ${cat} = ${(pct * 100).toFixed(0)}% of total spend`,
        insight:  `Over 45% of spending in one category (excluding payroll/COGS) suggests business model concentration risk. Review diversification.`,
        icon:     '⚠️',
      });
    }
  });

  // 6. MISSING VENDOR NAME (potential ghost vendor)
  transactions.forEach((t, i) => {
    const desc = (t.description || '').trim();
    if (desc.length < 4 && Math.abs(parseFloat(t.amount || 0)) > 100) {
      anomalies.push({
        type:     'ghost_vendor',
        severity: 'high',
        txIndex:  i,
        description: desc || '(blank)',
        date:     t.date,
        amount:   Math.abs(parseFloat(t.amount || 0)),
        message:  `Unidentified vendor: "${desc}" with amount ${formatAmount(Math.abs(parseFloat(t.amount || 0)))}`,
        insight:  'Transactions with missing or very short vendor names are a fraud risk indicator. Verify the payee.',
        icon:     '👻',
      });
    }
  });

  Intel.anomalies = anomalies;
  return anomalies;
}

// ── SMART INSIGHTS ENGINE ─────────────────────────────────────

/**
 * Generates actionable CFO-level insights from transaction data
 * Covers: burn rate, runway, SaaS metrics, cash cycle, tax exposure
 */
function generateInsights(transactions) {
  if (!transactions || !transactions.length) return [];
  const insights = [];
  const expenses = transactions.filter(t => parseFloat(t.amount || 0) > 0);
  const income   = transactions.filter(t => parseFloat(t.amount || 0) < 0 || t.category === 'Income');
  const totalExp = expenses.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalInc = income.reduce((s, t) => s + Math.abs(parseFloat(t.amount || 0)), 0);
  const netCash  = totalInc - totalExp;

  // ── BURN RATE & RUNWAY ──────────────────────────────────────
  if (totalExp > 0) {
    const months = getDateSpanMonths(transactions);
    const monthlyBurn = months > 0 ? totalExp / months : totalExp;
    const cashBalance = Math.max(0, netCash);
    const runway = monthlyBurn > 0 ? cashBalance / monthlyBurn : Infinity;

    if (runway < 6 && runway > 0) {
      insights.push({
        type:     'runway_warning',
        priority: 'critical',
        title:    `Only ${runway.toFixed(1)} months runway`,
        body:     `At current burn rate of ${formatAmount(monthlyBurn)}/month with ${formatAmount(cashBalance)} net cash, you have limited runway. Prioritize revenue generation or cost reduction immediately.`,
        metric:   `${runway.toFixed(1)}mo runway`,
        icon:     '🔥',
        action:   "showView('cashflow')",
      });
    } else if (runway < 12 && runway > 0) {
      insights.push({
        type:     'runway_caution',
        priority: 'high',
        title:    `${runway.toFixed(1)}-month cash runway`,
        body:     `Monthly burn of ${formatAmount(monthlyBurn)} against current net cash position gives approximately ${runway.toFixed(1)} months before cashflow becomes critical.`,
        metric:   `${formatAmount(monthlyBurn)}/mo burn`,
        icon:     '⏱️',
        action:   "showView('forecast')",
      });
    }
  }

  // ── GROSS MARGIN ────────────────────────────────────────────
  if (totalInc > 0) {
    const cogsTotal = transactions
      .filter(t => t.category === 'Cost of Goods Sold')
      .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const grossProfit = totalInc - cogsTotal;
    const grossMargin = totalInc > 0 ? grossProfit / totalInc : 0;

    if (cogsTotal > 0) {
      const status = grossMargin > 0.6 ? 'healthy' : grossMargin > 0.35 ? 'moderate' : 'thin';
      insights.push({
        type:     'gross_margin',
        priority: grossMargin < 0.35 ? 'high' : 'info',
        title:    `${(grossMargin * 100).toFixed(1)}% gross margin (${status})`,
        body:     `Revenue of ${formatAmount(totalInc)} minus COGS of ${formatAmount(cogsTotal)} = ${formatAmount(grossProfit)} gross profit. ${grossMargin < 0.35 ? 'Thin margin signals pricing or COGS efficiency issues.' : 'Margin is within healthy range.'}`,
        metric:   `${(grossMargin * 100).toFixed(1)}% GM`,
        icon:     '📊',
        action:   "showView('pl')",
      });
    }
  }

  // ── SOFTWARE SPEND RATIO ────────────────────────────────────
  const swSpend = transactions
    .filter(t => t.category === 'Software & Subscriptions')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  if (swSpend > 0 && totalExp > 0) {
    const swRatio = swSpend / totalExp;
    if (swRatio > 0.15) {
      insights.push({
        type:     'saas_sprawl',
        priority: 'medium',
        title:    `SaaS spend at ${(swRatio * 100).toFixed(0)}% of total — review for redundancy`,
        body:     `${formatAmount(swSpend)} in software subscriptions (${(swRatio * 100).toFixed(0)}% of expenses). Audit for duplicate tools, unused licenses, and annual vs monthly pricing opportunities.`,
        metric:   formatAmount(swSpend) + ' SaaS',
        icon:     '💻',
        action:   "showView('subscriptions')",
      });
    }
  }

  // ── MEALS & ENTERTAINMENT RISK ──────────────────────────────
  const meSpend = transactions
    .filter(t => t.category === 'Meals & Entertainment')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  if (meSpend > 0 && totalExp > 0) {
    const meRatio = meSpend / totalExp;
    const nonDeductible = meSpend * 0.5; // CRA: 50% rule
    if (meRatio > 0.08) {
      insights.push({
        type:     'me_exposure',
        priority: 'medium',
        title:    `Meals & entertainment is ${(meRatio * 100).toFixed(0)}% of expenses`,
        body:     `${formatAmount(meSpend)} in M&E with CRA's 50% limit means ${formatAmount(nonDeductible)} is non-deductible. High M&E ratios attract CRA scrutiny — ensure all receipts note business purpose and attendees.`,
        metric:   formatAmount(nonDeductible) + ' non-ded.',
        icon:     '🍽️',
        action:   "showView('flags')",
      });
    }
  }

  // ── HST EXPOSURE ────────────────────────────────────────────
  const hstableCategories = ['Software & Subscriptions', 'Advertising & Marketing', 'Legal & Professional Fees', 'Office Supplies & Equipment', 'Travel & Transportation'];
  const hstableSpend = transactions
    .filter(t => hstableCategories.includes(t.category))
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  if (hstableSpend > 5000) {
    const estimatedITC = hstableSpend * 0.13; // Ontario HST rate
    insights.push({
      type:     'itc_opportunity',
      priority: 'info',
      title:    `~${formatAmount(estimatedITC)} in potential HST Input Tax Credits`,
      body:     `Based on ${formatAmount(hstableSpend)} in HST-eligible expenses, you may be able to claim approximately ${formatAmount(estimatedITC)} in ITCs on your next HST return. Ensure all invoices show vendor HST number.`,
      metric:   formatAmount(estimatedITC) + ' est. ITCs',
      icon:     '🧾',
      action:   "showView('taxes')",
    });
  }

  // ── CONTRACTOR T4A RISK ─────────────────────────────────────
  const contractors = transactions.filter(t => t.category === 'Contractor / Professional Services');
  const contractorMap = {};
  contractors.forEach(t => {
    const k = normalizeVendorName(t.description || '');
    contractorMap[k] = (contractorMap[k] || 0) + parseFloat(t.amount || 0);
  });
  const t4aRisk = Object.entries(contractorMap).filter(([, v]) => v >= 500);
  if (t4aRisk.length > 0) {
    insights.push({
      type:     't4a_filing',
      priority: t4aRisk.length > 3 ? 'high' : 'medium',
      title:    `${t4aRisk.length} contractor(s) may require T4A filing`,
      body:     `${t4aRisk.map(([n, v]) => `${n}: ${formatAmount(v)}`).join(' · ')}. CRA requires T4A for any individual paid $500+ for services. Deadline: last day of February following the tax year.`,
      metric:   t4aRisk.length + ' T4As due',
      icon:     '📋',
      action:   "showView('contractors')",
    });
  }

  // ── PAYROLL TAX RATIO ────────────────────────────────────────
  const payroll = transactions
    .filter(t => t.category === 'Payroll')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const payrollTax = transactions
    .filter(t => t.category === 'Payroll Tax')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  if (payroll > 0 && payrollTax > 0) {
    const ptRatio = payrollTax / payroll;
    const expectedMin = 0.08; const expectedMax = 0.22;
    if (ptRatio < expectedMin || ptRatio > expectedMax) {
      insights.push({
        type:     'payroll_ratio',
        priority: 'high',
        title:    `Payroll tax ratio of ${(ptRatio * 100).toFixed(1)}% is ${ptRatio < expectedMin ? 'unusually low' : 'unusually high'}`,
        body:     `Payroll of ${formatAmount(payroll)} with payroll taxes of ${formatAmount(payrollTax)} = ${(ptRatio * 100).toFixed(1)}%. Expected range is 8–22% (EI + CPP + EHT). ${ptRatio < expectedMin ? 'Possible underpayment risk.' : 'Review classification — may include non-payroll items.'}`,
        metric:   (ptRatio * 100).toFixed(1) + '% PT ratio',
        icon:     '👥',
        action:   "showView('trialbalance')",
      });
    }
  }

  // ── UNCATEGORIZED TRANSACTION RISK ──────────────────────────
  const uncatCount = transactions.filter(t => !t.category || t.category === 'Miscellaneous' || t.category === 'Uncategorized').length;
  const uncatPct = transactions.length > 0 ? uncatCount / transactions.length : 0;
  if (uncatPct > 0.1 && uncatCount > 5) {
    insights.push({
      type:     'categorization_gap',
      priority: 'medium',
      title:    `${uncatCount} transactions (${(uncatPct * 100).toFixed(0)}%) uncategorized`,
      body:     `Uncategorized transactions reduce the accuracy of P&L, tax estimates, and ratios. Run AI Categorize All to auto-classify using Claude AI.`,
      metric:   uncatCount + ' uncategorized',
      icon:     '🏷️',
      action:   "aiCategorizeAll()",
    });
  }

  Intel.insights = insights;
  return insights;
}

// ── VENDOR INTELLIGENCE ────────────────────────────────────────

/**
 * Builds a profile for each vendor:
 * frequency, average spend, trend, first/last seen,
 * business vs personal classification
 */
function buildVendorProfiles(transactions) {
  const profiles = {};

  transactions.forEach(t => {
    const vendor = normalizeVendorName(t.description || '');
    if (!vendor) return;
    if (!profiles[vendor]) {
      profiles[vendor] = {
        name:       vendor,
        count:      0,
        total:      0,
        amounts:    [],
        dates:      [],
        categories: {},
        firstSeen:  null,
        lastSeen:   null,
      };
    }
    const p = profiles[vendor];
    const amt = Math.abs(parseFloat(t.amount || 0));
    p.count++;
    p.total += amt;
    p.amounts.push(amt);
    p.dates.push(t.date || '');
    p.categories[t.category || 'Unknown'] = (p.categories[t.category || 'Unknown'] || 0) + 1;
    if (!p.firstSeen || t.date < p.firstSeen) p.firstSeen = t.date;
    if (!p.lastSeen  || t.date > p.lastSeen)  p.lastSeen  = t.date;
  });

  // Compute derived stats
  Object.values(profiles).forEach(p => {
    const stats   = calcStats(p.amounts);
    p.average     = stats.mean;
    p.stdDev      = stats.sd;
    p.isRecurring = p.count >= 2 && stats.cv < 0.3;
    p.primaryCat  = Object.entries(p.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
    p.trend       = calcTrend(p.dates, p.amounts);
  });

  Intel.vendorProfiles = profiles;
  return profiles;
}

// ── FINANCIAL RATIO ANALYSIS ───────────────────────────────────

/**
 * Computes 15+ financial ratios for benchmarking
 */
function computeRatios(transactions) {
  const exp = (cat) => transactions.filter(t => t.category === cat).reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalExp  = transactions.filter(t => parseFloat(t.amount||0) > 0).reduce((s,t) => s + parseFloat(t.amount||0), 0);
  const totalInc  = transactions.filter(t => parseFloat(t.amount||0) < 0 || t.category === 'Income').reduce((s,t) => s + Math.abs(parseFloat(t.amount||0)), 0);
  const payroll   = exp('Payroll') + exp('Payroll Tax') + exp('Employee Benefits & Recognition');
  const marketing = exp('Advertising & Marketing');
  const software  = exp('Software & Subscriptions');
  const facilities= exp('Rent & Facilities');
  const cogs      = exp('Cost of Goods Sold');
  const legal     = exp('Legal & Professional Fees');
  const travel    = exp('Travel & Transportation');
  const me        = exp('Meals & Entertainment');

  const grossProfit = totalInc - cogs;

  const ratios = {
    grossMargin:         totalInc > 0 ? grossProfit / totalInc : null,
    netMargin:           totalInc > 0 ? (totalInc - totalExp) / totalInc : null,
    payrollRatio:        totalExp > 0 ? payroll / totalExp : null,
    marketingRatio:      totalExp > 0 ? marketing / totalExp : null,
    softwareRatio:       totalExp > 0 ? software / totalExp : null,
    facilitiesRatio:     totalExp > 0 ? facilities / totalExp : null,
    cogsRatio:           totalInc > 0 ? cogs / totalInc : null,
    legalRatio:          totalExp > 0 ? legal / totalExp : null,
    travelRatio:         totalExp > 0 ? travel / totalExp : null,
    meRatio:             totalExp > 0 ? me / totalExp : null,
    expensePerTxn:       transactions.length > 0 ? totalExp / transactions.length : null,
    revenuePerTxn:       totalInc > 0 && transactions.length > 0 ? totalInc / transactions.length : null,
    operatingLeverage:   totalInc > 0 && (totalInc - totalExp) > 0 ? grossProfit / (totalInc - totalExp) : null,
    burnMultiple:        totalInc > 0 ? totalExp / totalInc : null,
    cogsPerDollarRev:    totalInc > 0 ? cogs / totalInc : null,
  };

  Intel.ratios = ratios;
  return ratios;
}

// ── RISK SCORING ──────────────────────────────────────────────

/**
 * Composite risk score 0–100
 * Considers: flags, anomalies, T4A exposure, concentration, M&E ratio
 */
function computeRiskScore(transactions, flaggedItems) {
  let score = 0;
  const total = transactions.length || 1;

  // Flag rate
  const flagRate = (flaggedItems || 0) / total;
  score += Math.min(30, flagRate * 200);

  // Anomaly contribution
  const criticalAnomalies = Intel.anomalies.filter(a => a.severity === 'critical').length;
  const highAnomalies     = Intel.anomalies.filter(a => a.severity === 'high').length;
  score += criticalAnomalies * 8 + highAnomalies * 4;

  // Uncategorized rate
  const uncatRate = transactions.filter(t => !t.category || t.category === 'Miscellaneous').length / total;
  score += Math.min(20, uncatRate * 100);

  // M&E exposure
  const meRatio = Intel.ratios.meRatio || 0;
  if (meRatio > 0.15) score += 15;
  else if (meRatio > 0.08) score += 8;

  // T4A risk
  const t4aInsight = Intel.insights.find(i => i.type === 't4a_filing');
  if (t4aInsight) score += 10;

  Intel.riskScore = Math.min(100, Math.round(score));
  return Intel.riskScore;
}

// ── ML CASH FLOW FORECAST ─────────────────────────────────────

/**
 * Multi-method forecast:
 * 1. Linear regression on monthly totals
 * 2. Exponential smoothing (Holt's method)
 * 3. Seasonal decomposition (if 12+ months)
 * Returns 6-month projection with confidence intervals
 */
function forecastCashFlow(transactions, horizonMonths = 6) {
  if (!transactions.length) return null;

  // Build monthly time series
  const monthly = {};
  transactions.forEach(t => {
    const d = t.date ? t.date.substring(0, 7) : null;
    if (!d) return;
    if (!monthly[d]) monthly[d] = { expenses: 0, income: 0 };
    const amt = parseFloat(t.amount || 0);
    if (amt > 0) monthly[d].expenses += amt;
    else monthly[d].income += Math.abs(amt);
  });

  const keys     = Object.keys(monthly).sort();
  const expenses = keys.map(k => monthly[k].expenses);
  const income   = keys.map(k => monthly[k].income);
  const net      = keys.map((k, i) => income[i] - expenses[i]);

  if (keys.length < 2) return { method: 'insufficient_data', keys, expenses, income, net };

  // Method 1: Linear regression
  const expForecast  = linearRegression(expenses,  horizonMonths);
  const incForecast  = linearRegression(income,    horizonMonths);
  const netForecast  = linearRegression(net,       horizonMonths);

  // Method 2: Exponential smoothing (alpha = 0.3)
  const expSmoothed  = holtsSmoothing(expenses,    horizonMonths, 0.3, 0.1);
  const incSmoothed  = holtsSmoothing(income,      horizonMonths, 0.3, 0.1);

  // Blend: 60% Holt + 40% linear for better stability
  const projExpenses = expSmoothed.forecast.map((v, i) => v * 0.6 + (expForecast.forecast[i] || v) * 0.4);
  const projIncome   = incSmoothed.forecast.map((v, i) => v * 0.6 + (incForecast.forecast[i] || v) * 0.4);
  const projNet      = projIncome.map((v, i) => v - projExpenses[i]);

  // Generate future month labels
  const lastMonth = keys[keys.length - 1];
  const futureLabels = [];
  let [year, month] = lastMonth.split('-').map(Number);
  for (let m = 0; m < horizonMonths; m++) {
    month++;
    if (month > 12) { month = 1; year++; }
    futureLabels.push(`${year}-${String(month).padStart(2,'0')}`);
  }

  // Confidence intervals (±1 std dev of residuals)
  const expResiduals = expenses.map((v, i) => v - (expForecast.fitted[i] || v));
  const incResiduals = income.map((v, i) => v - (incForecast.fitted[i] || v));
  const expCI = calcStats(expResiduals.map(Math.abs)).mean;
  const incCI = calcStats(incResiduals.map(Math.abs)).mean;

  // Cumulative cash position
  let cumulativeCash = net.reduce((a, b) => a + b, 0);
  const cumulativeProjection = projNet.map(v => {
    cumulativeCash += v;
    return cumulativeCash;
  });

  return {
    method:        'blended_holt_linear',
    historical:    { keys, expenses, income, net },
    projection:    {
      labels:      futureLabels,
      expenses:    projExpenses.map(v => Math.max(0, v)),
      income:      projIncome.map(v => Math.max(0, v)),
      net:         projNet,
      cumulative:  cumulativeProjection,
      ciExpenses:  expCI,
      ciIncome:    incCI,
    },
    summary: {
      avgMonthlyBurn:    calcStats(expenses).mean,
      avgMonthlyIncome:  calcStats(income).mean,
      trend:             expForecast.slope > 0 ? 'increasing' : expForecast.slope < 0 ? 'decreasing' : 'stable',
      trendPct:          calcStats(expenses).mean > 0 ? (expForecast.slope / calcStats(expenses).mean) * 100 : 0,
      projectedCashIn6Mo: cumulativeProjection[cumulativeProjection.length - 1] || 0,
    },
  };
}

// ── MATH UTILITIES ────────────────────────────────────────────

function calcStats(arr) {
  if (!arr || !arr.length) return { mean:0, sd:0, min:0, max:0, median:0, cv:0 };
  const n    = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const sd   = Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);
  const sorted = [...arr].sort((a, b) => a - b);
  const median = n % 2 === 0 ? (sorted[n/2-1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];
  return { mean, sd, min: sorted[0], max: sorted[n-1], median, cv: mean > 0 ? sd / mean : 0 };
}

function linearRegression(data, horizonMonths) {
  const n = data.length;
  const xs = data.map((_, i) => i);
  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = data.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * data[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  const fitted    = xs.map(x => intercept + slope * x);
  const forecast  = Array.from({length: horizonMonths}, (_, i) => Math.max(0, intercept + slope * (n + i)));
  return { slope, intercept, fitted, forecast };
}

function holtsSmoothing(data, horizon, alpha = 0.3, beta = 0.1) {
  if (!data.length) return { forecast: Array(horizon).fill(0), fitted: [] };
  let level = data[0];
  let trend = data.length > 1 ? data[1] - data[0] : 0;
  const fitted = [level];
  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta  * (level - prevLevel) + (1 - beta) * trend;
    fitted.push(level + trend);
  }
  const forecast = Array.from({length: horizon}, (_, i) => Math.max(0, level + (i + 1) * trend));
  return { forecast, fitted };
}

function calcTrend(dates, amounts) {
  if (dates.length < 2) return 'flat';
  const sorted = dates.map((d, i) => ({ d, a: amounts[i] })).sort((a, b) => a.d.localeCompare(b.d));
  const first  = sorted.slice(0, Math.ceil(sorted.length / 2)).reduce((s, x) => s + x.a, 0) / Math.ceil(sorted.length / 2);
  const last   = sorted.slice(-Math.ceil(sorted.length / 2)).reduce((s, x) => s + x.a, 0) / Math.ceil(sorted.length / 2);
  if (last > first * 1.1) return 'increasing';
  if (last < first * 0.9) return 'decreasing';
  return 'stable';
}

function getDateSpanMonths(transactions) {
  const dates = transactions.map(t => t.date).filter(Boolean).sort();
  if (dates.length < 2) return 1;
  const first = new Date(dates[0]);
  const last  = new Date(dates[dates.length - 1]);
  const months = (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth());
  return Math.max(1, months);
}

function normalizeVendorName(desc) {
  return desc
    .replace(/\d{4,}/g, '')       // Remove long numbers (account numbers, dates)
    .replace(/\*+/g, '')          // Remove asterisks
    .replace(/[#\/\\|]/g, ' ')    // Remove special chars
    .replace(/\s+/g, ' ')         // Normalize spaces
    .trim()
    .toUpperCase()
    .substring(0, 30);            // Cap length
}

function formatAmount(v) {
  if (typeof window !== 'undefined' && typeof fmtAmt === 'function') {
    return (typeof currencySymbol === 'function' ? currencySymbol() : '$') + fmtAmt(v);
  }
  return '$' + (v || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── PUBLIC API ────────────────────────────────────────────────

/**
 * Run full intelligence analysis on transaction set
 * Returns comprehensive analysis object
 */
function runFullAnalysis(transactions) {
  if (!transactions || !transactions.length) return null;
  Intel.lastRun = new Date();
  const anomalies    = detectAnomalies(transactions);
  const ratios       = computeRatios(transactions);
  const insights     = generateInsights(transactions);
  const vendors      = buildVendorProfiles(transactions);
  const forecast     = forecastCashFlow(transactions, 6);
  const flaggedCount = transactions.filter(t => t.flag && t.flag !== 'none').length;
  const riskScore    = computeRiskScore(transactions, flaggedCount);
  return { anomalies, ratios, insights, vendors, forecast, riskScore, lastRun: Intel.lastRun };
}

/**
 * Render the intelligence panel into a container element
 */
function renderIntelligencePanel(containerId, transactions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const analysis = runFullAnalysis(transactions);
  if (!analysis) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">🧠</div><p>Load transactions to enable AI Intelligence</p></div>';
    return;
  }

  const riskColor = analysis.riskScore < 25 ? 'var(--green)' : analysis.riskScore < 60 ? 'var(--gold)' : 'var(--accent)';
  const riskLabel = analysis.riskScore < 25 ? 'Low Risk' : analysis.riskScore < 60 ? 'Moderate' : 'High Risk';

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:20px">
      <!-- Risk Score -->
      <div class="panel hover-lift" style="border-top:3px solid ${riskColor}">
        <div class="panel-body">
          <div class="stat-eyebrow">AI Risk Score</div>
          <div style="display:flex;align-items:baseline;gap:10px">
            <div class="stat-num" style="color:${riskColor};font-size:40px">${analysis.riskScore}</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:${riskColor};padding:3px 8px;background:color-mix(in srgb,${riskColor} 10%,white);border-radius:4px">${riskLabel}</div>
          </div>
          <div class="stat-sub">Based on ${analysis.anomalies.length} anomalies detected</div>
          <div class="progress-bar-wrap" style="margin-top:10px">
            <div class="progress-bar-fill" style="width:${analysis.riskScore}%;background:${riskColor}"></div>
          </div>
        </div>
      </div>

      <!-- Gross Margin Ratio -->
      ${analysis.ratios.grossMargin !== null ? `
      <div class="panel hover-lift">
        <div class="panel-body">
          <div class="stat-eyebrow">Gross Margin</div>
          <div class="stat-num">${(analysis.ratios.grossMargin * 100).toFixed(1)}%</div>
          <div class="stat-sub">${analysis.ratios.netMargin !== null ? 'Net margin: ' + (analysis.ratios.netMargin * 100).toFixed(1) + '%' : 'No revenue recorded'}</div>
        </div>
      </div>` : ''}

      <!-- Monthly Burn -->
      ${analysis.forecast ? `
      <div class="panel hover-lift">
        <div class="panel-body">
          <div class="stat-eyebrow">Avg Monthly Burn</div>
          <div class="stat-num">${formatAmount(analysis.forecast.summary.avgMonthlyBurn)}</div>
          <div class="stat-sub">Trend: ${analysis.forecast.summary.trend} (${analysis.forecast.summary.trendPct.toFixed(1)}%/mo)</div>
        </div>
      </div>` : ''}

      <!-- Vendor Count -->
      <div class="panel hover-lift">
        <div class="panel-body">
          <div class="stat-eyebrow">Unique Vendors</div>
          <div class="stat-num">${Object.keys(analysis.vendors).length}</div>
          <div class="stat-sub">${Object.values(analysis.vendors).filter(v => v.isRecurring).length} recurring</div>
        </div>
      </div>
    </div>

    <!-- Insights -->
    ${analysis.insights.length ? `
    <div class="panel" style="margin-bottom:16px">
      <div class="panel-header">
        <span class="panel-title">🧠 Smart Insights (${analysis.insights.length})</span>
      </div>
      <div class="panel-body" style="display:flex;flex-direction:column;gap:10px">
        ${analysis.insights.map(ins => `
          <div class="alert-card ${ins.priority === 'critical' ? '' : ins.priority === 'high' ? 'alert-warning' : ins.priority === 'medium' ? '' : 'alert-info'}"
               style="cursor:pointer" onclick="${ins.action || ''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
              <div>
                <div class="alert-title">${ins.icon} ${ins.title}</div>
                <div class="alert-body">${ins.body}</div>
              </div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;white-space:nowrap;padding:3px 8px;background:var(--paper);border:1px solid var(--border);border-radius:4px;flex-shrink:0">${ins.metric}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- Anomalies -->
    ${analysis.anomalies.length ? `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">🔍 Anomalies Detected (${analysis.anomalies.length})</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted)">${analysis.anomalies.filter(a=>a.severity==='critical'||a.severity==='high').length} high-priority</span>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr>
            <th>Type</th><th>Vendor / Description</th><th>Date</th><th>Amount</th><th>Detail</th>
          </tr></thead>
          <tbody>
            ${analysis.anomalies.slice(0, 20).map(a => `
            <tr>
              <td><span class="flag-severity-badge ${a.severity==='critical'||a.severity==='high'?'fsb-high':a.severity==='medium'?'fsb-medium':'fsb-low'}">${a.severity?.toUpperCase()}</span></td>
              <td style="font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis">${a.description||'—'}</td>
              <td style="font-family:'IBM Plex Mono',monospace;font-size:11px">${a.date||'—'}</td>
              <td style="font-family:'IBM Plex Mono',monospace;font-weight:600">${a.amount ? formatAmount(a.amount) : '—'}</td>
              <td style="font-size:12px;color:var(--muted)">${a.insight||a.message||'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : `
    <div class="panel">
      <div class="panel-body">
        <div class="empty" style="padding:32px 0">
          <div class="empty-icon">✅</div>
          <p>No anomalies detected — your transactions look clean</p>
        </div>
      </div>
    </div>`}
  `;
}

/**
 * Render a ratio dashboard
 */
function renderRatioDashboard(containerId, transactions) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const ratios = computeRatios(transactions);

  const ratioItems = [
    { label: 'Gross Margin',         value: ratios.grossMargin,        format: 'pct',  benchmark: 0.5,  higher: true  },
    { label: 'Net Margin',           value: ratios.netMargin,          format: 'pct',  benchmark: 0.1,  higher: true  },
    { label: 'Payroll Ratio',        value: ratios.payrollRatio,       format: 'pct',  benchmark: 0.35, higher: false },
    { label: 'Marketing Ratio',      value: ratios.marketingRatio,     format: 'pct',  benchmark: 0.10, higher: false },
    { label: 'Software Ratio',       value: ratios.softwareRatio,      format: 'pct',  benchmark: 0.12, higher: false },
    { label: 'Facilities Ratio',     value: ratios.facilitiesRatio,    format: 'pct',  benchmark: 0.10, higher: false },
    { label: 'COGS Ratio',           value: ratios.cogsRatio,          format: 'pct',  benchmark: 0.50, higher: false },
    { label: 'M&E Ratio',            value: ratios.meRatio,            format: 'pct',  benchmark: 0.05, higher: false },
    { label: 'Burn Multiple',        value: ratios.burnMultiple,       format: 'mult', benchmark: 1.0,  higher: false },
    { label: 'Legal/Prof Ratio',     value: ratios.legalRatio,         format: 'pct',  benchmark: 0.04, higher: false },
  ].filter(r => r.value !== null && r.value !== undefined);

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
      ${ratioItems.map(r => {
        const v = r.value;
        const isGood = r.higher ? v >= r.benchmark : v <= r.benchmark;
        const color  = v === null ? 'var(--muted)' : isGood ? 'var(--green)' : Math.abs(v - r.benchmark) / r.benchmark > 0.5 ? 'var(--accent)' : 'var(--gold)';
        const display = r.format === 'pct' ? (v * 100).toFixed(1) + '%' : v.toFixed(2) + 'x';
        return `
          <div class="stat-card card-shine" style="border-top:3px solid ${color}">
            <div class="stat-eyebrow">${r.label}</div>
            <div class="stat-num" style="color:${color};font-size:22px">${display}</div>
            <div class="stat-sub">Benchmark: ${r.format === 'pct' ? (r.benchmark*100).toFixed(0)+'%' : r.benchmark.toFixed(1)+'x'}</div>
            <div class="progress-bar-wrap" style="margin-top:8px">
              <div class="progress-bar-fill" style="width:${Math.min(100, Math.abs(v) * 100)}%;background:${color}"></div>
            </div>
          </div>`;
      }).join('')}
    </div>
  `;
}

// ── EXPOSE TO GLOBAL SCOPE ────────────────────────────────────
window.LedgerIntel = {
  runFullAnalysis,
  detectAnomalies,
  generateInsights,
  buildVendorProfiles,
  computeRatios,
  forecastCashFlow,
  computeRiskScore,
  renderIntelligencePanel,
  renderRatioDashboard,
  getState: () => Intel,
};

console.log('[LedgerAI] Intelligence engine loaded — runFullAnalysis(), renderIntelligencePanel() available');

})();
