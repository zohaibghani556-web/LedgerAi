// ============================================================
// LEDGER AI — app.js  v6.0
// All 28 sections — complete rewrite per spec
// ============================================================

// ============================================================
// SECTION 1: SETTINGS + CONSTANTS
// ============================================================
let settings = {
  company:        'Your Company',
  industry:       'Marketing / Creative Agency',
  fiscalYear:     '01',
  currency:       'USD',
  aiMode:         'auto',
  plaidLinkToken: ''
};

let currentProfile   = 'business'; // student | freelancer | business | professional
let periods          = {};
let activePeriod     = null;
let activeTransactions = [];
let originalSnapshot   = [];
let sortKey          = 'date';
let sortDir          = 1;
let auditLog         = [];
let plaidHandler     = null;
let sbClient         = null;   // NOTE: NOT 'supabase' — avoids window.supabase name collision
let currentUser      = null;
let sessionToken     = null;
let editCount        = 0;
let sortCol          = 'date';
let filteredIndices  = [];
let bankStatementRows = [];
let budgets          = {};
let chartInstance    = null;
let spendChartInstance = null;

// ============================================================
// SECTION 2: GAAP CHART OF ACCOUNTS
// ============================================================
const COA = {
  '1000': { name: 'Cash / Checking Account',         type: 'Asset',     normalBal: 'Debit',  group: 'Current Assets' },
  '1010': { name: 'Savings Account',                 type: 'Asset',     normalBal: 'Debit',  group: 'Current Assets' },
  '1200': { name: 'Accounts Receivable',             type: 'Asset',     normalBal: 'Debit',  group: 'Current Assets' },
  '1400': { name: 'Prepaid Expenses',                type: 'Asset',     normalBal: 'Debit',  group: 'Current Assets' },
  '2000': { name: 'Accounts Payable',                type: 'Liability', normalBal: 'Credit', group: 'Current Liabilities' },
  '2100': { name: 'Accrued Payroll',                 type: 'Liability', normalBal: 'Credit', group: 'Current Liabilities' },
  '2200': { name: 'Payroll Tax Payable',             type: 'Liability', normalBal: 'Credit', group: 'Current Liabilities' },
  '2300': { name: 'Sales Tax Payable',               type: 'Liability', normalBal: 'Credit', group: 'Current Liabilities' },
  '3000': { name: "Owner's Equity",                  type: 'Equity',    normalBal: 'Credit', group: 'Equity' },
  '3100': { name: 'Retained Earnings',               type: 'Equity',    normalBal: 'Credit', group: 'Equity' },
  '4000': { name: 'Service Revenue',                 type: 'Revenue',   normalBal: 'Credit', group: 'Revenue' },
  '4100': { name: 'Product Revenue',                 type: 'Revenue',   normalBal: 'Credit', group: 'Revenue' },
  '6000': { name: 'Salaries & Wages',                type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6010': { name: 'Payroll Tax Expense',             type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6100': { name: 'Rent & Facilities',               type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6200': { name: 'Advertising & Marketing',         type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6210': { name: 'Contractor / Prof. Services',     type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6300': { name: 'Software & Subscriptions',        type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6400': { name: 'Office Supplies',                 type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6500': { name: 'Meals & Entertainment',           type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6600': { name: 'Travel',                          type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6700': { name: 'Utilities & Hosting',             type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6800': { name: 'Bank & Finance Charges',          type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6850': { name: 'Insurance',                       type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6900': { name: 'Miscellaneous Expense',           type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
};

const JOURNAL_RULES = {
  'Payroll':                            { dr: '6000', cr: '1000', note: 'Also debit 6010 / credit 2200 for payroll taxes' },
  'Payroll Tax':                        { dr: '6010', cr: '2200', note: 'Employer payroll tax remittance' },
  'Rent & Facilities':                  { dr: '6100', cr: '1000', note: '' },
  'Advertising & Marketing':            { dr: '6200', cr: '2000', note: '' },
  'Contractor / Professional Services': { dr: '6210', cr: '2000', note: 'Issue 1099/T4A if annual total exceeds $600' },
  'Software & Subscriptions':           { dr: '6300', cr: '1000', note: '' },
  'Office Supplies':                    { dr: '6400', cr: '1000', note: '' },
  'Meals & Entertainment':              { dr: '6500', cr: '1000', note: 'Only 50% tax deductible' },
  'Travel':                             { dr: '6600', cr: '1000', note: '' },
  'Utilities & Hosting':                { dr: '6700', cr: '1000', note: '' },
  'Bank & Finance Charges':             { dr: '6800', cr: '1000', note: '' },
  'Insurance':                          { dr: '6850', cr: '1400', note: 'Debit prepaid if multi-period' },
  'Miscellaneous':                      { dr: '6900', cr: '1000', note: 'Review — reclassify if possible' },
  'Income':                             { dr: '1000', cr: '4000', note: 'Revenue recognition' },
};

const CATEGORIES = [
  'Payroll', 'Payroll Tax', 'Rent & Facilities', 'Advertising & Marketing',
  'Contractor / Professional Services', 'Software & Subscriptions', 'Office Supplies',
  'Meals & Entertainment', 'Travel', 'Utilities & Hosting', 'Bank & Finance Charges',
  'Insurance', 'Miscellaneous', 'Income'
];

const CF_CLASSIFICATION = {
  'Payroll':                            'operating',
  'Payroll Tax':                        'operating',
  'Rent & Facilities':                  'operating',
  'Advertising & Marketing':            'operating',
  'Contractor / Professional Services': 'operating',
  'Software & Subscriptions':           'operating',
  'Office Supplies':                    'operating',
  'Meals & Entertainment':              'operating',
  'Travel':                             'operating',
  'Utilities & Hosting':                'operating',
  'Bank & Finance Charges':             'financing',
  'Insurance':                          'operating',
  'Miscellaneous':                      'operating',
  'Income':                             'operating',
};

// ============================================================
// SECTION 3: PROFILE SYSTEM
// ============================================================
function selectProfile(profileId) {
  if (profileId) {
    currentProfile = profileId;
    localStorage.setItem('ledgerai_profile', profileId);
  }
  document.body.setAttribute('data-profile', currentProfile);
  const overlay = document.getElementById('profileSelectOverlay');
  if (overlay) overlay.classList.add('hidden');
  showProfileNav();
  // Update settings label
  const lbl = document.getElementById('currentProfileLabel');
  if (lbl) {
    const names = { student: 'Student', freelancer: 'Freelancer', business: 'Small Business', professional: 'Accounting Professional' };
    lbl.textContent = names[currentProfile] || currentProfile;
  }
  // Update topbar
  const co = document.getElementById('topbarCompany');
  if (co && settings.company !== 'Your Company') co.textContent = settings.company;
  auditEntry('system', 'Profile selected', currentProfile);
  if (!activeTransactions.length) {
    showView('onboard');
  } else {
    showView(getProfileDashboard());
  }
}

function showProfileNav() {
  // Hide all profile sections
  document.querySelectorAll('[data-profile-show]').forEach(el => {
    el.style.display = 'none';
  });
  // Show the matching one
  const section = document.querySelector(`[data-profile-show="${currentProfile}"]`);
  if (section) section.style.display = 'block';
}

function switchProfile() {
  const overlay = document.getElementById('profileSelectOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

function getProfileDashboard() {
  const map = {
    student:      'student-dashboard',
    freelancer:   'fl-dashboard',
    business:     'dashboard',
    professional: 'dashboard',
  };
  return map[currentProfile] || 'dashboard';
}

// ============================================================
// SECTION 4: VIEW ROUTING
// ============================================================
const VIEWS = [
  'onboard','dashboard','transactions','trialbalance','coa','flags','settings',
  'pl','cashflow','budget','reconcile','duplicates','audit','workingpapers','memo',
  'student-dashboard','spending','subscriptions','goals',
  'fl-dashboard','income','clients','taxes'
];

function showView(name) {
  VIEWS.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById('nav-' + name);
  if (navBtn) navBtn.classList.add('active');
  const view = document.getElementById('view-' + name);
  if (view) {
    view.style.display = 'block';
    view.classList.remove('view-enter');
    void view.offsetWidth;
    view.classList.add('view-enter');
  }
  renderView(name);
}

function renderView(name) {
  const noDataViews = ['settings','coa','onboard','student-dashboard','fl-dashboard','goals','subscriptions'];
  if (!activeTransactions.length && !noDataViews.includes(name)) return;
  if (name === 'dashboard')       renderDashboard();
  if (name === 'transactions')    renderTransactions();
  if (name === 'trialbalance')    renderTrialBalance();
  if (name === 'coa')             renderCOA();
  if (name === 'flags')           renderFlags();
  if (name === 'settings')        loadSettingsForm();
  if (name === 'pl')              renderPL();
  if (name === 'cashflow')        renderCashFlow();
  if (name === 'budget')          renderBudgetVsActual();
  if (name === 'reconcile')       renderReconcileSetup();
  if (name === 'duplicates')      runDuplicateDetection();
  if (name === 'audit')           renderAuditTrail();
  if (name === 'workingpapers')   renderWorkingPapers();
  if (name === 'memo')            { /* rendered on button click */ }
  if (name === 'student-dashboard') renderStudentDashboard();
  if (name === 'spending')        renderSpending();
  if (name === 'subscriptions')   renderSubscriptions();
  if (name === 'goals')           renderGoals();
  if (name === 'fl-dashboard')    renderFreelancerDashboard();
  if (name === 'income')          renderIncome();
  if (name === 'clients')         renderClients();
  if (name === 'taxes')           renderTaxes();
}

// ============================================================
// SECTION 5: FILE HANDLING + PARSING
// ============================================================
function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  showToast('Reading ' + file.name + '…');
  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = e => {
      const text    = e.target.result;
      const cleaned = stripJunkHeaders(text);
      Papa.parse(cleaned, {
        header: true, skipEmptyLines: true, dynamicTyping: false,
        complete: r => {
          const rows = normalizeColumns(r.data);
          if (!rows.length) { showToast('⚠ No valid rows found. Check column headers.'); return; }
          processData(rows, file.name);
        }
      });
    };
    reader.readAsText(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
        let bestRows = [];
        wb.SheetNames.forEach(sheetName => {
          const ws   = wb.Sheets[sheetName];
          const raw  = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
          const rows = normalizeColumns(raw);
          if (rows.length > bestRows.length) bestRows = rows;
        });
        if (!bestRows.length) { showToast('⚠ No valid rows found. Check your Excel file.'); return; }
        processData(bestRows, file.name);
      } catch (err) {
        showToast('⚠ Error reading Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    showToast('Unsupported file type. Use CSV, XLSX, or XLS.');
  }
}

function stripJunkHeaders(text) {
  // Find the first line that looks like a header row (contains common column keywords)
  const lines = text.split('\n');
  const headerKeywords = /date|description|amount|debit|credit|category|memo|payee|transaction|balance/i;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (headerKeywords.test(lines[i])) {
      return lines.slice(i).join('\n');
    }
  }
  return text;
}

function parseDate(s) {
  if (!s) return '';
  s = String(s).trim();
  if (!s) return '';
  // Handle Excel serial numbers
  if (/^\d{5}$/.test(s)) {
    const d = new Date((parseInt(s) - 25569) * 86400 * 1000);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  // ISO: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Compact: 20240115
  if (/^\d{8}$/.test(s)) return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);
  // MM/DD/YYYY, DD/MM/YYYY, MM/DD/YY
  const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slash) {
    let [, a, b, y] = slash;
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    const d = new Date(`${y}-${a.padStart(2,'0')}-${b.padStart(2,'0')}`);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  // Month-name formats
  const MONTHS = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  const m1 = s.match(/^([A-Za-z]{3})\W+(\d{1,2})\W+(\d{2,4})$/);
  if (m1 && MONTHS[m1[1].toLowerCase()]) {
    const mon = MONTHS[m1[1].toLowerCase()];
    let day = m1[2], yr = m1[3];
    if (yr.length === 2 && parseInt(yr) < parseInt(day)) { [yr, day] = [day, yr]; }
    if (yr.length === 2) yr = (parseInt(yr) > 50 ? '19' : '20') + yr;
    return `${yr}-${mon}-${day.padStart(2,'0')}`;
  }
  const m2 = s.match(/^(\d{1,2})\W+([A-Za-z]{3})\W+(\d{2,4})$/);
  if (m2 && MONTHS[m2[2].toLowerCase()]) {
    const mon = MONTHS[m2[2].toLowerCase()];
    let day = m2[1], yr = m2[3];
    if (yr.length === 2) yr = (parseInt(yr) > 50 ? '19' : '20') + yr;
    return `${yr}-${mon}-${day.padStart(2,'0')}`;
  }
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return s;
}

function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  let s = String(raw).trim();
  if (!s) return null;
  const negative = s.startsWith('(') && s.endsWith(')');
  s = s.replace(/[\$£€¥₹CA]/g, '').replace(/[()\s]/g, '').replace(/,/g, '').trim();
  if (!s) return null;
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -Math.abs(n) : n;
}

function normalizeColumns(rows) {
  if (!rows.length) return [];
  const sample = rows[0];
  const keyMap = {};
  Object.keys(sample).forEach(k => {
    const c = k.toLowerCase().trim().replace(/[\s\-\/\(\)#]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
    keyMap[c] = k;
  });
  const has = (...keys) => keys.find(k => keyMap[k] !== undefined);
  const dateKey   = has('date','transaction_date','trans_date','posting_date','value_date','entry_date','tran_date','txn_date','effective_date');
  const nameKey   = has('name','payee','vendor','supplier','merchant');
  const memoKey   = has('memo','description','desc','details','transaction','narration','particulars','transaction_description','trans_desc','reference','remarks','detail');
  const debitKey  = has('debit','dr','withdrawals','withdrawal','charges','payments','payment','debit_amount');
  const creditKey = has('credit','cr','deposits','deposit','receipts','receipt','credit_amount');
  const amtKey    = has('amount','amt','value','sum','net_amount','transaction_amount');
  const catKey    = has('category','cat','type','expense_type','account','account_name','gl_account','account_code');
  const flagKey   = has('flag','note','notes','review','comment','status');
  const onlyCreditCol = !amtKey && !debitKey && creditKey;
  const result = [];
  rows.forEach(row => {
    const get = key => key ? String(row[keyMap[key]] !== undefined ? row[keyMap[key]] : '').trim() : '';
    const rawDate = get(dateKey);
    const date    = parseDate(rawDate);
    const nameVal = get(nameKey);
    const memoVal = get(memoKey);
    let desc = '';
    if (nameVal && memoVal && nameVal !== memoVal) desc = nameVal + ' — ' + memoVal;
    else desc = nameVal || memoVal || 'Unknown Transaction';
    let amount = null;
    if (amtKey) {
      amount = parseAmount(get(amtKey));
    } else if (debitKey || creditKey) {
      const deb = parseAmount(get(debitKey));
      const cre = parseAmount(get(creditKey));
      if (deb && Math.abs(deb) > 0) {
        amount = Math.abs(deb);
      } else if (cre && Math.abs(cre) > 0) {
        if (onlyCreditCol) amount = Math.abs(cre);
        else return;
      }
    }
    if (amount === null || isNaN(amount) || amount === 0) return;
    const category = get(catKey) || '';
    const flag     = get(flagKey) || 'none';
    result.push({ date, description: desc, amount: String(amount), category, flag });
  });
  return result;
}

function processData(rawData, filename) {
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthCounts = {};
  rawData.forEach(r => {
    if (!r.date) return;
    const d = new Date(r.date);
    if (isNaN(d)) return;
    const key = MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear();
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });
  let periodKey = (filename || '').replace(/\.[^.]+$/, '') || 'Imported';
  if (Object.keys(monthCounts).length > 0) {
    periodKey = Object.entries(monthCounts).sort((a,b)=>b[1]-a[1])[0][0];
  }
  if (periods[periodKey]) {
    const existingSet = new Set(periods[periodKey].map(r => r.date+'|'+r.description+'|'+r.amount));
    const newRows = rawData.filter(r => !existingSet.has(r.date+'|'+r.description+'|'+r.amount));
    if (!newRows.length) {
      showToast(periodKey + ' already loaded — no new rows found.');
      activatePeriod(periodKey);
      return;
    }
    periods[periodKey] = [...periods[periodKey], ...newRows];
    showToast(periodKey + ' updated — ' + newRows.length + ' new rows added');
    auditEntry('load', 'File merged', periodKey + ' +' + newRows.length + ' rows');
  } else {
    periods[periodKey] = rawData;
    showToast('✓ ' + periodKey + ' loaded — ' + rawData.length + ' transactions');
    auditEntry('load', 'File loaded', filename + ' — ' + rawData.length + ' rows → ' + periodKey);
  }
  document.getElementById('periodSection').style.display = 'block';
  document.getElementById('view-onboard').style.display = 'none';
  if (settings.company !== 'Your Company') {
    document.getElementById('topbarCompany').textContent = settings.company;
  } else {
    document.getElementById('topbarCompany').textContent = periodKey;
  }
  updateSidebar();
  activatePeriod(periodKey);
  setTimeout(() => saveTransactionsToCloud(periodKey, periods[periodKey]), 1500);
}

function activatePeriod(key) {
  activePeriod = key;
  let data;
  if (key === '__ytd__') {
    data = Object.values(periods).flat();
  } else {
    data = periods[key] || [];
  }
  activeTransactions = data.map(r => ({...r}));
  originalSnapshot   = data.map(r => ({...r}));
  editCount = 0;
  populateCategoryFilter();
  populateAddFormCategories();
  document.querySelectorAll('.period-item').forEach(el => {
    el.classList.toggle('active', el.dataset.key === key);
  });
  const ytdBtn = document.getElementById('ytdBtn');
  if (ytdBtn) ytdBtn.classList.toggle('active', key === '__ytd__');
  const activeNav = document.querySelector('.nav-item.active');
  const viewId = activeNav?.id?.replace('nav-','') || getProfileDashboard();
  renderView(viewId);
  // AI categorize uncategorized
  if (settings.aiMode !== 'off') {
    activeTransactions.forEach((row, i) => {
      if (!row.category || row.category === '' || row.category === 'Uncategorized') {
        setTimeout(() => aiCategorize(row, i), i * 1200);
      }
    });
  }
}

function addPeriodToSidebar(period, count) {
  const list    = document.getElementById('periodList');
  const section = document.getElementById('periodSection');
  if (!list) return;
  const div = document.createElement('div');
  div.className = 'period-item' + (period === activePeriod ? ' active' : '');
  div.dataset.key = period;
  div.innerHTML = '<span>' + period + '</span><span class="period-item-count">' + count + ' txn</span>';
  div.onclick = () => activatePeriod(period);
  list.appendChild(div);
  if (section) section.style.display = 'block';
}

function updateSidebar() {
  const list = document.getElementById('periodList');
  if (!list) return;
  list.innerHTML = '';
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const sortedEntries = Object.entries(periods).sort((a,b) => {
    const parse = k => { const p = k.split(' '); const m = MONTH_NAMES.indexOf(p[0]); const y = parseInt(p[1])||0; return y*12+m; };
    return parse(a[0]) - parse(b[0]);
  });
  sortedEntries.forEach(([key, txns]) => {
    const div = document.createElement('div');
    div.className = 'period-item' + (key === activePeriod ? ' active' : '');
    div.dataset.key = key;
    div.innerHTML = '<span>' + key + '</span><span class="period-item-count">' + txns.length + ' txn</span>';
    div.onclick = () => activatePeriod(key);
    list.appendChild(div);
  });
  const ytdBtn = document.getElementById('ytdBtn');
  if (ytdBtn) ytdBtn.style.display = Object.keys(periods).length > 1 ? 'block' : 'none';
}

// ============================================================
// SECTION 6: AUDIT TRAIL
// ============================================================
function auditEntry(type, action, detail, before, after) {
  detail = detail || ''; before = before || ''; after = after || '';
  const now = new Date();
  const ts  = now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0') + ' ' +
    String(now.getHours()).padStart(2,'0') + ':' +
    String(now.getMinutes()).padStart(2,'0') + ':' +
    String(now.getSeconds()).padStart(2,'0');
  auditLog.unshift({ timestamp: ts, type, action, detail, before, after });
  if (auditLog.length > 500) auditLog = auditLog.slice(0, 500);
  const badge = document.getElementById('auditBadge');
  if (badge) badge.textContent = auditLog.length;
}

function renderAuditTrail() {
  const body  = document.getElementById('auditLogBody');
  const count = document.getElementById('auditEntryCount');
  if (!body) return;
  if (count) count.textContent = auditLog.length + ' entries';
  if (!auditLog.length) {
    body.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><p>No activity yet — load a file to begin</p></div>';
    return;
  }
  const META = {
    load:   { tag: 'at-load',   dot: '#2a4a9a' },
    edit:   { tag: 'at-edit',   dot: '#3a6adf' },
    ai:     { tag: 'at-ai',     dot: '#a87c1a' },
    delete: { tag: 'at-delete', dot: '#b83a20' },
    export: { tag: 'at-export', dot: '#1e6640' },
    revert: { tag: 'at-revert', dot: '#8c8478' },
    system: { tag: 'at-system', dot: '#444' },
    flag:   { tag: 'at-flag',   dot: '#c0321a' },
  };
  body.innerHTML = auditLog.map(e => {
    const m = META[e.type] || META.system;
    const label = e.type.charAt(0).toUpperCase() + e.type.slice(1);
    return '<div class="audit-log-entry">' +
      '<div class="audit-log-dot" style="background:' + m.dot + '"></div>' +
      '<div class="audit-log-time">' + e.timestamp + '</div>' +
      '<div style="flex:1;">' +
        '<div class="audit-log-msg">' + e.action + (e.detail ? ' — <strong>' + e.detail + '</strong>' : '') + '</div>' +
        (e.before ? '<span class="audit-log-before">Before: ' + e.before + (e.after ? '  →  After: ' + e.after : '') + '</span>' : '') +
      '</div>' +
      '<span class="audit-log-tag ' + m.tag + '">' + label + '</span>' +
    '</div>';
  }).join('');
}

function exportAuditPDF() {
  if (!auditLog.length) { showToast('Nothing to export.'); return; }
  const rows = auditLog.map(e =>
    '<tr style="border-bottom:1px solid #eee">' +
    '<td style="padding:7px 10px;font-family:monospace;font-size:10px;color:#888;white-space:nowrap">' + e.timestamp + '</td>' +
    '<td style="padding:7px 10px;font-family:monospace;font-size:10px;text-transform:uppercase">' + e.type + '</td>' +
    '<td style="padding:7px 10px;font-size:12px">' + e.action + (e.detail ? ' — ' + e.detail : '') + '</td>' +
    '<td style="padding:7px 10px;font-size:11px;color:#888">' + (e.before ? e.before + (e.after ? ' → ' + e.after : '') : '') + '</td>' +
    '</tr>').join('');
  const html = '<!DOCTYPE html><html><head><title>Audit Trail — ' + settings.company + '</title>' +
    '<style>body{font-family:Georgia,serif;color:#111;padding:44px}h1{font-size:22px;margin-bottom:4px}p{color:#666;font-size:13px;margin-bottom:28px}' +
    'table{width:100%;border-collapse:collapse}' +
    'thead th{font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#888;padding:9px 10px;text-align:left;background:#f5f2ec;border-bottom:2px solid #111}' +
    '@media print{body{padding:20px}}</style></head><body>' +
    '<h1>' + settings.company + ' — Audit Trail</h1>' +
    '<p>Generated ' + new Date().toLocaleString() + ' · ' + auditLog.length + ' entries</p>' +
    '<table><thead><tr><th>Timestamp</th><th>Type</th><th>Action</th><th>Before / After</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></body></html>';
  const w = window.open('', '_blank'); w.document.write(html); w.document.close();
  setTimeout(() => w.print(), 500);
  auditEntry('export', 'Audit Trail PDF exported', auditLog.length + ' entries');
}

function clearAuditLog() {
  if (!confirm('Clear the audit trail? This is permanent.')) return;
  auditLog = [];
  renderAuditTrail();
  showToast('Audit trail cleared.');
}

// ============================================================
// SECTION 7: DASHBOARD RENDERS
// ============================================================
function renderDashboard() {
  const txns    = activeTransactions;
  const total   = txns.reduce((s,r) => s + parseFloat(r.amount||0), 0);
  const flagged = txns.filter(r => r.flag && r.flag.toLowerCase() !== 'none').length;
  const sym     = currencySymbol();
  const label   = activePeriod === '__ytd__' ? 'Year-to-Date' : (activePeriod || '—');

  const el = id => document.getElementById(id);
  if (el('statTotal'))    el('statTotal').textContent   = sym + fmtAmt(total);
  if (el('statCount'))    el('statCount').textContent   = txns.length;
  if (el('statFlagged'))  el('statFlagged').textContent = flagged;
  if (el('statPeriod'))   el('statPeriod').textContent  = label;
  if (el('dashPeriodLabel')) el('dashPeriodLabel').textContent = label;

  // Update all flag badges
  document.querySelectorAll('[id^="sidebarFlagBadge"]').forEach(b => b.textContent = flagged);

  const { balanced } = calcTrialBalance(txns);
  if (el('statBalance'))    el('statBalance').textContent    = balanced ? '✓ Balanced' : '⚠ Off';
  if (el('statBalanceSub')) el('statBalanceSub').textContent = balanced ? 'Dr = Cr' : 'Check entries';
  if (el('statBalance'))    el('statBalance').style.color    = balanced ? 'var(--green)' : 'var(--accent)';

  setTimeout(() => {
    document.querySelectorAll('.stat-card').forEach(c => c.classList.add('in'));
    document.querySelectorAll('.panel').forEach(c => c.classList.add('in'));
  }, 50);

  // Category chart
  const catTotals = {};
  txns.forEach(r => { const c = r.category||'Uncategorized'; catTotals[c] = (catTotals[c]||0) + parseFloat(r.amount||0); });
  const sorted  = Object.entries(catTotals).sort((a,b) => b[1]-a[1]);
  const palette = ['#111210','#b83a20','#a87c1a','#1e6640','#1e3a7a','#5a3a8a','#8a6a4a','#6a8a4a','#4a8a8a','#8a4a4a','#4a4a8a'];

  if (chartInstance) { try { chartInstance.destroy(); } catch(e){} }
  const catChartEl = document.getElementById('catChart');
  if (catChartEl) {
    const ctx = catChartEl.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(e => e[0]),
        datasets: [{ data: sorted.map(e => e[1]), backgroundColor: palette.slice(0,sorted.length), borderRadius: 2, borderSkipped: false }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '  ' + sym + fmt(c.parsed.x) } } },
        scales: {
          x: { grid: { color: '#e4ddd0' }, ticks: { font: { family: 'IBM Plex Mono', size: 10 }, color: '#8c8478', callback: v => sym + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v) } },
          y: { grid: { display: false }, ticks: { font: { family: 'IBM Plex Sans', size: 11 }, color: '#111210' } }
        }
      }
    });
  }

  // Breakdown list
  const bd = document.getElementById('catBreakdown');
  if (bd) {
    bd.innerHTML = '';
    sorted.forEach(([cat, amt], i) => {
      const pct = total > 0 ? ((amt/total)*100).toFixed(1) : '0.0';
      const div = document.createElement('div');
      div.className = 'cat-item';
      div.innerHTML = `<div class="cat-head"><span class="cat-name">${cat}</span><span class="cat-amt">${sym}${fmtAmt(amt)} <span style="opacity:.45">${pct}%</span></span></div>
        <div class="cat-track"><div class="cat-fill" style="width:0%;background:${palette[i%palette.length]}" data-w="${pct}"></div></div>`;
      bd.appendChild(div);
    });
    setTimeout(() => document.querySelectorAll('.cat-fill').forEach(b => b.style.width = b.dataset.w + '%'), 300);
  }
}

function renderStudentDashboard() {
  const txns  = activeTransactions;
  const sym   = currencySymbol();
  const total = txns.reduce((s,r) => s + parseFloat(r.amount||0), 0);

  const el = id => document.getElementById(id);
  if (el('studentHeroAmount')) el('studentHeroAmount').textContent = sym + fmtAmt(total);
  if (el('studentHeroSub'))    el('studentHeroSub').textContent    = txns.length + ' transactions this period';

  // Vibe message
  let vibe = '';
  if      (total < 500)  vibe = "You're doing great — keep it up! 🌟";
  else if (total < 1500) vibe = "Steady spending — check your budget 👀";
  else                   vibe = "Big month — review your categories 📊";
  if (!txns.length) vibe = 'Load a file or add transactions to get started';
  if (el('studentVibe')) el('studentVibe').textContent = vibe;

  // Top category
  const catTotals = {};
  txns.forEach(r => { const c = r.category||'Uncategorized'; catTotals[c] = (catTotals[c]||0) + parseFloat(r.amount||0); });
  const topCat = Object.entries(catTotals).sort((a,b) => b[1]-a[1])[0];
  if (el('sdTopCat')) el('sdTopCat').textContent = topCat ? topCat[0] : '—';
  if (el('sdTxnCount')) el('sdTxnCount').textContent = txns.length;

  // Days left in month
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  if (el('sdDaysLeft')) el('sdDaysLeft').textContent = (lastDay - now.getDate()) + ' days';

  // Budget bars
  const bars = document.getElementById('studentBudgetBars');
  if (bars && txns.length) {
    const DEFAULT_BUDGET = 500;
    bars.innerHTML = Object.entries(catTotals).sort((a,b) => b[1]-a[1]).slice(0,6).map(([cat, amt]) => {
      const budget = budgets[cat] || DEFAULT_BUDGET;
      const pct    = Math.min((amt/budget)*100, 150).toFixed(0);
      const isOver = amt > budget;
      return `<div class="bb-row">
        <div class="bb-label"><span>${cat}</span><span>${sym}${fmtAmt(amt)} / ${sym}${fmtAmt(budget)}</span></div>
        <div class="bva-bar-track"><div class="bva-bar-fill" style="width:0%;background:${isOver?'var(--accent)':'var(--green)'}" data-w="${pct}"></div></div>
      </div>`;
    }).join('');
    setTimeout(() => document.querySelectorAll('#studentBudgetBars .bva-bar-fill').forEach(b => b.style.width = b.dataset.w + '%'), 200);
  }

  // Subscriptions detected
  const subGrid = document.getElementById('studentSubGrid');
  if (subGrid) {
    const subs = detectSubscriptions();
    if (subs.length) {
      subGrid.innerHTML = subs.map(s => `<div class="sub-card"><div class="sub-icon">${s.icon}</div><div class="sub-name">${s.name}</div><div class="sub-amt">${sym}${fmtAmt(s.amount)}/mo</div></div>`).join('');
    } else {
      subGrid.innerHTML = '<div class="empty"><div class="empty-icon">🔁</div><p>No recurring charges detected yet</p></div>';
    }
  }

  // Savings goal
  const goals = JSON.parse(localStorage.getItem('ledgerai_goals') || '[]');
  const pctEl  = el('studentGoalPct');
  const fillEl = el('studentGoalFill');
  if (goals.length && pctEl && fillEl) {
    const g    = goals[0];
    const pct  = Math.min((g.current / g.target) * 100, 100).toFixed(0);
    pctEl.textContent  = pct + '%';
    fillEl.style.width = pct + '%';
  }
}

function renderFreelancerDashboard() {
  const txns     = activeTransactions;
  const sym      = currencySymbol();
  const income   = txns.filter(r => r.category === 'Income' || parseFloat(r.amount||0) < 0);
  const expenses = txns.filter(r => r.category !== 'Income' && parseFloat(r.amount||0) > 0);
  const totalInc = income.reduce((s,r) => s + Math.abs(parseFloat(r.amount||0)), 0);
  const totalExp = expenses.reduce((s,r) => s + parseFloat(r.amount||0), 0);
  const profit   = totalInc - totalExp;
  const tax      = Math.max(0, profit * 0.25);

  const el = id => document.getElementById(id);
  if (el('flIncome'))   el('flIncome').textContent   = sym + fmtAmt(totalInc);
  if (el('flExpenses')) el('flExpenses').textContent = sym + fmtAmt(totalExp);
  if (el('flProfit'))   el('flProfit').textContent   = sym + fmtAmt(profit);
  if (el('flTaxAmt'))   el('flTaxAmt').textContent   = sym + fmtAmt(tax);
  if (el('statCount'))  el('statCount').textContent  = txns.length;
  if (el('statFlagged')) el('statFlagged').textContent = txns.filter(r => r.flag && r.flag.toLowerCase()!=='none').length;

  const { balanced } = calcTrialBalance(txns);
  if (el('statBalance'))    el('statBalance').textContent    = balanced ? '✓ Balanced' : '⚠ Off';
  if (el('statBalanceSub')) el('statBalanceSub').textContent = balanced ? 'Dr = Cr' : 'Check entries';

  // Quarter summary
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  const qLabel = 'Q' + q + ' ' + now.getFullYear();
  if (el('flQuarterVal')) el('flQuarterVal').textContent = qLabel + ' — ' + sym + fmtAmt(totalInc);

  // Client tracker in freelancer dashboard
  const clientBody = el('flClientBody');
  if (clientBody) {
    const clientMap = {};
    income.forEach(r => {
      const k = r.description || 'Unknown';
      if (!clientMap[k]) clientMap[k] = { amount: 0, date: r.date };
      clientMap[k].amount += Math.abs(parseFloat(r.amount||0));
      if (r.date > clientMap[k].date) clientMap[k].date = r.date;
    });
    if (Object.keys(clientMap).length) {
      clientBody.innerHTML = Object.entries(clientMap).sort((a,b)=>b[1].amount-a[1].amount).map(([name,d]) => {
        const daysSince = Math.floor((Date.now() - new Date(d.date)) / 86400000);
        const status = daysSince <= 30 ? 'ct-paid' : daysSince <= 60 ? 'ct-pending' : 'ct-overdue';
        const statusLabel = daysSince <= 30 ? '✓ Recent' : daysSince <= 60 ? '⏳ Pending' : '⚠ Overdue';
        return `<div class="client-tracker-row"><span class="ct-name">${name}</span><span class="ct-amount">${sym}${fmtAmt(d.amount)}</span><span class="ct-status ${status}">${statusLabel}</span><span>${d.date}</span></div>`;
      }).join('');
    } else {
      clientBody.innerHTML = '<div class="empty"><p>No income transactions — add income with category "Income"</p></div>';
    }
  }
}

// ============================================================
// SECTION 8: TRANSACTIONS VIEW
// ============================================================
function renderTransactions() {
  const label = activePeriod === '__ytd__' ? 'Year-to-Date' : (activePeriod||'—');
  const lbl = document.getElementById('txnPeriodLabel');
  if (lbl) lbl.textContent = label;
  populateCategoryFilter();
  applyFilters();
  updateEditBar();
}

function populateCategoryFilter() {
  const sel = document.getElementById('filterCategory');
  if (!sel) return;
  const used = [...new Set(activeTransactions.map(r=>r.category).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">All Categories</option>' + used.map(c=>`<option value="${c}">${c}</option>`).join('');
}

function populateAddFormCategories() {
  const sel = document.getElementById('nCat');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select Category —</option>' + CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('');
}

function applyFilters() {
  const query = (document.getElementById('searchInput')?.value||'').toLowerCase();
  const catF  = document.getElementById('filterCategory')?.value||'';
  const flagF = document.getElementById('filterFlag')?.value||'';
  const tbody = document.getElementById('txnBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  filteredIndices = [];
  let sorted = activeTransactions.map((r,i) => ({r,i}));
  sorted.sort((a,b) => {
    let av = a.r[sortCol]||'', bv = b.r[sortCol]||'';
    if (sortCol==='amount') { av=parseFloat(av||0); bv=parseFloat(bv||0); }
    if (av<bv) return sortDir==='asc'?-1:1;
    if (av>bv) return sortDir==='asc'?1:-1;
    return 0;
  });
  sorted.forEach(({r,i}) => {
    const matchSearch = !query || (r.description||'').toLowerCase().includes(query) || (r.category||'').toLowerCase().includes(query) || (r.date||'').includes(query) || String(r.amount||'').includes(query);
    const matchCat  = !catF  || r.category === catF;
    const hasFlag   = r.flag && r.flag.toLowerCase() !== 'none';
    const matchFlag = !flagF || (flagF==='flagged'&&hasFlag) || (flagF==='clear'&&!hasFlag);
    if (matchSearch && matchCat && matchFlag) {
      filteredIndices.push(i);
      tbody.appendChild(buildRow(r,i));
    }
  });
  const cnt = document.getElementById('txnCount');
  if (cnt) cnt.textContent = filteredIndices.length + ' of ' + activeTransactions.length + ' transactions';
}

function sortTable(col) {
  if (sortCol === col) sortDir = sortDir==='asc'?'desc':'asc';
  else { sortCol=col; sortDir='asc'; }
  applyFilters();
}

function buildRow(row, index) {
  const tr = document.createElement('tr');
  tr.id = `row-${index}`;
  const hasFlag = row.flag && row.flag.toLowerCase() !== 'none';
  if (hasFlag)     tr.classList.add('row-flagged');
  if (row._edited) tr.classList.add('row-edited');
  const jEntry = buildJournalEntry(row.category, row.amount);
  tr.innerHTML = `
    <td class="td-date"><span class="editable" onclick="editCell(${index},'date',this)">${row.date||'—'}</span></td>
    <td class="td-desc"><span class="editable" onclick="editCell(${index},'description',this)">${row.description||'—'}</span></td>
    <td class="td-amt"><span class="editable" onclick="editCell(${index},'amount',this)">${currencySymbol()}${fmtAmt(row.amount)}</span></td>
    <td class="td-cat" id="cat-${index}"><span class="editable" onclick="editCat(${index},this)">${row.category||'<span style="color:var(--rule);font-style:italic">Uncategorized</span>'}</span></td>
    <td class="td-acct" id="jrn-${index}">${jEntry.html}</td>
    <td id="flg-${index}">${hasFlag?`<span class="badge b-flag">${row.flag}</span>`:`<span class="badge b-ok">✓ Clear</span>`}</td>
    <td class="td-acts"><button class="btn btn-xs btn-red" onclick="deleteRow(${index})">✕</button></td>`;
  return tr;
}

function editCell(index, field, span) {
  const row = activeTransactions[index];
  if (!row) return;
  const cur   = field==='amount' ? row.amount : (row[field]||'');
  const input = document.createElement('input');
  input.className = 'edit-in';
  input.value = cur;
  span.replaceWith(input);
  input.focus(); input.select();
  const _beforeVal = field==='amount' ? row.amount : (row[field]||'');
  function save() {
    const val      = input.value.trim();
    const _afterVal = field==='amount' ? (val.replace(/[^0-9.\-]/g,'')||'0') : val;
    if (_afterVal !== _beforeVal) {
      auditEntry('edit', 'Field "' + field + '" edited on', row.description||'Row '+index, _beforeVal, _afterVal);
    }
    if (field==='amount') row.amount = _afterVal;
    else row[field] = val;
    markEdited(index);
    reRenderRow(index);
    refreshDependentViews();
  }
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();input.blur();} if(e.key==='Escape'){input.value=cur;input.blur();} });
}

function editCat(index, span) {
  const row = activeTransactions[index];
  const sel = document.createElement('select');
  sel.className = 'edit-sel';
  sel.innerHTML = '<option value="">— Select —</option>' + CATEGORIES.map(c=>`<option value="${c}" ${c===row.category?'selected':''}>${c}</option>`).join('');
  span.replaceWith(sel); sel.focus();
  const _beforeCat = row.category || 'Uncategorized';
  function save() {
    if (sel.value && sel.value !== _beforeCat) {
      auditEntry('edit', 'Category changed on', row.description||'Row '+index, _beforeCat, sel.value);
      row.category = sel.value;
    } else if (sel.value) { row.category = sel.value; }
    markEdited(index);
    reRenderRow(index);
    refreshDependentViews();
  }
  sel.addEventListener('blur', save);
  sel.addEventListener('change', save);
}

function markEdited(index) {
  if (!activeTransactions[index]._edited) {
    activeTransactions[index]._edited = true;
    editCount++;
    updateEditBar();
  }
}

function updateEditBar() {
  const bar = document.getElementById('editBar');
  if (!bar) return;
  if (editCount > 0) {
    bar.style.display = 'flex';
    const lbl = document.getElementById('editCountLabel');
    if (lbl) lbl.textContent = editCount + (editCount===1?' edit':' edits');
  } else {
    bar.style.display = 'none';
  }
}

function deleteRow(index) {
  if (!confirm('Delete this transaction? This cannot be undone.')) return;
  const row = activeTransactions[index];
  auditEntry('delete', 'Transaction deleted', (row.description||'Row '+index) + ' — ' + currencySymbol() + fmtAmt(row.amount), 'Category: ' + (row.category||'Uncategorized'));
  const deleted = activeTransactions.splice(index, 1)[0];
  if (activePeriod === '__ytd__') {
    Object.keys(periods).forEach(pk => {
      periods[pk] = periods[pk].filter(r => !(r.date===deleted.date && r.description===deleted.description && r.amount===deleted.amount));
    });
  } else if (activePeriod) {
    periods[activePeriod] = activeTransactions.map(r => ({...r}));
  }
  applyFilters();
  refreshDependentViews();
  showToast('Row deleted.');
}

function addRow() {
  const date = document.getElementById('nDate')?.value.trim();
  const desc = document.getElementById('nDesc')?.value.trim();
  const amt  = document.getElementById('nAmt')?.value.trim();
  const cat  = document.getElementById('nCat')?.value || '';
  const flag = document.getElementById('nFlag')?.value.trim() || 'none';
  if (!date||!desc||!amt) { showToast('Date, description, and amount are required.'); return; }
  const newRow = { date, description:desc, amount:amt, category:cat, flag, _edited:true };
  activeTransactions.push(newRow);
  if (activePeriod && activePeriod !== '__ytd__') periods[activePeriod].push(newRow);
  editCount++;
  updateEditBar();
  applyFilters();
  refreshDependentViews();
  auditEntry('edit', 'Row added manually', desc + ' — ' + currencySymbol() + fmtAmt(amt));
  ['nDate','nDesc','nAmt','nFlag'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  const nCat = document.getElementById('nCat'); if(nCat) nCat.value='';
  toggleAddForm();
  showToast('Transaction added.');
  saveTransactionsToCloud(activePeriod, periods[activePeriod]);
}

function toggleAddForm() {
  const form = document.getElementById('addForm');
  if (form) form.classList.toggle('open');
}

function revertAll() {
  auditEntry('revert', 'All edits reverted', activePeriod||'', editCount+' edits discarded');
  activeTransactions = originalSnapshot.map(r => ({...r}));
  if (activePeriod && activePeriod !== '__ytd__') {
    periods[activePeriod] = activeTransactions.map(r => ({...r}));
  }
  editCount = 0;
  updateEditBar();
  applyFilters();
  refreshDependentViews();
  showToast('All edits reverted to original data.');
}

function reRenderRow(index) {
  const row = activeTransactions[index];
  const old = document.getElementById(`row-${index}`);
  if (old) old.replaceWith(buildRow(row, index));
}

function refreshDependentViews() {
  const active = document.querySelector('.nav-item.active')?.id?.replace('nav-','');
  if (active === 'dashboard' || active === 'dashboard-p') renderDashboard();
  if (active === 'trialbalance' || active === 'trialbalance-p') renderTrialBalance();
  if (active === 'flags' || active === 'flags-p' || active === 'flags-s' || active === 'flags-f') renderFlags();
  if (active === 'student-dashboard') renderStudentDashboard();
  if (active === 'fl-dashboard') renderFreelancerDashboard();
  refreshAllBadges();
}

function refreshAllBadges() {
  const flagged = activeTransactions.filter(r => r.flag && r.flag.toLowerCase() !== 'none').length;
  document.querySelectorAll('[id^="sidebarFlagBadge"]').forEach(b => b.textContent = flagged);
  const auditBadge = document.getElementById('auditBadge');
  if (auditBadge) auditBadge.textContent = auditLog.length;
}

// ============================================================
// SECTION 9: TRIAL BALANCE
// ============================================================
function calcTrialBalance(txns) {
  const accounts = {};
  txns.forEach(row => {
    const rule   = JOURNAL_RULES[row.category];
    const amount = parseFloat(row.amount||0);
    if (!rule) return;
    if (!accounts[rule.dr]) accounts[rule.dr] = { debit:0, credit:0 };
    if (!accounts[rule.cr]) accounts[rule.cr] = { debit:0, credit:0 };
    accounts[rule.dr].debit  += amount;
    accounts[rule.cr].credit += amount;
  });
  const totDr   = Object.values(accounts).reduce((s,v) => s+v.debit, 0);
  const totCr   = Object.values(accounts).reduce((s,v) => s+v.credit, 0);
  const balanced = Math.abs(totDr - totCr) < 0.01;
  return { accounts, totDr, totCr, balanced };
}

function renderTrialBalance() {
  const txns  = activeTransactions;
  const label = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl = document.getElementById('tbPeriodLabel');
  if (lbl) lbl.textContent = label;
  const { accounts, totDr, totCr, balanced } = calcTrialBalance(txns);
  const sym   = currencySymbol();
  const tbody = document.getElementById('tbBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  Object.entries(accounts).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([code,vals]) => {
    const acct = COA[code] || { name:code, type:'—', group:'—' };
    const tr   = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="tb-acct">${acct.name}</div></td>
      <td><span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--blue);font-weight:600;">${code}</span></td>
      <td><span class="coa-type">${acct.type}</span></td>
      <td class="tb-dr">${vals.debit >0?sym+fmtAmt(vals.debit) :'—'}</td>
      <td class="tb-cr">${vals.credit>0?sym+fmtAmt(vals.credit):'—'}</td>`;
    tbody.appendChild(tr);
  });
  const tdr = document.getElementById('tbTotalDr');
  const tcr = document.getElementById('tbTotalCr');
  if (tdr) tdr.textContent = sym + fmtAmt(totDr);
  if (tcr) tcr.textContent = sym + fmtAmt(totCr);
  const uncatCount = txns.filter(r => !r.category || r.category==='' || r.category==='Uncategorized').length;
  const notice = document.getElementById('tbNotice');
  if (notice) {
    notice.style.display = 'flex';
    notice.className = 'tb-notice ' + (balanced?'ok':'err');
    let text = balanced
      ? `✓ Trial balance is balanced — total debits equal total credits (${sym}${fmt(totDr)})`
      : `⚠ Out of balance — difference of ${sym}${fmt(Math.abs(totDr-totCr))}. Review uncategorized or flagged transactions.`;
    if (uncatCount > 0) text += `  ·  ${uncatCount} uncategorized transaction${uncatCount>1?'s':''} excluded.`;
    notice.textContent = text;
  }
}

function exportTrialBalanceCSV() {
  if (!activeTransactions.length) return;
  const { accounts, totDr, totCr } = calcTrialBalance(activeTransactions);
  const sym = currencySymbol();
  const headers = ['Acct Code','Account Name','Type','Debit','Credit'];
  const rows = Object.entries(accounts).sort((a,b)=>a[0].localeCompare(b[0])).map(([code,v]) => {
    const acct = COA[code]||{name:code,type:'—'};
    return [code,`"${acct.name}"`,acct.type,v.debit>0?v.debit.toFixed(2):'',v.credit>0?v.credit.toFixed(2):''].join(',');
  });
  rows.push(['TOTAL','','',totDr.toFixed(2),totCr.toFixed(2)].join(','));
  downloadFile([headers.join(','),...rows].join('\n'),'text/csv',`${settings.company.replace(/\s+/g,'-')}-trial-balance.csv`);
  showToast('Trial Balance CSV exported.');
}

function exportTrialBalancePDF() {
  if (!activeTransactions.length) return;
  const { accounts, totDr, totCr, balanced } = calcTrialBalance(activeTransactions);
  const sym    = currencySymbol();
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const rows = Object.entries(accounts).sort((a,b)=>a[0].localeCompare(b[0])).map(([code,v]) => {
    const acct = COA[code]||{name:code,type:'—'};
    return `<tr style="border-bottom:1px solid #eee">
      <td style="padding:9px 14px;font-weight:500;">${acct.name}</td>
      <td style="padding:9px 14px;font-family:monospace;font-size:11px;color:#1e3a7a;font-weight:600;">${code}</td>
      <td style="padding:9px 14px;font-family:monospace;font-size:10px;text-transform:uppercase;color:#888;">${acct.type}</td>
      <td style="padding:9px 14px;text-align:right;font-family:monospace;color:#1e3a7a;">${v.debit>0?sym+fmt(v.debit):'—'}</td>
      <td style="padding:9px 14px;text-align:right;font-family:monospace;color:#b83a20;">${v.credit>0?sym+fmt(v.credit):'—'}</td>
    </tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><title>Trial Balance</title>
  <style>body{font-family:Georgia,serif;color:#111;padding:44px;}h1{font-size:24px;margin-bottom:2px;}h2{font-size:13px;color:#666;font-weight:400;margin-bottom:24px;}
  table{width:100%;border-collapse:collapse;}thead th{background:#111;color:#fff;font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:.1em;padding:10px 14px;text-align:left;}
  tfoot td{background:#f5f2ec;font-family:monospace;font-weight:700;padding:10px 14px;border-top:2px solid #111;}
  .notice{margin-top:14px;padding:10px 16px;font-family:monospace;font-size:11px;background:${balanced?'#e2f5ea':'#fdf0ed'};color:${balanced?'#1e6640':'#b83a20'};}
  @media print{body{padding:20px;}}</style></head><body>
  <h1>${settings.company}</h1><h2>Trial Balance — ${period} · Generated ${new Date().toLocaleDateString()}</h2>
  <table><thead><tr><th>Account Name</th><th>Code</th><th>Type</th><th>Debit</th><th>Credit</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td colspan="3">TOTALS</td><td style="text-align:right">${sym}${fmt(totDr)}</td><td style="text-align:right">${sym}${fmt(totCr)}</td></tr></tfoot></table>
  <div class="notice">${balanced?`✓ Balanced — debits equal credits (${sym}${fmt(totDr)})`:`⚠ Out of balance — difference of ${sym}${fmt(Math.abs(totDr-totCr))}`}</div>
  </body></html>`;
  const w = window.open('','_blank'); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(),500);
  showToast('Trial Balance PDF opened.');
}

// ============================================================
// SECTION 10: CHART OF ACCOUNTS
// ============================================================
function renderCOA() {
  const tbl = document.getElementById('coaTable');
  if (!tbl) return;
  tbl.innerHTML = '<tr><th>Code</th><th>Account Name</th><th>Type</th><th>Normal Balance</th><th>Group</th></tr>';
  let lastGroup = '';
  Object.entries(COA).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([code,acct]) => {
    if (acct.group !== lastGroup) {
      lastGroup = acct.group;
      const sep = document.createElement('tr');
      sep.className = 'coa-group';
      sep.innerHTML = `<td colspan="5">${acct.group}</td>`;
      tbl.appendChild(sep);
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="coa-code">${code}</td>
      <td style="font-weight:500">${acct.name}</td>
      <td class="coa-type">${acct.type}</td>
      <td class="coa-type">${acct.normalBal}</td>
      <td style="font-size:12px;color:var(--muted)">${acct.group}</td>`;
    tbl.appendChild(tr);
  });
}

// ============================================================
// SECTION 11: FLAGS VIEW
// ============================================================
function renderFlags() {
  const txns    = activeTransactions;
  const label   = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const flagged = txns.filter(r => r.flag && r.flag.toLowerCase() !== 'none');
  const lbl = document.getElementById('flagPeriodLabel');
  if (lbl) lbl.textContent = `${label} — ${flagged.length} item${flagged.length!==1?'s':''} flagged`;
  document.querySelectorAll('[id^="sidebarFlagBadge"]').forEach(b => b.textContent = flagged.length);
  const container = document.getElementById('flagsContainer');
  if (!container) return;
  if (!flagged.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">✅</div><p>No flagged transactions</p></div>';
    return;
  }
  container.innerHTML = `<div class="flags-grid">${flagged.map(r => {
    const gIdx = txns.findIndex(t => t.date===r.date && t.description===r.description && t.amount===r.amount);
    return `<div class="flag-card">
      <div class="flag-title">${r.description}</div>
      <div class="flag-meta">${r.date} · ${currencySymbol()}${fmtAmt(r.amount)} · ${r.category||'Uncategorized'}</div>
      <div class="flag-reason">⚠ ${r.flag}</div>
      ${gIdx>=0?`<button class="btn btn-sm" style="margin-top:10px;font-size:10px;background:var(--green-l);color:var(--green);border:1px solid rgba(30,102,64,0.2);" onclick="clearFlag(${gIdx})">✓ Mark Resolved</button>`:''}
    </div>`;
  }).join('')}</div>`;
}

function clearFlag(index) {
  const row = activeTransactions[index];
  if (!row) return;
  const prevFlag = row.flag;
  row.flag = 'none';
  row._edited = true;
  if (activePeriod && activePeriod !== '__ytd__') periods[activePeriod] = activeTransactions.map(r=>({...r}));
  auditEntry('flag', 'Flag cleared on', row.description||'Row '+index, prevFlag, 'none');
  markEdited(index);
  renderFlags();
  refreshDependentViews();
  showToast('Flag cleared — marked as resolved.');
}

function refreshAllBadgesAndFlags() {
  refreshAllBadges();
  renderFlags();
}

// ============================================================
// SECTION 12: P&L STATEMENT
// ============================================================
function renderPL() {
  if (!activeTransactions.length) return;
  const txns   = activeTransactions;
  const sym    = currencySymbol();
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl1 = document.getElementById('plPeriodLabel');
  const lbl2 = document.getElementById('plPeriodSpan');
  if (lbl1) lbl1.textContent = period;
  if (lbl2) lbl2.textContent = '— ' + period;
  const revenue = parseFloat(document.getElementById('plRevenueInput')?.value || 0);
  const catTotals = {};
  txns.forEach(r => { const c = r.category||'Miscellaneous'; catTotals[c] = (catTotals[c]||0) + parseFloat(r.amount||0); });
  const totalExpenses = Object.values(catTotals).reduce((s,v)=>s+v, 0);
  const netIncome     = revenue - totalExpenses;
  const netMargin     = revenue > 0 ? ((netIncome/revenue)*100).toFixed(1) : '—';
  const isPositive    = netIncome >= 0;
  const expenseLines  = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,amt]) =>
    `<div class="pl-line"><span class="pl-line-name">${cat}</span><span class="pl-line-amt" style="color:var(--accent)">(${sym}${fmtAmt(amt)})</span></div>`
  ).join('');
  const stmt = document.getElementById('plStatement');
  if (!stmt) return;
  stmt.innerHTML = `
    <div class="pl-statement">
      <div class="pl-header"><h2>${settings.company}</h2><p>Income Statement (P&amp;L) · ${period} · Generated ${new Date().toLocaleDateString()}</p></div>
      <div class="pl-section">
        <div class="pl-section-title">Revenue</div>
        <div class="pl-line"><span class="pl-line-name">Total Revenue ${revenue===0?'<span class="pl-line-sub">(enter above)</span>':''}</span><span class="pl-line-amt" style="color:var(--green)">${sym}${fmtAmt(revenue)}</span></div>
        <div class="pl-subtotal"><span>Gross Profit</span><span class="pl-subtotal-amt" style="color:var(--green)">${sym}${fmtAmt(revenue)}</span></div>
      </div>
      <div class="pl-section">
        <div class="pl-section-title">Operating Expenses</div>
        ${expenseLines}
        <div class="pl-subtotal"><span>Total Operating Expenses</span><span class="pl-subtotal-amt" style="color:var(--accent)">(${sym}${fmtAmt(totalExpenses)})</span></div>
      </div>
      <div class="pl-net ${isPositive?'positive':'negative'}">
        <span>Net ${isPositive?'Income':'Loss'}</span>
        <span class="pl-net-amt">${isPositive?'':'('}${sym}${fmtAmt(Math.abs(netIncome))}${isPositive?'':')'}</span>
      </div>
      <div class="pl-margin"><span>Net Profit Margin</span><span>${revenue>0?netMargin+'%':'— (enter revenue above)'}</span></div>
    </div>`;
}

function exportPLCSV() {
  if (!activeTransactions.length) return;
  const revenue   = parseFloat(document.getElementById('plRevenueInput')?.value||0);
  const catTotals = {};
  activeTransactions.forEach(r=>{ const c=r.category||'Miscellaneous'; catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0); });
  const totalExp  = Object.values(catTotals).reduce((s,v)=>s+v,0);
  const netIncome = revenue - totalExp;
  const period    = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const rows = [
    ['P&L Statement','',''],
    [settings.company, period, new Date().toLocaleDateString()],
    ['','',''],['REVENUE','',''],['Total Revenue','',revenue.toFixed(2)],['Gross Profit','',revenue.toFixed(2)],
    ['','',''],['OPERATING EXPENSES','',''],
    ...Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([c,v])=>[c,'',(-v).toFixed(2)]),
    ['Total Operating Expenses','',(-(totalExp)).toFixed(2)],['','',''],
    ['NET INCOME','',netIncome.toFixed(2)],
  ];
  downloadFile(rows.map(r=>r.join(',')).join('\n'),'text/csv',`${settings.company.replace(/\s+/g,'-')}-pl.csv`);
  showToast('P&L exported to CSV.');
}

