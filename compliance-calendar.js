// ============================================================
// LEDGERAI — COMPLIANCE CALENDAR v1.0
// CRA + IRS filing deadlines · HST remittance schedules
// T4A / T4 / T2 / T1 due dates · Payroll remittance
// US: 941/940/1099-NEC/1120/1065/Schedule-C deadlines
// Alert escalation · Calendar export (iCal) · Email draft
// Business days calculator · Holiday-aware scheduling
// ============================================================

(function () {
'use strict';

// ── CANADIAN HOLIDAYS ─────────────────────────────────────────
const CA_HOLIDAYS_2024 = [
  '2024-01-01','2024-02-19','2024-03-29','2024-05-20','2024-06-24',
  '2024-07-01','2024-08-05','2024-09-02','2024-10-14','2024-11-11',
  '2024-12-25','2024-12-26',
];
const CA_HOLIDAYS_2025 = [
  '2025-01-01','2025-02-17','2025-04-18','2025-05-19','2025-06-23',
  '2025-07-01','2025-08-04','2025-09-01','2025-10-13','2025-11-11',
  '2025-12-25','2025-12-26',
];
const US_HOLIDAYS_2024 = [
  '2024-01-01','2024-01-15','2024-02-19','2024-05-27','2024-06-19',
  '2024-07-04','2024-09-02','2024-10-14','2024-11-11','2024-11-28',
  '2024-12-25',
];
const US_HOLIDAYS_2025 = [
  '2025-01-01','2025-01-20','2025-02-17','2025-05-26','2025-06-19',
  '2025-07-04','2025-09-01','2025-10-13','2025-11-11','2025-11-27',
  '2025-12-25',
];

const ALL_HOLIDAYS = new Set([
  ...CA_HOLIDAYS_2024, ...CA_HOLIDAYS_2025,
  ...US_HOLIDAYS_2024, ...US_HOLIDAYS_2025,
]);

function isWeekend(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.getDay() === 0 || d.getDay() === 6;
}
function isHoliday(date) {
  const str = (date instanceof Date ? date : new Date(date)).toISOString().slice(0,10);
  return ALL_HOLIDAYS.has(str);
}
function isBusinessDay(date) { return !isWeekend(date) && !isHoliday(date); }
function addBusinessDays(date, n) {
  let d = new Date(date); let added = 0;
  while (added < n) { d.setDate(d.getDate()+1); if (isBusinessDay(d)) added++; }
  return d;
}
function nextBusinessDay(date) {
  let d = new Date(date);
  d.setDate(d.getDate()+1);
  while (!isBusinessDay(d)) d.setDate(d.getDate()+1);
  return d;
}
function adjustForHoliday(date) {
  // If deadline falls on weekend/holiday, move to next business day
  let d = new Date(date);
  while (!isBusinessDay(d)) d.setDate(d.getDate()+1);
  return d;
}
function daysUntil(date) {
  const now = new Date(); now.setHours(0,0,0,0);
  const d   = new Date(date); d.setHours(0,0,0,0);
  return Math.round((d - now) / 86400000);
}
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-CA', { year:'numeric', month:'long', day:'numeric' });
}

// ── DEADLINE GENERATORS ───────────────────────────────────────
function generateCRADeadlines(year, businessType, hstFrequency, payrollFrequency) {
  year = year || new Date().getFullYear();
  businessType    = businessType    || 'corporation';
  hstFrequency    = hstFrequency    || 'quarterly';
  payrollFrequency= payrollFrequency|| 'bi-weekly';

  const deadlines = [];

  // ── CORPORATE TAX (T2) ──────────────────────────────────────
  if (businessType === 'corporation') {
    // T2 due 6 months after fiscal year-end (assuming Dec 31)
    const t2Due = adjustForHoliday(new Date(`${year+1}-06-30`));
    deadlines.push({
      id: `t2_${year}`, type:'filing', jurisdiction:'CRA', priority:'critical',
      title: `T2 Corporate Tax Return — ${year}`,
      dueDate: t2Due.toISOString().slice(0,10),
      description: 'Federal corporate income tax return. Balance due 2 months after fiscal year-end (Feb 28 for Dec 31 year-end). Return due 6 months after year-end (Jun 30).',
      penaltyNote: '5% of balance + 1%/month for up to 12 months if late. Second offence: 10% + 2%/month.',
      actions: ['Gather all source documents','Reconcile general ledger','Complete financial statements','File electronically via CRA My Business Account'],
      form: 'T2',
      estimatedFee: '$1,500–$5,000 (accountant)', linked_form: 'T2SCH1',
    });
    // Tax installments
    ['03-31','06-30','09-30','12-31'].forEach((md, i) => {
      deadlines.push({
        id: `t2_install_${year}_q${i+1}`, type:'payment', jurisdiction:'CRA', priority:'high',
        title: `Corporate Tax Installment Q${i+1} — ${year}`,
        dueDate: adjustForHoliday(new Date(`${year}-${md}`)).toISOString().slice(0,10),
        description: 'Quarterly corporate income tax installment. Based on prior year tax or current year estimate.',
        penaltyNote: 'Arrears interest at prescribed rate + 2% on deficient installments.',
        actions: ['Calculate installment base','Pay via CRA My Business Account or bank'],
        form: 'T2',
      });
    });
  }

  // ── PERSONAL TAX (T1) ──────────────────────────────────────
  if (businessType === 'self-employed' || businessType === 'corporation') {
    const t1Due = adjustForHoliday(new Date(`${year+1}-${businessType==='self-employed'?'06-15':'04-30'}`));
    deadlines.push({
      id: `t1_${year}`, type:'filing', jurisdiction:'CRA', priority:'critical',
      title: `T1 Personal Income Tax Return — ${year}`,
      dueDate: t1Due.toISOString().slice(0,10),
      description: businessType === 'self-employed' ? 'Self-employed individuals: June 15, but balance due April 30.' : 'Personal T1 return due April 30.',
      penaltyNote: '5% of unpaid balance + 1%/month for up to 12 months.',
      actions: ['Gather T4s, T4As, T5s, investment slips','Complete T2125 business income schedule','File electronically'],
      form: 'T1',
    });
  }

  // ── HST/GST REMITTANCE ─────────────────────────────────────
  const hstSchedules = {
    monthly: [
      {q:'Jan',due:`${year}-02-28`},{q:'Feb',due:`${year}-03-31`},{q:'Mar',due:`${year}-04-30`},
      {q:'Apr',due:`${year}-05-31`},{q:'May',due:`${year}-06-30`},{q:'Jun',due:`${year}-07-31`},
      {q:'Jul',due:`${year}-08-31`},{q:'Aug',due:`${year}-09-30`},{q:'Sep',due:`${year}-10-31`},
      {q:'Oct',due:`${year}-11-30`},{q:'Nov',due:`${year}-12-31`},{q:'Dec',due:`${year+1}-01-31`},
    ],
    quarterly: [
      {q:'Q1 (Jan–Mar)',due:`${year}-04-30`},{q:'Q2 (Apr–Jun)',due:`${year}-07-31`},
      {q:'Q3 (Jul–Sep)',due:`${year}-10-31`},{q:'Q4 (Oct–Dec)',due:`${year+1}-01-31`},
    ],
    annual: [{q:'Annual',due:`${year+1}-03-31`}],
  };

  (hstSchedules[hstFrequency] || hstSchedules.quarterly).forEach(({ q, due }) => {
    deadlines.push({
      id: `hst_${year}_${q.replace(/\s/g,'')}`, type:'remittance', jurisdiction:'CRA', priority:'high',
      title: `HST/GST Remittance — ${q} ${year}`,
      dueDate: adjustForHoliday(new Date(due)).toISOString().slice(0,10),
      description: `Net HST collected minus Input Tax Credits (ITCs). ${hstFrequency.charAt(0).toUpperCase()+hstFrequency.slice(1)} filer.`,
      penaltyNote: '6% penalty on first $30,000 not remitted + interest.',
      actions: ['Reconcile HST collected on sales','Calculate ITCs on business expenses','File GST34 return','Pay balance owing'],
      form: 'GST34',
    });
  });

  // ── PAYROLL REMITTANCE ─────────────────────────────────────
  const payDates = [];
  if (payrollFrequency === 'bi-weekly') {
    for (let m = 1; m <= 12; m++) {
      payDates.push({ period: `${year}-${String(m).padStart(2,'0')} mid`, due: `${year}-${String(m).padStart(2,'0')}-15` });
      const lastDay = new Date(year, m, 0).getDate();
      payDates.push({ period: `${year}-${String(m).padStart(2,'0')} end`, due: `${year}-${String(m).padStart(2,'0')}-${lastDay}` });
    }
  } else if (payrollFrequency === 'monthly') {
    for (let m = 1; m <= 12; m++) {
      const lastDay = new Date(year, m, 0).getDate();
      payDates.push({ period: `${year}-${String(m).padStart(2,'0')}`, due: `${year}-${String(m).padStart(2,'0')}-${lastDay}` });
    }
  }

  payDates.slice(0, 24).forEach(({ period, due }) => {
    const remitDate = addBusinessDays(new Date(due), 3); // remit within 3 business days
    deadlines.push({
      id: `payroll_${period.replace(/\s/g,'_')}`, type:'remittance', jurisdiction:'CRA', priority:'high',
      title: `Payroll Remittance — ${period}`,
      dueDate: remitDate.toISOString().slice(0,10),
      description: 'Employer/employee CPP, EI, and income tax deductions. Regular remitter: 3 business days after pay date.',
      penaltyNote: '3% for 1-3 days late; 5% for 4-5 days; 7% for 6-7 days; 10% for 7+ days.',
      actions: ['Verify payroll register','Calculate CPP/EI/IT deductions','Remit via CRA My Business Account'],
      form: 'PD7A',
    });
  });

  // ── T4 / T4A SLIPS ────────────────────────────────────────
  const t4Due = adjustForHoliday(new Date(`${year+1}-02-28`));
  deadlines.push({
    id: `t4_${year}`, type:'filing', jurisdiction:'CRA', priority:'critical',
    title: `T4 Slips & T4 Summary — ${year}`,
    dueDate: t4Due.toISOString().slice(0,10),
    description: 'Issue T4 slips to all employees and file summary with CRA. Last day of February following the calendar year.',
    penaltyNote: '$100/slip or 5% of unpaid amounts — up to $7,500 per failure.',
    actions: ['Run payroll year-end reconciliation','Verify employee SINs and addresses','Issue T4 slips to employees','File T4 Summary with CRA electronically'],
    form: 'T4/T4A',
  });
  deadlines.push({
    id: `t4a_${year}`, type:'filing', jurisdiction:'CRA', priority:'critical',
    title: `T4A Slips — Contractor Payments — ${year}`,
    dueDate: t4Due.toISOString().slice(0,10),
    description: 'Issue T4A slips to contractors and service providers paid $500+ during the year. Same deadline as T4.',
    penaltyNote: '$100/slip or 5% of unpaid amounts.',
    actions: ['Identify all contractor payments ≥$500','Obtain contractor SINs/business numbers','Issue T4A slips','File T4A Summary'],
    form: 'T4A',
  });

  // ── RRSP CONTRIBUTION ─────────────────────────────────────
  const rrspDue = adjustForHoliday(new Date(`${year+1}-03-03`)); // ~60 days after Dec 31
  deadlines.push({
    id: `rrsp_${year}`, type:'planning', jurisdiction:'CRA', priority:'medium',
    title: `RRSP Contribution Deadline — ${year} Tax Year`,
    dueDate: rrspDue.toISOString().slice(0,10),
    description: 'Last day to make RRSP contributions deductible against prior year income. Usually March 1 (or first business day).',
    penaltyNote: '1%/month on contributions exceeding RRSP room.',
    actions: ['Check RRSP room on CRA My Account','Calculate optimal contribution','Make contribution by deadline'],
    form: 'RRSP',
  });

  return deadlines;
}

function generateIRSDeadlines(year, businessType) {
  year = year || new Date().getFullYear();
  businessType = businessType || 'corporation';
  const deadlines = [];

  // ── 1099-NEC ──────────────────────────────────────────────
  deadlines.push({
    id: `1099nec_${year}`, type:'filing', jurisdiction:'IRS', priority:'critical',
    title: `1099-NEC Filing — Contractor Payments ${year}`,
    dueDate: adjustForHoliday(new Date(`${year+1}-01-31`)).toISOString().slice(0,10),
    description: 'File 1099-NEC for each non-employee paid $600+ during the year. Recipient copy AND IRS copy both due January 31.',
    penaltyNote: '$50–$290 per form depending on lateness; up to $3.4M aggregate.',
    actions: ['Collect W-9 from all contractors','Identify payments ≥$600','File via IRS FIRE system or tax software','Distribute copies to contractors'],
    form: '1099-NEC',
  });

  // ── 941 QUARTERLY ─────────────────────────────────────────
  ['04-30','07-31','10-31',`${year+1}-01-31`].forEach((due, i) => {
    deadlines.push({
      id: `941_${year}_q${i+1}`, type:'filing', jurisdiction:'IRS', priority:'high',
      title: `Form 941 — Quarterly Payroll Tax Q${i+1} ${year}`,
      dueDate: adjustForHoliday(new Date(due.includes(String(year+1)) ? due : `${year}-${due}`)).toISOString().slice(0,10),
      description: 'Employer\'s Quarterly Federal Tax Return. Reports federal income tax withheld, Social Security, and Medicare taxes.',
      penaltyNote: '2–15% penalty for failure to deposit payroll taxes on time.',
      actions: ['Reconcile payroll register','Verify federal tax deposits','Complete Form 941','File with IRS'],
      form: '941',
    });
  });

  // ── 940 ANNUAL FUTA ───────────────────────────────────────
  deadlines.push({
    id: `940_${year}`, type:'filing', jurisdiction:'IRS', priority:'high',
    title: `Form 940 — Annual FUTA Return ${year}`,
    dueDate: adjustForHoliday(new Date(`${year+1}-01-31`)).toISOString().slice(0,10),
    description: 'Federal Unemployment Tax Act annual return. FUTA rate: 6.0% on first $7,000 of wages per employee.',
    penaltyNote: '10% of FUTA tax owed for failure to file or pay.',
    actions: ['Calculate FUTA tax per employee','Account for state unemployment credits','File Form 940'],
    form: '940',
  });

  // ── CORPORATE (1120) ──────────────────────────────────────
  if (businessType === 'corporation') {
    deadlines.push({
      id: `1120_${year}`, type:'filing', jurisdiction:'IRS', priority:'critical',
      title: `Form 1120 — Corporate Tax Return ${year}`,
      dueDate: adjustForHoliday(new Date(`${year+1}-04-15`)).toISOString().slice(0,10),
      description: 'U.S. Corporation Income Tax Return. April 15 for calendar year corps. Extension available (Form 7004) — extends to October 15.',
      penaltyNote: '5%/month on unpaid tax, up to 25%.',
      actions: ['Prepare financial statements','Complete depreciation schedules','Calculate estimated payments','File or extend'],
      form: '1120',
    });
    // Estimated tax payments
    ['04-15','06-17','09-16',`${year+1}-01-15`].forEach((due, i) => {
      deadlines.push({
        id: `1120_est_${year}_q${i+1}`, type:'payment', jurisdiction:'IRS', priority:'high',
        title: `Corporate Estimated Tax Q${i+1} — ${year}`,
        dueDate: adjustForHoliday(new Date(due.includes(String(year+1)) ? due : `${year}-${due}`)).toISOString().slice(0,10),
        description: 'Quarterly estimated corporate income tax. Required if tax liability ≥$500.',
        penaltyNote: 'Underpayment penalty at IRS short-term rate + 3%.',
        actions: ['Estimate current year income','Calculate installment (100% prior year OR 100% current year)','Pay via EFTPS'],
        form: '1120-W',
      });
    });
  }

  // ── W-2 ───────────────────────────────────────────────────
  deadlines.push({
    id: `w2_${year}`, type:'filing', jurisdiction:'IRS', priority:'critical',
    title: `W-2 Filing — Employee Wages ${year}`,
    dueDate: adjustForHoliday(new Date(`${year+1}-01-31`)).toISOString().slice(0,10),
    description: 'File W-2 forms with SSA (copies A) and provide W-2 to employees. January 31 for all filers.',
    penaltyNote: '$50–$580 per form depending on timing.',
    actions: ['Reconcile payroll to W-3','Prepare W-2 for each employee','File with SSA via Business Services Online','Distribute to employees'],
    form: 'W-2/W-3',
  });

  return deadlines;
}

// ── MERGE + SORT ALL DEADLINES ────────────────────────────────
function getAllDeadlines(year, options) {
  options = options || {};
  const { businessType, hstFrequency, payrollFrequency, jurisdiction } = options;

  let deadlines = [];

  if (!jurisdiction || jurisdiction === 'CRA' || jurisdiction === 'both') {
    deadlines = deadlines.concat(generateCRADeadlines(year, businessType, hstFrequency, payrollFrequency));
  }
  if (!jurisdiction || jurisdiction === 'IRS' || jurisdiction === 'both') {
    deadlines = deadlines.concat(generateIRSDeadlines(year, businessType));
  }

  // Enrich with urgency data
  deadlines.forEach(d => {
    const days = daysUntil(d.dueDate);
    d.daysUntil   = days;
    d.isOverdue   = days < 0;
    d.isUrgent    = days >= 0 && days <= 7;
    d.isSoon      = days >= 0 && days <= 30;
    d.urgencyLevel= d.isOverdue ? 'overdue' : d.isUrgent ? 'urgent' : d.isSoon ? 'soon' : 'upcoming';
    d.displayDate = formatDate(d.dueDate);
  });

  return deadlines.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
}

// ── TRANSACTION-AWARE DEADLINE ENRICHMENT ──────────────────────
// Reads actual transaction data to surface specific, data-driven warnings
function enrichFromTransactions(deadlines, transactions) {
  if (!transactions || !transactions.length) return deadlines;

  const contractors = {};
  let payrollTotal = 0;
  let hstCollected = 0;
  let t4aFlag = false;

  transactions.forEach(t => {
    const amt = parseFloat(t.amount || 0);
    if (t.category === 'Contractor / Professional Services' && amt > 0) {
      const name = (t.description || '').replace(/INV.*$/i,'').trim();
      contractors[name] = (contractors[name] || 0) + amt;
      if (contractors[name] >= 500) t4aFlag = true;
    }
    if (t.category === 'Payroll') payrollTotal += amt;
    if (t.category === 'Income') hstCollected += Math.abs(amt) * 0.13; // est 13% HST
  });

  return deadlines.map(d => {
    let dataNote = '';
    if (d.form === 'T4A' && t4aFlag) {
      const t4aContractors = Object.entries(contractors).filter(([,v]) => v >= 500);
      dataNote = `⚡ ${t4aContractors.length} contractor(s) in your data require T4A slips (total: $${Object.values(contractors).filter(v=>v>=500).reduce((s,v)=>s+v,0).toLocaleString()})`;
    }
    if ((d.form === 'T2' || d.form === '1120') && payrollTotal > 0) {
      dataNote = `Based on loaded data: Payroll total $${payrollTotal.toLocaleString()} — verify CPP/EI allocations`;
    }
    if (d.form === 'GST34' && hstCollected > 0) {
      dataNote = `Est. HST collected from revenue: $${hstCollected.toFixed(0)}`;
    }
    return dataNote ? { ...d, dataNote } : d;
  });
}

// ── ICAL EXPORT ────────────────────────────────────────────────
function exportToICal(deadlines) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LedgerAI//Compliance Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LedgerAI Compliance Deadlines',
    'X-WR-TIMEZONE:America/Toronto',
  ];

  deadlines.forEach(d => {
    const dateStr = d.dueDate.replace(/-/g, '');
    const uid     = `ledgerai-${d.id}@ledgerai.app`;
    const desc    = (d.description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,');
    const alert   = d.daysUntil !== undefined && d.daysUntil > 0 ? -Math.min(d.daysUntil, 30) : -14;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${dateStr}`,
      `SUMMARY:${d.title}`,
      `DESCRIPTION:${desc}`,
      `CATEGORIES:${d.jurisdiction},TAX`,
      `PRIORITY:${d.priority === 'critical' ? 1 : d.priority === 'high' ? 3 : 5}`,
      `STATUS:CONFIRMED`,
      'BEGIN:VALARM',
      'TRIGGER:-P14D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${d.title} due in 14 days`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:URGENT: ${d.title} due in 7 days`,
      'END:VALARM',
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  const ical = lines.join('\r\n');
  const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'ledgerai-compliance-calendar.ics';
  a.click(); URL.revokeObjectURL(url);
}

// ── RENDER: COMPLIANCE CALENDAR ────────────────────────────────
function renderComplianceCalendar(containerId, transactions, options) {
  const container = document.getElementById(containerId);
  if (!container) return;

  options = options || {};
  const year = options.year || new Date().getFullYear();
  let deadlines = getAllDeadlines(year, options);
  deadlines = enrichFromTransactions(deadlines, transactions || []);

  const overdue  = deadlines.filter(d => d.isOverdue);
  const urgent   = deadlines.filter(d => d.isUrgent);
  const soon     = deadlines.filter(d => d.isSoon && !d.isUrgent);
  const upcoming = deadlines.filter(d => !d.isOverdue && !d.isSoon && !d.isUrgent);

  const sym = typeof currencySymbol !== 'undefined' ? currencySymbol() : '$';

  function renderDeadlineCard(d) {
    const urgencyColor = d.isOverdue ? 'var(--accent)' : d.isUrgent ? '#d97706' : d.isSoon ? 'var(--blue)' : 'var(--muted)';
    const urgencyBg    = d.isOverdue ? 'var(--accent-l)' : d.isUrgent ? 'var(--gold-l)' : d.isSoon ? 'var(--blue-l)' : 'var(--paper)';
    const daysLabel    = d.isOverdue ? `${Math.abs(d.daysUntil)}d overdue` : d.daysUntil === 0 ? 'Due TODAY' : `${d.daysUntil}d`;

    return `<div class="deadline-card" style="border-left:3px solid ${urgencyColor}">
      <div class="dc-header">
        <div>
          <div class="dc-title">${d.title}</div>
          <div class="dc-meta">
            <span>${d.displayDate}</span>
            <span>·</span>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;padding:2px 6px;border-radius:3px;background:${urgencyBg};color:${urgencyColor};font-weight:700">${daysLabel}</span>
            <span>·</span>
            <span>${d.jurisdiction}</span>
            <span>·</span>
            <span>${d.form}</span>
          </div>
        </div>
        <span class="dc-type-badge dc-${d.type}">${d.type}</span>
      </div>
      <div class="dc-desc">${d.description}</div>
      ${d.dataNote ? `<div class="dc-data-note">⚡ ${d.dataNote}</div>` : ''}
      ${d.penaltyNote ? `<div class="dc-penalty">⚠ ${d.penaltyNote}</div>` : ''}
      <div class="dc-actions-list">
        ${d.actions.map((a,i) => `<span class="dc-action-item"><span class="dc-action-num">${i+1}</span>${a}</span>`).join('')}
      </div>
    </div>`;
  }

  function renderGroup(title, items, color) {
    if (!items.length) return '';
    return `<div class="deadline-group">
      <div class="dg-header" style="color:${color}">
        <span class="dg-indicator" style="background:${color}"></span>
        ${title} <span class="dg-count">${items.length}</span>
      </div>
      ${items.map(renderDeadlineCard).join('')}
    </div>`;
  }

  container.innerHTML = `
    <style>
      .cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px}
      .cal-summary-band{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
      .cal-summary-card{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center}
      .cal-summary-val{font-size:24px;font-weight:700;letter-spacing:-.5px}
      .cal-summary-lbl{font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-top:4px}
      .deadline-group{margin-bottom:20px}
      .dg-header{font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:700;display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)}
      .dg-indicator{width:10px;height:10px;border-radius:50%;flex-shrink:0}
      .dg-count{margin-left:auto;background:var(--paper);border:1px solid var(--border);border-radius:10px;padding:2px 8px;font-size:9px}
      .deadline-card{background:white;border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
      .dc-header{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;flex-wrap:wrap}
      .dc-title{font-weight:700;font-size:13.5px;color:var(--ink);margin-bottom:5px}
      .dc-meta{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);flex-wrap:wrap}
      .dc-type-badge{font-family:'IBM Plex Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.08em;padding:3px 8px;border-radius:3px;flex-shrink:0}
      .dc-filing{background:var(--blue-l);color:var(--blue)}
      .dc-remittance{background:var(--accent-l);color:var(--accent)}
      .dc-payment{background:var(--gold-l);color:var(--gold)}
      .dc-planning{background:var(--green-l);color:var(--green)}
      .dc-desc{font-size:12.5px;color:var(--muted);line-height:1.7;margin-bottom:8px}
      .dc-data-note{background:var(--blue-l);border-left:2px solid var(--blue);padding:6px 10px;font-size:11.5px;color:var(--blue);margin-bottom:8px;border-radius:0 4px 4px 0}
      .dc-penalty{background:var(--gold-l);border-left:2px solid var(--gold);padding:6px 10px;font-size:11px;color:var(--gold);margin-bottom:8px;border-radius:0 4px 4px 0}
      .dc-actions-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .dc-action-item{font-size:11px;display:flex;align-items:center;gap:5px;background:var(--paper);border:1px solid var(--border);padding:3px 8px;border-radius:3px}
      .dc-action-num{font-family:'IBM Plex Mono',monospace;font-size:9px;background:var(--ink);color:white;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    </style>

    <div class="cal-header">
      <div>
        <h2 style="font-size:20px;font-weight:700;letter-spacing:-.3px">Compliance Calendar — ${year}</h2>
        <p style="font-size:12px;color:var(--muted);font-family:'IBM Plex Mono',monospace;margin-top:3px">CRA + IRS deadlines · Holiday-adjusted · ${deadlines.length} total obligations</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <select class="btn" style="padding:7px 10px" onchange="
          const yr=parseInt(this.value);
          if(typeof LedgerCompliance!=='undefined')
            LedgerCompliance.renderComplianceCalendar('${containerId}',window.activeTransactions||[],{year:yr})
        ">
          ${[year-1,year,year+1].map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('')}
        </select>
        <button class="btn" onclick="if(typeof LedgerCompliance!=='undefined')LedgerCompliance.exportToICal(LedgerCompliance.getAllDeadlines(${year}))">📅 Export iCal</button>
        <button class="btn btn-solid" onclick="window.print()">⬇ Print</button>
      </div>
    </div>

    <div class="cal-summary-band">
      <div class="cal-summary-card"><div class="cal-summary-val" style="color:var(--accent)">${overdue.length}</div><div class="cal-summary-lbl">Overdue</div></div>
      <div class="cal-summary-card"><div class="cal-summary-val" style="color:var(--gold)">${urgent.length}</div><div class="cal-summary-lbl">Due within 7 days</div></div>
      <div class="cal-summary-card"><div class="cal-summary-val" style="color:var(--blue)">${soon.length}</div><div class="cal-summary-lbl">Due within 30 days</div></div>
      <div class="cal-summary-card"><div class="cal-summary-val">${upcoming.length}</div><div class="cal-summary-lbl">Upcoming</div></div>
    </div>

    ${renderGroup('⚠ Overdue', overdue, 'var(--accent)')}
    ${renderGroup('🔴 Urgent — Due Within 7 Days', urgent, '#d97706')}
    ${renderGroup('🟡 Due Within 30 Days', soon, 'var(--blue)')}
    ${renderGroup('📅 Upcoming', upcoming.slice(0, 20), 'var(--muted)')}
    ${upcoming.length > 20 ? `<div style="text-align:center;color:var(--muted);font-family:'IBM Plex Mono',monospace;font-size:10px;padding:12px">… and ${upcoming.length-20} more upcoming deadlines</div>` : ''}`;
}

// ── PUBLIC API ─────────────────────────────────────────────────
window.LedgerCompliance = {
  generateCRADeadlines,
  generateIRSDeadlines,
  getAllDeadlines,
  enrichFromTransactions,
  renderComplianceCalendar,
  exportToICal,
  daysUntil,
  formatDate,
  isBusinessDay,
  addBusinessDays,
  nextBusinessDay,
  adjustForHoliday,
};

console.log('[LedgerAI] Compliance Calendar loaded — CRA + IRS deadlines · iCal export');

})();