function exportPLPDF() {
  if (!activeTransactions.length) return;
  const revenue = parseFloat(document.getElementById('plRevenueInput')?.value||0);
  const sym     = currencySymbol();
  const catTotals = {};
  activeTransactions.forEach(r=>{ const c=r.category||'Miscellaneous'; catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0); });
  const totalExp  = Object.values(catTotals).reduce((s,v)=>s+v,0);
  const netIncome = revenue - totalExp;
  const period    = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const isPos     = netIncome >= 0;
  const expLines  = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<tr><td style="padding:7px 0;border-bottom:1px solid #eee;">${c}</td><td style="padding:7px 0;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:#b83a20;">(${sym}${fmtAmt(v)})</td></tr>`).join('');
  const html = `<!DOCTYPE html><html><head><title>P&L — ${settings.company}</title>
  <style>body{font-family:Georgia,serif;color:#111;padding:52px;max-width:600px;margin:0 auto;}h1{font-size:22px;margin-bottom:4px;}p{color:#666;font-size:13px;margin-bottom:32px;}
  .section-title{font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#888;padding:14px 0 6px;border-bottom:1px solid #ddd;}
  .subtotal{display:flex;justify-content:space-between;padding:10px 0;border-top:1.5px solid #111;font-weight:700;font-size:14px;}
  .net{display:flex;justify-content:space-between;padding:14px;background:${isPos?'#1e6640':'#b83a20'};color:white;font-weight:700;font-size:16px;margin-top:8px;}
  table{width:100%;border-collapse:collapse;}@media print{body{padding:20px;}}</style></head><body>
  <h1>${settings.company}</h1><p>Income Statement (P&amp;L) · ${period} · ${new Date().toLocaleDateString()}</p>
  <div class="section-title">Revenue</div>
  <table><tbody><tr><td style="padding:8px 0;border-bottom:1px solid #eee;">Total Revenue</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:#1e6640;font-weight:700;">${sym}${fmtAmt(revenue)}</td></tr></tbody></table>
  <div class="subtotal"><span>Gross Profit</span><span style="color:#1e6640;">${sym}${fmtAmt(revenue)}</span></div>
  <div class="section-title">Operating Expenses</div>
  <table><tbody>${expLines}</tbody></table>
  <div class="subtotal"><span>Total Operating Expenses</span><span style="color:#b83a20;">(${sym}${fmt(totalExp)})</span></div>
  <div class="net"><span>Net ${isPos?'Income':'Loss'}</span><span>${isPos?'':'('}${sym}${fmtAmt(Math.abs(netIncome))}${isPos?'':')'}</span></div>
  </body></html>`;
  const w = window.open('','_blank'); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(),500);
}

// ============================================================
// SECTION 13: CASH FLOW
// ============================================================
function renderCashFlow() {
  if (!activeTransactions.length) return;
  const txns   = activeTransactions;
  const sym    = currencySymbol();
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl = document.getElementById('cfPeriodLabel');
  if (lbl) lbl.textContent = period;
  const sections = { operating: [], investing: [], financing: [] };
  txns.forEach(r => {
    const amount = parseFloat(r.amount||0);
    if (amount > 5000 && !['Payroll','Rent & Facilities','Advertising & Marketing'].includes(r.category)) {
      sections.investing.push(r);
    } else {
      const cls = CF_CLASSIFICATION[r.category] || 'operating';
      sections[cls].push(r);
    }
  });
  const sectionMeta = {
    operating:  { label: 'Operating Activities',   desc: 'Day-to-day business operations',        tag: 'cf-operating',  color: 'var(--blue)' },
    investing:  { label: 'Investing Activities',    desc: 'Capital expenditures & investments',    tag: 'cf-investing',  color: 'var(--purple, #5a3a8a)' },
    financing:  { label: 'Financing Activities',    desc: 'Debt, equity & bank charges',           tag: 'cf-financing',  color: 'var(--gold)' },
  };
  let totalNetCash = 0;
  let html = '';
  Object.entries(sectionMeta).forEach(([key, meta]) => {
    const rows = sections[key];
    if (!rows.length) return;
    const sectionTotal = rows.reduce((s,r) => s+parseFloat(r.amount||0), 0);
    totalNetCash += sectionTotal;
    const bycat = {};
    rows.forEach(r => { const c=r.category||'Misc'; bycat[c]=(bycat[c]||0)+parseFloat(r.amount||0); });
    const lineItems = Object.entries(bycat).sort((a,b)=>b[1]-a[1]).map(([c,v]) =>
      `<div class="cf-line"><span class="cf-line-name">${c}</span><span class="cf-line-amt" style="color:var(--accent)">(${sym}${fmtAmt(v)})</span></div>`
    ).join('');
    html += `<div class="cf-section">
      <div class="cf-section-header">
        <span class="cf-section-title">${meta.label} <span class="cf-class-tag ${meta.tag}">${key}</span></span>
        <span class="cf-section-total" style="color:var(--accent)">(${sym}${fmtAmt(sectionTotal)})</span>
      </div>
      <div style="font-size:12px;color:var(--muted);padding:8px 24px 6px;font-family:'IBM Plex Mono',monospace;letter-spacing:0.05em;">${meta.desc}</div>
      ${lineItems}
    </div>`;
  });
  html += `<div class="cf-net"><span>Net Cash Used</span><span class="cf-net-amt">(${sym}${fmtAmt(totalNetCash)})</span></div>`;
  const cfContent = document.getElementById('cfContent');
  if (cfContent) cfContent.innerHTML = html;
}

function exportCFPDF() {
  if (!activeTransactions.length) return;
  const txns   = activeTransactions;
  const sym    = currencySymbol();
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const sections = { operating:[], investing:[], financing:[] };
  txns.forEach(r => {
    const cls = CF_CLASSIFICATION[r.category]||'operating';
    sections[cls].push(r);
  });
  let bodyHtml = '';
  const meta = { operating:'Operating Activities', investing:'Investing Activities', financing:'Financing Activities' };
  let totalNet = 0;
  Object.entries(meta).forEach(([key,label]) => {
    if (!sections[key].length) return;
    const total = sections[key].reduce((s,r)=>s+parseFloat(r.amount||0),0);
    totalNet += total;
    const bycat = {};
    sections[key].forEach(r => { const c=r.category||'Misc'; bycat[c]=(bycat[c]||0)+parseFloat(r.amount||0); });
    const rows = Object.entries(bycat).map(([c,v])=>`<tr><td style="padding:6px 0;border-bottom:1px solid #eee;padding-left:16px;">${c}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:#b83a20;">(${sym}${fmtAmt(v)})</td></tr>`).join('');
    bodyHtml += `<div style="margin-bottom:24px;"><div style="font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#888;padding:14px 0 8px;border-bottom:2px solid #111;">${label}</div><table style="width:100%;border-collapse:collapse;">${rows}<tr><td style="padding:10px 0;font-weight:700;">Net Cash — ${label}</td><td style="text-align:right;font-family:monospace;font-weight:700;color:#b83a20;">(${sym}${fmt(total)})</td></tr></table></div>`;
  });
  const html = `<!DOCTYPE html><html><head><title>Cash Flow — ${settings.company}</title>
  <style>body{font-family:Georgia,serif;color:#111;padding:52px;max-width:600px;margin:0 auto;}h1{font-size:22px;}p{color:#666;font-size:13px;margin-bottom:32px;}
  .net{display:flex;justify-content:space-between;padding:14px;background:#111;color:white;font-weight:700;font-size:16px;margin-top:8px;}
  @media print{body{padding:20px;}}</style></head><body>
  <h1>${settings.company}</h1><p>Cash Flow Statement · ${period} · ${new Date().toLocaleDateString()}</p>
  ${bodyHtml}
  <div class="net"><span>Total Net Cash Used</span><span>(${sym}${fmt(totalNet)})</span></div>
  </body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(),500);
}

// ============================================================
// SECTION 14: BUDGET VS ACTUAL
// ============================================================
function renderBudgetVsActual() {
  if (!activeTransactions.length) return;
  const txns   = activeTransactions;
  const sym    = currencySymbol();
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl = document.getElementById('bvaPeriodLabel');
  if (lbl) lbl.textContent = period;
  const catTotals = {};
  txns.forEach(r => { const c=r.category||'Miscellaneous'; catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0); });
  let totalBudget=0, totalActual=0;
  const rows = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,actual]) => {
    const budget   = budgets[cat] || 0;
    const variance = budget - actual;
    const pct      = budget > 0 ? Math.min((actual/budget)*100, 150) : 0;
    const isOver   = budget > 0 && actual > budget;
    totalBudget += budget; totalActual += actual;
    const varClass = !budget ? 'bva-neutral' : (isOver ? 'bva-over' : 'bva-under');
    const varText  = !budget ? '—' : (isOver ? `▲ ${sym}${fmtAmt(Math.abs(variance))} over` : `▼ ${sym}${fmtAmt(Math.abs(variance))} under`);
    const barColor = !budget ? '#e4ddd0' : (isOver ? 'var(--accent)' : 'var(--green)');
    return `<tr>
      <td style="padding:12px 16px;font-weight:500;">${cat}</td>
      <td><input class="bva-budget-input" data-cat="${cat}" value="${budget||''}" placeholder="0.00" onchange="updateBudget('${cat}',this.value)" type="number" step="0.01" min="0"/></td>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;">${sym}${fmtAmt(actual)}</td>
      <td class="${varClass}" style="font-family:'IBM Plex Mono',monospace;font-size:11px;">${varText}</td>
      <td>
        <div class="bva-bar-wrap">
          <div class="bva-bar-track"><div class="bva-bar-fill" style="width:0%;background:${barColor}" data-w="${pct}"></div></div>
          <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);width:32px;text-align:right;">${budget>0?Math.round(pct)+'%':'—'}</span>
        </div>
      </td>
    </tr>`;
  }).join('');
  const totalVar  = totalBudget - totalActual;
  const tvarStyle = !totalBudget ? '' : (totalVar < 0 ? 'color:var(--accent);font-weight:700' : 'color:var(--green);font-weight:700');
  const bvaTable = document.getElementById('bvaTable');
  if (bvaTable) {
    bvaTable.innerHTML = `<div class="bva-table"><table>
      <thead><tr><th>Category</th><th style="text-align:left;">Monthly Budget</th><th>Actual Spent</th><th>Variance</th><th>% of Budget</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td>TOTALS</td>
        <td style="text-align:right;">${totalBudget>0?sym+fmt(totalBudget):'—'}</td>
        <td style="text-align:right;">${sym}${fmt(totalActual)}</td>
        <td style="text-align:right;${tvarStyle}">${totalBudget>0?(totalVar<0?'▲ '+sym+fmt(Math.abs(totalVar))+' over':'▼ '+sym+fmt(Math.abs(totalVar))+' under'):'Set budgets above'}</td>
        <td></td>
      </tr></tfoot>
    </table></div>`;
    setTimeout(()=>document.querySelectorAll('.bva-bar-fill').forEach(b=>b.style.width=b.dataset.w+'%'),200);
  }
}

function updateBudget(cat, val) {
  budgets[cat] = parseFloat(val)||0;
}

function saveBudgets() {
  document.querySelectorAll('.bva-budget-input').forEach(input => {
    const cat = input.dataset.cat;
    if (cat) budgets[cat] = parseFloat(input.value)||0;
  });
  renderBudgetVsActual();
  auditEntry('system', 'Budgets saved', Object.keys(budgets).length + ' categories');
  showToast('Budgets saved.');
}

function exportBVAPDF() {
  if (!activeTransactions.length) return;
  const sym  = currencySymbol();
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const catTotals = {};
  activeTransactions.forEach(r=>{ const c=r.category||'Miscellaneous'; catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0); });
  const rows = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,actual]) => {
    const budget  = budgets[cat]||0;
    const variance = budget - actual;
    const isOver   = budget>0 && actual>budget;
    return `<tr style="border-bottom:1px solid #eee">
      <td style="padding:8px 0;">${cat}</td>
      <td style="padding:8px 0;text-align:right;font-family:monospace;">${budget?sym+fmt(budget):'—'}</td>
      <td style="padding:8px 0;text-align:right;font-family:monospace;">${sym}${fmtAmt(actual)}</td>
      <td style="padding:8px 0;text-align:right;font-family:monospace;color:${isOver?'#b83a20':'#1e6640'};">${budget?(isOver?'▲ over ':'▼ under ')+sym+fmt(Math.abs(variance)):'—'}</td>
    </tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><title>Budget vs Actual</title>
  <style>body{font-family:Georgia,serif;color:#111;padding:44px;}h1{font-size:22px;}p{color:#666;font-size:13px;margin-bottom:28px;}
  table{width:100%;border-collapse:collapse;}thead th{font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#888;padding:9px 0;text-align:right;border-bottom:2px solid #111;}
  thead th:first-child{text-align:left;}@media print{body{padding:20px;}}</style></head><body>
  <h1>${settings.company}</h1><p>Budget vs Actual · ${period} · ${new Date().toLocaleDateString()}</p>
  <table><thead><tr><th>Category</th><th>Budget</th><th>Actual</th><th>Variance</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(),500);
}

// ============================================================
// SECTION 15: BANK RECONCILIATION
// ============================================================
function handleBankFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    Papa.parse(file, { header:true, skipEmptyLines:true,
      complete: r => {
        bankStatementRows = normalizeColumns(r.data);
        updateReconCounts();
        showToast(`Bank file loaded: ${bankStatementRows.length} rows`);
      }
    });
  } else {
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      bankStatementRows = normalizeColumns(XLSX.utils.sheet_to_json(ws,{defval:''}));
      updateReconCounts();
      showToast(`Bank file loaded: ${bankStatementRows.length} rows`);
    };
    reader.readAsArrayBuffer(file);
  }
}

function renderReconcileSetup() {
  if (!activeTransactions.length) return;
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl = document.getElementById('reconPeriodLabel');
  if (lbl) lbl.textContent = period;
  updateReconCounts();
}

function updateReconCounts() {
  const lc = document.getElementById('reconLedgerCount');
  const bc = document.getElementById('reconBankCount');
  if (lc) lc.textContent = activeTransactions.length + ' ledger transactions loaded';
  if (bc) bc.textContent = bankStatementRows.length > 0 ? bankStatementRows.length + ' bank rows loaded' : 'No bank file loaded yet';
}

function runReconciliation() {
  const ledger = activeTransactions;
  const bank   = bankStatementRows;
  const sym    = currencySymbol();
  if (!ledger.length) { showToast('Load a transaction file first.'); return; }
  if (!bank.length)   { showToast('Upload a bank statement file first.'); return; }
  const ledgerUsed = new Array(ledger.length).fill(false);
  const bankUsed   = new Array(bank.length).fill(false);
  const matches    = [];
  const unmatchedLedger = [];
  const unmatchedBank   = [];
  const normalizeDesc = s => (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2);
  ledger.forEach((lrow, li) => {
    const lAmt   = Math.abs(parseFloat(lrow.amount||0));
    const lDate  = new Date(lrow.date||'');
    const lWords = normalizeDesc(lrow.description);
    let bestJ = -1, bestScore = -1;
    bank.forEach((brow, bi) => {
      if (bankUsed[bi]) return;
      const bAmt  = Math.abs(parseFloat(brow.amount||0));
      const bDate = new Date(brow.date||'');
      if (Math.abs(lAmt-bAmt) > 0.01) return;
      const dayDiff = Math.abs((lDate-bDate)/86400000);
      if (dayDiff > 5) return;
      const bWords   = normalizeDesc(brow.description);
      const shared   = lWords.filter(w=>bWords.some(bw=>bw.includes(w)||w.includes(bw)));
      const descScore = lWords.length > 0 ? shared.length/lWords.length : 0.5;
      const score    = descScore * 2 + (1-dayDiff/10);
      if (score > bestScore) { bestScore = score; bestJ = bi; }
    });
    if (bestJ >= 0) {
      const brow    = bank[bestJ];
      const dayDiff = Math.abs((lDate-new Date(brow.date||''))/86400000);
      const bWords  = normalizeDesc(brow.description);
      const shared  = lWords.filter(w=>bWords.some(bw=>bw.includes(w)||w.includes(bw)));
      const descPct = lWords.length > 0 ? Math.round(shared.length/lWords.length*100) : 100;
      matches.push({ ledger:lrow, bank:brow, dayDiff:Math.round(dayDiff), descPct });
      ledgerUsed[li] = true;
      bankUsed[bestJ] = true;
    } else {
      unmatchedLedger.push(lrow);
    }
  });
  bank.forEach((brow,bi) => { if(!bankUsed[bi]) unmatchedBank.push(brow); });
  const matchRate = ((matches.length/Math.max(ledger.length,1))*100).toFixed(0);
  const matchRows = matches.map(m=>`
    <div class="recon-row recon-row-matched">
      <div style="flex:2;"><div style="font-weight:500;font-size:12px;">${m.ledger.description}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);">${m.ledger.date} · Ledger</div></div>
      <div style="flex:2;"><div style="font-size:12px;">${m.bank.description||m.bank.date}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);">${m.bank.date} · Bank${m.dayDiff>0?' · '+m.dayDiff+'d apart':''} · ${m.descPct}% desc match</div></div>
      <div style="font-family:'IBM Plex Mono',monospace;font-weight:700;">${sym}${fmtAmt(m.ledger.amount)}</div>
      <span class="recon-match-badge rmb-ok">✓ Matched</span>
    </div>`).join('');
  const unMatchLedgerRows = unmatchedLedger.map(r=>`
    <div class="recon-row recon-row-unmatched">
      <div style="flex:3;"><div style="font-weight:500;font-size:13px;">${r.description}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);">${r.date} · ${r.category||'—'}</div></div>
      <div style="font-family:'IBM Plex Mono',monospace;font-weight:700;">${sym}${fmtAmt(r.amount)}</div>
      <span class="recon-match-badge rmb-miss">⚠ Not in bank</span>
    </div>`).join('');
  const unMatchBankRows = unmatchedBank.map(r=>`
    <div class="recon-row recon-row-unmatched-bank">
      <div style="flex:3;"><div style="font-weight:500;font-size:13px;">${r.description||'—'}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);">${r.date} · Bank only</div></div>
      <div style="font-family:'IBM Plex Mono',monospace;font-weight:700;">${sym}${fmtAmt(r.amount)}</div>
      <span class="recon-match-badge rmb-extra">? Not in ledger</span>
    </div>`).join('');
  const reconResults = document.getElementById('reconResults');
  if (reconResults) {
    reconResults.innerHTML = `
      <div class="recon-stats">
        <div class="recon-stat"><div class="recon-stat-label">Match Rate</div><div class="recon-stat-val" style="color:var(--green)">${matchRate}%</div></div>
        <div class="recon-stat"><div class="recon-stat-label">Matched</div><div class="recon-stat-val">${matches.length}</div></div>
        <div class="recon-stat"><div class="recon-stat-label">In Ledger Only</div><div class="recon-stat-val" style="color:var(--accent)">${unmatchedLedger.length}</div></div>
        <div class="recon-stat"><div class="recon-stat-label">In Bank Only</div><div class="recon-stat-val" style="color:var(--gold)">${unmatchedBank.length}</div></div>
      </div>
      ${matches.length?`<div class="recon-section"><div class="recon-section-header"><span class="recon-section-title">✓ Matched Transactions (${matches.length})</span></div>${matchRows}</div>`:''}
      ${unmatchedLedger.length?`<div class="recon-section"><div class="recon-section-header"><span class="recon-section-title" style="color:var(--accent)">⚠ In Ledger — Not in Bank (${unmatchedLedger.length})</span></div>${unMatchLedgerRows}</div>`:''}
      ${unmatchedBank.length?`<div class="recon-section"><div class="recon-section-header"><span class="recon-section-title" style="color:var(--gold)">? In Bank — Not in Ledger (${unmatchedBank.length})</span></div>${unMatchBankRows}</div>`:''}`;
  }
  showToast(`Reconciliation complete — ${matchRate}% match rate`);
  auditEntry('system', 'Bank reconciliation run', matchRate + '% match rate');
}

function levenshtein(a, b) {
  const m=a.length,n=b.length;
  if(!m||!n) return Math.max(m,n);
  const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function levenshteinSimilarity(a, b) {
  const m=a.length,n=b.length;
  if(!m&&!n) return 1;
  return 1-levenshtein(a,b)/Math.max(m,n);
}

function exportReconPDF() {
  if (!activeTransactions.length) { showToast('Run reconciliation first.'); return; }
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const resultsEl = document.getElementById('reconResults');
  if (!resultsEl || !resultsEl.innerHTML.trim()) { showToast('Run reconciliation first.'); return; }
  const html = `<!DOCTYPE html><html><head><title>Bank Reconciliation</title>
  <style>body{font-family:Georgia,serif;color:#111;padding:44px;}h1{font-size:22px;}p{color:#666;font-size:13px;margin-bottom:28px;}
  @media print{body{padding:20px;}}</style></head><body>
  <h1>${settings.company}</h1><p>Bank Reconciliation Report · ${period} · ${new Date().toLocaleDateString()}</p>
  ${resultsEl.innerHTML}</body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(),500);
}

// ============================================================
// SECTION 16: DUPLICATE DETECTION
// ============================================================
function runDuplicateDetection() {
  const txns   = activeTransactions;
  const sym    = currencySymbol();
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl = document.getElementById('dupPeriodLabel');
  if (lbl) lbl.textContent = period;
  if (!txns.length) return;
  const groups  = [];
  const used    = new Array(txns.length).fill(false);
  txns.forEach((rowA,i) => {
    if (used[i]) return;
    const group = [i];
    const amtA  = parseFloat(rowA.amount||0);
    const dateA = new Date(rowA.date||'');
    const descA = (rowA.description||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    txns.forEach((rowB,j) => {
      if (j<=i||used[j]) return;
      const amtB   = parseFloat(rowB.amount||0);
      const dateB  = new Date(rowB.date||'');
      const descB  = (rowB.description||'').toLowerCase().replace(/[^a-z0-9]/g,'');
      const dayDiff = Math.abs((dateA-dateB)/86400000);
      const sameAmt  = Math.abs(amtA-amtB)<0.01;
      const closeDate = dayDiff<=7;
      const simDesc  = descA.length>4&&descB.length>4&&(descA.includes(descB.slice(0,6))||descB.includes(descA.slice(0,6))||levenshteinSimilarity(descA,descB)>0.7);
      if (sameAmt&&closeDate&&simDesc) { group.push(j); used[j]=true; }
    });
    if (group.length>1) { groups.push(group.map(idx=>({...txns[idx],_idx:idx}))); used[i]=true; }
  });
  const badge = document.getElementById('dupBadge');
  if (badge) { badge.textContent=groups.length; badge.style.display=groups.length?'inline-flex':'none'; }
  const container = document.getElementById('dupContent');
  if (!container) return;
  if (!groups.length) {
    container.innerHTML = `<div class="empty" style="background:var(--green-l);border:1px solid rgba(30,102,64,0.15);border-radius:2px;padding:40px;">
      <div class="empty-icon">✅</div><p style="color:var(--green);">No duplicate transactions detected</p>
      <p style="font-size:12px;color:var(--muted);margin-top:8px;text-transform:none;letter-spacing:0;">Scanned ${txns.length} transactions for matching amounts, descriptions, and dates within 7 days.</p>
    </div>`;
    return;
  }
  const totalDupAmt = groups.reduce((s,g)=>s+g.slice(1).reduce((ss,r)=>ss+parseFloat(r.amount||0),0),0);
  let html = `<div class="dup-summary-bar">
    <div class="dup-summary-stat"><label>Duplicate Groups</label><value style="color:var(--accent)">${groups.length}</value></div>
    <div class="dup-summary-stat"><label>Potential Duplicate Rows</label><value>${groups.reduce((s,g)=>s+g.length,0)}</value></div>
    <div class="dup-summary-stat"><label>Potential Overcharge</label><value style="color:var(--accent);font-size:18px;margin-top:4px;">${sym}${fmt(totalDupAmt)}</value></div>
  </div>`;
  groups.forEach((group,gi) => {
    const confidence = group.length>2?'HIGH':'MEDIUM';
    const rows = group.map((r,ri)=>`
      <div class="dup-row">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);width:20px;">${ri===0?'①':'②'}</div>
        <div style="flex:3;"><div style="font-weight:${ri===0?600:400};font-size:13px;">${r.description}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);">${r.date} · ${r.category||'—'}</div></div>
        <div style="font-family:'IBM Plex Mono',monospace;font-weight:700;">${sym}${fmtAmt(r.amount)}</div>
        ${ri===0?'<span style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:var(--green);padding:3px 8px;background:var(--green-l);border-radius:2px;">Original</span>'
               :`<button class="btn btn-xs btn-red" onclick="deleteRow(${r._idx})">Delete Duplicate</button>`}
      </div>`).join('');
    html += `<div class="dup-group">
      <div class="dup-group-header">
        <span class="dup-group-title">Potential Duplicate Group ${gi+1} — ${group.length} transactions — ${sym}${fmtAmt(group[0].amount)}</span>
        <span class="dup-confidence ${confidence==='HIGH'?'dc-high':'dc-medium'}">${confidence} confidence</span>
      </div>${rows}</div>`;
  });
  container.innerHTML = html;
}

// ============================================================
// SECTION 17: SETTINGS
// ============================================================
function loadSettingsForm() {
  const el = id => document.getElementById(id);
  if (el('sCompany'))    el('sCompany').value    = settings.company;
  if (el('sIndustry'))   el('sIndustry').value   = settings.industry;
  if (el('sFiscalYear')) el('sFiscalYear').value  = settings.fiscalYear;
  if (el('sCurrency'))   el('sCurrency').value    = settings.currency;
  if (el('sAiMode'))     el('sAiMode').value      = settings.aiMode;
  if (el('sPlaidToken')) el('sPlaidToken').value   = settings.plaidLinkToken;
  const lbl = el('currentProfileLabel');
  if (lbl) {
    const names = { student:'Student', freelancer:'Freelancer', business:'Small Business', professional:'Accounting Professional' };
    lbl.textContent = names[currentProfile] || currentProfile;
  }
}

function saveSettings() {
  settings.company        = document.getElementById('sCompany')?.value.trim() || 'Your Company';
  settings.industry       = document.getElementById('sIndustry')?.value || settings.industry;
  settings.fiscalYear     = document.getElementById('sFiscalYear')?.value || '01';
  settings.currency       = document.getElementById('sCurrency')?.value || 'USD';
  settings.aiMode         = document.getElementById('sAiMode')?.value || 'auto';
  settings.plaidLinkToken = document.getElementById('sPlaidToken')?.value.trim() || '';
  document.getElementById('topbarCompany').textContent = settings.company;
  const activeNav = document.querySelector('.nav-item.active');
  if (activeNav) {
    const viewId = activeNav.id.replace('nav-','');
    if (viewId && viewId !== 'settings') renderView(viewId);
  }
  auditEntry('system', 'Settings saved', 'Currency: '+settings.currency+', Company: '+settings.company);
  showToast('Settings saved — view updated.');
  saveSettingsToCloud();
}

function currencySymbol() {
  const map = { USD:'$', CAD:'CA$', GBP:'£', EUR:'€', AUD:'A$' };
  return map[settings.currency] || '$';
}

const FX_RATES = { USD:1.0, CAD:1.36, GBP:0.79, EUR:0.92, AUD:1.53 };

function fmtAmt(usdAmount) {
  const rate = FX_RATES[settings.currency] || 1;
  return fmt(parseFloat(usdAmount||0) * rate);
}

function fmt(v) {
  return parseFloat(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}

// ============================================================
// SECTION 18: WORKING PAPERS
// ============================================================
function renderWorkingPapers() {
  const txns   = activeTransactions;
  const sym    = currencySymbol();
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl = document.getElementById('wpPeriodLabel');
  if (lbl) lbl.textContent = period;
  const content = document.getElementById('wpContent');
  if (!content) return;
  if (!txns.length) {
    content.innerHTML = '<div class="empty"><div class="empty-icon">📄</div><p>Load a file to generate working papers</p></div>';
    return;
  }
  const catTotals = {};
  txns.forEach(r => { const cat=r.category||'Miscellaneous'; catTotals[cat]=(catTotals[cat]||0)+parseFloat(r.amount||0); });
  const periodKeys    = Object.keys(periods).filter(k=>k!=='__ytd__').sort();
  const currentIdx    = activePeriod!=='__ytd__' ? periodKeys.indexOf(activePeriod) : -1;
  const priorPeriodKey = currentIdx>0 ? periodKeys[currentIdx-1] : null;
  const priorTxns     = priorPeriodKey ? periods[priorPeriodKey] : null;
  const priorTotals   = {};
  if (priorTxns) {
    priorTxns.forEach(r => { const cat=r.category||'Miscellaneous'; priorTotals[cat]=(priorTotals[cat]||0)+parseFloat(r.amount||0); });
  }
  const hasPrior  = priorTxns && Object.keys(priorTotals).length > 0;
  const matThresh = parseFloat(document.getElementById('wpMateriality')?.value||5000);
  const varPctTh  = parseFloat(document.getElementById('wpVarPct')?.value||15);
  const sortedCats = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const totalCurr  = sortedCats.reduce((s,[,v])=>s+v,0);
  const totalPrior = hasPrior ? Object.values(priorTotals).reduce((s,v)=>s+v,0) : null;
  let sigVariances = [];
  const leadRows = sortedCats.map(([cat,curr]) => {
    const prior  = hasPrior ? (priorTotals[cat]||0) : null;
    const varAmt = prior!==null ? curr-prior : null;
    const varPct = prior>0 ? ((curr-prior)/prior)*100 : null;
    const isSig  = varPct!==null && (Math.abs(varPct)>=varPctTh || Math.abs(varAmt)>=matThresh);
    if (isSig) sigVariances.push({cat,curr,prior,varAmt,varPct});
    const rule    = JOURNAL_RULES[cat];
    const acctCode = rule ? rule.dr : '6900';
    const pctOfTotal = totalCurr>0?(curr/totalCurr*100).toFixed(1):'0.0';
    return `<tr class="${isSig?'wp-sig-row':''}">
      <td class="wp-acct-code">${acctCode}</td>
      <td style="font-weight:500;">${cat}</td>
      <td class="wp-num">${sym}${fmtAmt(curr)}</td>
      ${hasPrior
        ? `<td class="wp-num">${prior>0?sym+fmtAmt(prior):'—'}</td>
           <td class="wp-var-amt ${varAmt>0?'wp-over':'wp-under'}">${varAmt!==null?(varAmt>0?'+':'')+sym+fmtAmt(Math.abs(varAmt)):'—'}</td>
           <td class="wp-var-pct ${isSig?(varPct>0?'wp-over':'wp-under'):''}">${varPct!==null?(varPct>0?'+':'')+varPct.toFixed(1)+'%':'—'}${isSig?' ⚑':''}</td>`
        : '<td class="wp-num wp-muted">No prior period</td><td></td><td></td>'
      }
      <td class="wp-num wp-muted">${pctOfTotal}%</td>
    </tr>`;
  }).join('');
  const sigNotes = sigVariances.map(v =>
    `<div class="wp-sig-note"><span class="wp-sig-flag">⚑ SIGNIFICANT</span>
    <strong>${v.cat}</strong> — Current: ${sym}${fmtAmt(v.curr)} vs Prior: ${sym}${fmtAmt(v.prior)}
    (${v.varPct>0?'+':''}${v.varPct.toFixed(1)}%, ${v.varAmt>0?'+':''}${sym}${fmtAmt(Math.abs(v.varAmt))}).
    Obtain management explanation.</div>`
  ).join('');
  const flagged     = txns.filter(r=>r.flag&&r.flag.toLowerCase()!=='none');
  const uncategorized = txns.filter(r=>!r.category||r.category==='Uncategorized'||r.category==='');
  const contractors = txns.filter(r=>r.category==='Contractor / Professional Services');
  const contTotal   = contractors.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const meals       = txns.filter(r=>r.category==='Meals & Entertainment');
  const mealsTotal  = meals.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const pbcItems    = [
    {item:'Trial balance — current period',status:'auto',note:'Generated by LedgerAI'},
    {item:'Bank statements — all accounts',status:'pending',note:'Upload via Reconciliation tab'},
    {item:'Payroll register — all payroll periods',status:'pending',note:'Required for payroll testing'},
    {item:'Contractor agreements & invoices',status:contractors.length>0?'pending':'na',note:contractors.length>0?`${contractors.length} contractor payment(s) totalling ${sym}${fmtAmt(contTotal)} — 1099 verification required`:'No contractor payments this period'},
    {item:'Meals & Entertainment receipts',status:meals.length>0?'pending':'na',note:meals.length>0?`${meals.length} transaction(s) totalling ${sym}${fmtAmt(mealsTotal)} — 50% deductible; receipts required`:'No M&E this period'},
    {item:'Revenue support documentation',status:'pending',note:'Invoices, contracts, recognition schedule'},
    {item:'Accounts payable listing',status:'pending',note:'AP aging as at period end'},
    {item:'Fixed asset continuity schedule',status:'pending',note:'Additions, disposals, depreciation'},
  ];
  const pbcRows = pbcItems.map(p => {
    const cls = p.status==='auto'?'pbc-auto':p.status==='na'?'pbc-na':'pbc-pending';
    const lbl = p.status==='auto'?'✓ Auto':p.status==='na'?'N/A':'⏳ Pending';
    return `<tr><td style="font-size:12px;">${p.item}</td><td><span class="pbc-badge ${cls}">${lbl}</span></td><td style="font-size:11px;color:var(--muted);">${p.note}</td></tr>`;
  }).join('');
  const {balanced, totDr, totCr} = calcTrialBalance(txns);
  content.innerHTML = `
    <div class="wp-section">
      <div class="wp-section-header">
        <span class="wp-section-title">W/P Ref: LS-01 · Lead Schedule — All Expense Accounts</span>
        <span class="wp-section-meta">${period} · ${sortedCats.length} accounts · Materiality: ${sym}${fmtAmt(matThresh)}</span>
      </div>
      <div class="tbl-wrap">
        <table class="wp-table">
          <thead><tr>
            <th>Acct #</th><th>Account / Category</th><th>Current Period</th>
            ${hasPrior?'<th>Prior Period</th><th>Variance $</th><th>Variance %</th>':'<th colspan="3" style="color:var(--muted);font-weight:400;">Load prior period for variance analysis</th>'}
            <th>% of Total</th>
          </tr></thead>
          <tbody>${leadRows}</tbody>
          <tfoot><tr class="wp-tfoot">
            <td></td><td>TOTAL EXPENSES</td>
            <td class="wp-num">${sym}${fmtAmt(totalCurr)}</td>
            ${hasPrior?`<td class="wp-num">${sym}${fmtAmt(totalPrior)}</td><td class="wp-num">${totalCurr>=totalPrior?'+':''}${sym}${fmtAmt(Math.abs(totalCurr-totalPrior))}</td><td></td>`:'<td colspan="3"></td>'}
            <td class="wp-num">100%</td>
          </tr></tfoot>
        </table>
      </div>
      ${sigNotes?`<div class="wp-sig-section"><div class="wp-sig-header">⚑ Significant Variances — Require Explanation</div>${sigNotes}</div>`:(hasPrior?'<div class="wp-all-clear">✓ No significant variances identified at current thresholds.</div>':'')}
    </div>
    <div class="wp-section" style="margin-top:1px;">
      <div class="wp-section-header">
        <span class="wp-section-title">W/P Ref: TB-01 · Trial Balance Summary</span>
        <span class="wp-section-meta ${balanced?'wp-balanced':'wp-unbalanced'}">${balanced?'✓ Balanced — Dr = Cr':'⚠ NOT BALANCED — Dr ≠ Cr'}</span>
      </div>
      <div style="padding:16px 20px;font-family:'IBM Plex Mono',monospace;font-size:12px;display:flex;gap:48px;flex-wrap:wrap;">
        <div><span style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:4px;">Total Debits</span><span style="font-size:20px;font-weight:600;">${sym}${fmtAmt(totDr)}</span></div>
        <div><span style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:4px;">Total Credits</span><span style="font-size:20px;font-weight:600;">${sym}${fmtAmt(totCr)}</span></div>
        <div><span style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:4px;">Difference</span><span style="font-size:20px;font-weight:600;color:${balanced?'var(--green)':'var(--accent)'};">${sym}${fmtAmt(Math.abs(totDr-totCr))}</span></div>
        <div><span style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:4px;">Uncategorized</span><span style="font-size:20px;font-weight:600;color:${uncategorized.length>0?'var(--accent)':'var(--green)'};">${uncategorized.length}</span></div>
      </div>
    </div>
    <div class="wp-section" style="margin-top:1px;">
      <div class="wp-section-header">
        <span class="wp-section-title">W/P Ref: PBC-01 · Prepared by Client Checklist</span>
        <span class="wp-section-meta">${pbcItems.filter(p=>p.status==='pending').length} items outstanding</span>
      </div>
      <div class="tbl-wrap"><table class="wp-table">
        <thead><tr><th>Required Item</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>${pbcRows}</tbody>
      </table></div>
    </div>`;
}

function exportWorkingPapersPDF() {
  if (!activeTransactions.length) { showToast('Load a file first.'); return; }
  const content = document.getElementById('wpContent');
  if (!content) return;
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const html = `<!DOCTYPE html><html><head><title>Working Papers — ${settings.company}</title>
  <style>body{font-family:Georgia,serif;color:#111;padding:44px;font-size:12px;}h1{font-size:22px;margin-bottom:4px;}p.meta{color:#666;font-size:11px;margin-bottom:28px;}
  table{width:100%;border-collapse:collapse;margin-bottom:24px;}th{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#888;padding:8px;text-align:left;border-bottom:2px solid #111;background:#f9f7f3;}
  td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px;}.section{margin-bottom:32px;}.sec-head{font-family:monospace;font-size:10px;background:#111;color:white;padding:8px 12px;}
  .sig{background:#fff8e6;color:#8a6414;}.num{text-align:right;font-family:monospace;}.over{color:#c0311a;}.under{color:#1b6038;}@media print{body{padding:20px;}}
  </style></head><body>
  <h1>${settings.company} — Audit Working Papers</h1>
  <p class="meta">Period: ${period} · Generated: ${new Date().toLocaleString()} · Prepared by: LedgerAI</p>
  ${content.innerHTML}</body></html>`;
  const w = window.open('','_blank'); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(),500);
  auditEntry('export', 'Working Papers PDF exported', period);
}

// ============================================================
// SECTION 19: AI MEMO DRAFTING
// ============================================================
async function renderAIMemo() {
  const txns = activeTransactions;
  const memoOutput = document.getElementById('memoOutput');
  if (!memoOutput) return;
  if (!txns.length) {
    memoOutput.innerHTML = '<div class="empty"><div class="empty-icon">✍️</div><p>Load a file to generate memos</p></div>';
    return;
  }
  const memoType = document.getElementById('memoType')?.value || 'month-end';
  const sym      = currencySymbol();
  const period   = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const catTotals = {};
  txns.forEach(r => { const cat=r.category||'Miscellaneous'; catTotals[cat]=(catTotals[cat]||0)+parseFloat(r.amount||0); });
  const totalExp  = Object.values(catTotals).reduce((s,v)=>s+v,0);
  const flagged   = txns.filter(r=>r.flag&&r.flag.toLowerCase()!=='none');
  const {balanced,totDr,totCr} = calcTrialBalance(txns);
  const topCats   = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const periodKeys = Object.keys(periods).filter(k=>k!=='__ytd__').sort();
  const currentIdx = activePeriod!=='__ytd__'?periodKeys.indexOf(activePeriod):-1;
  const priorKey   = currentIdx>0?periodKeys[currentIdx-1]:null;
  let priorSummary = '';
  if (priorKey) {
    const priorTxns = periods[priorKey];
    const priorTotal = priorTxns.reduce((s,r)=>s+parseFloat(r.amount||0),0);
    const change     = totalExp - priorTotal;
    priorSummary = `Prior period (${priorKey}): $${fmt(priorTotal)} total. Change: ${change>=0?'+':''}$${fmt(change)} (${priorTotal>0?((change/priorTotal)*100).toFixed(1):'N/A'}%).`;
  }
  const financialSummary = `Company: ${settings.company} (${settings.industry})
Period: ${period}
Total expenses: $${fmt(totalExp)}
${priorSummary}
Top expense categories:
${topCats.map(([c,v])=>`  ${c}: $${fmt(v)} (${totalExp>0?(v/totalExp*100).toFixed(1):0}% of total)`).join('\n')}
Flagged transactions: ${flagged.length}
Trial balance: ${balanced?'BALANCED':'NOT BALANCED — difference of $'+fmt(Math.abs(totDr-totCr))}
Significant flags: ${flagged.slice(0,3).map(r=>r.description+' — '+r.flag).join('; ')||'None'}`.trim();
  const prompts = {
    'month-end':    'You are a professional accounting assistant. Write a concise, professional month-end client summary memo based on the financial data below. 2-3 paragraphs. Tone: professional but clear. Plain prose, no markdown.',
    'cfo':          'You are a professional accounting assistant. Write a CFO/controller variance memo. Focus on significant variances, compliance items, and items requiring management attention. 3-4 paragraphs, professional tone. Plain prose.',
    'mgmt-letter':  'You are a public accounting assistant. Write 4-6 management letter recommendation numbered bullet points. Each: identify a finding, explain the risk, give a practical recommendation. Numbered list only.',
    'audit-plan':   'You are an audit senior. Write a brief audit planning note. Identify: (1) significant accounts/transactions, (2) key risks, (3) suggested audit procedures. Professional audit language. 3-4 paragraphs.',
  };
  const systemPrompt = prompts[memoType]||prompts['month-end'];
  const userPrompt   = `${systemPrompt}\n\nFinancial Data:\n${financialSummary}`;
  memoOutput.innerHTML = `<div class="memo-generating"><div class="memo-spinner"></div><span>Claude AI is drafting your memo…</span></div>`;
  try {
    const res  = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:800, messages:[{role:'user',content:userPrompt}] })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || res.status);
    const memoText     = data.content[0].text;
    const memoTypeLabel = document.getElementById('memoType')?.options[document.getElementById('memoType').selectedIndex]?.text || 'Memo';
    const dateStr      = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    memoOutput.innerHTML = `
      <div class="memo-result">
        <div class="memo-result-header">
          <div><div class="memo-result-type">${memoTypeLabel}</div><div class="memo-result-company">${settings.company} · ${period}</div></div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-sm" onclick="copyMemo()">⎘ Copy</button>
            <button class="btn btn-sm btn-solid" onclick="exportMemoPDF()">⬇ PDF</button>
          </div>
        </div>
        <div class="memo-result-date">Prepared: ${dateStr} · Generated by LedgerAI / Claude AI · Review before sending</div>
        <div class="memo-result-body" id="memoText">${memoText.replace(/\n/g,'<br>')}</div>
      </div>`;
    auditEntry('ai', 'AI Memo drafted', memoTypeLabel + ' — ' + period);
    showToast('Memo drafted — review before sending.');
  } catch(e) {
    memoOutput.innerHTML = `<div class="memo-error">⚠ AI error: ${e.message}. Check your connection or Vercel deployment.</div>`;
  }
}

function copyMemo() {
  const el = document.getElementById('memoText');
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(()=>showToast('Memo copied to clipboard.'));
}

function exportMemoPDF() {
  const el = document.getElementById('memoText');
  if (!el) return;
  const type   = document.getElementById('memoType')?.options[document.getElementById('memoType').selectedIndex]?.text || 'Memo';
  const period = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const html = `<!DOCTYPE html><html><head><title>${type} — ${settings.company}</title>
  <style>body{font-family:Georgia,serif;color:#111;padding:52px;max-width:680px;}h1{font-size:20px;margin-bottom:4px;}p.meta{color:#666;font-size:11px;margin-bottom:32px;border-bottom:1px solid #eee;padding-bottom:12px;}
  .body{font-size:13px;line-height:1.9;white-space:pre-wrap;}.footer{margin-top:40px;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:12px;}@media print{body{padding:24px;}}</style></head><body>
  <h1>${settings.company}</h1>
  <p class="meta">${type} · ${period} · ${new Date().toLocaleDateString()} · Generated by LedgerAI</p>
  <div class="body">${el.innerText}</div>
  <div class="footer">Generated by LedgerAI · Review and edit before sending · Not a substitute for professional judgment</div>
  </body></html>`;
  const w = window.open('','_blank'); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(),500);
  auditEntry('export', 'Memo PDF exported', type+' — '+period);
}

// ============================================================
// SECTION 20: AI CATEGORIZATION
// ============================================================
async function aiCategorizeAll() {
  if (settings.aiMode==='off') { showToast('AI mode is off — enable in Settings.'); return; }
  const uncategorized = activeTransactions.map((r,i)=>({r,i})).filter(({r})=>!r.category||r.category===''||r.category==='Uncategorized');
  if (!uncategorized.length) { showToast('All transactions already categorized.'); return; }
  const total = uncategorized.length;
  showToast(`Running AI on ${total} transactions — 0 done`);
  for (let k=0; k<uncategorized.length; k++) {
    const {r,i} = uncategorized[k];
    await aiCategorize(r,i);
    showToast(`AI categorizing — ${k+1} of ${total} done`);
    await new Promise(res=>setTimeout(res,700));
  }
  showToast(`✓ AI complete — ${total} transactions categorized`);
  auditEntry('ai','AI Categorize All complete',total+' transactions');
}

async function aiCategorize(row, index) {
  if (settings.aiMode==='off') return;
  const companyCtx = settings.company!=='Your Company'?`Company: ${settings.company} (${settings.industry})`:'Company: Small Business';
  const ctxExamples = activeTransactions
    .filter((r,ii)=>ii!==index&&r.category&&r.category!=='Uncategorized'&&r.category!==''&&r.description)
    .slice(-8).map(r=>`  "${r.description}" → ${r.category}`).join('\n');
  const examplesBlock = ctxExamples?`\nExamples from this file:\n${ctxExamples}\n`:'';
  const prompt = `You are a GAAP-trained bookkeeper. Categorize the transaction below into exactly one of the valid categories.
${companyCtx}
Transaction:
- Date: ${row.date}
- Description: ${row.description}
- Amount: $${parseFloat(row.amount).toFixed(2)}
${examplesBlock}
Valid categories (choose EXACTLY one):
${CATEGORIES.map(c=>'  - '+c).join('\n')}
Rules:
- Payroll = recurring staff wages (ADP, Gusto, payroll processors)
- Contractor = freelancers/consultants paid per invoice
- Software & Subscriptions = SaaS tools, cloud software, app subscriptions
- Utilities & Hosting = internet, electricity, cloud hosting
- Advertising & Marketing = paid ads, sponsorships, PR spend
- Meals & Entertainment = restaurants, client meals, team lunches
- Bank & Finance Charges = bank fees, wire fees, credit card fees
- Travel = flights, hotels, car rental, transit for business
- Office Supplies = physical supplies, stationery, small equipment
- Rent & Facilities = office rent, coworking, storage
- Income = any incoming payment, revenue, or deposit
- Miscellaneous = ONLY if no other category fits
Flag rules:
- "none" for normal transactions
- "Meals & entertainment — only 50% tax deductible" for meals
- "Contractor — issue 1099-NEC if annual total exceeds $600" for contractors
- "Large transaction — verify authorization" if amount > 5000
Respond ONLY with valid JSON, no markdown, no explanation:
{"category":"<exact category name>","flag":"<flag text or none>"}`;
  const catCell = document.getElementById('cat-'+index);
  if (catCell) catCell.innerHTML = '<span class="badge b-pulse">⟳ AI analyzing...</span>';
  try {
    const res  = await fetch('/api/claude',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:150,messages:[{role:'user',content:prompt}]})
    });
    const data   = await res.json();
    if (!res.ok) throw new Error(data?.error?.message||res.status);
    const result = JSON.parse(data.content[0].text.replace(/```json|```/g,'').trim());
    const _prevCat = activeTransactions[index].category||'Uncategorized';
    activeTransactions[index].category = result.category;
    activeTransactions[index].flag     = result.flag||'none';
    auditEntry('ai','AI categorized',(activeTransactions[index].description||'Row '+index),_prevCat,result.category);
    reRenderRow(index);
    refreshDependentViews();
  } catch(e) {
    const errCell = document.getElementById('cat-'+index);
    if (errCell) errCell.innerHTML = '<span class="editable" onclick="editCat('+index+',this)">'+(activeTransactions[index].category||'<span style="color:var(--accent);font-size:11px">⚠ AI error — click to set</span>')+'</span>';
    console.warn('AI error row',index,e);
  }
}

function buildJournalEntry(category, amount) {
  const rule = JOURNAL_RULES[category];
  const f    = v => parseFloat(v||0).toLocaleString('en-US',{minimumFractionDigits:2});
  const sym  = currencySymbol();
  if (!rule) {
    return {
      html: `<span class="acct-line acct-dr">Dr. 6900 Misc Expense ${sym}${f(amount)}</span><span class="acct-line acct-cr">Cr. 1000 Cash ${sym}${f(amount)}</span>`,
      text: `Dr. 6900 Misc Expense $${f(amount)} | Cr. 1000 Cash $${f(amount)}`
    };
  }
  const drAcct = COA[rule.dr];
  const crAcct = COA[rule.cr];
  return {
    html: `<span class="acct-line acct-dr">Dr. ${rule.dr} ${drAcct?.name||''} ${sym}${f(amount)}</span>`+
          `<span class="acct-line acct-cr">Cr. ${rule.cr} ${crAcct?.name||''} ${sym}${f(amount)}</span>`+
          (rule.note?`<span class="acct-note">※ ${rule.note}</span>`:''),
    text: `Dr. ${rule.dr} ${drAcct?.name||''} $${f(amount)} | Cr. ${rule.cr} ${crAcct?.name||''} $${f(amount)}`
  };
}

// ============================================================
// SECTION 21: PLAID BANK CONNECTION
// ============================================================
function initPlaid() {
  if (!settings.plaidLinkToken) {
    showToast('Add Plaid Link Token in Settings to connect a real bank. Loading demo data instead.');
    loadPlaidSandboxTransactions({});
    return;
  }
  if (!window.Plaid) {
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.onload = () => openPlaidLink();
    document.head.appendChild(script);
  } else {
    openPlaidLink();
  }
}

function openPlaidLink() {
  if (!window.Plaid) { showToast('Plaid script failed to load.'); return; }
  const linkToken = settings.plaidLinkToken || '';
  if (!linkToken) { showToast('Plaid Link Token required. Add it in Settings.'); return; }
  plaidHandler = window.Plaid.create({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      showToast(`Bank connected: ${metadata.institution?.name||'Account'} — transactions loading…`);
      auditEntry('system','Bank connected via Plaid',metadata.institution?.name||'Unknown bank');
      loadPlaidSandboxTransactions(metadata);
    },
    onExit: (err) => { if (err) showToast('Bank connection cancelled.'); },
    onEvent: (eventName) => console.log('Plaid event:',eventName)
  });
  plaidHandler.open();
}

function loadPlaidSandboxTransactions(metadata) {
  const institutionName = metadata?.institution?.name || 'Connected Bank';
  const now = new Date();
  const SANDBOX_TXNS = [
    {desc:'ADP PAYROLL',cat:'Payroll',amt:12500},{desc:'WEWORK OFFICE',cat:'Rent & Facilities',amt:3200},
    {desc:'GOOGLE ADS',cat:'Advertising & Marketing',amt:2200},{desc:'AWS CLOUD SERVICES',cat:'Utilities & Hosting',amt:312},
    {desc:'JANE SMITH CONSULTING',cat:'Contractor / Professional Services',amt:1800},
    {desc:'CAPITAL GRILLE CLIENT LUNCH',cat:'Meals & Entertainment',amt:284},{desc:'BANK WIRE FEE',cat:'Bank & Finance Charges',amt:35},
    {desc:'ADOBE CREATIVE CLOUD',cat:'Software & Subscriptions',amt:54.99},
    {desc:'SARA OKONKWO INVOICE',cat:'Contractor / Professional Services',amt:2200},
    {desc:'NOBU RESTAURANT CLIENT DINNER',cat:'Meals & Entertainment',amt:412},
    {desc:'STAPLES OFFICE SUPPLIES',cat:'Office Supplies',amt:87.50},{desc:'ADP PAYROLL FINAL',cat:'Payroll',amt:12500},
  ];
  const month = String(now.getMonth()+1).padStart(2,'0');
  const year  = now.getFullYear();
  const transactions = SANDBOX_TXNS.map((t,i) => ({
    date: `${year}-${month}-${String(Math.min(i*2+1,28)).padStart(2,'0')}`,
    description: t.desc, amount: t.amt.toString(), category: t.cat,
    flag: t.cat==='Meals & Entertainment'?'Meals & entertainment — only 50% tax deductible':'none'
  }));
  const periodKey = `${year}-${month} (${institutionName})`;
  periods[periodKey] = transactions;
  activatePeriod(periodKey);
  showToast(`✓ ${transactions.length} transactions loaded from ${institutionName}`);
  auditEntry('load',`Plaid: ${transactions.length} transactions loaded`,institutionName,'',periodKey);
  showView(getProfileDashboard());
}

// ============================================================
// SECTION 22: SUPABASE AUTH + CLOUD SAVE
// ============================================================
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function initAuth() {
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    const res  = await fetch('/api/config');
    const conf = await res.json();
    if (!conf.supabaseUrl) return; // running locally without config
    sbClient = window.supabase.createClient(conf.supabaseUrl, conf.supabaseAnon);
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) {
      window.location.href = 'auth.html';
      return;
    }
    currentUser  = session.user;
    sessionToken = session.access_token;
    updateUserUI();
    await loadUserData();
    sbClient.auth.onAuthStateChange((event, session) => {
      if (event==='SIGNED_OUT') window.location.href='auth.html';
      if (session) { currentUser=session.user; sessionToken=session.access_token; }
    });
  } catch(e) {
    console.warn('Auth init failed — running in offline mode', e);
  }
}

function updateUserUI() {
  if (!currentUser) return;
  const name  = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
  const co    = document.getElementById('topbarCompany');
  if (co) co.textContent = name;
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) signOutBtn.style.display = 'inline-flex';
}

async function loadUserData() {
  if (!sessionToken) return;
  showToast('Loading your saved data…');
  try {
    const res  = await fetch('/api/db',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'load_transactions',token:sessionToken})
    });
    const data = await res.json();
    if (!data.success||!data.transactions?.length) {
      showToast('No saved data yet — load a file to get started.');
      return;
    }
    const grouped = {};
    data.transactions.forEach(t => {
      const p = t.period||'Imported';
      if (!grouped[p]) grouped[p]=[];
      grouped[p].push({date:t.date,description:t.description,amount:t.amount,category:t.category,flag:t.flag});
    });
    Object.entries(grouped).forEach(([period,txns]) => {
      periods[period] = txns;
      addPeriodToSidebar(period,txns.length);
    });
    const firstPeriod = Object.keys(grouped)[0];
    if (firstPeriod) activatePeriod(firstPeriod);
    showToast(`✓ Loaded ${data.transactions.length} saved transactions`);
    // Load settings
    const sRes  = await fetch('/api/db',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'load_settings',token:sessionToken})
    });
    const sData = await sRes.json();
    if (sData.success&&sData.settings) {
      settings.company    = sData.settings.company    || settings.company;
      settings.industry   = sData.settings.industry   || settings.industry;
      settings.currency   = sData.settings.currency   || settings.currency;
      settings.fiscalYear = sData.settings.fiscal_year|| settings.fiscalYear;
      settings.aiMode     = sData.settings.ai_mode    || settings.aiMode;
      const co = document.getElementById('topbarCompany');
      if (co && settings.company!=='Your Company') co.textContent=settings.company;
    }
  } catch(e) {
    console.warn('Could not load saved data',e);
    showToast('Running in offline mode — data will not be saved.');
  }
}

async function saveTransactionsToCloud(period, txns) {
  if (!sessionToken||!txns?.length) return;
  try {
    await fetch('/api/db',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'save_transactions',token:sessionToken,data:{period,transactions:txns,accountType:'personal'}})
    });
  } catch(e) { console.warn('Could not save to cloud',e); }
}

async function saveSettingsToCloud() {
  if (!sessionToken) return;
  try {
    await fetch('/api/db',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'save_settings',token:sessionToken,data:{
        company:settings.company, industry:settings.industry, currency:settings.currency,
        fiscalYear:settings.fiscalYear, aiMode:settings.aiMode
      }})
    });
  } catch(e) { console.warn('Could not save settings',e); }
}

async function signOut() {
  if (sbClient) await sbClient.auth.signOut();
  window.location.href = 'auth.html';
}

// ============================================================
// SECTION 23: STUDENT-SPECIFIC VIEWS
// ============================================================
function detectSubscriptions() {
  const txns   = activeTransactions;
  const KNOWN  = ['netflix','spotify','adobe','hulu','disney','amazon prime','apple','google','slack','dropbox','github','notion','figma','zoom','microsoft','office 365','aws','shopify','mailchimp'];
  const found  = [];
  const descMap = {};
  txns.forEach(r => {
    const key = (r.description||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim();
    if (!descMap[key]) descMap[key] = [];
    descMap[key].push(r);
  });
  Object.entries(descMap).forEach(([key,rows]) => {
    const isKnown = KNOWN.some(k=>key.includes(k));
    const isRecurring = rows.length >= 2;
    if (isKnown||isRecurring) {
      const avgAmt = rows.reduce((s,r)=>s+parseFloat(r.amount||0),0)/rows.length;
      const icon   = key.includes('netflix')?'📺':key.includes('spotify')?'🎵':key.includes('adobe')?'🎨':key.includes('amazon')?'📦':key.includes('apple')?'🍎':key.includes('google')?'🔍':'🔁';
      found.push({ name:rows[0].description, amount:avgAmt, icon, freq:'Monthly' });
    }
  });
  return found.slice(0,8);
}

function renderSpending() {
  const txns  = activeTransactions;
  const sym   = currencySymbol();
  const total = txns.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const el    = id => document.getElementById(id);
  if (el('spendTotal'))    el('spendTotal').textContent   = sym + fmtAmt(total);
  if (el('spendTxnCount')) el('spendTxnCount').textContent = txns.length;
  const catTotals = {};
  txns.forEach(r => { const c=r.category||'Uncategorized'; catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0); });
  const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
  if (el('spendTopCat')) el('spendTopCat').textContent = topCat?topCat[0]:'—';
  const now  = new Date();
  const days = now.getDate();
  const avgDay = days>0?(total/days):0;
  if (el('spendAvgDay')) el('spendAvgDay').textContent = sym+fmtAmt(avgDay);
  // Chart
  const sorted  = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const palette = ['#111210','#b83a20','#a87c1a','#1e6640','#1e3a7a','#5a3a8a','#8a6a4a','#6a8a4a'];
  if (spendChartInstance) { try { spendChartInstance.destroy(); } catch(e){} }
  const spendChartEl = document.getElementById('spendChart');
  if (spendChartEl) {
    const ctx = spendChartEl.getContext('2d');
    spendChartInstance = new Chart(ctx,{
      type:'bar',
      data:{ labels:sorted.map(e=>e[0]), datasets:[{data:sorted.map(e=>e[1]),backgroundColor:palette.slice(0,sorted.length),borderRadius:2}] },
      options:{ indexAxis:'y', plugins:{legend:{display:false}}, scales:{ x:{ticks:{callback:v=>sym+(v>=1000?(v/1000).toFixed(0)+'k':v)}}, y:{grid:{display:false}} } }
    });
  }
  // Breakdown
  const bd = el('spendBreakdown');
  if (bd) {
    bd.innerHTML = '';
    sorted.forEach(([cat,amt],i) => {
      const pct = total>0?((amt/total)*100).toFixed(1):'0.0';
      const div = document.createElement('div');
      div.className = 'cat-item';
      div.innerHTML = `<div class="cat-head"><span class="cat-name">${cat}</span><span class="cat-amt">${sym}${fmtAmt(amt)} <span style="opacity:.45">${pct}%</span></span></div>
        <div class="cat-track"><div class="cat-fill" style="width:0%;background:${palette[i%palette.length]}" data-w="${pct}"></div></div>`;
      bd.appendChild(div);
    });
    setTimeout(()=>bd.querySelectorAll('.cat-fill').forEach(b=>b.style.width=b.dataset.w+'%'),300);
  }
}

function renderSubscriptions() {
  const sym  = currencySymbol();
  const subs = detectSubscriptions();
  const el   = id => document.getElementById(id);
  const monthly  = subs.reduce((s,sub)=>s+sub.amount,0);
  const annual   = monthly*12;
  if (el('subMonthlyTotal')) el('subMonthlyTotal').textContent = sym+fmtAmt(monthly);
  if (el('subAnnualTotal'))  el('subAnnualTotal').textContent  = sym+fmtAmt(annual);
  if (el('subCount'))        el('subCount').textContent        = subs.length;
  const grid = el('subGrid');
  if (grid) {
    if (subs.length) {
      grid.innerHTML = subs.map(s=>`
        <div class="sub-card">
          <div class="sub-icon">${s.icon}</div>
          <div class="sub-name">${s.name}</div>
          <div class="sub-amt">${sym}${fmtAmt(s.amount)}/mo</div>
          <div class="sub-freq">${s.freq}</div>
        </div>`).join('');
    } else {
      grid.innerHTML = '<div class="empty"><div class="empty-icon">🔁</div><p>No recurring charges detected. Load more months of data to detect subscriptions.</p></div>';
    }
  }
}

function renderGoals() {
  const goals   = JSON.parse(localStorage.getItem('ledgerai_goals')||'[]');
  const content = document.getElementById('goalsContent');
  if (!content) return;
  if (!goals.length) {
    content.innerHTML = '<div class="empty"><div class="empty-icon">🎯</div><p>Add a savings goal to get started</p></div>';
    return;
  }
  content.innerHTML = goals.map((g,i) => {
    const pct = Math.min((g.current/g.target)*100,100).toFixed(0);
    return `<div class="savings-goal panel" style="margin-bottom:12px;">
      <div class="sg-header"><h3 class="sg-title">${g.name}</h3><span class="sg-pct">${pct}%</span></div>
      <div class="sg-track"><div class="sg-fill" style="width:${pct}%"></div></div>
      <div class="sg-labels"><span>${currencySymbol()}${fmtAmt(g.current)} saved</span><span>Goal: ${currencySymbol()}${fmtAmt(g.target)}</span></div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <input type="number" placeholder="Update amount" style="font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;border:1px solid var(--rule);background:var(--paper);width:120px;" id="goalAmt-${i}"/>
        <button class="btn btn-sm" onclick="updateGoal(${i})">Update</button>
        <button class="btn btn-sm btn-red" onclick="deleteGoal(${i})">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function addGoal() {
  const name   = prompt('Goal name (e.g. Emergency Fund, New Laptop):');
  if (!name) return;
  const target = parseFloat(prompt('Target amount ($):'));
  if (isNaN(target)||target<=0) { showToast('Invalid amount.'); return; }
  const goals = JSON.parse(localStorage.getItem('ledgerai_goals')||'[]');
  goals.push({ name, target, current:0 });
  localStorage.setItem('ledgerai_goals', JSON.stringify(goals));
  auditEntry('system','Savings goal added',name+' — target: '+currencySymbol()+fmtAmt(target));
  renderGoals();
  showToast('Goal added: '+name);
}

function updateGoal(index) {
  const goals = JSON.parse(localStorage.getItem('ledgerai_goals')||'[]');
  const amt   = parseFloat(document.getElementById('goalAmt-'+index)?.value||0);
  if (isNaN(amt)) return;
  goals[index].current = amt;
  localStorage.setItem('ledgerai_goals', JSON.stringify(goals));
  renderGoals();
  showToast('Goal updated.');
}

function deleteGoal(index) {
  if (!confirm('Delete this goal?')) return;
  const goals = JSON.parse(localStorage.getItem('ledgerai_goals')||'[]');
  goals.splice(index,1);
  localStorage.setItem('ledgerai_goals',JSON.stringify(goals));
  renderGoals();
}

// ============================================================
// SECTION 24: FREELANCER-SPECIFIC VIEWS
// ============================================================
function renderIncome() {
  const income = activeTransactions.filter(r=>r.category==='Income'||parseFloat(r.amount||0)<0);
  const sym    = currencySymbol();
  const tbody  = document.getElementById('incomeBody');
  if (!tbody) return;
  if (!income.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">No income transactions yet. Add transactions with category "Income".</td></tr>';
    return;
  }
  tbody.innerHTML = income.sort((a,b)=>b.date.localeCompare(a.date)).map(r =>
    `<tr>
      <td>${r.date}</td>
      <td>${r.description}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--green);">${sym}${fmtAmt(Math.abs(parseFloat(r.amount||0)))}</td>
      <td>${r.category}</td>
      <td><span class="badge b-ok">✓ Received</span></td>
    </tr>`
  ).join('');
}

function renderClients() {
  const income   = activeTransactions.filter(r=>r.category==='Income'||parseFloat(r.amount||0)<0);
  const sym      = currencySymbol();
  const clientMap = {};
  income.forEach(r => {
    const k = r.description||'Unknown';
    if (!clientMap[k]) clientMap[k] = { amount:0, date:r.date, payments:0 };
    clientMap[k].amount   += Math.abs(parseFloat(r.amount||0));
    clientMap[k].payments += 1;
    if (r.date>clientMap[k].date) clientMap[k].date=r.date;
  });
  const tbody = document.getElementById('flClientBody');
  if (!tbody) return;
  if (!Object.keys(clientMap).length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;">No clients yet. Add income transactions to track clients.</td></tr>';
    return;
  }
  tbody.innerHTML = Object.entries(clientMap).sort((a,b)=>b[1].amount-a[1].amount).map(([name,d]) => {
    const daysSince = Math.floor((Date.now()-new Date(d.date))/86400000);
    const status = daysSince<=30?'ct-paid':daysSince<=60?'ct-pending':'ct-overdue';
    const statusLabel = daysSince<=30?'✓ Recent':daysSince<=60?'⏳ Pending':'⚠ Overdue';
    return `<tr>
      <td>${name} <span style="font-size:10px;color:var(--muted);font-family:'IBM Plex Mono',monospace;">(${d.payments} payment${d.payments!==1?'s':''})</span></td>
      <td style="font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--green);">${sym}${fmtAmt(d.amount)}</td>
      <td><span class="ct-status ${status}">${statusLabel}</span></td>
      <td>${d.date}</td>
    </tr>`;
  }).join('');
}

function addClient() {
  showToast('Add income transactions with the client name as the description to track clients.');
}

function renderTaxes() {
  const txns   = activeTransactions;
  const sym    = currencySymbol();
  const income  = txns.filter(r=>r.category==='Income'||parseFloat(r.amount||0)<0);
  const expenses = txns.filter(r=>r.category!=='Income'&&parseFloat(r.amount||0)>0);
  const totalInc = income.reduce((s,r)=>s+Math.abs(parseFloat(r.amount||0)),0);
  const totalExp = expenses.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const netProfit = totalInc-totalExp;
  const taxEstimate = Math.max(0,netProfit*0.25);
  const el = id => document.getElementById(id);
  if (el('taxEstimate')) el('taxEstimate').textContent = sym+fmtAmt(taxEstimate);
  // Build quarterly data
  const quarters = {Q1:{income:0,expenses:0},Q2:{income:0,expenses:0},Q3:{income:0,expenses:0},Q4:{income:0,expenses:0}};
  txns.forEach(r => {
    const month = new Date(r.date||'').getMonth();
    const q = `Q${Math.floor(month/3)+1}`;
    const amt = parseFloat(r.amount||0);
    if (r.category==='Income'||amt<0) quarters[q].income += Math.abs(amt);
    else quarters[q].expenses += amt;
  });
  const tbody = el('taxBody');
  if (tbody) {
    tbody.innerHTML = Object.entries(quarters).map(([q,d]) => {
      const net = d.income-d.expenses;
      const tax = Math.max(0,net*0.25);
      return `<tr>
        <td style="font-weight:600;">${q}</td>
        <td style="font-family:'IBM Plex Mono',monospace;color:var(--green);">${sym}${fmtAmt(d.income)}</td>
        <td style="font-family:'IBM Plex Mono',monospace;color:var(--accent);">${sym}${fmtAmt(d.expenses)}</td>
        <td style="font-family:'IBM Plex Mono',monospace;font-weight:600;">${sym}${fmtAmt(net)}</td>
        <td style="font-family:'IBM Plex Mono',monospace;color:var(--gold);font-weight:600;">${tax>0?sym+fmtAmt(tax):'—'}</td>
      </tr>`;
    }).join('');
  }
}

// ============================================================
// SECTION 25: MANUAL ENTRY
// ============================================================
function toggleManualEntry() {
  const form = document.getElementById('manualEntryForm');
  if (form) form.style.display = form.style.display==='none'?'block':'none';
}

function addManualTransaction() {
  const date     = document.getElementById('mDate')?.value;
  const desc     = document.getElementById('mDesc')?.value.trim();
  const amount   = document.getElementById('mAmount')?.value;
  const category = document.getElementById('mCategory')?.value;
  const type     = document.getElementById('mType')?.value||'expense';
  if (!date||!amount) { showToast('Date and amount are required.'); return; }
  if (!desc) { showToast('Description is required.'); return; }
  // Determine period from date
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const d = new Date(date);
  const periodKey = isNaN(d) ? 'Manual Entry' : MONTH_NAMES[d.getMonth()]+' '+d.getFullYear();
  const finalAmount = type==='income' ? '-'+Math.abs(parseFloat(amount)) : String(Math.abs(parseFloat(amount)));
  const finalCat    = type==='income' ? 'Income' : (category||'Miscellaneous');
  const newRow = { date, description:desc, amount:finalAmount, category:finalCat, flag:'none', _edited:true };
  if (!periods[periodKey]) {
    periods[periodKey] = [];
    document.getElementById('periodSection').style.display='block';
  }
  periods[periodKey].push(newRow);
  if (activePeriod===periodKey) {
    activeTransactions.push(newRow);
    editCount++;
    updateEditBar();
  }
  updateSidebar();
  if (!activePeriod) activatePeriod(periodKey);
  else if (activePeriod===periodKey) applyFilters();
  auditEntry('edit','Manual transaction added',desc+' — '+currencySymbol()+fmtAmt(amount));
  saveTransactionsToCloud(periodKey,periods[periodKey]);
  document.getElementById('view-onboard').style.display='none';
  toggleManualEntry();
  showToast('Transaction added: '+desc);
  refreshDependentViews();
}

// ============================================================
// SECTION 26: EXPORT FUNCTIONS
// ============================================================
function exportCSV() {
  const txns = activeTransactions;
  if (!txns.length) return;
  const sym     = currencySymbol();
  const headers = ['Date','Description','Amount','Category','Debit Acct #','Debit Account','Credit Acct #','Credit Account','Journal Note','Flag'];
  const rows = txns.map(r => {
    const rule   = JOURNAL_RULES[r.category]||{dr:'6900',cr:'1000',note:''};
    const drAcct = COA[rule.dr]?.name||'';
    const crAcct = COA[rule.cr]?.name||'';
    return [r.date,`"${(r.description||'').replace(/"/g,'""')}"`,parseFloat(r.amount||0).toFixed(2),
      `"${r.category||''}"`,rule.dr,`"${drAcct}"`,rule.cr,`"${crAcct}"`,
      `"${rule.note||''}"`,`"${r.flag&&r.flag.toLowerCase()!=='none'?r.flag:'Clear'}"`
    ].join(',');
  });
  downloadFile([headers.join(','),...rows].join('\n'),'text/csv',`${settings.company.replace(/\s+/g,'-')}-transactions.csv`);
  auditEntry('export','Transactions CSV exported',activeTransactions.length+' rows');
  showToast('CSV exported.');
}

function exportPDF() {
  const txns = activeTransactions;
  if (!txns.length) return;
  const total   = txns.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const flagged = txns.filter(r=>r.flag&&r.flag.toLowerCase()!=='none').length;
  const sym     = currencySymbol();
  const period  = activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const rows    = txns.map(r => {
    const rule   = JOURNAL_RULES[r.category]||{dr:'6900',cr:'1000',note:''};
    const drAcct = COA[rule.dr]?.name||'';
    const crAcct = COA[rule.cr]?.name||'';
    const hasFlag = r.flag&&r.flag.toLowerCase()!=='none';
    return `<tr style="border-bottom:1px solid #eee;${hasFlag?'background:#fef8f7':''}">
      <td style="padding:6px 8px;font-size:11px;color:#888;white-space:nowrap;">${r.date}</td>
      <td style="padding:6px 8px;font-size:12px;font-weight:500;">${r.description}</td>
      <td style="padding:6px 8px;font-size:12px;font-family:monospace;white-space:nowrap;">${sym}${fmtAmt(r.amount)}</td>
      <td style="padding:6px 8px;font-size:11px;color:#555;">${r.category||'—'}</td>
      <td style="padding:6px 8px;font-size:10px;font-family:monospace;color:#1e3a7a;">Dr.${rule.dr} ${drAcct}</td>
      <td style="padding:6px 8px;font-size:10px;font-family:monospace;color:#b83a20;">Cr.${rule.cr} ${crAcct}</td>
      <td style="padding:6px 8px;font-size:10px;color:${hasFlag?'#b83a20':'#1e6640'};">${hasFlag?'⚠ '+r.flag:'✓'}</td>
    </tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><title>${settings.company} — Transaction Report</title>
  <style>body{font-family:Georgia,serif;color:#111;padding:44px;background:#fff;}
  h1{font-size:26px;margin-bottom:2px;}h2{font-size:14px;font-weight:400;color:#666;margin-bottom:24px;}
  .stats{display:flex;gap:36px;padding:14px 0;border-top:2px solid #111;border-bottom:1px solid #eee;margin-bottom:24px;}
  .s label{font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#888;display:block;margin-bottom:2px;}
  .s value{font-size:20px;}table{width:100%;border-collapse:collapse;}
  thead th{font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#888;padding:7px 8px;text-align:left;background:#f5f2ec;}
  @media print{body{padding:20px;}}</style></head><body>
  <h1>${settings.company}</h1>
  <h2>Transaction Report — ${period} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString()}</h2>
  <div class="stats">
    <div class="s"><label>Total Expenses</label><value>${sym}${fmt(total)}</value></div>
    <div class="s"><label>Transactions</label><value>${txns.length}</value></div>
    <div class="s"><label>Flagged</label><value style="color:#b83a20">${flagged}</value></div>
  </div>
  <table><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Category</th><th>Debit</th><th>Credit</th><th>Flag</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #eee;font-family:monospace;font-size:10px;color:#bbb;">
    Powered by LedgerAI · Claude AI · For demonstration purposes only
  </div></body></html>`;
  const w = window.open('','_blank'); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(),500);
  auditEntry('export','PDF report exported',period);
  showToast('PDF opened for printing.');
}

function downloadFile(content, type, filename) {
  const blob = new Blob([content],{type});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// SECTION 27: TOAST + HELPERS
// ============================================================
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ============================================================
// SECTION 28: INITIALIZATION
// ============================================================
// Initialize mobile sidebar
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen  = sidebar.classList.contains('open');
  sidebar.classList.toggle('open', !isOpen);
  overlay.classList.toggle('show', !isOpen);
}

function initMobile() {
  const toggle = document.getElementById('menuToggle');
  if (!toggle) return;
  const mq = window.matchMedia('(max-width: 900px)');
  const update = () => toggle.style.display = mq.matches ? 'flex' : 'none';
  mq.addEventListener('change', update);
  update();
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
      }
    });
  });
}

// Initialize COA (doesn't need data)
renderCOA();

// Initialize profile from localStorage
const savedProfile = localStorage.getItem('ledgerai_profile');
if (savedProfile) {
  currentProfile = savedProfile;
  document.body.setAttribute('data-profile', currentProfile);
  showProfileNav();
  // Update settings label
  const lbl = document.getElementById('currentProfileLabel');
  if (lbl) {
    const names = { student:'Student', freelancer:'Freelancer', business:'Small Business', professional:'Accounting Professional' };
    lbl.textContent = names[currentProfile]||currentProfile;
  }
} else {
  // Show profile selection overlay for new users
  const overlay = document.getElementById('profileSelectOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

// Initial audit entry
auditEntry('system', 'LedgerAI session started', 'v6.0 — ' + new Date().toLocaleDateString());

// Init mobile
initMobile();

// Initialize auth (async — handles Supabase auth and cloud data loading)
initAuth();