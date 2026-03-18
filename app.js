// ============================================================
// LEDGER AI — app.js  v7.0
// Universal parser · Precision rules engine · Excel export
// Privacy-first AI · Preloaded demo data · Four profiles
// ============================================================

// ============================================================
// SECTION 1: STATE + SETTINGS
// ============================================================
let settings = {
  company:        'Your Company',
  industry:       'Marketing / Creative Agency',
  fiscalYear:     '01',
  currency:       'CAD',
  aiMode:         'auto',
  plaidLinkToken: ''
};

let currentProfile    = 'business';
let periods           = {};
let activePeriod      = null;
let activeTransactions = [];
let originalSnapshot  = [];
let sortCol           = 'date';
let sortDir           = 'asc';
let editCount         = 0;
let filteredIndices   = [];
let auditLog          = [];
let bankStatementRows = [];
let budgets           = {};
let chartInstance     = null;
let spendChartInstance = null;
let sbClient          = null;
let currentUser       = null;
let sessionToken      = null;
let plaidHandler      = null;

// ============================================================
// SECTION 2: GAAP CHART OF ACCOUNTS
// ============================================================
const COA = {
  '1000': { name: 'Cash / Chequing Account',          type: 'Asset',     normalBal: 'Debit',  group: 'Current Assets' },
  '1010': { name: 'Savings Account',                   type: 'Asset',     normalBal: 'Debit',  group: 'Current Assets' },
  '1100': { name: 'Accounts Receivable',               type: 'Asset',     normalBal: 'Debit',  group: 'Current Assets' },
  '1200': { name: 'Prepaid Expenses',                  type: 'Asset',     normalBal: 'Debit',  group: 'Current Assets' },
  '1300': { name: 'Inventory',                         type: 'Asset',     normalBal: 'Debit',  group: 'Current Assets' },
  '1500': { name: 'Property & Equipment',              type: 'Asset',     normalBal: 'Debit',  group: 'Non-Current Assets' },
  '1510': { name: 'Accumulated Depreciation',          type: 'Asset',     normalBal: 'Credit', group: 'Non-Current Assets' },
  '2000': { name: 'Accounts Payable',                  type: 'Liability', normalBal: 'Credit', group: 'Current Liabilities' },
  '2100': { name: 'Accrued Payroll Liabilities',       type: 'Liability', normalBal: 'Credit', group: 'Current Liabilities' },
  '2200': { name: 'Payroll Tax Payable',               type: 'Liability', normalBal: 'Credit', group: 'Current Liabilities' },
  '2300': { name: 'HST/GST Payable',                   type: 'Liability', normalBal: 'Credit', group: 'Current Liabilities' },
  '2400': { name: 'Deferred Revenue',                  type: 'Liability', normalBal: 'Credit', group: 'Current Liabilities' },
  '3000': { name: "Owner's Equity",                    type: 'Equity',    normalBal: 'Credit', group: 'Equity' },
  '3100': { name: 'Retained Earnings',                 type: 'Equity',    normalBal: 'Credit', group: 'Equity' },
  '4000': { name: 'Service Revenue',                   type: 'Revenue',   normalBal: 'Credit', group: 'Revenue' },
  '4100': { name: 'Product Revenue',                   type: 'Revenue',   normalBal: 'Credit', group: 'Revenue' },
  '4200': { name: 'Other Income',                      type: 'Revenue',   normalBal: 'Credit', group: 'Revenue' },
  '5000': { name: 'Cost of Goods Sold',                type: 'Expense',   normalBal: 'Debit',  group: 'COGS' },
  '6000': { name: 'Salaries & Wages',                  type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6010': { name: 'Payroll Tax Expense (EI/CPP)',      type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6100': { name: 'Rent & Facilities',                 type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6200': { name: 'Advertising & Marketing',           type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6210': { name: 'Contractor / Prof. Services',       type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6220': { name: 'Legal & Professional Fees',         type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6300': { name: 'Software & Subscriptions',          type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6400': { name: 'Office Supplies & Equipment',       type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6500': { name: 'Meals & Entertainment',             type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6600': { name: 'Travel & Transportation',           type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6700': { name: 'Utilities & Hosting',               type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6800': { name: 'Bank & Finance Charges',            type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6850': { name: 'Insurance',                         type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6900': { name: 'Depreciation Expense',              type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6910': { name: 'Employee Benefits & Recognition',   type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6920': { name: 'Shipping & Courier',                type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
  '6950': { name: 'Miscellaneous Expense',             type: 'Expense',   normalBal: 'Debit',  group: 'Operating Expenses' },
};

const JOURNAL_RULES = {
  'Payroll':                            { dr: '6000', cr: '1000', note: 'Also debit 6010 / credit 2200 for EI/CPP remittance' },
  'Payroll Tax':                        { dr: '6010', cr: '2200', note: 'Employer portion of EI/CPP' },
  'Rent & Facilities':                  { dr: '6100', cr: '1000', note: '' },
  'Advertising & Marketing':            { dr: '6200', cr: '2000', note: '' },
  'Contractor / Professional Services': { dr: '6210', cr: '2000', note: 'Issue T4A if annual total ≥ $500 (CRA) / 1099-NEC if ≥ $600 (IRS)' },
  'Legal & Professional Fees':          { dr: '6220', cr: '2000', note: 'Verify deductibility — some legal fees must be capitalized' },
  'Software & Subscriptions':           { dr: '6300', cr: '1000', note: '' },
  'Office Supplies & Equipment':        { dr: '6400', cr: '1000', note: 'Items >$500 may require capitalization — verify with accountant' },
  'Meals & Entertainment':              { dr: '6500', cr: '1000', note: 'Only 50% deductible per CRA/IRS — retain all receipts' },
  'Travel & Transportation':            { dr: '6600', cr: '1000', note: '' },
  'Utilities & Hosting':                { dr: '6700', cr: '1000', note: '' },
  'Bank & Finance Charges':             { dr: '6800', cr: '1000', note: '' },
  'Insurance':                          { dr: '6850', cr: '1200', note: 'Debit prepaid if multi-period policy; amortize monthly' },
  'Employee Benefits & Recognition':    { dr: '6910', cr: '1000', note: 'Taxable benefit to employee if personal in nature' },
  'Shipping & Courier':                 { dr: '6920', cr: '1000', note: '' },
  'Miscellaneous':                      { dr: '6950', cr: '1000', note: 'Review and reclassify — do not leave in misc at period end' },
  'Income':                             { dr: '1000', cr: '4000', note: 'Revenue recognition — confirm delivery/service completion' },
  'Transfer':                           { dr: '1000', cr: '1000', note: 'Inter-account transfer — not an expense' },
  'Period-End Adjustment':              { dr: '2400', cr: '4000', note: 'Review adjusting entry with accountant before posting' },
};

const CATEGORIES = [
  'Payroll', 'Payroll Tax', 'Rent & Facilities', 'Advertising & Marketing',
  'Contractor / Professional Services', 'Legal & Professional Fees',
  'Software & Subscriptions', 'Office Supplies & Equipment', 'Meals & Entertainment',
  'Travel & Transportation', 'Utilities & Hosting', 'Bank & Finance Charges',
  'Insurance', 'Employee Benefits & Recognition', 'Shipping & Courier',
  'Miscellaneous', 'Income', 'Transfer', 'Period-End Adjustment'
];

const CF_CLASSIFICATION = {
  'Payroll': 'operating', 'Payroll Tax': 'operating', 'Rent & Facilities': 'operating',
  'Advertising & Marketing': 'operating', 'Contractor / Professional Services': 'operating',
  'Legal & Professional Fees': 'operating', 'Software & Subscriptions': 'operating',
  'Office Supplies & Equipment': 'investing', 'Meals & Entertainment': 'operating',
  'Travel & Transportation': 'operating', 'Utilities & Hosting': 'operating',
  'Bank & Finance Charges': 'financing', 'Insurance': 'operating',
  'Employee Benefits & Recognition': 'operating', 'Shipping & Courier': 'operating',
  'Miscellaneous': 'operating', 'Income': 'operating',
  'Transfer': 'financing', 'Period-End Adjustment': 'operating',
};

// ============================================================
// SECTION 3: PRECISION RULES ENGINE
// ============================================================
const RULES_ENGINE = [
  { pattern: /\bADP\b.*payroll|payroll.*\bADP\b|CERIDIAN|PAYLOCITY|GUSTO.*payroll|payroll.*run/i, category: 'Payroll', flag: 'none' },
  { pattern: /ADP.*employer.*tax|ADP.*tax.*remit|payroll.*tax.*remit|EI.*remit|CPP.*remit/i, category: 'Payroll Tax', flag: 'none' },
  { pattern: /WEWORK|REGUS|SPACES\s+OFFICE|IWG\s+OFFICE|rent.*office|office.*rent|lease.*office/i, category: 'Rent & Facilities', flag: 'none' },
  { pattern: /\bRENT\b|\bLEASE\b/i, category: 'Rent & Facilities', flag: 'none' },
  { pattern: /GOOGLE\s*(ADS|ADWORDS)|META\s*ADS|FACEBOOK\s*ADS|INSTAGRAM\s*ADS|LINKEDIN\s*ADS?|TIKTOK\s*ADS|PINTEREST\s*ADS|YOUTUBE\s*ADS|TWITTER\s*ADS|SNAPCHAT\s*ADS/i, category: 'Advertising & Marketing', flag: 'none' },
  { pattern: /MAILCHIMP|KLAVIYO|HUBSPOT|MARKETO|CONSTANT\s*CONTACT|SEMRUSH|AHREFS|MOZ\s+PRO/i, category: 'Advertising & Marketing', flag: 'none' },
  { pattern: /CONFERENCE.*REGIST|CMTO|sponsored\s+post|sponsorship|PR\s+FIRM|PRESS\s+RELEASE/i, category: 'Advertising & Marketing', flag: 'none' },
  { pattern: /FREELANCER\.COM|UPWORK|FIVERR|INV\s*#|INVOICE\s*#/i, category: 'Contractor / Professional Services', flag: 'Contractor payment — issue T4A if annual total ≥ $500 (CRA) or 1099-NEC if ≥ $600 (IRS)' },
  { pattern: /LEGAL\s*FEES?|LLP|BARRISTER|SOLICITOR|LAW\s+FIRM|LAWYER|NOTARY/i, category: 'Legal & Professional Fees', flag: 'Legal fees — verify tax deductibility; capital vs. revenue expenditure distinction required' },
  { pattern: /ADOBE\s*(CC|CREATIVE|STOCK|ACROBAT)|MICROSOFT\s*(365|OFFICE)|GOOGLE\s*WORKSPACE|SLACK|NOTION|FIGMA|CANVA|ZOOM|DROPBOX|BOX\.COM|GITHUB|GITLAB|JIRA|CONFLUENCE|ASANA|MONDAY\.COM|TRELLO|HUBSPOT|SALESFORCE|SHOPIFY|SQUARESPACE|WORDPRESS|WOOCOMMERCE|XERO|QUICKBOOKS|FRESHBOOKS|WAVE\s*APP/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /NETFLIX|SPOTIFY|APPLE\.COM\/BILL|AMAZON\s*PRIME|DISNEY\+|HULU|HBO|PARAMOUNT|CRAVE|APPLE\s*TV|YOUTUBE\s*PREMIUM/i, category: 'Software & Subscriptions', flag: 'Personal subscription — verify business use before claiming as deduction' },
  { pattern: /ANTHROPIC|OPENAI|CHATGPT|MIDJOURNEY|RUNWAY|ELEVEN\s*LABS|PERPLEXITY/i, category: 'Software & Subscriptions', flag: 'AI tool subscription — deductible if used for business purposes' },
  { pattern: /AWS|AMAZON\s*WEB\s*SERVICES|GOOGLE\s*CLOUD|AZURE|DIGITALOCEAN|CLOUDFLARE|HEROKU|VERCEL|NETLIFY/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /RESTAURANT|BISTRO|BRASSERIE|TAVERN|GRILL|STEAKHOUSE|SUSHI|RAMEN|POUTINE|PIZZERIA|CANOE\s+RESTAURANT|NANDO|WHOLE\s*FOODS.*CATER|CATERING/i, category: 'Meals & Entertainment', flag: 'Meals & entertainment — only 50% deductible per CRA/IRS. Retain receipt with business purpose noted.' },
  { pattern: /TIM\s*HORTONS|STARBUCKS|MCDONALDS|MCDONALD'S|SUBWAY|CHICK.FIL.A|KFC|BURGER\s*KING|A&W|WENDY'S|POPEYES|BARBURRITO|GINO'S\s*PIZZA|THE\s*CHEF/i, category: 'Meals & Entertainment', flag: 'Meals & entertainment — only 50% deductible. Retain receipt with business purpose noted.' },
  { pattern: /CLIENT\s*(DINNER|LUNCH|BREAKFAST|GIFT|ENTERTAIN)|TEAM\s*(LUNCH|DINNER|BREAKFAST)|OFFICE\s*(LUNCH|DINNER)/i, category: 'Meals & Entertainment', flag: 'Meals & entertainment — only 50% deductible per CRA/IRS. Retain receipt with business purpose noted.' },
  { pattern: /DELTA\s*AIRLINES|AIR\s*CANADA|WESTJET|PORTER|UNITED\s*AIRLINES|AMERICAN\s*AIRLINES|SOUTHWEST|RYANAIR|EASYJET|LUFTHANSA|KLM|BRITISH\s*AIRWAYS/i, category: 'Travel & Transportation', flag: 'none' },
  { pattern: /AIRBNB|MARRIOTT|HILTON|WESTIN|SHERATON|HYATT|HAMPTON\s*INN|BEST\s*WESTERN|HOTEL\s*LE\s*GERMAIN|IHG/i, category: 'Travel & Transportation', flag: 'none' },
  { pattern: /UBER\s*CAN(?!ADA\/UBE\s*_V.*REV)|LYFT|TAXI|AIRPORT\s*TRANSFER/i, category: 'Travel & Transportation', flag: 'none' },
  { pattern: /UBER\s*CANADA\/UBE\s*_V|UBER\s*CANADA\/UBE\s*_F|UBER\*\s*TRIP/i, category: 'Travel & Transportation', flag: 'none' },
  { pattern: /PRESTO\s*MOBL|PRESTO\s*CARD|TRANSIT|TTC|GO\s*TRAIN|VIA\s*RAIL|METRO\s*PASS/i, category: 'Travel & Transportation', flag: 'none' },
  { pattern: /UBER\s*CAN\s*REV/i, category: 'Travel & Transportation', flag: 'Uber refund/reversal detected — verify original charge and confirm net amount is correct' },
  { pattern: /STAPLES\s*(BUSINESS)?|BEST\s*BUY|OFFICE\s*DEPOT|CANADA\s*COMPUTERS|MEMORY\s*EXPRESS|AMAZON\s*BUSINESS/i, category: 'Office Supplies & Equipment', flag: 'Equipment purchases >$500 may require capitalization under CRA/IRS rules — consult accountant' },
  { pattern: /IKEA\s*(BUSINESS)?|STANDING\s*DESK|OFFICE\s*FURNITURE|ERGONOMIC/i, category: 'Office Supplies & Equipment', flag: 'Furniture purchase — items >$500 may require capitalization. Verify useful life for CCA class.' },
  { pattern: /COMCAST|ROGERS|BELL\s*(CANADA)?|TELUS|SHAW|COGECO|VIDEOTRON|INTERNET|PHONE.*BUSINESS|BUSINESS.*PHONE/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /COINAMATIC|LAUNDRY/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /HYDRO|ELECTRICITY|NATURAL\s*GAS|ENBRIDGE|TORONTO\s*HYDRO|BC\s*HYDRO/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /STRIPE\s*FEES?|SQUARE\s*FEES?|PAYPAL\s*FEES?|MERCHANT\s*FEES?|PAYMENT\s*PROCESSING/i, category: 'Bank & Finance Charges', flag: 'none' },
  { pattern: /AMEX.*FEE|WIRE\s*(TRANSFER|FEE)|BANK.*FEE|ACCOUNT\s*FEE|NSF\s*FEE|LATE\s*PAYMENT\s*FEE|FOREIGN.*TRANSACTION/i, category: 'Bank & Finance Charges', flag: 'none' },
  { pattern: /RBC.*FEE|TD.*FEE|BMO.*FEE|CIBC.*FEE|SCOTIABANK.*FEE/i, category: 'Bank & Finance Charges', flag: 'none' },
  { pattern: /COINBASE|BINANCE|CRYPTO|BITCOIN|ETHEREUM/i, category: 'Bank & Finance Charges', flag: 'Cryptocurrency transaction — capital gains/losses may apply. Consult tax advisor for CRA/IRS treatment.' },
  { pattern: /INSURANCE|LIABILITY\s*INS|CYBER\s*(RISK|INS)|E&O\s*INS|COMMERCIAL\s*INS/i, category: 'Insurance', flag: 'Multi-period insurance policy — verify if prepaid portion should be deferred to Prepaid Expenses (1200)' },
  { pattern: /EMPLOYEE\s*(RECOGNITION|AWARD|GIFT|BONUS|APPRECIATION)|TEAM\s*(BUILDING|EVENT|OUTING)/i, category: 'Employee Benefits & Recognition', flag: 'Employee benefit — amounts >$500/year per employee may be a taxable benefit under CRA rules' },
  { pattern: /PUROLATOR|FEDEX|UPS|CANADA\s*POST|USPS|DHL|CANPAR/i, category: 'Shipping & Courier', flag: 'none' },
  { pattern: /DEFERRED\s*REVENUE|PREPAID.*RECLASS|RECLASSIF|ADJUSTING\s*ENTRY|PERIOD.*END|YEAR.*END.*CLEANUP|ACCRUAL/i, category: 'Period-End Adjustment', flag: 'Period-end adjusting entry — review with accountant before finalizing.' },
  { pattern: /E-TRANSFER\s+\*{3}[A-Z0-9]{3,}|SEND\s+E-TFR/i, category: 'Transfer', flag: 'E-transfer — confirm if business income, personal transfer, or contractor payment', checkDeposit: true },
  { pattern: /CLIENT\s*PAYMENT|INVOICE\s*PAID|DEPOSIT|REVENUE|INCOME\b/i, category: 'Income', flag: 'none', onlyIfDeposit: true },
  { pattern: /TFR.TO\s*C\/C|TRANSFER\s*TO|INTER.*TRANSFER|JW\d+\s*TFR/i, category: 'Transfer', flag: 'Inter-account transfer — not an expense, exclude from P&L' },
  { pattern: /SEVERANCE|TERMINATION\s*PAY|WRONGFUL\s*DISMISS/i, category: 'Payroll', flag: '⚠ SEVERANCE PAYMENT — required disclosure in financial statements.' },
  { pattern: /GOOGLE\s*ANALYTICS\s*360|ANNUAL\s*(SETUP|LICENSE|SUBSCRIPTION)\b/i, category: 'Software & Subscriptions', flag: 'Large annual prepayment — consider deferring prepaid portion to Prepaid Expenses (1200)' },
  { pattern: /REFUND|REVERSAL|CREDIT\s*APPLIED|CREDIT\s*NOTE/i, category: 'Miscellaneous', flag: 'Credit/reversal — match to original transaction and net against that category', isCredit: true },
];

// ============================================================
// SECTION 4: PRECISION RULES CATEGORIZER
// ============================================================
function applyRulesEngine(description, amount, isDeposit) {
  const amt  = parseFloat(amount || 0);
  const isNeg = amt < 0;
  const desc = (description || '').toUpperCase();

  for (const rule of RULES_ENGINE) {
    if (!rule.pattern.test(desc)) continue;
    if (rule.onlyIfExpense  && isDeposit) continue;
    if (rule.onlyIfDeposit  && !isDeposit) continue;
    if (rule.checkDeposit) {
      const cat  = isDeposit ? 'Income' : 'Contractor / Professional Services';
      const flag = isDeposit
        ? 'E-transfer deposit — confirm if business income or personal'
        : 'E-transfer payment — issue T4A if contractor annual total ≥ $500 (CRA)';
      return { category: cat, flag, source: 'rules' };
    }
    let flag = rule.flag;
    if (Math.abs(amt) > 5000 && flag && !flag.includes('⚠')) {
      flag += ' · Large transaction (>$5,000) — verify authorization on file.';
    }
    if (isNeg && flag && !rule.isCredit) {
      flag += ' · Negative amount — credit or reversal detected, verify against original charge.';
    }
    return { category: rule.category, flag: flag || 'none', source: 'rules' };
  }
  return null;
}

function sanitizeForAI(description) {
  return description
    .replace(/\b[A-Z0-9]{3,}\s*\*{3}[A-Z0-9]{2,6}/gi, '[MASKED_REF]')
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[MASKED_CARD]')
    .replace(/\b\d{7,}\b/g, '[MASKED_NUM]')
    .replace(/_[VFM]\b/g, '')
    .trim();
}

// ============================================================
// SECTION 5: UNIVERSAL DATE PARSER
// ============================================================
function parseDate(s) {
  if (!s) return '';
  s = String(s).trim();
  if (!s || /^(STARTING BALANCE|BALANCE FORWARD|OPENING BALANCE|CLOSING BALANCE)$/i.test(s)) return '';

  if (/^\d{5}$/.test(s)) {
    const d = new Date((parseInt(s) - 25569) * 86400 * 1000);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{8}$/.test(s)) return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);

  const tdMatch = s.match(/^([A-Z]{3})(\d{2})(?:\/(\d{2}))?$/i);
  if (tdMatch) {
    const MONTHS = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
    const mon = MONTHS[tdMatch[1].toUpperCase()];
    if (mon) {
      const day = tdMatch[2].padStart(2,'0');
      const yr  = tdMatch[3] ? (parseInt(tdMatch[3]) > 50 ? '19' : '20') + tdMatch[3] : new Date().getFullYear().toString();
      return `${yr}-${mon}-${day}`;
    }
  }

  const MONTHS = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  const m1 = s.match(/^([A-Za-z]{3})\W+(\d{1,2})\W+(\d{2,4})$/);
  if (m1 && MONTHS[m1[1].toLowerCase()]) {
    const mon = MONTHS[m1[1].toLowerCase()]; let day = m1[2], yr = m1[3];
    if (yr.length === 2 && parseInt(yr) < parseInt(day)) [yr,day] = [day,yr];
    if (yr.length === 2) yr = (parseInt(yr) > 50 ? '19':'20') + yr;
    return `${yr}-${mon}-${day.padStart(2,'0')}`;
  }
  const m2 = s.match(/^(\d{1,2})\W+([A-Za-z]{3})\W+(\d{2,4})$/);
  if (m2 && MONTHS[m2[2].toLowerCase()]) {
    const mon = MONTHS[m2[2].toLowerCase()]; let day = m2[1], yr = m2[3];
    if (yr.length === 2) yr = (parseInt(yr) > 50 ? '19':'20') + yr;
    return `${yr}-${mon}-${day.padStart(2,'0')}`;
  }
  const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slash) {
    let [,a,b,y] = slash;
    if (y.length === 2) y = (parseInt(y) > 50 ? '19':'20') + y;
    const d = new Date(`${y}-${a.padStart(2,'0')}-${b.padStart(2,'0')}`);
    if (!isNaN(d)) return d.toISOString().slice(0,10);
  }
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0,10);
  return s;
}

// ============================================================
// SECTION 6: UNIVERSAL AMOUNT PARSER
// ============================================================
function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  let s = String(raw).trim();
  if (!s) return null;
  const negative = s.startsWith('(') && s.endsWith(')');
  s = s.replace(/[\$£€¥₹]|CA\$/g,'').replace(/[()\s]/g,'').replace(/,/g,'').trim();
  if (!s) return null;
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -Math.abs(n) : n;
}

// ============================================================
// SECTION 7: UNIVERSAL COLUMN NORMALIZER
// ============================================================
function normalizeColumns(rows) {
  if (!rows.length) return [];
  const sample = rows[0];
  const keyMap = {};
  Object.keys(sample).forEach(k => {
    const c = k.toLowerCase().trim().replace(/[\s\-\/\(\)#]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
    keyMap[c] = k;
  });
  const has = (...keys) => keys.find(k => keyMap[k] !== undefined);
  const dateKey   = has('date','transaction_date','trans_date','posting_date','value_date','entry_date','tran_date','txn_date','effective_date','settlement_date');
  const nameKey   = has('name','payee','vendor','supplier','merchant','memo','description','desc','details','transaction','narration','particulars','transaction_description','trans_desc','reference','remarks');
  const debitKey  = has('debit','dr','withdrawals','withdrawal','charges','payments','payment','debit_amount','amount_debit','out');
  const creditKey = has('credit','cr','deposits','deposit','receipts','receipt','credit_amount','amount_credit','in');
  const amtKey    = has('amount','amt','value','sum','net_amount','transaction_amount');
  const catKey    = has('category','cat','type','expense_type','account','account_name','gl_account','account_code');
  const flagKey   = has('flag','note','notes','review','comment','status');
  const result = [];

  rows.forEach(row => {
    const get = key => key ? String(row[keyMap[key]] !== undefined ? row[keyMap[key]] : '').trim() : '';
    const rawDesc = get(nameKey) || '';
    if (/^(STARTING BALANCE|BALANCE FORWARD|OPENING BALANCE|CLOSING BALANCE)$/i.test(rawDesc.trim())) return;
    if (!get(dateKey) && !rawDesc) return;
    const date = parseDate(get(dateKey));
    const desc = rawDesc || 'Unknown Transaction';
    let amount = null, isDeposit = false;
    if (amtKey) {
      amount = parseAmount(get(amtKey));
    } else if (debitKey || creditKey) {
      const deb = parseAmount(get(debitKey));
      const cre = parseAmount(get(creditKey));
      if (deb && Math.abs(deb) > 0) {
        amount = Math.abs(deb); isDeposit = false;
      } else if (cre && Math.abs(cre) > 0) {
        amount = -Math.abs(cre); isDeposit = true;
      }
    }
    if (amount === null || isNaN(amount) || amount === 0) return;
    result.push({ date, description: desc, amount: String(amount), category: get(catKey) || '', flag: get(flagKey) || 'none', _isDeposit: isDeposit });
  });
  return result;
}

// ============================================================
// SECTION 8: DUPLICATE + REVERSAL DETECTION
// ============================================================
function levenshteinSimilarity(a,b) {
  const m=a.length,n=b.length; if(!m&&!n) return 1;
  const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return 1-dp[m][n]/Math.max(m,n);
}

function detectDuplicatesAndReversals(transactions) {
  const flagged = new Set();
  transactions.forEach((txA, i) => {
    transactions.forEach((txB, j) => {
      if (j <= i || flagged.has(i) || flagged.has(j)) return;
      const amtA = parseFloat(txA.amount || 0), amtB = parseFloat(txB.amount || 0);
      const dateA = new Date(txA.date || ''), dateB = new Date(txB.date || '');
      const dayDiff = Math.abs((dateA - dateB) / 86400000);
      if (Math.abs(amtA + amtB) < 0.01 && dayDiff <= 14) {
        if (!txA.flag || txA.flag === 'none') txA.flag = 'Reversal pair detected — matches transaction on ' + txB.date + '.';
        if (!txB.flag || txB.flag === 'none') txB.flag = 'Reversal pair detected — matches transaction on ' + txA.date + '.';
        flagged.add(i); flagged.add(j); return;
      }
      const descA = (txA.description || '').toLowerCase().replace(/[^a-z0-9]/g,'');
      const descB = (txB.description || '').toLowerCase().replace(/[^a-z0-9]/g,'');
      const sameAmt = Math.abs(amtA - amtB) < 0.01, closeDt = dayDiff <= 7;
      const simDesc = descA.length > 4 && descB.length > 4 && (descA.includes(descB.slice(0,6)) || descB.includes(descA.slice(0,6)) || levenshteinSimilarity(descA,descB) > 0.75);
      if (sameAmt && closeDt && simDesc && !flagged.has(j)) {
        txB.flag = '⚠ Potential duplicate of ' + txA.date + ' — ' + txA.description + '. Verify before posting.';
        flagged.add(j);
      }
    });
  });
  return transactions;
}

// ============================================================
// SECTION 9: CONTRACTOR T4A AGGREGATOR
// ============================================================
function checkContractorThresholds(transactions) {
  const contractors = {};
  transactions.forEach((tx, i) => {
    if (tx.category !== 'Contractor / Professional Services') return;
    const amt = parseFloat(tx.amount || 0); if (amt <= 0) return;
    const name = tx.description.replace(/INV\s*#[A-Z0-9-]+/gi,'').replace(/INVOICE\s*#[A-Z0-9-]+/gi,'').trim();
    if (!contractors[name]) contractors[name] = { total: 0, indices: [] };
    contractors[name].total += amt; contractors[name].indices.push(i);
  });
  Object.entries(contractors).forEach(([name, data]) => {
    if (data.total >= 500) {
      data.indices.forEach(idx => {
        const existing = transactions[idx].flag || 'none';
        const threshold = data.total >= 600
          ? `T4A / 1099-NEC REQUIRED — ${name} paid ${currencySymbol()}${fmt(data.total)} total (≥ $500 CRA / ≥ $600 IRS)`
          : `T4A threshold approaching — ${name} paid ${currencySymbol()}${fmt(data.total)} total. T4A required if annual total ≥ $500.`;
        transactions[idx].flag = existing !== 'none' && !existing.includes('T4A') ? existing + ' · ' + threshold : threshold;
      });
    }
  });
  return transactions;
}

// ============================================================
// SECTION 10: FILE HANDLING
// ============================================================
function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  showToast('Reading ' + file.name + '…');
  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = e => {
      const cleaned = stripJunkHeaders(e.target.result);
      Papa.parse(cleaned, { header: true, skipEmptyLines: true, dynamicTyping: false,
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
        const wb = XLSX.read(new Uint8Array(e.target.result), { type:'array', cellDates:true });
        let bestRows = [];
        wb.SheetNames.forEach(sn => {
          const rows = normalizeColumns(XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval:'', raw:false }));
          if (rows.length > bestRows.length) bestRows = rows;
        });
        if (!bestRows.length) { showToast('⚠ No valid rows found. Check your Excel file.'); return; }
        processData(bestRows, file.name);
      } catch(err) { showToast('⚠ Error reading Excel file: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  } else { showToast('Unsupported file type. Use CSV, XLSX, or XLS.'); }
}

function stripJunkHeaders(text) {
  const lines = text.split('\n');
  const headerKeywords = /date|description|amount|debit|credit|category|memo|payee|transaction|balance|withdrawal/i;
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    if (headerKeywords.test(lines[i])) return lines.slice(i).join('\n');
  }
  return text;
}

function processData(rawData, filename) {
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  rawData = rawData.map(row => {
    if (!row.category) {
      const isDeposit = row._isDeposit || parseFloat(row.amount || 0) < 0;
      const result = applyRulesEngine(row.description, row.amount, isDeposit);
      if (result) { row.category = result.category; if (!row.flag || row.flag === 'none') row.flag = result.flag; row._rulesMatched = true; }
    }
    return row;
  });
  rawData = detectDuplicatesAndReversals(rawData);
  const monthCounts = {};
  rawData.forEach(r => {
    if (!r.date) return;
    const d = new Date(r.date); if (isNaN(d)) return;
    const key = MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear();
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });
  let periodKey = (filename || '').replace(/\.[^.]+$/, '') || 'Imported';
  if (Object.keys(monthCounts).length > 0) periodKey = Object.entries(monthCounts).sort((a,b)=>b[1]-a[1])[0][0];
  if (periods[periodKey]) {
    const existingSet = new Set(periods[periodKey].map(r => r.date+'|'+r.description+'|'+r.amount));
    const newRows = rawData.filter(r => !existingSet.has(r.date+'|'+r.description+'|'+r.amount));
    if (!newRows.length) { showToast(periodKey + ' already loaded — no new rows found.'); activatePeriod(periodKey); return; }
    periods[periodKey] = [...periods[periodKey], ...newRows];
    showToast('✓ ' + periodKey + ' updated — ' + newRows.length + ' new rows added');
    auditEntry('load','File merged into existing period', periodKey + ' +' + newRows.length + ' rows');
  } else {
    periods[periodKey] = rawData;
    const ruled = rawData.filter(r=>r._rulesMatched).length;
    showToast(`✓ ${periodKey} — ${rawData.length} transactions, ${ruled} auto-categorized`);
    auditEntry('load','File loaded', filename + ' — ' + rawData.length + ' rows → ' + periodKey);
  }
  document.getElementById('periodSection').style.display = 'block';
  document.getElementById('view-onboard').style.display  = 'none';
  document.getElementById('topbarCompany').textContent = settings.company !== 'Your Company' ? settings.company : periodKey;
  updateSidebar(); activatePeriod(periodKey);
  setTimeout(() => saveTransactionsToCloud(periodKey, periods[periodKey]), 1500);
}

function activatePeriod(key) {
  activePeriod = key;
  let data = key === '__ytd__' ? Object.values(periods).flat() : (periods[key] || []);
  activeTransactions = data.map(r => ({...r}));
  originalSnapshot   = data.map(r => ({...r}));
  editCount = 0;
  activeTransactions = checkContractorThresholds(activeTransactions);
  populateCategoryFilter(); populateAddFormCategories();
  document.querySelectorAll('.period-item').forEach(el => el.classList.toggle('active', el.dataset.key === key));
  const ytdBtn = document.getElementById('ytdBtn');
  if (ytdBtn) ytdBtn.classList.toggle('active', key === '__ytd__');
  const activeNav = document.querySelector('.nav-item.active');
  const viewId = activeNav?.id?.replace('nav-','') || getProfileDashboard();
  renderView(viewId);
  if (settings.aiMode !== 'off') {
    const uncategorized = activeTransactions.map((r,i)=>({r,i})).filter(({r})=>!r.category||r.category===''||r.category==='Uncategorized');
    if (uncategorized.length > 0) {
      showToast(`⚡ AI categorizing ${uncategorized.length} remaining transactions…`);
      uncategorized.forEach(({r,i}, k) => setTimeout(() => aiCategorize(r, i), k * 900));
    }
  }
}

function addPeriodToSidebar(period, count) {
  const list = document.getElementById('periodList');
  if (!list) return;
  const div = document.createElement('div');
  div.className = 'period-item' + (period === activePeriod ? ' active' : '');
  div.dataset.key = period;
  div.innerHTML = '<span>' + period + '</span><span class="period-item-count">' + count + ' txn</span>';
  div.onclick = () => activatePeriod(period);
  list.appendChild(div);
  document.getElementById('periodSection').style.display = 'block';
}

function updateSidebar() {
  const list = document.getElementById('periodList'); if (!list) return;
  list.innerHTML = '';
  const MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  Object.entries(periods).sort((a,b)=>{
    const parse = k => { const p = k.split(' '); return (parseInt(p[1])||0)*12 + MN.indexOf(p[0]); };
    return parse(a[0]) - parse(b[0]);
  }).forEach(([key, txns]) => {
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
// SECTION 11: PRELOADED DEMO DATA
// ============================================================
const DEMO_DATA = {
  student: [
    {date:'2024-11-01',description:'UBER CANADA/UBE _V',amount:'5.90',category:'Travel & Transportation',flag:'none'},
    {date:'2024-11-01',description:'UBER CANADA/UBE _V',amount:'39.39',category:'Travel & Transportation',flag:'none'},
    {date:'2024-11-01',description:'SULTANS MEDITERRANEAN KITCHEN',amount:'9.04',category:'Meals & Entertainment',flag:'Meals & entertainment — only 50% deductible. Retain receipt with business purpose noted.'},
    {date:'2024-11-04',description:'UBER CANADA/UBE _V',amount:'39.14',category:'Travel & Transportation',flag:'none'},
    {date:'2024-11-04',description:'CHICK-FIL-A KITCHENER',amount:'38.26',category:'Meals & Entertainment',flag:'Meals & entertainment — only 50% deductible. Retain receipt with business purpose noted.'},
    {date:'2024-11-04',description:'MCDONALDS #471',amount:'46.52',category:'Meals & Entertainment',flag:'Meals & entertainment — only 50% deductible. Retain receipt with business purpose noted.'},
    {date:'2024-11-05',description:'COINAMATIC-300 LAUNDRY',amount:'10.00',category:'Utilities & Hosting',flag:'none'},
    {date:'2024-11-06',description:'NEIGHBOURS MARKET WATERLOO',amount:'8.10',category:'Miscellaneous',flag:'none'},
    {date:'2024-11-07',description:'BARBURRITO',amount:'14.68',category:'Meals & Entertainment',flag:'Meals & entertainment — only 50% deductible. Retain receipt with business purpose noted.'},
    {date:'2024-11-07',description:'QR VAPE WATERLOO',amount:'35.02',category:'Miscellaneous',flag:'Personal expense — non-deductible'},
    {date:'2024-11-08',description:'THE CHEF SIGNATURE',amount:'13.55',category:'Meals & Entertainment',flag:'none'},
    {date:'2024-11-08',description:'APPLE.COM/BILL',amount:'1.46',category:'Software & Subscriptions',flag:'Personal subscription — verify business use before claiming as deduction'},
    {date:'2024-11-12',description:'SULTANS MEDITERRANEAN KITCHEN',amount:'9.04',category:'Meals & Entertainment',flag:'none'},
    {date:'2024-11-14',description:'SHOPPERS DRUG MART',amount:'24.05',category:'Miscellaneous',flag:'Personal expense — health & personal care'},
    {date:'2024-11-15',description:'KRONICLEZ WATERLOO',amount:'40.59',category:'Miscellaneous',flag:'Personal expense — non-deductible'},
    {date:'2024-11-15',description:'UBER CANADA/UBE _V',amount:'17.27',category:'Travel & Transportation',flag:'none'},
    {date:'2024-11-15',description:'PRESTO MOBL TRANSIT',amount:'10.00',category:'Travel & Transportation',flag:'none'},
    {date:'2024-11-18',description:'APPLE.COM/BILL',amount:'24.85',category:'Software & Subscriptions',flag:'Personal subscription — verify business use before claiming as deduction'},
    {date:'2024-11-18',description:'UBER CANADA/UBE _V',amount:'17.00',category:'Travel & Transportation',flag:'none'},
    {date:'2024-11-18',description:'BUDDIES CANNABIS WATERLOO',amount:'36.16',category:'Miscellaneous',flag:'Personal expense — cannabis purchases are non-deductible'},
    {date:'2024-11-21',description:'STARBUCKS',amount:'25.00',category:'Meals & Entertainment',flag:'Meals & entertainment — only 50% deductible. Retain receipt with business purpose noted.'},
    {date:'2024-11-22',description:'KFC/TB CONESTOGA',amount:'6.78',category:'Meals & Entertainment',flag:'none'},
    {date:'2024-11-25',description:'SHOPPERS DRUG MART',amount:'8.24',category:'Miscellaneous',flag:'Personal expense — health & personal care'},
    {date:'2024-11-25',description:'TIM HORTONS #01',amount:'8.45',category:'Meals & Entertainment',flag:'none'},
    {date:'2024-11-26',description:'COINBASE CRYPTO',amount:'5.00',category:'Bank & Finance Charges',flag:'Cryptocurrency purchase — capital gains/losses may apply. Consult tax advisor for CRA treatment.'},
    {date:'2024-11-29',description:"GINO'S PIZZA",amount:'28.97',category:'Meals & Entertainment',flag:'none'},
    {date:'2024-11-29',description:'APPLE.COM/BILL',amount:'10.16',category:'Software & Subscriptions',flag:'Personal subscription — verify business use before claiming as deduction'},
    {date:'2024-11-01',description:'E-TRANSFER DEPOSIT - PARENTS',amount:'-60.00',category:'Income',flag:'E-transfer deposit — personal transfer from family'},
    {date:'2024-11-12',description:'E-TRANSFER DEPOSIT - TUTORING',amount:'-150.00',category:'Income',flag:'E-transfer deposit — confirm if income should be reported to CRA'},
    {date:'2024-11-28',description:'E-TRANSFER DEPOSIT - OSAP',amount:'-1000.00',category:'Income',flag:'OSAP deposit — student loan, not taxable income'},
  ],
  freelancer: [
    {date:'2025-01-03',description:'ADOBE CC - CREATIVE CLOUD ANNUAL',amount:'659.88',category:'Software & Subscriptions',flag:'none'},
    {date:'2025-01-03',description:'FIGMA - PROFESSIONAL PLAN',amount:'180.00',category:'Software & Subscriptions',flag:'none'},
    {date:'2025-01-06',description:'CLIENT PAYMENT - BEACON RETAIL INV #2024-041',amount:'-3500.00',category:'Income',flag:'Client invoice payment — confirm HST collected and remitted to CRA'},
    {date:'2025-01-08',description:'HOME OFFICE INTERNET - BELL',amount:'89.99',category:'Utilities & Hosting',flag:'Home office — only business-use percentage deductible (T2125)'},
    {date:'2025-01-12',description:'CLIENT LUNCH - CANOE RESTAURANT',amount:'124.00',category:'Meals & Entertainment',flag:'Meals & entertainment — only 50% deductible per CRA. Retain receipt with business purpose noted.'},
    {date:'2025-01-22',description:'CLIENT PAYMENT - NOVA STUDIOS INV #2025-001',amount:'-2200.00',category:'Income',flag:'Client invoice payment — confirm HST collected and remitted to CRA'},
    {date:'2025-01-28',description:'BANK FEE - RBC BUSINESS ACCOUNT',amount:'6.00',category:'Bank & Finance Charges',flag:'none'},
    {date:'2025-02-03',description:'CLIENT PAYMENT - BEACON RETAIL INV #2025-002',amount:'-3500.00',category:'Income',flag:'Client invoice payment — confirm HST collected and remitted to CRA'},
    {date:'2025-02-07',description:'HOME OFFICE INTERNET - BELL',amount:'89.99',category:'Utilities & Hosting',flag:'Home office — only business-use percentage deductible (T2125)'},
    {date:'2025-02-12',description:'SUBCONTRACTOR - JAMES OKAFOR INV #JO-001',amount:'800.00',category:'Contractor / Professional Services',flag:'T4A / 1099-NEC REQUIRED — James Okafor paid $800.00 total (≥ $500 CRA threshold)'},
    {date:'2025-02-14',description:'CLIENT PAYMENT - GREENWAVE CO INV #2025-003',amount:'-5800.00',category:'Income',flag:'Client invoice payment — confirm HST collected and remitted to CRA'},
    {date:'2025-02-22',description:'PROFESSIONAL LIABILITY INSURANCE - ANNUAL',amount:'680.00',category:'Insurance',flag:'Multi-period insurance policy — consider deferring unused portion to Prepaid Expenses (1200)'},
    {date:'2025-02-25',description:'CHATGPT PLUS - MONTHLY',amount:'28.00',category:'Software & Subscriptions',flag:'AI tool subscription — deductible if used for business purposes'},
    {date:'2025-02-28',description:'PAYPAL FEES - INVOICE PROCESSING',amount:'84.22',category:'Bank & Finance Charges',flag:'none'},
    {date:'2025-03-01',description:'CLIENT PAYMENT - NOVA STUDIOS INV #2025-004',amount:'-4400.00',category:'Income',flag:'Client invoice payment — confirm HST collected and remitted to CRA'},
    {date:'2025-03-05',description:'SUBCONTRACTOR - JAMES OKAFOR INV #JO-002',amount:'800.00',category:'Contractor / Professional Services',flag:'T4A / 1099-NEC REQUIRED — James Okafor paid $1,600.00 total (≥ $500 CRA threshold)'},
    {date:'2025-03-07',description:'STANDING DESK - AMAZON BUSINESS',amount:'489.00',category:'Office Supplies & Equipment',flag:'Equipment purchase — items >$500 may require capitalization under CRA rules. Consult accountant.'},
    {date:'2025-03-10',description:'CLIENT PAYMENT - BEACON RETAIL INV #2025-005',amount:'-3500.00',category:'Income',flag:'Client invoice payment — confirm HST collected and remitted to CRA'},
    {date:'2025-03-15',description:'CLIENT PAYMENT - GREENWAVE CO INV #2025-006',amount:'-6200.00',category:'Income',flag:'Client invoice payment — confirm HST collected and remitted to CRA'},
    {date:'2025-03-25',description:'CHATGPT PLUS - MONTHLY',amount:'28.00',category:'Software & Subscriptions',flag:'AI tool subscription — deductible if used for business purposes'},
    {date:'2025-03-28',description:'BANK FEE - RBC BUSINESS ACCOUNT',amount:'6.00',category:'Bank & Finance Charges',flag:'none'},
    {date:'2025-03-30',description:'HST REMITTANCE - Q1 2025',amount:'2808.00',category:'Bank & Finance Charges',flag:'⚠ HST/GST remittance to CRA — confirm amount matches HST collected less input tax credits (ITCs)'},
    {date:'2025-03-31',description:'NEW LAPTOP - APPLE MACBOOK PRO M3',amount:'2799.00',category:'Office Supplies & Equipment',flag:'⚠ Potential capital expenditure — laptop >$500, useful life >1 year. Consider CCA Class 10 (30%) treatment.'},
  ],
  business: [],
  professional: [],
};

function loadDemoData(profile) {
  const data = DEMO_DATA[profile];
  if (!data || !data.length) { loadNorthgateDemo(); return; }
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const grouped = {};
  data.forEach(row => {
    const d = new Date(row.date); if (isNaN(d)) return;
    const key = MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  });
  Object.entries(grouped).forEach(([key, rows]) => { periods[key] = rows; });
  updateSidebar();
  document.getElementById('periodSection').style.display = 'block';
  document.getElementById('view-onboard').style.display  = 'none';
  const firstPeriod = Object.keys(grouped)[0];
  if (firstPeriod) activatePeriod(firstPeriod);
  auditEntry('load', 'Demo data loaded', profile + ' profile — ' + data.length + ' transactions');
  showToast(`✓ ${profile.charAt(0).toUpperCase()+profile.slice(1)} demo loaded — explore all the tools`);
}

function loadNorthgateDemo() {
  fetch('/sample-data/northgate-creative-q1-2024.csv')
    .then(r => r.text())
    .then(text => {
      Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false,
        complete: r => {
          let rows = normalizeColumns(r.data);
          rows = rows.map(row => {
            if (!row.category) {
              const result = applyRulesEngine(row.description, row.amount, false);
              if (result) { row.category = result.category; if (!row.flag || row.flag === 'none') row.flag = result.flag; }
            }
            return row;
          });
          rows = detectDuplicatesAndReversals(rows);
          processData(rows, 'northgate-creative-q1-2024.csv');
          showToast('✓ Northgate Creative Q1 2024 — 169 transactions loaded');
        }
      });
    })
    .catch(() => showToast('Load the Northgate CSV from sample-data/ to see the business demo'));
}

// ============================================================
// SECTION 12: PROFILE SYSTEM
// ============================================================
function selectProfile(profileId) {
  if (profileId) { currentProfile = profileId; localStorage.setItem('ledgerai_profile', profileId); }
  document.body.setAttribute('data-profile', currentProfile);
  const overlay = document.getElementById('profileSelectOverlay');
  if (overlay) overlay.classList.add('hidden');
  showProfileNav();
  const lbl = document.getElementById('currentProfileLabel');
  if (lbl) { const names={student:'Student',freelancer:'Freelancer',business:'Small Business',professional:'Accounting Professional'}; lbl.textContent = names[currentProfile] || currentProfile; }
  auditEntry('system','Profile selected', currentProfile);
  if (!activeTransactions.length) {
    const wantDemo = confirm(`Load demo data for the ${currentProfile} profile?\n\nOK = demo data · Cancel = start fresh`);
    if (wantDemo) loadDemoData(currentProfile); else showView('onboard');
  } else { showView(getProfileDashboard()); }
}

function showProfileNav() {
  document.querySelectorAll('[data-profile-show]').forEach(el => el.style.display = 'none');
  const section = document.querySelector(`[data-profile-show="${currentProfile}"]`);
  if (section) section.style.display = 'block';
}

function switchProfile() {
  const overlay = document.getElementById('profileSelectOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

function getProfileDashboard() {
  return { student:'student-dashboard', freelancer:'fl-dashboard', business:'dashboard', professional:'dashboard' }[currentProfile] || 'dashboard';
}

// ============================================================
// SECTION 13: VIEW ROUTING
// ============================================================
const VIEWS = [
  'onboard','dashboard','transactions','trialbalance','coa','flags','settings',
  'pl','cashflow','budget','reconcile','duplicates','audit','workingpapers','memo',
  'student-dashboard','spending','subscriptions','goals',
  'fl-dashboard','income','clients','taxes'
];

function showView(name) {
  VIEWS.forEach(v => { const el = document.getElementById('view-'+v); if(el) el.style.display='none'; });
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById('nav-'+name);
  if (navBtn) navBtn.classList.add('active');
  const view = document.getElementById('view-'+name);
  if (view) { view.style.display = 'block'; view.classList.remove('view-enter'); void view.offsetWidth; view.classList.add('view-enter'); }
  renderView(name);
}

function renderView(name) {
  const noDataViews = ['settings','coa','onboard','student-dashboard','fl-dashboard','goals','subscriptions'];
  if (!activeTransactions.length && !noDataViews.includes(name)) return;
  const map = {
    dashboard: renderDashboard, transactions: renderTransactions,
    trialbalance: renderTrialBalance, coa: renderCOA, flags: renderFlags,
    settings: loadSettingsForm, pl: renderPL, cashflow: renderCashFlow,
    budget: renderBudgetVsActual, reconcile: renderReconcileSetup,
    duplicates: runDuplicateDetection, audit: renderAuditTrail,
    workingpapers: renderWorkingPapers,
    'student-dashboard': renderStudentDashboard, spending: renderSpending,
    subscriptions: renderSubscriptions, goals: renderGoals,
    'fl-dashboard': renderFreelancerDashboard, income: renderIncome,
    clients: renderClients, taxes: renderTaxes,
  };
  if (map[name]) map[name]();
}

// ============================================================
// SECTION 14: AUDIT TRAIL
// ============================================================
function auditEntry(type, action, detail, before, after) {
  detail=detail||''; before=before||''; after=after||'';
  const now=new Date();
  const ts=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':'+String(now.getSeconds()).padStart(2,'0');
  auditLog.unshift({timestamp:ts,type,action,detail,before,after});
  if(auditLog.length>500) auditLog=auditLog.slice(0,500);
  const badge=document.getElementById('auditBadge'); if(badge) badge.textContent=auditLog.length;
}

function renderAuditTrail() {
  const body=document.getElementById('auditLogBody');
  const count=document.getElementById('auditEntryCount');
  if(!body) return;
  if(count) count.textContent=auditLog.length+' entries';
  if(!auditLog.length){body.innerHTML='<div class="empty"><div class="empty-icon">📋</div><p>No activity yet</p></div>';return;}
  const META={load:{tag:'at-load',dot:'#2a4a9a'},edit:{tag:'at-edit',dot:'#3a6adf'},ai:{tag:'at-ai',dot:'#a87c1a'},delete:{tag:'at-delete',dot:'#b83a20'},export:{tag:'at-export',dot:'#1e6640'},revert:{tag:'at-revert',dot:'#8c8478'},system:{tag:'at-load',dot:'#444'},flag:{tag:'at-flag',dot:'#c0321a'}};
  body.innerHTML=auditLog.map(e=>{
    const m=META[e.type]||META.system;
    return `<div class="audit-log-entry"><div class="audit-log-dot" style="background:${m.dot}"></div><div class="audit-log-time">${e.timestamp}</div>
      <div style="flex:1"><div class="audit-log-msg">${e.action}${e.detail?' — <strong>'+e.detail+'</strong>':''}</div>
      ${e.before?`<span class="audit-log-before">Before: ${e.before}${e.after?' → After: '+e.after:''}</span>`:''}</div>
      <span class="audit-log-tag ${m.tag}">${e.type.charAt(0).toUpperCase()+e.type.slice(1)}</span></div>`;
  }).join('');
}

function exportAuditPDF() {
  if(!auditLog.length){showToast('Nothing to export.');return;}
  const rows=auditLog.map(e=>`<tr style="border-bottom:1px solid #eee"><td style="padding:7px 10px;font-family:monospace;font-size:10px;color:#888;white-space:nowrap">${e.timestamp}</td><td style="padding:7px 10px;font-family:monospace;font-size:10px;text-transform:uppercase">${e.type}</td><td style="padding:7px 10px;font-size:12px">${e.action}${e.detail?' — '+e.detail:''}</td><td style="padding:7px 10px;font-size:11px;color:#888">${e.before?e.before+(e.after?' → '+e.after:''):''}</td></tr>`).join('');
  const html=`<!DOCTYPE html><html><head><title>Audit Trail — ${settings.company}</title><style>body{font-family:Georgia,serif;color:#111;padding:44px}h1{font-size:22px;margin-bottom:4px}p{color:#666;font-size:13px;margin-bottom:28px}table{width:100%;border-collapse:collapse}thead th{font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#888;padding:9px 10px;text-align:left;background:#f5f2ec;border-bottom:2px solid #111}@media print{body{padding:20px}}</style></head><body><h1>${settings.company} — Audit Trail</h1><p>Generated ${new Date().toLocaleString()} · ${auditLog.length} entries · LedgerAI v7.0</p><table><thead><tr><th>Timestamp</th><th>Type</th><th>Action</th><th>Before / After</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
  auditEntry('export','Audit Trail PDF exported',auditLog.length+' entries');
}

function clearAuditLog() {
  if(!confirm('Clear the audit trail? This is permanent.')) return;
  auditLog=[]; renderAuditTrail(); showToast('Audit trail cleared.');
}

// ============================================================
// SECTION 15: DASHBOARD RENDERS
// ============================================================
function renderDashboard() {
  const txns=activeTransactions;
  const expenses=txns.filter(r=>parseFloat(r.amount||0)>0);
  const total=expenses.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const flagged=txns.filter(r=>r.flag&&r.flag.toLowerCase()!=='none'&&!r.flag.includes('50%')).length;
  const sym=currencySymbol();
  const label=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const el=id=>document.getElementById(id);
  if(el('statTotal'))     el('statTotal').textContent    =sym+fmtAmt(total);
  if(el('statCount'))     el('statCount').textContent    =txns.length;
  if(el('statFlagged'))   el('statFlagged').textContent  =flagged;
  if(el('statPeriod'))    el('statPeriod').textContent   =label;
  if(el('dashPeriodLabel')) el('dashPeriodLabel').textContent=label;
  document.querySelectorAll('[id^="sidebarFlagBadge"]').forEach(b=>b.textContent=flagged);
  const {balanced}=calcTrialBalance(txns);
  if(el('statBalance'))    el('statBalance').textContent    =balanced?'✓ Balanced':'⚠ Off';
  if(el('statBalanceSub')) el('statBalanceSub').textContent =balanced?'Dr = Cr':'Check entries';
  if(el('statBalance'))    el('statBalance').style.color    =balanced?'var(--green)':'var(--accent)';
  setTimeout(()=>{document.querySelectorAll('.stat-card').forEach(c=>c.classList.add('in'));document.querySelectorAll('.panel').forEach(c=>c.classList.add('in'));},50);
  const catTotals={};
  expenses.forEach(r=>{const c=r.category||'Uncategorized';catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0);});
  const sorted=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const palette=['#c8341c','#1c3e80','#a87820','#1e6640','#5a3a8a','#8a6a4a','#0e6868','#6a8a4a','#4a8a8a','#8a4a4a','#4a4a8a','#c8a040'];
  if(chartInstance){try{chartInstance.destroy();}catch(e){}}
  const catChartEl=document.getElementById('catChart');
  if(catChartEl){
    const ctx=catChartEl.getContext('2d');
    chartInstance=new Chart(ctx,{type:'bar',data:{labels:sorted.map(e=>e[0]),datasets:[{data:sorted.map(e=>e[1]),backgroundColor:palette.slice(0,sorted.length),borderRadius:2,borderSkipped:false}]},options:{indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>'  '+sym+fmt(c.parsed.x)}}},scales:{x:{grid:{color:'#e4ddd0'},ticks:{font:{family:'IBM Plex Mono',size:10},color:'#8c8478',callback:v=>sym+(v>=1000?(v/1000).toFixed(0)+'k':v)}},y:{grid:{display:false},ticks:{font:{family:'IBM Plex Sans',size:11},color:'#111210'}}}}});
  }
  const bd=document.getElementById('catBreakdown');
  if(bd){
    bd.innerHTML='';
    sorted.forEach(([cat,amt],i)=>{
      const pct=total>0?((amt/total)*100).toFixed(1):'0.0';
      const div=document.createElement('div'); div.className='cat-item';
      div.innerHTML=`<div class="cat-head"><span class="cat-name">${cat}</span><span class="cat-amt">${sym}${fmtAmt(amt)} <span style="opacity:.45">${pct}%</span></span></div><div class="cat-track"><div class="cat-fill" style="width:0%;background:${palette[i%palette.length]}" data-w="${pct}"></div></div>`;
      bd.appendChild(div);
    });
    setTimeout(()=>bd.querySelectorAll('.cat-fill').forEach(b=>b.style.width=b.dataset.w+'%'),300);
  }
}

function renderStudentDashboard() {
  const txns=activeTransactions;
  const expenses=txns.filter(r=>parseFloat(r.amount||0)>0);
  const total=expenses.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const sym=currencySymbol();
  const el=id=>document.getElementById(id);
  if(el('studentHeroAmount')) el('studentHeroAmount').textContent=sym+fmtAmt(total);
  if(el('studentHeroSub'))    el('studentHeroSub').textContent=expenses.length+' transactions this period';
  let vibe=total<500?'You\'re doing great — keep it up! 🌟':total<1500?'Steady spending — check your budget 👀':'Big month — review your categories 📊';
  if(!txns.length) vibe='Load your bank statement or use demo data to get started';
  if(el('studentVibe')) el('studentVibe').textContent=vibe;
  const catTotals={};
  expenses.forEach(r=>{const c=r.category||'Uncategorized';catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0);});
  const topCat=Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
  if(el('sdTopCat'))    el('sdTopCat').textContent    =topCat?topCat[0]:'—';
  if(el('sdTxnCount')) el('sdTxnCount').textContent  =expenses.length;
  const now=new Date();
  if(el('sdDaysLeft')) el('sdDaysLeft').textContent  =(new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate())+' days';
  const bars=document.getElementById('studentBudgetBars');
  if(bars&&expenses.length){
    bars.innerHTML=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([cat,amt])=>{
      const budget=budgets[cat]||300;
      const pct=Math.min((amt/budget)*100,150).toFixed(0);
      const isOver=amt>budget;
      return `<div class="bb-row"><div class="bb-label"><span>${cat}</span><span>${sym}${fmtAmt(amt)}</span></div><div class="bva-bar-track"><div class="bva-bar-fill" style="width:0%;background:${isOver?'var(--accent)':'var(--green)'}" data-w="${pct}"></div></div></div>`;
    }).join('');
    setTimeout(()=>document.querySelectorAll('#studentBudgetBars .bva-bar-fill').forEach(b=>b.style.width=b.dataset.w+'%'),200);
  }
  const subGrid=document.getElementById('studentSubGrid');
  if(subGrid){
    const subs=detectSubscriptions();
    subGrid.innerHTML=subs.length?subs.map(s=>`<div class="sub-card"><div class="sub-icon">${s.icon}</div><div class="sub-name">${s.name}</div><div class="sub-amt">${sym}${fmtAmt(s.amount)}/mo</div></div>`).join(''):'<div class="empty"><div class="empty-icon">🔁</div><p>No recurring charges detected yet</p></div>';
  }
}

function renderFreelancerDashboard() {
  const txns=activeTransactions;
  const sym=currencySymbol();
  const incTxns=txns.filter(r=>parseFloat(r.amount||0)<0||r.category==='Income');
  const expTxns=txns.filter(r=>parseFloat(r.amount||0)>0&&r.category!=='Income'&&r.category!=='Transfer');
  const totalInc=incTxns.reduce((s,r)=>s+Math.abs(parseFloat(r.amount||0)),0);
  const totalExp=expTxns.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const profit=totalInc-totalExp;
  const tax=Math.max(0,profit*0.25);
  const el=id=>document.getElementById(id);
  if(el('flIncome'))    el('flIncome').textContent    =sym+fmtAmt(totalInc);
  if(el('flExpenses'))  el('flExpenses').textContent  =sym+fmtAmt(totalExp);
  if(el('flProfit'))    el('flProfit').textContent    =sym+fmtAmt(profit);
  if(el('flTaxAmt'))    el('flTaxAmt').textContent    =sym+fmtAmt(tax);
  if(el('statCount'))   el('statCount').textContent   =txns.length;
  if(el('statFlagged')) el('statFlagged').textContent =txns.filter(r=>r.flag&&r.flag!=='none').length;
  const {balanced}=calcTrialBalance(txns);
  if(el('statBalance'))    el('statBalance').textContent    =balanced?'✓ Balanced':'⚠ Off';
  if(el('statBalanceSub')) el('statBalanceSub').textContent =balanced?'Dr = Cr':'Check entries';
  const now=new Date();
  const q=Math.floor(now.getMonth()/3)+1;
  if(el('flQuarterVal')) el('flQuarterVal').textContent=`Q${q} ${now.getFullYear()} — ${sym}${fmtAmt(totalInc)}`;
  const clientBody=el('flClientBody');
  if(clientBody&&incTxns.length){
    const clientMap={};
    incTxns.forEach(r=>{
      const k=r.description.replace(/INV\s*#[^\s]+/i,'').replace(/INVOICE\s*#[^\s]+/i,'').trim();
      if(!clientMap[k]) clientMap[k]={amount:0,date:r.date,payments:0};
      clientMap[k].amount+=Math.abs(parseFloat(r.amount||0)); clientMap[k].payments+=1;
      if(r.date>clientMap[k].date) clientMap[k].date=r.date;
    });
    clientBody.innerHTML=Object.entries(clientMap).sort((a,b)=>b[1].amount-a[1].amount).map(([name,d])=>{
      const days=Math.floor((Date.now()-new Date(d.date))/86400000);
      const status=days<=30?'ct-paid':days<=60?'ct-pending':'ct-overdue';
      const lbl=days<=30?'✓ Recent':days<=60?'⏳ Pending':'⚠ Overdue';
      return `<div class="client-tracker-row"><span class="ct-name">${name}</span><span class="ct-amount">${sym}${fmtAmt(d.amount)}</span><span class="ct-status ${status}">${lbl}</span><span>${d.date}</span></div>`;
    }).join('');
  }
}

// ============================================================
// SECTION 16: TRANSACTIONS VIEW
// ============================================================
function renderTransactions() {
  const lbl=document.getElementById('txnPeriodLabel');
  if(lbl) lbl.textContent=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  populateCategoryFilter(); applyFilters(); updateEditBar();
}

function populateCategoryFilter() {
  const sel=document.getElementById('filterCategory'); if(!sel) return;
  const used=[...new Set(activeTransactions.map(r=>r.category).filter(Boolean))].sort();
  sel.innerHTML='<option value="">All Categories</option>'+used.map(c=>`<option value="${c}">${c}</option>`).join('');
}

function populateAddFormCategories() {
  const sel=document.getElementById('nCat'); if(!sel) return;
  sel.innerHTML='<option value="">— Select Category —</option>'+CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('');
}

function applyFilters() {
  const query=(document.getElementById('searchInput')?.value||'').toLowerCase();
  const catF=document.getElementById('filterCategory')?.value||'';
  const flagF=document.getElementById('filterFlag')?.value||'';
  const tbody=document.getElementById('txnBody'); if(!tbody) return;
  tbody.innerHTML=''; filteredIndices=[];
  let sorted=activeTransactions.map((r,i)=>({r,i}));
  sorted.sort((a,b)=>{
    let av=a.r[sortCol]||'',bv=b.r[sortCol]||'';
    if(sortCol==='amount'){av=parseFloat(av||0);bv=parseFloat(bv||0);}
    if(av<bv) return sortDir==='asc'?-1:1; if(av>bv) return sortDir==='asc'?1:-1; return 0;
  });
  sorted.forEach(({r,i})=>{
    const matchSearch=!query||(r.description||'').toLowerCase().includes(query)||(r.category||'').toLowerCase().includes(query)||(r.date||'').includes(query)||String(r.amount||'').includes(query);
    const matchCat=!catF||r.category===catF;
    const hasFlag=r.flag&&r.flag.toLowerCase()!=='none';
    const matchFlag=!flagF||(flagF==='flagged'&&hasFlag)||(flagF==='clear'&&!hasFlag);
    if(matchSearch&&matchCat&&matchFlag){filteredIndices.push(i);tbody.appendChild(buildRow(r,i));}
  });
  const cnt=document.getElementById('txnCount');
  if(cnt) cnt.textContent=filteredIndices.length+' of '+activeTransactions.length+' transactions';
}

function sortTable(col) {
  if(sortCol===col) sortDir=sortDir==='asc'?'desc':'asc'; else{sortCol=col;sortDir='asc';}
  applyFilters();
}

function buildRow(row, index) {
  const tr=document.createElement('tr'); tr.id=`row-${index}`;
  const hasFlag=row.flag&&row.flag.toLowerCase()!=='none';
  const isDeposit=parseFloat(row.amount||0)<0;
  if(hasFlag) tr.classList.add('row-flagged');
  if(row._edited) tr.classList.add('row-edited');
  const jEntry=buildJournalEntry(row.category,row.amount);
  const amtDisplay=isDeposit
    ?`<span style="color:var(--green)">+${currencySymbol()}${fmtAmt(Math.abs(parseFloat(row.amount||0)))}</span>`
    :`${currencySymbol()}${fmtAmt(row.amount)}`;
  tr.innerHTML=`
    <td class="td-date"><span class="editable" onclick="editCell(${index},'date',this)">${row.date||'—'}</span></td>
    <td class="td-desc"><span class="editable" onclick="editCell(${index},'description',this)">${row.description||'—'}</span></td>
    <td class="td-amt"><span class="editable" onclick="editCell(${index},'amount',this)">${amtDisplay}</span></td>
    <td class="td-cat" id="cat-${index}"><span class="editable" onclick="editCat(${index},this)">${row.category||'<span style="color:var(--rule);font-style:italic">Uncategorized</span>'}</span></td>
    <td class="td-acct" id="jrn-${index}">${jEntry.html}</td>
    <td id="flg-${index}">${hasFlag?`<span class="badge b-flag" title="${row.flag}">⚠ Flag</span>`:`<span class="badge b-ok">✓ Clear</span>`}</td>
    <td class="td-acts"><button class="btn btn-xs btn-red" onclick="deleteRow(${index})">✕</button></td>`;
  return tr;
}

function editCell(index, field, span) {
  const row=activeTransactions[index]; if(!row) return;
  const cur=field==='amount'?row.amount:(row[field]||'');
  const input=document.createElement('input');
  input.className='edit-in'; input.value=cur;
  span.replaceWith(input); input.focus(); input.select();
  const _before=field==='amount'?row.amount:(row[field]||'');
  function save(){
    const val=input.value.trim();
    const _after=field==='amount'?(val.replace(/[^0-9.\-]/g,'')||'0'):val;
    if(_after!==_before) auditEntry('edit','Field "'+field+'" edited on',row.description||'Row '+index,_before,_after);
    if(field==='amount') row.amount=_after; else row[field]=val;
    markEdited(index); reRenderRow(index); refreshDependentViews();
  }
  input.addEventListener('blur',save);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}if(e.key==='Escape'){input.value=cur;input.blur();}});
}

function editCat(index, span) {
  const row=activeTransactions[index];
  const sel=document.createElement('select'); sel.className='edit-sel';
  sel.innerHTML='<option value="">— Select —</option>'+CATEGORIES.map(c=>`<option value="${c}" ${c===row.category?'selected':''}>${c}</option>`).join('');
  span.replaceWith(sel); sel.focus();
  const _before=row.category||'Uncategorized';
  function save(){
    if(sel.value&&sel.value!==_before){auditEntry('edit','Category changed on',row.description||'Row '+index,_before,sel.value);row.category=sel.value;}
    else if(sel.value) row.category=sel.value;
    markEdited(index); reRenderRow(index); refreshDependentViews();
  }
  sel.addEventListener('blur',save); sel.addEventListener('change',save);
}

function markEdited(index){
  if(!activeTransactions[index]._edited){activeTransactions[index]._edited=true;editCount++;updateEditBar();}
}

function updateEditBar(){
  const bar=document.getElementById('editBar'); if(!bar) return;
  if(editCount>0){bar.style.display='flex';const lbl=document.getElementById('editCountLabel');if(lbl)lbl.textContent=editCount+(editCount===1?' edit':' edits');}
  else bar.style.display='none';
}

function deleteRow(index){
  if(!confirm('Delete this transaction?')) return;
  const row=activeTransactions[index];
  auditEntry('delete','Transaction deleted',(row.description||'Row '+index)+' — '+currencySymbol()+fmtAmt(Math.abs(parseFloat(row.amount||0))));
  const deleted=activeTransactions.splice(index,1)[0];
  if(activePeriod==='__ytd__'){Object.keys(periods).forEach(pk=>{periods[pk]=periods[pk].filter(r=>!(r.date===deleted.date&&r.description===deleted.description&&r.amount===deleted.amount));});}
  else if(activePeriod) periods[activePeriod]=activeTransactions.map(r=>({...r}));
  applyFilters(); refreshDependentViews(); showToast('Row deleted.');
}

function addRow(){
  const date=document.getElementById('nDate')?.value.trim();
  const desc=document.getElementById('nDesc')?.value.trim();
  const amt=document.getElementById('nAmt')?.value.trim();
  const cat=document.getElementById('nCat')?.value||'';
  const flag=document.getElementById('nFlag')?.value.trim()||'none';
  if(!date||!desc||!amt){showToast('Date, description, and amount are required.');return;}
  const newRow={date,description:desc,amount:amt,category:cat,flag,_edited:true};
  activeTransactions.push(newRow);
  if(activePeriod&&activePeriod!=='__ytd__') periods[activePeriod].push(newRow);
  editCount++; updateEditBar(); applyFilters(); refreshDependentViews();
  auditEntry('edit','Row added manually',desc+' — '+currencySymbol()+fmtAmt(amt));
  ['nDate','nDesc','nAmt','nFlag'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const nCat=document.getElementById('nCat'); if(nCat) nCat.value='';
  toggleAddForm(); showToast('Transaction added.');
  saveTransactionsToCloud(activePeriod,periods[activePeriod]);
}

function toggleAddForm(){const form=document.getElementById('addForm');if(form)form.classList.toggle('open');}

function revertAll(){
  auditEntry('revert','All edits reverted',activePeriod||'',editCount+' edits discarded');
  activeTransactions=originalSnapshot.map(r=>({...r}));
  if(activePeriod&&activePeriod!=='__ytd__') periods[activePeriod]=activeTransactions.map(r=>({...r}));
  editCount=0; updateEditBar(); applyFilters(); refreshDependentViews();
  showToast('All edits reverted to original data.');
}

function reRenderRow(index){const old=document.getElementById(`row-${index}`);if(old)old.replaceWith(buildRow(activeTransactions[index],index));}

function refreshDependentViews(){
  const active=document.querySelector('.nav-item.active')?.id?.replace('nav-','');
  if(['dashboard','dashboard-p'].includes(active)) renderDashboard();
  if(['trialbalance','trialbalance-p'].includes(active)) renderTrialBalance();
  if(['flags','flags-p','flags-s','flags-f'].includes(active)) renderFlags();
  if(active==='student-dashboard') renderStudentDashboard();
  if(active==='fl-dashboard') renderFreelancerDashboard();
  refreshAllBadges();
}

function refreshAllBadges(){
  const flagged=activeTransactions.filter(r=>r.flag&&r.flag.toLowerCase()!=='none').length;
  document.querySelectorAll('[id^="sidebarFlagBadge"]').forEach(b=>b.textContent=flagged);
  const ab=document.getElementById('auditBadge'); if(ab) ab.textContent=auditLog.length;
}

// ============================================================
// SECTION 17: TRIAL BALANCE
// ============================================================
function calcTrialBalance(txns){
  const accounts={};
  txns.forEach(row=>{
    const rule=JOURNAL_RULES[row.category];
    const amount=Math.abs(parseFloat(row.amount||0));
    if(!rule||amount===0) return;
    if(!accounts[rule.dr]) accounts[rule.dr]={debit:0,credit:0};
    if(!accounts[rule.cr]) accounts[rule.cr]={debit:0,credit:0};
    accounts[rule.dr].debit+=amount; accounts[rule.cr].credit+=amount;
  });
  const totDr=Object.values(accounts).reduce((s,v)=>s+v.debit,0);
  const totCr=Object.values(accounts).reduce((s,v)=>s+v.credit,0);
  return{accounts,totDr,totCr,balanced:Math.abs(totDr-totCr)<0.01};
}

function renderTrialBalance(){
  const{accounts,totDr,totCr,balanced}=calcTrialBalance(activeTransactions);
  const sym=currencySymbol();
  const label=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl=document.getElementById('tbPeriodLabel'); if(lbl) lbl.textContent=label;
  const tbody=document.getElementById('tbBody'); if(!tbody) return;
  tbody.innerHTML='';
  Object.entries(accounts).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([code,vals])=>{
    const acct=COA[code]||{name:code,type:'—',group:'—'};
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><div class="tb-acct">${acct.name}</div></td><td><span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--blue);font-weight:600">${code}</span></td><td><span class="coa-type">${acct.type}</span></td><td class="tb-dr">${vals.debit>0?sym+fmtAmt(vals.debit):'—'}</td><td class="tb-cr">${vals.credit>0?sym+fmtAmt(vals.credit):'—'}</td>`;
    tbody.appendChild(tr);
  });
  const tdr=document.getElementById('tbTotalDr'); if(tdr) tdr.textContent=sym+fmtAmt(totDr);
  const tcr=document.getElementById('tbTotalCr'); if(tcr) tcr.textContent=sym+fmtAmt(totCr);
  const uncatCount=activeTransactions.filter(r=>!r.category||r.category===''||r.category==='Uncategorized').length;
  const notice=document.getElementById('tbNotice');
  if(notice){
    notice.style.display='flex'; notice.className='tb-notice '+(balanced?'ok':'err');
    let text=balanced?`✓ Trial balance is balanced — total debits equal total credits (${sym}${fmt(totDr)})`:`⚠ Out of balance — difference of ${sym}${fmt(Math.abs(totDr-totCr))}. Review uncategorized or flagged transactions.`;
    if(uncatCount>0) text+=`  ·  ${uncatCount} uncategorized transaction${uncatCount>1?'s':''} excluded.`;
    notice.textContent=text;
  }
}

function exportTrialBalanceCSV(){
  if(!activeTransactions.length) return;
  const{accounts,totDr,totCr}=calcTrialBalance(activeTransactions);
  const sym=currencySymbol();
  const headers=['Acct Code','Account Name','Type','Normal Balance','Debit','Credit'];
  const rows=Object.entries(accounts).sort((a,b)=>a[0].localeCompare(b[0])).map(([code,v])=>{
    const acct=COA[code]||{name:code,type:'—',normalBal:'—'};
    return[code,`"${acct.name}"`,acct.type,acct.normalBal||'—',v.debit>0?v.debit.toFixed(2):'',v.credit>0?v.credit.toFixed(2):''].join(',');
  });
  rows.push(['TOTAL','','','',totDr.toFixed(2),totCr.toFixed(2)].join(','));
  downloadFile([headers.join(','),...rows].join('\n'),'text/csv',`${settings.company.replace(/\s+/g,'-')}-trial-balance.csv`);
  showToast('Trial Balance CSV exported.');
}

function exportTrialBalancePDF(){
  if(!activeTransactions.length) return;
  const{accounts,totDr,totCr,balanced}=calcTrialBalance(activeTransactions);
  const sym=currencySymbol();
  const period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const rows=Object.entries(accounts).sort((a,b)=>a[0].localeCompare(b[0])).map(([code,v])=>{
    const acct=COA[code]||{name:code,type:'—'};
    return`<tr style="border-bottom:1px solid #eee"><td style="padding:9px 14px;font-weight:500">${acct.name}</td><td style="padding:9px 14px;font-family:monospace;font-size:11px;color:#1e3a7a;font-weight:600">${code}</td><td style="padding:9px 14px;font-family:monospace;font-size:10px;text-transform:uppercase;color:#888">${acct.type}</td><td style="padding:9px 14px;text-align:right;font-family:monospace;color:#1e3a7a">${v.debit>0?sym+fmt(v.debit):'—'}</td><td style="padding:9px 14px;text-align:right;font-family:monospace;color:#b83a20">${v.credit>0?sym+fmt(v.credit):'—'}</td></tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html><head><title>Trial Balance</title><style>body{font-family:Georgia,serif;color:#111;padding:44px}h1{font-size:24px;margin-bottom:2px}h2{font-size:13px;color:#666;font-weight:400;margin-bottom:24px}table{width:100%;border-collapse:collapse}thead th{background:#111;color:#fff;font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:.1em;padding:10px 14px;text-align:left}tfoot td{background:#f5f2ec;font-family:monospace;font-weight:700;padding:10px 14px;border-top:2px solid #111}.notice{margin-top:14px;padding:10px 16px;font-family:monospace;font-size:11px;background:${balanced?'#e2f5ea':'#fdf0ed'};color:${balanced?'#1e6640':'#b83a20'}}@media print{body{padding:20px}}</style></head><body><h1>${settings.company}</h1><h2>Trial Balance — ${period} · Generated ${new Date().toLocaleDateString()}</h2><table><thead><tr><th>Account Name</th><th>Code</th><th>Type</th><th>Debit</th><th>Credit</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3">TOTALS</td><td style="text-align:right">${sym}${fmt(totDr)}</td><td style="text-align:right">${sym}${fmt(totCr)}</td></tr></tfoot></table><div class="notice">${balanced?`✓ Balanced — debits equal credits (${sym}${fmt(totDr)})`:`⚠ Out of balance — difference of ${sym}${fmt(Math.abs(totDr-totCr))}`}</div></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
  showToast('Trial Balance PDF opened.');
}

// ============================================================
// SECTION 18: PROFESSIONAL EXCEL EXPORT — 7 sheets
// ============================================================
function exportProfessionalExcel(){
  if(!activeTransactions.length){showToast('Load transactions first.');return;}
  if(typeof XLSX==='undefined'){showToast('SheetJS not loaded — check your connection.');return;}
  const wb=XLSX.utils.book_new();
  const sym=currencySymbol();
  const txns=activeTransactions;
  const period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const company=settings.company;

  // Sheet 1: Transaction Detail
  const txnData=[['LedgerAI — Transaction Detail','','','','','','',''],
    [company+' · '+period,'','','','','','',''],
    ['Generated: '+new Date().toLocaleString(),'','','','','','',''],
    [],
    ['Date','Description','Amount','Category','Debit Acct #','Debit Account Name','Credit Acct #','Credit Account Name','Flag','Journal Note']];
  txns.forEach(r=>{
    const rule=JOURNAL_RULES[r.category]||{dr:'6950',cr:'1000',note:''};
    txnData.push([r.date,r.description,parseFloat(r.amount||0),r.category||'',rule.dr,COA[rule.dr]?.name||'',rule.cr,COA[rule.cr]?.name||'',(r.flag&&r.flag!=='none'?r.flag:''),rule.note||'']);
  });
  const ws1=XLSX.utils.aoa_to_sheet(txnData);
  ws1['!cols']=[{wch:12},{wch:45},{wch:12},{wch:30},{wch:10},{wch:30},{wch:10},{wch:30},{wch:50},{wch:40}];
  XLSX.utils.book_append_sheet(wb,ws1,'Transaction Detail');

  // Sheet 2: Trial Balance
  const{accounts,totDr,totCr,balanced}=calcTrialBalance(txns);
  const tbData=[['LedgerAI — Trial Balance','','','',''],
    [company+' · '+period,'','','',''],
    [],
    ['Account Code','Account Name','Account Type','Total Debits','Total Credits','Net Balance']];
  let tbDrTotal=0,tbCrTotal=0;
  Object.entries(accounts).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([code,v])=>{
    const acct=COA[code]||{name:code,type:'—'};
    tbData.push([code,acct.name,acct.type,v.debit>0?v.debit:0,v.credit>0?v.credit:0,v.debit-v.credit]);
    tbDrTotal+=v.debit; tbCrTotal+=v.credit;
  });
  tbData.push([]);
  tbData.push(['','TOTALS','',tbDrTotal,tbCrTotal,tbDrTotal-tbCrTotal]);
  tbData.push(['','','BALANCED?',balanced?'YES — Dr = Cr':'NO — CHECK ENTRIES','',Math.abs(tbDrTotal-tbCrTotal)]);
  const ws2=XLSX.utils.aoa_to_sheet(tbData);
  ws2['!cols']=[{wch:14},{wch:35},{wch:18},{wch:16},{wch:16},{wch:16}];
  XLSX.utils.book_append_sheet(wb,ws2,'Trial Balance');

  // Sheet 3: P&L Statement
  const catTotals={};
  txns.filter(r=>parseFloat(r.amount||0)>0).forEach(r=>{const c=r.category||'Miscellaneous';catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0);});
  const plData=[['LedgerAI — Income Statement (P&L)',''],
    [company+' · '+period,''],
    ['Generated: '+new Date().toLocaleString(),''],
    [],
    ['REVENUE',''],
    ['  Total Revenue (enter manually or import)',0],
    ['  Gross Profit','=B6'],
    [],
    ['OPERATING EXPENSES','']];
  Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).forEach(([cat,amt])=>plData.push(['  '+cat,-amt]));
  const expStartRow=10,expEndRow=expStartRow+Object.keys(catTotals).length-1;
  plData.push(['  Total Operating Expenses',`=SUM(B${expStartRow}:B${expEndRow})`]);
  plData.push([]);
  plData.push(['NET INCOME / (LOSS)',`=B7+B${expEndRow+1}`]);
  plData.push(['Net Profit Margin',`=IF(B6<>0,B${expEndRow+3}/B6,"N/A")`]);
  const ws3=XLSX.utils.aoa_to_sheet(plData);
  ws3['!cols']=[{wch:40},{wch:18}];
  XLSX.utils.book_append_sheet(wb,ws3,'P&L Statement');

  // Sheet 4: Lead Schedule
  const periodKeys=Object.keys(periods).filter(k=>k!=='__ytd__').sort();
  const currentIdx=periodKeys.indexOf(activePeriod);
  const priorKey=currentIdx>0?periodKeys[currentIdx-1]:null;
  const priorTotals={};
  if(priorKey) periods[priorKey].filter(r=>parseFloat(r.amount||0)>0).forEach(r=>{const c=r.category||'Miscellaneous';priorTotals[c]=(priorTotals[c]||0)+parseFloat(r.amount||0);});
  const lsData=[['LedgerAI — Lead Schedule','','','','','',''],
    ['W/P Ref: LS-01','','','','','',''],
    [company+' · '+period+(priorKey?' vs '+priorKey:''),'','','','','',''],
    ['Generated: '+new Date().toLocaleString()+' · Materiality: '+sym+fmtAmt(5000),'','','','','',''],
    [],
    ['Acct #','Category','Current Period','Prior Period','Variance $','Variance %','% of Total','Significant?']];
  const sortedCats=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const totalCurr=sortedCats.reduce((s,[,v])=>s+v,0);
  sortedCats.forEach(([cat,curr])=>{
    const rule=JOURNAL_RULES[cat],code=rule?rule.dr:'6950';
    const prior=priorTotals[cat]||0;
    const varAmt=prior>0?curr-prior:null,varPct=prior>0?((curr-prior)/prior)*100:null;
    const pctTot=totalCurr>0?(curr/totalCurr)*100:0;
    const isSig=varPct!==null&&(Math.abs(varPct)>=15||Math.abs(varAmt)>=5000);
    lsData.push([code,cat,curr,prior||'N/A',varAmt!==null?varAmt:'N/A',varPct!==null?(varPct/100):'N/A',pctTot/100,isSig?'⚑ YES':'']);
  });
  lsData.push([]);
  lsData.push(['','TOTAL EXPENSES',totalCurr,Object.values(priorTotals).reduce((s,v)=>s+v,0)||'N/A','','',1.0,'']);
  const ws4=XLSX.utils.aoa_to_sheet(lsData);
  ws4['!cols']=[{wch:10},{wch:32},{wch:16},{wch:16},{wch:14},{wch:12},{wch:12},{wch:12}];
  XLSX.utils.book_append_sheet(wb,ws4,'Lead Schedule LS-01');

  // Sheet 5: Contractor T4A
  const contractors={};
  txns.filter(r=>r.category==='Contractor / Professional Services'&&parseFloat(r.amount||0)>0).forEach(r=>{
    const name=r.description.replace(/INV\s*#[A-Z0-9-]+/gi,'').replace(/INVOICE\s*#[A-Z0-9-]+/gi,'').trim();
    if(!contractors[name]) contractors[name]={total:0,payments:0,lastDate:r.date};
    contractors[name].total+=parseFloat(r.amount||0); contractors[name].payments+=1;
    if(r.date>contractors[name].lastDate) contractors[name].lastDate=r.date;
  });
  const contrData=[['LedgerAI — Contractor Summary (T4A / 1099-NEC)','','','','',''],
    [company+' · '+period,'','','','',''],
    ['CRA T4A threshold: $500 · IRS 1099-NEC threshold: $600','','','','',''],
    [],
    ['Contractor Name','Total Paid','# Payments','Last Payment','T4A Required (CRA ≥$500)','1099-NEC Required (IRS ≥$600)']];
  Object.entries(contractors).sort((a,b)=>b[1].total-a[1].total).forEach(([name,d])=>{
    contrData.push([name,d.total,d.payments,d.lastDate,d.total>=500?'YES — FILE T4A':'No',d.total>=600?'YES — FILE 1099-NEC':'No']);
  });
  if(!Object.keys(contractors).length) contrData.push(['No contractor payments found in this period','','','','','']);
  const ws5=XLSX.utils.aoa_to_sheet(contrData);
  ws5['!cols']=[{wch:40},{wch:14},{wch:12},{wch:14},{wch:28},{wch:30}];
  XLSX.utils.book_append_sheet(wb,ws5,'Contractors T4A');

  // Sheet 6: Audit Flags
  const flaggedTxns=txns.filter(r=>r.flag&&r.flag.toLowerCase()!=='none');
  const flagData=[['LedgerAI — Audit Flags & Risk Items','','','',''],
    [company+' · '+period+' · '+flaggedTxns.length+' items flagged','','','',''],
    [],
    ['Date','Description','Amount','Category','Flag / Risk Note','Recommended Action']];
  flaggedTxns.forEach(r=>{
    const amt=parseFloat(r.amount||0);
    const action=r.flag.includes('50%')?'Retain receipt, confirm business purpose':r.flag.includes('T4A')||r.flag.includes('1099')?'File T4A/1099-NEC by deadline':r.flag.includes('capital')||r.flag.includes('capitalize')?'Assess CCA class, consult accountant':r.flag.includes('duplicate')||r.flag.includes('reversal')?'Match to original, confirm net':r.flag.includes('SEVERANCE')?'Disclose in notes to financial statements':r.flag.includes('HST')?'Confirm CRA remittance matches return':'Review with accountant before period close';
    flagData.push([r.date,r.description,amt,r.category||'',r.flag,action]);
  });
  if(!flaggedTxns.length) flagData.push(['No audit flags in this period','','','','','']);
  const ws6=XLSX.utils.aoa_to_sheet(flagData);
  ws6['!cols']=[{wch:12},{wch:45},{wch:12},{wch:28},{wch:60},{wch:45}];
  XLSX.utils.book_append_sheet(wb,ws6,'Audit Flags');

  // Sheet 7: Meals & Entertainment
  const meTxns=txns.filter(r=>r.category==='Meals & Entertainment'&&parseFloat(r.amount||0)>0);
  const meData=[['LedgerAI — Meals & Entertainment Schedule','','','',''],
    ['CRA/IRS Rule: Only 50% of M&E is tax deductible. Retain all receipts.','','','',''],
    [company+' · '+period,'','','',''],
    [],
    ['Date','Description','Total Amount','50% Deductible','50% Non-Deductible','Receipt on File?']];
  let meTotalFull=0,meTotal50=0;
  meTxns.forEach(r=>{
    const amt=parseFloat(r.amount||0); meTotalFull+=amt; meTotal50+=amt*0.5;
    meData.push([r.date,r.description,amt,amt*0.5,amt*0.5,'Confirm']);
  });
  meData.push([]);
  meData.push(['TOTALS','',meTotalFull,meTotal50,meTotal50,'']);
  const ws7=XLSX.utils.aoa_to_sheet(meData);
  ws7['!cols']=[{wch:12},{wch:45},{wch:14},{wch:16},{wch:18},{wch:16}];
  XLSX.utils.book_append_sheet(wb,ws7,'Meals & Entertainment');

  XLSX.writeFile(wb,`${company.replace(/\s+/g,'-')}-${period.replace(/\s+/g,'-')}-LedgerAI.xlsx`);
  auditEntry('export','Professional Excel workbook exported',period+' — 7 sheets');
  showToast('✓ Excel workbook downloaded — 7 sheets including T4A summary and audit flags');
}

// ============================================================
// SECTION 19: CHART OF ACCOUNTS
// ============================================================
function renderCOA(){
  const tbl=document.getElementById('coaTable'); if(!tbl) return;
  tbl.innerHTML='<tr><th>Code</th><th>Account Name</th><th>Type</th><th>Normal Balance</th><th>Group</th></tr>';
  let lastGroup='';
  Object.entries(COA).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([code,acct])=>{
    if(acct.group!==lastGroup){lastGroup=acct.group;const sep=document.createElement('tr');sep.className='coa-group';sep.innerHTML=`<td colspan="5">${acct.group}</td>`;tbl.appendChild(sep);}
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="coa-code">${code}</td><td style="font-weight:500">${acct.name}</td><td class="coa-type">${acct.type}</td><td class="coa-type">${acct.normalBal}</td><td style="font-size:12px;color:var(--muted)">${acct.group}</td>`;
    tbl.appendChild(tr);
  });
}

// ============================================================
// SECTION 20: FLAGS VIEW
// ============================================================
function renderFlags(){
  const txns=activeTransactions;
  const label=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const flagged=txns.filter(r=>r.flag&&r.flag.toLowerCase()!=='none');
  const lbl=document.getElementById('flagPeriodLabel');
  if(lbl) lbl.textContent=`${label} — ${flagged.length} item${flagged.length!==1?'s':''} flagged`;
  document.querySelectorAll('[id^="sidebarFlagBadge"]').forEach(b=>b.textContent=flagged.length);
  const container=document.getElementById('flagsContainer'); if(!container) return;
  if(!flagged.length){container.innerHTML='<div class="empty"><div class="empty-icon">✅</div><p>No flagged transactions</p></div>';return;}
  container.innerHTML=`<div class="flags-grid">${flagged.map(r=>{
    const gIdx=txns.findIndex(t=>t.date===r.date&&t.description===r.description&&t.amount===r.amount);
    const severity=r.flag.includes('⚠')?'severity-high':r.flag.includes('50%')?'severity-medium':'severity-low';
    return `<div class="flag-card ${severity}"><div class="flag-title">${r.description}</div><div class="flag-meta">${r.date} · ${currencySymbol()}${fmtAmt(Math.abs(parseFloat(r.amount||0)))} · ${r.category||'Uncategorized'}</div><div class="flag-body">${r.flag}</div>${gIdx>=0?`<button class="btn btn-sm" style="margin-top:10px;font-size:10px;background:var(--green-l);color:var(--green);border:1px solid rgba(30,102,64,0.2);" onclick="clearFlag(${gIdx})">✓ Mark Resolved</button>`:''}</div>`;
  }).join('')}</div>`;
}

function clearFlag(index){
  const row=activeTransactions[index]; if(!row) return;
  const prev=row.flag; row.flag='none'; row._edited=true;
  if(activePeriod&&activePeriod!=='__ytd__') periods[activePeriod]=activeTransactions.map(r=>({...r}));
  auditEntry('flag','Flag cleared on',row.description||'Row '+index,prev,'none');
  markEdited(index); renderFlags(); refreshDependentViews(); showToast('Flag cleared — marked as resolved.');
}

// ============================================================
// SECTION 21: P&L STATEMENT
// ============================================================
function renderPL(){
  if(!activeTransactions.length) return;
  const txns=activeTransactions,sym=currencySymbol();
  const period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl1=document.getElementById('plPeriodLabel'),lbl2=document.getElementById('plPeriodSpan');
  if(lbl1) lbl1.textContent=period; if(lbl2) lbl2.textContent='— '+period;
  const revenue=parseFloat(document.getElementById('plRevenueInput')?.value||0);
  const catTotals={};
  txns.filter(r=>parseFloat(r.amount||0)>0&&r.category!=='Transfer').forEach(r=>{const c=r.category||'Miscellaneous';catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0);});
  const incomeTotal=txns.filter(r=>parseFloat(r.amount||0)<0||r.category==='Income').reduce((s,r)=>s+Math.abs(parseFloat(r.amount||0)),0);
  const effectiveRevenue=revenue>0?revenue:incomeTotal;
  const totalExpenses=Object.values(catTotals).reduce((s,v)=>s+v,0);
  const netIncome=effectiveRevenue-totalExpenses;
  const netMargin=effectiveRevenue>0?((netIncome/effectiveRevenue)*100).toFixed(1):'—';
  const isPositive=netIncome>=0;
  const expenseLines=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>`<div class="pl-line"><span class="pl-line-name">${cat}</span><span class="pl-line-amt" style="color:var(--accent)">(${sym}${fmtAmt(amt)})</span></div>`).join('');
  const stmt=document.getElementById('plStatement'); if(!stmt) return;
  stmt.innerHTML=`<div class="pl-statement"><div class="pl-header"><h2>${settings.company}</h2><p>Income Statement (P&amp;L) · ${period} · Generated ${new Date().toLocaleDateString()}</p></div>
    <div class="pl-section"><div class="pl-section-title">Revenue</div><div class="pl-line"><span class="pl-line-name">Total Revenue</span><span class="pl-line-amt" style="color:var(--green)">${sym}${fmtAmt(effectiveRevenue)}</span></div><div class="pl-subtotal"><span>Gross Profit</span><span class="pl-subtotal-amt" style="color:var(--green)">${sym}${fmtAmt(effectiveRevenue)}</span></div></div>
    <div class="pl-section"><div class="pl-section-title">Operating Expenses</div>${expenseLines}<div class="pl-subtotal"><span>Total Operating Expenses</span><span class="pl-subtotal-amt" style="color:var(--accent)">(${sym}${fmtAmt(totalExpenses)})</span></div></div>
    <div class="pl-net ${isPositive?'positive':'negative'}"><span>Net ${isPositive?'Income':'Loss'}</span><span class="pl-net-amt">${isPositive?'':'('}${sym}${fmtAmt(Math.abs(netIncome))}${isPositive?'':')'}</span></div>
    <div class="pl-margin"><span>Net Profit Margin</span><span>${effectiveRevenue>0?netMargin+'%':'— (enter revenue above)'}</span></div></div>`;
}

function exportPLCSV(){
  if(!activeTransactions.length) return;
  const revenue=parseFloat(document.getElementById('plRevenueInput')?.value||0);
  const catTotals={};
  activeTransactions.filter(r=>parseFloat(r.amount||0)>0&&r.category!=='Transfer').forEach(r=>{const c=r.category||'Miscellaneous';catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0);});
  const totalExp=Object.values(catTotals).reduce((s,v)=>s+v,0);
  const period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const rows=[['P&L Statement','',''],['Company',settings.company,''],['Period',period,''],['Generated',new Date().toLocaleDateString(),''],['','',''],['REVENUE','',''],['Total Revenue','',revenue.toFixed(2)],['Gross Profit','',revenue.toFixed(2)],['','',''],['OPERATING EXPENSES','',''],...Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([c,v])=>[c,'',(- v).toFixed(2)]),['Total Operating Expenses','',(-(totalExp)).toFixed(2)],['','',''],['NET INCOME','',(revenue-totalExp).toFixed(2)]];
  downloadFile(rows.map(r=>r.join(',')).join('\n'),'text/csv',`${settings.company.replace(/\s+/g,'-')}-pl.csv`);
  showToast('P&L exported to CSV.');
}

function exportPLPDF(){
  if(!activeTransactions.length) return;
  const revenue=parseFloat(document.getElementById('plRevenueInput')?.value||0);
  const sym=currencySymbol();
  const catTotals={};
  activeTransactions.filter(r=>parseFloat(r.amount||0)>0&&r.category!=='Transfer').forEach(r=>{const c=r.category||'Miscellaneous';catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0);});
  const totalExp=Object.values(catTotals).reduce((s,v)=>s+v,0);
  const netIncome=revenue-totalExp,period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—'),isPos=netIncome>=0;
  const expLines=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<tr><td style="padding:7px 0;border-bottom:1px solid #eee">${c}</td><td style="padding:7px 0;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:#b83a20">(${sym}${fmtAmt(v)})</td></tr>`).join('');
  const html=`<!DOCTYPE html><html><head><title>P&L — ${settings.company}</title><style>body{font-family:Georgia,serif;color:#111;padding:52px;max-width:600px;margin:0 auto}h1{font-size:22px;margin-bottom:4px}p{color:#666;font-size:13px;margin-bottom:32px}.section-title{font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#888;padding:14px 0 6px;border-bottom:1px solid #ddd}.subtotal{display:flex;justify-content:space-between;padding:10px 0;border-top:1.5px solid #111;font-weight:700;font-size:14px}.net{display:flex;justify-content:space-between;padding:14px;background:${isPos?'#1e6640':'#b83a20'};color:white;font-weight:700;font-size:16px;margin-top:8px}table{width:100%;border-collapse:collapse}@media print{body{padding:20px}}</style></head><body><h1>${settings.company}</h1><p>Income Statement (P&amp;L) · ${period} · ${new Date().toLocaleDateString()}</p><div class="section-title">Revenue</div><table><tbody><tr><td style="padding:8px 0;border-bottom:1px solid #eee">Total Revenue</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:#1e6640;font-weight:700">${sym}${fmtAmt(revenue)}</td></tr></tbody></table><div class="subtotal"><span>Gross Profit</span><span style="color:#1e6640">${sym}${fmtAmt(revenue)}</span></div><div class="section-title">Operating Expenses</div><table><tbody>${expLines}</tbody></table><div class="subtotal"><span>Total Operating Expenses</span><span style="color:#b83a20">(${sym}${fmt(totalExp)})</span></div><div class="net"><span>Net ${isPos?'Income':'Loss'}</span><span>${isPos?'':'('}${sym}${fmtAmt(Math.abs(netIncome))}${isPos?'':')'}</span></div></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
}

// ============================================================
// SECTION 22: CASH FLOW
// ============================================================
function renderCashFlow(){
  if(!activeTransactions.length) return;
  const txns=activeTransactions,sym=currencySymbol();
  const period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl=document.getElementById('cfPeriodLabel'); if(lbl) lbl.textContent=period;
  const sections={operating:[],investing:[],financing:[]};
  txns.filter(r=>parseFloat(r.amount||0)>0&&r.category!=='Transfer').forEach(r=>{const cls=CF_CLASSIFICATION[r.category]||'operating';sections[cls].push(r);});
  const meta={operating:{label:'Operating Activities',desc:'Day-to-day business operations',tag:'cf-operating'},investing:{label:'Investing Activities',desc:'Capital expenditures & long-term investments',tag:'cf-investing'},financing:{label:'Financing Activities',desc:'Debt, equity & bank charges',tag:'cf-financing'}};
  let totalNetCash=0,html='';
  Object.entries(meta).forEach(([key,m])=>{
    if(!sections[key].length) return;
    const sectionTotal=sections[key].reduce((s,r)=>s+parseFloat(r.amount||0),0); totalNetCash+=sectionTotal;
    const bycat={};
    sections[key].forEach(r=>{const c=r.category||'Misc';bycat[c]=(bycat[c]||0)+parseFloat(r.amount||0);});
    const lineItems=Object.entries(bycat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div class="cf-line"><span class="cf-line-name">${c}</span><span class="cf-line-amt" style="color:var(--accent)">(${sym}${fmtAmt(v)})</span></div>`).join('');
    html+=`<div class="cf-section"><div class="cf-section-header"><span class="cf-section-title">${m.label} <span class="cf-class-tag ${m.tag}">${key}</span></span><span class="cf-section-total" style="color:var(--accent)">(${sym}${fmtAmt(sectionTotal)})</span></div><div style="font-size:12px;color:var(--muted);padding:8px 24px 6px;font-family:'IBM Plex Mono',monospace">${m.desc}</div>${lineItems}</div>`;
  });
  html+=`<div class="cf-net"><span>Net Cash Used</span><span class="cf-net-amt">(${sym}${fmtAmt(totalNetCash)})</span></div>`;
  const cfContent=document.getElementById('cfContent'); if(cfContent) cfContent.innerHTML=html;
}

// ============================================================
// SECTION 23: BUDGET VS ACTUAL
// ============================================================
function renderBudgetVsActual(){
  if(!activeTransactions.length) return;
  const txns=activeTransactions,sym=currencySymbol();
  const period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl=document.getElementById('bvaPeriodLabel'); if(lbl) lbl.textContent=period;
  const catTotals={};
  txns.filter(r=>parseFloat(r.amount||0)>0&&r.category!=='Transfer').forEach(r=>{const c=r.category||'Miscellaneous';catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0);});
  let totalBudget=0,totalActual=0;
  const rows=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,actual])=>{
    const budget=budgets[cat]||0,variance=budget-actual,pct=budget>0?Math.min((actual/budget)*100,150):0,isOver=budget>0&&actual>budget;
    totalBudget+=budget; totalActual+=actual;
    const varClass=!budget?'bva-neutral':(isOver?'bva-over':'bva-under');
    const varText=!budget?'—':(isOver?`▲ ${sym}${fmtAmt(Math.abs(variance))} over`:`▼ ${sym}${fmtAmt(Math.abs(variance))} under`);
    const barColor=!budget?'#e4ddd0':(isOver?'var(--accent)':'var(--green)');
    return`<tr><td style="padding:12px 16px;font-weight:500">${cat}</td><td><input class="bva-budget-input" data-cat="${cat}" value="${budget||''}" placeholder="0.00" onchange="updateBudget('${cat}',this.value)" type="number" step="0.01" min="0"/></td><td style="font-family:'IBM Plex Mono',monospace;font-size:12px">${sym}${fmtAmt(actual)}</td><td class="${varClass}" style="font-family:'IBM Plex Mono',monospace;font-size:11px">${varText}</td><td><div class="bva-bar-wrap"><div class="bva-bar-track"><div class="bva-bar-fill" style="width:0%;background:${barColor}" data-w="${pct}"></div></div><span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);width:32px;text-align:right">${budget>0?Math.round(pct)+'%':'—'}</span></div></td></tr>`;
  }).join('');
  const bvaTable=document.getElementById('bvaTable');
  if(bvaTable){bvaTable.innerHTML=`<div class="bva-table"><table><thead><tr><th>Category</th><th style="text-align:left">Monthly Budget</th><th>Actual Spent</th><th>Variance</th><th>% of Budget</th></tr></thead><tbody>${rows}</tbody></table></div>`;setTimeout(()=>document.querySelectorAll('.bva-bar-fill').forEach(b=>b.style.width=b.dataset.w+'%'),200);}
}

function updateBudget(cat,val){budgets[cat]=parseFloat(val)||0;}
function saveBudgets(){document.querySelectorAll('.bva-budget-input').forEach(input=>{const cat=input.dataset.cat;if(cat)budgets[cat]=parseFloat(input.value)||0;});renderBudgetVsActual();auditEntry('system','Budgets saved',Object.keys(budgets).length+' categories');showToast('Budgets saved.');}

// ============================================================
// SECTION 24: BANK RECONCILIATION
// ============================================================
function handleBankFile(event){
  const file=event.target.files[0]; if(!file) return;
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='csv'){Papa.parse(file,{header:true,skipEmptyLines:true,complete:r=>{bankStatementRows=normalizeColumns(r.data);updateReconCounts();showToast(`Bank file loaded: ${bankStatementRows.length} rows`);}});}
  else{const reader=new FileReader();reader.onload=e=>{const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});bankStatementRows=normalizeColumns(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''}));updateReconCounts();showToast(`Bank file loaded: ${bankStatementRows.length} rows`);};reader.readAsArrayBuffer(file);}
}
function renderReconcileSetup(){if(!activeTransactions.length) return;const period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');const lbl=document.getElementById('reconPeriodLabel');if(lbl)lbl.textContent=period;updateReconCounts();}
function updateReconCounts(){const lc=document.getElementById('reconLedgerCount'),bc=document.getElementById('reconBankCount');if(lc)lc.textContent=activeTransactions.length+' ledger transactions loaded';if(bc)bc.textContent=bankStatementRows.length>0?bankStatementRows.length+' bank rows loaded':'No bank file loaded yet';}

function runReconciliation(){
  const ledger=activeTransactions.filter(r=>parseFloat(r.amount||0)>0),bank=bankStatementRows,sym=currencySymbol();
  if(!ledger.length){showToast('Load a transaction file first.');return;}
  if(!bank.length){showToast('Upload a bank statement file first.');return;}
  const ledgerUsed=new Array(ledger.length).fill(false),bankUsed=new Array(bank.length).fill(false);
  const matches=[],unmatchedLedger=[],unmatchedBank=[];
  const normalizeDesc=s=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2);
  ledger.forEach((lrow,li)=>{
    const lAmt=Math.abs(parseFloat(lrow.amount||0)),lDate=new Date(lrow.date||''),lWords=normalizeDesc(lrow.description);
    let bestJ=-1,bestScore=-1;
    bank.forEach((brow,bi)=>{
      if(bankUsed[bi]) return;
      const bAmt=Math.abs(parseFloat(brow.amount||0)),bDate=new Date(brow.date||'');
      if(Math.abs(lAmt-bAmt)>0.01) return;
      const dayDiff=Math.abs((lDate-bDate)/86400000); if(dayDiff>7) return;
      const bWords=normalizeDesc(brow.description);
      const shared=lWords.filter(w=>bWords.some(bw=>bw.includes(w)||w.includes(bw)));
      const descScore=lWords.length>0?shared.length/lWords.length:0.5;
      const score=descScore*2+(1-dayDiff/14);
      if(score>bestScore){bestScore=score;bestJ=bi;}
    });
    if(bestJ>=0){
      const brow=bank[bestJ];
      const dayDiff=Math.abs((lDate-new Date(brow.date||''))/86400000);
      const bWords=normalizeDesc(brow.description);
      const shared=lWords.filter(w=>bWords.some(bw=>bw.includes(w)||w.includes(bw)));
      const descPct=lWords.length>0?Math.round(shared.length/lWords.length*100):100;
      matches.push({ledger:lrow,bank:brow,dayDiff:Math.round(dayDiff),descPct});
      ledgerUsed[li]=true; bankUsed[bestJ]=true;
    } else unmatchedLedger.push(lrow);
  });
  bank.forEach((brow,bi)=>{if(!bankUsed[bi]) unmatchedBank.push(brow);});
  const matchRate=((matches.length/Math.max(ledger.length,1))*100).toFixed(0);
  const matchRows=matches.map(m=>`<div class="recon-row recon-row-matched"><div style="flex:2"><div style="font-weight:500;font-size:12px">${m.ledger.description}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted)">${m.ledger.date} · Ledger</div></div><div style="flex:2"><div style="font-size:12px">${m.bank.description||m.bank.date}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted)">${m.bank.date} · Bank${m.dayDiff>0?' · '+m.dayDiff+'d apart':''} · ${m.descPct}% match</div></div><div style="font-family:'IBM Plex Mono',monospace;font-weight:700">${sym}${fmtAmt(m.ledger.amount)}</div><span class="recon-match-badge rmb-ok">✓ Matched</span></div>`).join('');
  const reconResults=document.getElementById('reconResults');
  if(reconResults) reconResults.innerHTML=`<div class="recon-stats"><div class="recon-stat"><div class="recon-stat-label">Match Rate</div><div class="recon-stat-val" style="color:var(--green)">${matchRate}%</div></div><div class="recon-stat"><div class="recon-stat-label">Matched</div><div class="recon-stat-val">${matches.length}</div></div><div class="recon-stat"><div class="recon-stat-label">Ledger Only</div><div class="recon-stat-val" style="color:var(--accent)">${unmatchedLedger.length}</div></div><div class="recon-stat"><div class="recon-stat-label">Bank Only</div><div class="recon-stat-val" style="color:var(--gold)">${unmatchedBank.length}</div></div></div>${matches.length?`<div class="recon-section"><div class="recon-section-header"><span class="recon-section-title">✓ Matched (${matches.length})</span></div>${matchRows}</div>`:''}${unmatchedLedger.length?`<div class="recon-section"><div class="recon-section-header"><span class="recon-section-title" style="color:var(--accent)">⚠ In Ledger — Not in Bank (${unmatchedLedger.length})</span></div>${unmatchedLedger.map(r=>`<div class="recon-row recon-row-unmatched"><div style="flex:3"><div style="font-weight:500;font-size:13px">${r.description}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted)">${r.date} · ${r.category||'—'}</div></div><div style="font-family:'IBM Plex Mono',monospace;font-weight:700">${sym}${fmtAmt(r.amount)}</div><span class="recon-match-badge rmb-miss">⚠ Not in bank</span></div>`).join('')}</div>`:''}${unmatchedBank.length?`<div class="recon-section"><div class="recon-section-header"><span class="recon-section-title" style="color:var(--gold)">? In Bank — Not in Ledger (${unmatchedBank.length})</span></div>${unmatchedBank.map(r=>`<div class="recon-row recon-row-unmatched-bank"><div style="flex:3"><div style="font-weight:500;font-size:13px">${r.description||'—'}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted)">${r.date} · Bank only</div></div><div style="font-family:'IBM Plex Mono',monospace;font-weight:700">${sym}${fmtAmt(r.amount)}</div><span class="recon-match-badge rmb-extra">? Not in ledger</span></div>`).join('')}</div>`:''}`;
  showToast(`Reconciliation complete — ${matchRate}% match rate`);
  auditEntry('system','Bank reconciliation run',matchRate+'% match rate — '+matches.length+' matched');
}

// ============================================================
// SECTION 25: DUPLICATE DETECTION VIEW
// ============================================================
function runDuplicateDetection(){
  const txns=activeTransactions,sym=currencySymbol();
  const period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl=document.getElementById('dupPeriodLabel'); if(lbl) lbl.textContent=period;
  if(!txns.length) return;
  const groups=[],used=new Array(txns.length).fill(false);
  txns.forEach((rowA,i)=>{
    if(used[i]) return;
    const group=[i];
    const amtA=parseFloat(rowA.amount||0),dateA=new Date(rowA.date||''),descA=(rowA.description||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    txns.forEach((rowB,j)=>{
      if(j<=i||used[j]) return;
      const amtB=parseFloat(rowB.amount||0),dateB=new Date(rowB.date||''),descB=(rowB.description||'').toLowerCase().replace(/[^a-z0-9]/g,'');
      const dayDiff=Math.abs((dateA-dateB)/86400000);
      const sameAmt=Math.abs(amtA-amtB)<0.01,closeDt=dayDiff<=7;
      const simDesc=descA.length>4&&descB.length>4&&(descA.includes(descB.slice(0,6))||descB.includes(descA.slice(0,6))||levenshteinSimilarity(descA,descB)>0.75);
      if(sameAmt&&closeDt&&simDesc){group.push(j);used[j]=true;}
    });
    if(group.length>1){groups.push(group.map(idx=>({...txns[idx],_idx:idx})));used[i]=true;}
  });
  const badge=document.getElementById('dupBadge');
  if(badge){badge.textContent=groups.length;badge.style.display=groups.length?'inline-flex':'none';}
  const container=document.getElementById('dupContent'); if(!container) return;
  if(!groups.length){container.innerHTML=`<div class="empty" style="background:var(--green-l);border:1px solid rgba(30,102,64,0.15);border-radius:2px;padding:40px"><div class="empty-icon">✅</div><p style="color:var(--green)">No duplicate transactions detected</p><p style="font-size:12px;color:var(--muted);margin-top:8px">Scanned ${txns.length} transactions for matching amounts, descriptions, and dates within 7 days.</p></div>`;return;}
  const totalDupAmt=groups.reduce((s,g)=>s+g.slice(1).reduce((ss,r)=>ss+parseFloat(r.amount||0),0),0);
  let html=`<div class="dup-summary-bar"><div class="dup-summary-stat"><label>Duplicate Groups</label><value style="color:var(--accent)">${groups.length}</value></div><div class="dup-summary-stat"><label>Potential Duplicate Rows</label><value>${groups.reduce((s,g)=>s+g.length,0)}</value></div><div class="dup-summary-stat"><label>Potential Overcharge</label><value style="color:var(--accent);font-size:18px;margin-top:4px">${sym}${fmt(totalDupAmt)}</value></div></div>`;
  groups.forEach((group,gi)=>{
    const confidence=group.length>2?'HIGH':'MEDIUM';
    const rows=group.map((r,ri)=>`<div class="dup-row"><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);width:20px">${ri===0?'①':'②'}</div><div style="flex:3"><div style="font-weight:${ri===0?600:400};font-size:13px">${r.description}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted)">${r.date} · ${r.category||'—'}</div></div><div style="font-family:'IBM Plex Mono',monospace;font-weight:700">${sym}${fmtAmt(r.amount)}</div>${ri===0?'<span style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:var(--green);padding:3px 8px;background:var(--green-l);border-radius:2px">Original</span>':`<button class="btn btn-xs btn-red" onclick="deleteRow(${r._idx})">Delete Duplicate</button>`}</div>`).join('');
    html+=`<div class="dup-group"><div class="dup-group-header"><span class="dup-group-title">Potential Duplicate Group ${gi+1} — ${group.length} transactions — ${sym}${fmtAmt(group[0].amount)}</span><span class="dup-confidence ${confidence==='HIGH'?'dc-high':'dc-medium'}">${confidence} confidence</span></div>${rows}</div>`;
  });
  container.innerHTML=html;
}

// ============================================================
// SECTION 26: SETTINGS
// ============================================================
function loadSettingsForm(){
  const el=id=>document.getElementById(id);
  if(el('sCompany'))    el('sCompany').value   =settings.company;
  if(el('sIndustry'))   el('sIndustry').value  =settings.industry;
  if(el('sFiscalYear')) el('sFiscalYear').value =settings.fiscalYear;
  if(el('sCurrency'))   el('sCurrency').value   =settings.currency;
  if(el('sAiMode'))     el('sAiMode').value     =settings.aiMode;
  if(el('sPlaidToken')) el('sPlaidToken').value  =settings.plaidLinkToken;
  const lbl=el('currentProfileLabel');
  if(lbl){const names={student:'Student',freelancer:'Freelancer',business:'Small Business',professional:'Accounting Professional'};lbl.textContent=names[currentProfile]||currentProfile;}
}

function saveSettings(){
  settings.company       =document.getElementById('sCompany')?.value.trim()||'Your Company';
  settings.industry      =document.getElementById('sIndustry')?.value||settings.industry;
  settings.fiscalYear    =document.getElementById('sFiscalYear')?.value||'01';
  settings.currency      =document.getElementById('sCurrency')?.value||'CAD';
  settings.aiMode        =document.getElementById('sAiMode')?.value||'auto';
  settings.plaidLinkToken=document.getElementById('sPlaidToken')?.value.trim()||'';
  document.getElementById('topbarCompany').textContent=settings.company;
  const activeNav=document.querySelector('.nav-item.active');
  if(activeNav){const viewId=activeNav.id.replace('nav-','');if(viewId&&viewId!=='settings') renderView(viewId);}
  auditEntry('system','Settings saved','Currency: '+settings.currency+', Company: '+settings.company);
  showToast('Settings saved.'); saveSettingsToCloud();
}

function currencySymbol(){return{USD:'$',CAD:'$',GBP:'£',EUR:'€',AUD:'A$'}[settings.currency]||'$';}
const FX_RATES={USD:1.0,CAD:1.0,GBP:0.57,EUR:0.68,AUD:1.53};
function fmtAmt(v){const rate=FX_RATES[settings.currency]||1;return fmt(parseFloat(v||0)*rate);}
function fmt(v){return parseFloat(v||0).toLocaleString('en-CA',{minimumFractionDigits:2,maximumFractionDigits:2});}

function buildJournalEntry(category,amount){
  const rule=JOURNAL_RULES[category];
  const f=v=>Math.abs(parseFloat(v||0)).toLocaleString('en-CA',{minimumFractionDigits:2});
  const sym=currencySymbol();
  if(!rule) return{html:`<span class="acct-line acct-dr">Dr. 6950 Misc Expense ${sym}${f(amount)}</span><span class="acct-line acct-cr">Cr. 1000 Cash ${sym}${f(amount)}</span>`,text:`Dr. 6950 Misc $${f(amount)} | Cr. 1000 Cash $${f(amount)}`};
  const drAcct=COA[rule.dr],crAcct=COA[rule.cr];
  return{html:`<span class="acct-line acct-dr">Dr. ${rule.dr} ${drAcct?.name||''} ${sym}${f(amount)}</span><span class="acct-line acct-cr">Cr. ${rule.cr} ${crAcct?.name||''} ${sym}${f(amount)}</span>${rule.note?`<span class="acct-note">※ ${rule.note}</span>`:''}`,text:`Dr. ${rule.dr} ${drAcct?.name||''} | Cr. ${rule.cr} ${crAcct?.name||''}`};
}

// ============================================================
// SECTION 27: WORKING PAPERS
// ============================================================
function renderWorkingPapers(){
  const txns=activeTransactions,sym=currencySymbol();
  const period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const lbl=document.getElementById('wpPeriodLabel'); if(lbl) lbl.textContent=period;
  const content=document.getElementById('wpContent'); if(!content) return;
  if(!txns.length){content.innerHTML='<div class="empty"><div class="empty-icon">📄</div><p>Load a file to generate working papers</p></div>';return;}
  const expenses=txns.filter(r=>parseFloat(r.amount||0)>0&&r.category!=='Transfer');
  const catTotals={};
  expenses.forEach(r=>{const cat=r.category||'Miscellaneous';catTotals[cat]=(catTotals[cat]||0)+parseFloat(r.amount||0);});
  const periodKeys=Object.keys(periods).filter(k=>k!=='__ytd__').sort();
  const currentIdx=activePeriod!=='__ytd__'?periodKeys.indexOf(activePeriod):-1;
  const priorKey=currentIdx>0?periodKeys[currentIdx-1]:null;
  const priorTxns=priorKey?periods[priorKey]:null;
  const priorTotals={};
  if(priorTxns) priorTxns.filter(r=>parseFloat(r.amount||0)>0&&r.category!=='Transfer').forEach(r=>{const cat=r.category||'Miscellaneous';priorTotals[cat]=(priorTotals[cat]||0)+parseFloat(r.amount||0);});
  const hasPrior=priorTxns&&Object.keys(priorTotals).length>0;
  const matThresh=parseFloat(document.getElementById('wpMateriality')?.value||5000);
  const varPctTh=parseFloat(document.getElementById('wpVarPct')?.value||15);
  const sortedCats=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const totalCurr=sortedCats.reduce((s,[,v])=>s+v,0);
  const totalPrior=hasPrior?Object.values(priorTotals).reduce((s,v)=>s+v,0):null;
  let sigVariances=[];
  const leadRows=sortedCats.map(([cat,curr])=>{
    const prior=hasPrior?(priorTotals[cat]||0):null;
    const varAmt=prior!==null?curr-prior:null,varPct=prior>0?((curr-prior)/prior)*100:null;
    const isSig=varPct!==null&&(Math.abs(varPct)>=varPctTh||Math.abs(varAmt)>=matThresh);
    if(isSig) sigVariances.push({cat,curr,prior,varAmt,varPct});
    const rule=JOURNAL_RULES[cat],acctCode=rule?rule.dr:'6950';
    const pctOfTotal=totalCurr>0?(curr/totalCurr*100).toFixed(1):'0.0';
    return`<tr class="${isSig?'wp-sig-row':''}"><td class="wp-acct-code">${acctCode}</td><td style="font-weight:500">${cat}</td><td class="wp-num">${sym}${fmtAmt(curr)}</td>${hasPrior?`<td class="wp-num">${prior>0?sym+fmtAmt(prior):'—'}</td><td class="wp-var-amt ${varAmt>0?'wp-over':'wp-under'}">${varAmt!==null?(varAmt>0?'+':'')+sym+fmtAmt(Math.abs(varAmt)):'—'}</td><td class="wp-var-pct ${isSig?(varPct>0?'wp-over':'wp-under'):''}">${varPct!==null?(varPct>0?'+':'')+varPct.toFixed(1)+'%':'—'}${isSig?' ⚑':''}</td>`:'<td class="wp-num wp-muted">No prior period</td><td></td><td></td>'}<td class="wp-num wp-muted">${pctOfTotal}%</td></tr>`;
  }).join('');
  const sigNotes=sigVariances.map(v=>`<div class="wp-sig-note"><span class="wp-sig-flag">⚑ SIGNIFICANT</span><strong>${v.cat}</strong> — Current: ${sym}${fmtAmt(v.curr)} vs Prior: ${sym}${fmtAmt(v.prior)} (${v.varPct>0?'+':''}${v.varPct.toFixed(1)}%, ${v.varAmt>0?'+':''}${sym}${fmtAmt(Math.abs(v.varAmt))}). Obtain management explanation. Document in working paper file.</div>`).join('');
  const flagged=txns.filter(r=>r.flag&&r.flag.toLowerCase()!=='none');
  const uncategorized=txns.filter(r=>!r.category||r.category==='Uncategorized'||r.category==='');
  const contractors=txns.filter(r=>r.category==='Contractor / Professional Services'&&parseFloat(r.amount||0)>0);
  const contTotal=contractors.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const meals=txns.filter(r=>r.category==='Meals & Entertainment'&&parseFloat(r.amount||0)>0);
  const mealsTotal=meals.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const legal=txns.filter(r=>r.category==='Legal & Professional Fees'&&parseFloat(r.amount||0)>0);
  const legalTotal=legal.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const pbcItems=[
    {item:'Trial balance — current period',status:'auto',note:'Generated by LedgerAI — verify against source records'},
    {item:'Bank statements — all accounts',status:'pending',note:'Upload via Reconciliation tab'},
    {item:'Payroll register — all payroll periods',status:txns.some(r=>r.category==='Payroll')?'pending':'na',note:txns.some(r=>r.category==='Payroll')?'Payroll expenses detected — payroll register required for testing':'No payroll this period'},
    {item:'Contractor agreements & T4A/1099 documentation',status:contractors.length>0?'pending':'na',note:contractors.length>0?`${contractors.length} contractor payment(s) — ${sym}${fmtAmt(contTotal)} total. T4A/1099 verification required.`:'No contractor payments this period'},
    {item:'Meals & Entertainment receipts (50% rule)',status:meals.length>0?'pending':'na',note:meals.length>0?`${meals.length} transaction(s) — ${sym}${fmtAmt(mealsTotal)} total. Retain receipts with business purpose for CRA/IRS.`:'No M&E this period'},
    {item:'Legal fee invoices and deductibility memo',status:legal.length>0?'pending':'na',note:legal.length>0?`${legal.length} legal payment(s) — ${sym}${fmtAmt(legalTotal)} total. Confirm capital vs. revenue treatment.`:'No legal fees this period'},
    {item:'Revenue support — invoices & contracts',status:'pending',note:'Invoices, contracts, revenue recognition schedule'},
    {item:'Accounts payable listing at period end',status:'pending',note:'AP aging schedule as at period end'},
    {item:'Fixed asset continuity schedule',status:'pending',note:'Additions, disposals, CCA calculation'},
    {item:'Insurance policies — confirm period coverage',status:txns.some(r=>r.category==='Insurance')?'pending':'na',note:txns.some(r=>r.category==='Insurance')?'Insurance expense detected — confirm policy period and prepaid allocation':'No insurance this period'},
  ];
  const pbcRows=pbcItems.map(p=>{const cls=p.status==='auto'?'pbc-auto':p.status==='na'?'pbc-na':'pbc-pending',lbl=p.status==='auto'?'✓ Auto':p.status==='na'?'N/A':'⏳ Pending';return`<tr><td style="font-size:12px">${p.item}</td><td><span class="pbc-badge ${cls}">${lbl}</span></td><td style="font-size:11px;color:var(--muted)">${p.note}</td></tr>`;}).join('');
  const{balanced,totDr,totCr}=calcTrialBalance(txns);
  content.innerHTML=`
    <div class="wp-section"><div class="wp-section-header"><span class="wp-section-title">W/P Ref: LS-01 · Lead Schedule — All Expense Accounts</span><span class="wp-section-meta">${period} · ${sortedCats.length} accounts · Materiality: ${sym}${fmtAmt(matThresh)}</span></div>
      <div class="tbl-wrap"><table class="wp-table"><thead><tr><th>Acct #</th><th>Account / Category</th><th>Current Period</th>${hasPrior?'<th>Prior Period</th><th>Variance $</th><th>Variance %</th>':'<th colspan="3" style="color:var(--muted);font-weight:400">Load prior period for variance analysis</th>'}<th>% of Total</th></tr></thead><tbody>${leadRows}</tbody><tfoot><tr class="wp-tfoot"><td></td><td>TOTAL EXPENSES</td><td class="wp-num">${sym}${fmtAmt(totalCurr)}</td>${hasPrior?`<td class="wp-num">${sym}${fmtAmt(totalPrior)}</td><td class="wp-num">${totalCurr>=totalPrior?'+':''}${sym}${fmtAmt(Math.abs(totalCurr-totalPrior))}</td><td></td>`:'<td colspan="3"></td>'}<td class="wp-num">100%</td></tr></tfoot></table></div>
      ${sigNotes?`<div class="wp-sig-section"><div class="wp-sig-header">⚑ Significant Variances — Require Management Explanation</div>${sigNotes}</div>`:(hasPrior?'<div class="wp-all-clear">✓ No significant variances at current thresholds.</div>':'')}
    </div>
    <div class="wp-section" style="margin-top:1px"><div class="wp-section-header"><span class="wp-section-title">W/P Ref: TB-01 · Trial Balance Summary</span><span class="wp-section-meta ${balanced?'wp-balanced':'wp-unbalanced'}">${balanced?'✓ Balanced — Dr = Cr':'⚠ NOT BALANCED'}</span></div>
      <div style="padding:16px 20px;font-family:'IBM Plex Mono',monospace;font-size:12px;display:flex;gap:48px;flex-wrap:wrap"><div><span style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:4px">Total Debits</span><span style="font-size:20px;font-weight:600">${sym}${fmtAmt(totDr)}</span></div><div><span style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:4px">Total Credits</span><span style="font-size:20px;font-weight:600">${sym}${fmtAmt(totCr)}</span></div><div><span style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:4px">Difference</span><span style="font-size:20px;font-weight:600;color:${balanced?'var(--green)':'var(--accent)'}">${sym}${fmtAmt(Math.abs(totDr-totCr))}</span></div><div><span style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:4px">Uncategorized</span><span style="font-size:20px;font-weight:600;color:${uncategorized.length>0?'var(--accent)':'var(--green)'}">${uncategorized.length}</span></div></div>
    </div>
    <div class="wp-section" style="margin-top:1px"><div class="wp-section-header"><span class="wp-section-title">W/P Ref: PBC-01 · Prepared by Client Checklist</span><span class="wp-section-meta">${pbcItems.filter(p=>p.status==='pending').length} items outstanding</span></div>
      <div class="tbl-wrap"><table class="wp-table"><thead><tr><th>Required Item</th><th>Status</th><th>Notes</th></tr></thead><tbody>${pbcRows}</tbody></table></div>
    </div>
    <div class="wp-section" style="margin-top:1px"><div class="wp-section-header"><span class="wp-section-title">W/P Ref: FL-01 · Audit Flag Summary</span><span class="wp-section-meta">${flagged.length} item${flagged.length!==1?'s':''} requiring review</span></div>
      <div class="tbl-wrap"><table class="wp-table"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Risk / Flag</th></tr></thead><tbody>${flagged.slice(0,15).map(r=>`<tr><td style="font-family:'IBM Plex Mono',monospace;font-size:11px;white-space:nowrap">${r.date}</td><td style="font-size:12px;font-weight:500">${r.description}</td><td style="font-family:'IBM Plex Mono',monospace;font-size:11px;white-space:nowrap">${sym}${fmtAmt(Math.abs(parseFloat(r.amount||0)))}</td><td style="font-size:11px;color:var(--muted)">${r.flag}</td></tr>`).join('')}${flagged.length>15?`<tr><td colspan="4" style="text-align:center;padding:12px;font-size:11px;color:var(--muted)">… and ${flagged.length-15} more flags. See Flags view for full list.</td></tr>`:''}</tbody></table></div>
    </div>`;
}

function exportWorkingPapersPDF(){
  if(!activeTransactions.length){showToast('Load a file first.');return;}
  const content=document.getElementById('wpContent'); if(!content) return;
  const period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const html=`<!DOCTYPE html><html><head><title>Working Papers — ${settings.company}</title><style>body{font-family:Georgia,serif;color:#111;padding:44px;font-size:12px}h1{font-size:22px;margin-bottom:4px}p.meta{color:#666;font-size:11px;margin-bottom:28px}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#888;padding:8px;text-align:left;border-bottom:2px solid #111;background:#f9f7f3}td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px}.section{margin-bottom:32px}.sec-head{font-family:monospace;font-size:10px;background:#111;color:white;padding:8px 12px}@media print{body{padding:20px}}</style></head><body><h1>${settings.company} — Audit Working Papers</h1><p class="meta">Period: ${period} · Generated: ${new Date().toLocaleString()} · LedgerAI v7.0</p>${content.innerHTML}</body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
  auditEntry('export','Working Papers PDF exported',period);
}

// ============================================================
// SECTION 28: AI MEMO DRAFTING
// ============================================================
async function renderAIMemo(){
  const txns=activeTransactions;
  const memoOutput=document.getElementById('memoOutput'); if(!memoOutput) return;
  if(!txns.length){memoOutput.innerHTML='<div class="empty"><div class="empty-icon">✍️</div><p>Load a file to generate memos</p></div>';return;}
  const memoType=document.getElementById('memoType')?.value||'month-end';
  const sym=currencySymbol(),period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const expenses=txns.filter(r=>parseFloat(r.amount||0)>0&&r.category!=='Transfer');
  const catTotals={};
  expenses.forEach(r=>{const cat=r.category||'Miscellaneous';catTotals[cat]=(catTotals[cat]||0)+parseFloat(r.amount||0);});
  const totalExp=Object.values(catTotals).reduce((s,v)=>s+v,0);
  const flagged=txns.filter(r=>r.flag&&r.flag.toLowerCase()!=='none');
  const{balanced,totDr,totCr}=calcTrialBalance(txns);
  const topCats=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const periodKeys=Object.keys(periods).filter(k=>k!=='__ytd__').sort();
  const currentIdx=activePeriod!=='__ytd__'?periodKeys.indexOf(activePeriod):-1;
  const priorKey=currentIdx>0?periodKeys[currentIdx-1]:null;
  let priorSummary='';
  if(priorKey){const priorTotal=periods[priorKey].filter(r=>parseFloat(r.amount||0)>0).reduce((s,r)=>s+parseFloat(r.amount||0),0);const change=totalExp-priorTotal;priorSummary=`Prior period (${priorKey}): ${sym}${fmt(priorTotal)} total. Change: ${change>=0?'+':''}${sym}${fmt(change)} (${priorTotal>0?((change/priorTotal)*100).toFixed(1):'N/A'}%).`;}
  const topCatLines = topCats.map(([c,v]) => '  ' + c + ': ' + sym + fmt(v) + ' (' + (totalExp>0?(v/totalExp*100).toFixed(1):0) + '% of total)').join('\n');
  const flagTypes = [...new Set(flagged.map(r => {
    if (r.flag.includes('50%')) return 'M&E 50% rule';
    if (r.flag.includes('T4A') || r.flag.includes('1099')) return 'T4A/1099 threshold';
    if (r.flag.includes('capital') || r.flag.includes('capitalize')) return 'Capitalize vs expense';
    if (r.flag.includes('duplicate') || r.flag.includes('reversal')) return 'Duplicate/reversal';
    if (r.flag.includes('SEVERANCE')) return 'Severance disclosure';
    return 'Other';
  }))].join(', ') || 'None';
  const tbStatus = balanced ? 'BALANCED' : 'NOT BALANCED — difference of ' + sym + fmt(Math.abs(totDr-totCr));
  const financialSummary = [
    'Company: ' + settings.company + ' (' + settings.industry + ')',
    'Period: ' + period,
    'Total expenses: ' + sym + fmt(totalExp),
    priorSummary,
    'Top expense categories:',
    topCatLines,
    'Number of flagged transactions: ' + flagged.length,
    'Flag types present: ' + flagTypes,
    'Trial balance: ' + tbStatus
  ].filter(Boolean).join('\n').trim();
  const prompts={'month-end':'You are a professional accounting assistant. Write a concise, professional month-end client summary memo. 2-3 paragraphs. Professional but clear. Plain prose, no markdown, no bullet points.','cfo':'You are a professional accounting assistant. Write a CFO/controller variance memo. Focus on significant variances, compliance items, and items requiring management attention. 3-4 paragraphs, professional tone. Plain prose only.','mgmt-letter':'You are a public accounting assistant. Write 4-6 management letter recommendation items. Each item: identify the finding, explain the risk, give a practical recommendation. Numbered list only.','audit-plan':'You are an audit senior at a CPA firm. Write a brief audit planning note identifying: (1) significant accounts for testing, (2) key risks, (3) recommended audit procedures. Professional audit language. 3-4 paragraphs.'};
  const userPrompt=`${prompts[memoType]||prompts['month-end']}\n\nFinancial Data:\n${financialSummary}`;
  memoOutput.innerHTML=`<div class="memo-generating"><div class="memo-spinner"></div><span>Claude AI is drafting your memo…</span></div>`;
  try{
    const res=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:900,messages:[{role:'user',content:userPrompt}]})});
    const data=await res.json();
    if(!res.ok) throw new Error(data?.error?.message||res.status);
    const memoText=data.content[0].text;
    const memoTypeLabel=document.getElementById('memoType')?.options[document.getElementById('memoType').selectedIndex]?.text||'Memo';
    const dateStr=new Date().toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'});
    memoOutput.innerHTML=`<div class="memo-result"><div class="memo-result-header"><div><div class="memo-result-type">${memoTypeLabel}</div><div class="memo-result-company">${settings.company} · ${period}</div></div><div style="display:flex;gap:8px"><button class="btn btn-sm" onclick="copyMemo()">⎘ Copy</button><button class="btn btn-sm btn-solid" onclick="exportMemoPDF()">⬇ PDF</button></div></div><div class="memo-result-date">Prepared: ${dateStr} · Generated by LedgerAI / Claude AI · Review before sending</div><div class="memo-result-body" id="memoText">${memoText.replace(/\n/g,'<br>')}</div><div style="margin-top:12px;padding:10px 14px;background:var(--gold-l);border:1px solid rgba(168,120,26,.2);font-size:11px;color:var(--gold);font-family:'IBM Plex Mono',monospace">⚠ AI-generated draft — review all figures, verify compliance statements, and edit before sending.</div></div>`;
    auditEntry('ai','AI Memo drafted',memoTypeLabel+' — '+period);
    showToast('Memo drafted — review before sending.');
  }catch(e){memoOutput.innerHTML=`<div class="memo-error">⚠ AI error: ${e.message}. Check your connection.</div>`;}
}

function copyMemo(){const el=document.getElementById('memoText');if(!el) return;navigator.clipboard.writeText(el.innerText).then(()=>showToast('Memo copied to clipboard.'));}
function exportMemoPDF(){
  const el=document.getElementById('memoText'); if(!el) return;
  const type=document.getElementById('memoType')?.options[document.getElementById('memoType').selectedIndex]?.text||'Memo';
  const period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const html=`<!DOCTYPE html><html><head><title>${type} — ${settings.company}</title><style>body{font-family:Georgia,serif;color:#111;padding:52px;max-width:680px}h1{font-size:20px;margin-bottom:4px}p.meta{color:#666;font-size:11px;margin-bottom:32px;border-bottom:1px solid #eee;padding-bottom:12px}.body{font-size:13px;line-height:1.9;white-space:pre-wrap}.footer{margin-top:40px;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:12px}.disclaimer{margin-top:20px;padding:10px;background:#fff8e6;font-size:10px;color:#8a6414;border-left:3px solid #a87820}@media print{body{padding:24px}}</style></head><body><h1>${settings.company}</h1><p class="meta">${type} · ${period} · ${new Date().toLocaleDateString()}</p><div class="body">${el.innerText}</div><div class="disclaimer">⚠ AI-generated draft. Review before distribution. Not a substitute for professional judgment.</div><div class="footer">Generated by LedgerAI v7.0 · Powered by Claude AI · ${settings.company}</div></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
  auditEntry('export','Memo PDF exported',type+' — '+period);
}

// ============================================================
// SECTION 29: AI CATEGORIZATION
// ============================================================
async function aiCategorizeAll(){
  if(settings.aiMode==='off'){showToast('AI mode is off — enable in Settings.');return;}
  const uncategorized=activeTransactions.map((r,i)=>({r,i})).filter(({r})=>!r.category||r.category===''||r.category==='Uncategorized');
  if(!uncategorized.length){showToast('All transactions already categorized.');return;}
  const total=uncategorized.length; showToast(`⚡ Running AI on ${total} remaining transactions…`);
  for(let k=0;k<uncategorized.length;k++){
    const{r,i}=uncategorized[k]; await aiCategorize(r,i);
    if(k%5===0) showToast(`AI categorizing — ${k+1} of ${total} done`);
    await new Promise(res=>setTimeout(res,700));
  }
  showToast(`✓ AI complete — ${total} transactions categorized`);
  auditEntry('ai','AI Categorize All complete',total+' transactions');
}

async function aiCategorize(row,index){
  if(settings.aiMode==='off') return;
  const sanitizedDesc=sanitizeForAI(row.description);
  const isDeposit=parseFloat(row.amount||0)<0;
  const rulesResult=applyRulesEngine(row.description,row.amount,isDeposit);
  if(rulesResult){activeTransactions[index].category=rulesResult.category;activeTransactions[index].flag=rulesResult.flag;reRenderRow(index);refreshDependentViews();return;}
  const companyCtx=settings.company!=='Your Company'?`Company: ${settings.company} (${settings.industry})`:'Company: Small Business';
  const ctxExamples=activeTransactions.filter((r,ii)=>ii!==index&&r.category&&r.category!=='Uncategorized'&&r.category!==''&&r.description&&r._rulesMatched!==true).slice(-6).map(r=>`  "${sanitizeForAI(r.description)}" → ${r.category}`).join('\n');
  const examplesBlock=ctxExamples?`\nExamples from this file:\n${ctxExamples}\n`:'';
  const prompt=`You are a GAAP-trained bookkeeper for a Canadian business. Categorize the transaction below.\n${companyCtx}\nTransaction description: "${sanitizedDesc}"\nTransaction type: ${isDeposit?'DEPOSIT (incoming)':'EXPENSE (outgoing)'}\n${examplesBlock}\nValid categories:\n${CATEGORIES.map(c=>'  - '+c).join('\n')}\n\nReturn ONLY valid JSON:\n{"category":"<exact category name>","flag":"<specific accounting flag or none>"}\n\nFlag rules:\n- Meals & Entertainment: "Meals & entertainment — only 50% deductible per CRA/IRS"\n- Contractors: "Contractor payment — issue T4A if annual total ≥ $500 (CRA)"\n- Legal fees: "Legal fees — verify capital vs. revenue treatment"\n- Deposits/Income: "Client invoice payment — confirm HST collected and remitted to CRA"\n- Otherwise: "none"`;
  const catCell=document.getElementById('cat-'+index);
  if(catCell) catCell.innerHTML='<span class="badge b-pulse">⟳ AI…</span>';
  try{
    const res=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:100,messages:[{role:'user',content:prompt}]})});
    const data=await res.json();
    if(!res.ok) throw new Error(data?.error?.message||res.status);
    const result=JSON.parse(data.content[0].text.replace(/```json|```/g,'').trim());
    const _prev=activeTransactions[index].category||'Uncategorized';
    activeTransactions[index].category=result.category; activeTransactions[index].flag=result.flag||'none';
    auditEntry('ai','AI categorized',(activeTransactions[index].description||'Row '+index),_prev,result.category);
    reRenderRow(index); refreshDependentViews();
  }catch(e){
    const errCell=document.getElementById('cat-'+index);
    if(errCell) errCell.innerHTML=`<span class="editable" onclick="editCat(${index},this)">${activeTransactions[index].category||'<span style="color:var(--accent);font-size:11px">⚠ Click to set</span>'}</span>`;
    console.warn('AI error row',index,e);
  }
}

// ============================================================
// SECTION 30: STUDENT VIEWS
// ============================================================
function detectSubscriptions(){
  const txns=activeTransactions;
  const KNOWN=['netflix','spotify','apple.com/bill','amazon prime','disney','hulu','crave','apple tv','youtube premium','adobe','slack','notion','figma','canva','zoom','dropbox','github','jira','asana','monday','chatgpt','midjourney','anthropic','openai','google workspace','microsoft 365','shopify','hubspot'];
  const found=[],descMap={};
  txns.filter(r=>parseFloat(r.amount||0)>0).forEach(r=>{const key=(r.description||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim();if(!descMap[key])descMap[key]=[];descMap[key].push(r);});
  Object.entries(descMap).forEach(([key,rows])=>{
    const isKnown=KNOWN.some(k=>key.includes(k.toLowerCase()));
    const isRecurring=rows.length>=2;
    if(isKnown||isRecurring){
      const avgAmt=rows.reduce((s,r)=>s+parseFloat(r.amount||0),0)/rows.length;
      const icon=key.includes('netflix')?'📺':key.includes('spotify')?'🎵':key.includes('adobe')?'🎨':key.includes('amazon')?'📦':key.includes('apple')?'🍎':key.includes('google')?'🔍':key.includes('slack')?'💬':key.includes('zoom')?'📹':'🔁';
      found.push({name:rows[0].description,amount:avgAmt,icon,freq:'Monthly'});
    }
  });
  return found.slice(0,8);
}

function renderSpending(){
  const txns=activeTransactions,expenses=txns.filter(r=>parseFloat(r.amount||0)>0),sym=currencySymbol();
  const total=expenses.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const el=id=>document.getElementById(id);
  if(el('spendTotal'))    el('spendTotal').textContent    =sym+fmtAmt(total);
  if(el('spendTxnCount')) el('spendTxnCount').textContent =expenses.length;
  const catTotals={};
  expenses.forEach(r=>{const c=r.category||'Uncategorized';catTotals[c]=(catTotals[c]||0)+parseFloat(r.amount||0);});
  const topCat=Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
  if(el('spendTopCat')) el('spendTopCat').textContent=topCat?topCat[0]:'—';
  const days=new Date().getDate();
  if(el('spendAvgDay')) el('spendAvgDay').textContent=sym+fmtAmt(days>0?total/days:0);
  const sorted=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const palette=['#c8341c','#1c3e80','#a87820','#1e6640','#5a3a8a','#8a6a4a','#0e6868','#6a8a4a'];
  if(spendChartInstance){try{spendChartInstance.destroy();}catch(e){}}
  const spEl=document.getElementById('spendChart');
  if(spEl){const ctx=spEl.getContext('2d');spendChartInstance=new Chart(ctx,{type:'bar',data:{labels:sorted.map(e=>e[0]),datasets:[{data:sorted.map(e=>e[1]),backgroundColor:palette.slice(0,sorted.length),borderRadius:2}]},options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{callback:v=>sym+(v>=1000?(v/1000).toFixed(0)+'k':v)}},y:{grid:{display:false}}}}});}
  const bd=el('spendBreakdown');
  if(bd){
    bd.innerHTML='';
    sorted.forEach(([cat,amt],i)=>{
      const pct=total>0?((amt/total)*100).toFixed(1):'0.0';
      const div=document.createElement('div'); div.className='cat-item';
      div.innerHTML=`<div class="cat-head"><span class="cat-name">${cat}</span><span class="cat-amt">${sym}${fmtAmt(amt)} <span style="opacity:.45">${pct}%</span></span></div><div class="cat-track"><div class="cat-fill" style="width:0%;background:${palette[i%palette.length]}" data-w="${pct}"></div></div>`;
      bd.appendChild(div);
    });
    setTimeout(()=>bd.querySelectorAll('.cat-fill').forEach(b=>b.style.width=b.dataset.w+'%'),300);
  }
}

function renderSubscriptions(){
  const sym=currencySymbol(),subs=detectSubscriptions();
  const el=id=>document.getElementById(id);
  const monthly=subs.reduce((s,sub)=>s+sub.amount,0);
  if(el('subMonthlyTotal')) el('subMonthlyTotal').textContent=sym+fmtAmt(monthly);
  if(el('subAnnualTotal'))  el('subAnnualTotal').textContent =sym+fmtAmt(monthly*12);
  if(el('subCount'))        el('subCount').textContent       =subs.length;
  const grid=el('subGrid');
  if(grid) grid.innerHTML=subs.length?subs.map(s=>`<div class="sub-card"><div class="sub-icon">${s.icon}</div><div class="sub-name">${s.name}</div><div class="sub-amt">${sym}${fmtAmt(s.amount)}/mo</div></div>`).join(''):'<div class="empty"><div class="empty-icon">🔁</div><p>No recurring charges detected yet</p></div>';
}

function renderGoals(){
  const goals=JSON.parse(localStorage.getItem('ledgerai_goals')||'[]');
  const content=document.getElementById('goalsContent'); if(!content) return;
  if(!goals.length){content.innerHTML='<div class="empty"><div class="empty-icon">🎯</div><p>Add a savings goal to get started</p></div>';return;}
  content.innerHTML=goals.map((g,i)=>{
    const pct=Math.min((g.current/g.target)*100,100).toFixed(0);
    return`<div class="savings-goal panel" style="margin-bottom:12px"><div class="sg-header"><h3 class="sg-title">${g.name}</h3><span class="sg-pct">${pct}%</span></div><div class="sg-track"><div class="sg-fill" style="width:${pct}%"></div></div><div class="sg-labels"><span>${currencySymbol()}${fmtAmt(g.current)} saved</span><span>Goal: ${currencySymbol()}${fmtAmt(g.target)}</span></div><div style="margin-top:8px;display:flex;gap:8px"><input type="number" placeholder="Update amount" style="font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;border:1px solid var(--rule);background:var(--paper);width:120px" id="goalAmt-${i}"/><button class="btn btn-sm" onclick="updateGoal(${i})">Update</button><button class="btn btn-sm btn-red" onclick="deleteGoal(${i})">Delete</button></div></div>`;
  }).join('');
}

function addGoal(){const name=prompt('Goal name:');if(!name) return;const target=parseFloat(prompt('Target amount ($):'));if(isNaN(target)||target<=0){showToast('Invalid amount.');return;}const goals=JSON.parse(localStorage.getItem('ledgerai_goals')||'[]');goals.push({name,target,current:0});localStorage.setItem('ledgerai_goals',JSON.stringify(goals));auditEntry('system','Savings goal added',name+' — target: '+currencySymbol()+fmtAmt(target));renderGoals();showToast('Goal added: '+name);}
function updateGoal(index){const goals=JSON.parse(localStorage.getItem('ledgerai_goals')||'[]');const amt=parseFloat(document.getElementById('goalAmt-'+index)?.value||0);if(isNaN(amt)) return;goals[index].current=amt;localStorage.setItem('ledgerai_goals',JSON.stringify(goals));renderGoals();showToast('Goal updated.');}
function deleteGoal(index){if(!confirm('Delete this goal?')) return;const goals=JSON.parse(localStorage.getItem('ledgerai_goals')||'[]');goals.splice(index,1);localStorage.setItem('ledgerai_goals',JSON.stringify(goals));renderGoals();}

// ============================================================
// SECTION 31: FREELANCER VIEWS
// ============================================================
function renderIncome(){
  const income=activeTransactions.filter(r=>parseFloat(r.amount||0)<0||r.category==='Income');
  const sym=currencySymbol();
  const tbody=document.getElementById('incomeBody'); if(!tbody) return;
  if(!income.length){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">No income transactions. Add transactions with category "Income" or negative amounts.</td></tr>';return;}
  tbody.innerHTML=income.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr><td>${r.date}</td><td>${r.description}</td><td style="font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--green)">${sym}${fmtAmt(Math.abs(parseFloat(r.amount||0)))}</td><td>${r.category}</td><td><span class="badge b-ok">✓ Received</span></td></tr>`).join('');
}

function renderClients(){
  const income=activeTransactions.filter(r=>parseFloat(r.amount||0)<0||r.category==='Income');
  const sym=currencySymbol();
  const clientMap={};
  income.forEach(r=>{const k=r.description.replace(/INV\s*#[A-Z0-9-]+/gi,'').replace(/INVOICE\s*#[A-Z0-9-]+/gi,'').trim();if(!clientMap[k])clientMap[k]={amount:0,date:r.date,payments:0};clientMap[k].amount+=Math.abs(parseFloat(r.amount||0));clientMap[k].payments+=1;if(r.date>clientMap[k].date)clientMap[k].date=r.date;});
  const tbody=document.getElementById('flClientBody'); if(!tbody) return;
  if(!Object.keys(clientMap).length){tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">No clients yet. Add income transactions to track clients.</td></tr>';return;}
  tbody.innerHTML=Object.entries(clientMap).sort((a,b)=>b[1].amount-a[1].amount).map(([name,d])=>{
    const days=Math.floor((Date.now()-new Date(d.date))/86400000);
    const status=days<=30?'ct-paid':days<=60?'ct-pending':'ct-overdue';
    const lbl=days<=30?'✓ Recent':days<=60?'⏳ Pending':'⚠ Overdue';
    return`<tr><td>${name} <span style="font-size:10px;color:var(--muted)">(${d.payments} payment${d.payments!==1?'s':''})</span></td><td style="font-family:'IBM Plex Mono',monospace;font-weight:600;color:var(--green)">${sym}${fmtAmt(d.amount)}</td><td><span class="ct-status ${status}">${lbl}</span></td><td>${d.date}</td></tr>`;
  }).join('');
}

function addClient(){showToast('Add income transactions with the client name as the description to track clients.');}

function renderTaxes(){
  const txns=activeTransactions,sym=currencySymbol();
  const income=txns.filter(r=>parseFloat(r.amount||0)<0||r.category==='Income');
  const expenses=txns.filter(r=>parseFloat(r.amount||0)>0&&r.category!=='Income'&&r.category!=='Transfer');
  const totalInc=income.reduce((s,r)=>s+Math.abs(parseFloat(r.amount||0)),0);
  const totalExp=expenses.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const net=totalInc-totalExp,tax=Math.max(0,net*0.25);
  const el=id=>document.getElementById(id);
  if(el('taxEstimate')) el('taxEstimate').textContent=sym+fmtAmt(tax);
  const quarters={Q1:{income:0,expenses:0},Q2:{income:0,expenses:0},Q3:{income:0,expenses:0},Q4:{income:0,expenses:0}};
  txns.forEach(r=>{const month=new Date(r.date||'').getMonth();const q=`Q${Math.floor(month/3)+1}`;const amt=parseFloat(r.amount||0);if(amt<0||r.category==='Income')quarters[q].income+=Math.abs(amt);else if(amt>0&&r.category!=='Transfer')quarters[q].expenses+=amt;});
  const tbody=el('taxBody');
  if(tbody) tbody.innerHTML=Object.entries(quarters).map(([q,d])=>{const net=d.income-d.expenses,t=Math.max(0,net*0.25);return`<tr><td style="font-weight:600">${q}</td><td style="font-family:'IBM Plex Mono',monospace;color:var(--green)">${sym}${fmtAmt(d.income)}</td><td style="font-family:'IBM Plex Mono',monospace;color:var(--accent)">${sym}${fmtAmt(d.expenses)}</td><td style="font-family:'IBM Plex Mono',monospace;font-weight:600">${sym}${fmtAmt(net)}</td><td style="font-family:'IBM Plex Mono',monospace;color:var(--gold);font-weight:600">${t>0?sym+fmtAmt(t):'—'}</td></tr>`;}).join('');
}

// ============================================================
// SECTION 32: MANUAL ENTRY
// ============================================================
function toggleManualEntry(){const form=document.getElementById('manualEntryForm');if(form)form.style.display=form.style.display==='none'?'block':'none';}

function addManualTransaction(){
  const date=document.getElementById('mDate')?.value;
  const desc=document.getElementById('mDesc')?.value.trim();
  const amount=document.getElementById('mAmount')?.value;
  const category=document.getElementById('mCategory')?.value;
  const type=document.getElementById('mType')?.value||'expense';
  if(!date||!amount){showToast('Date and amount are required.');return;}
  if(!desc){showToast('Description is required.');return;}
  const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const d=new Date(date);
  const periodKey=isNaN(d)?'Manual Entry':MN[d.getMonth()]+' '+d.getFullYear();
  const finalAmount=type==='income'?String(-Math.abs(parseFloat(amount))):String(Math.abs(parseFloat(amount)));
  const finalCat=type==='income'?'Income':(category||'Miscellaneous');
  const newRow={date,description:desc,amount:finalAmount,category:finalCat,flag:'none',_edited:true};
  if(!periods[periodKey]){periods[periodKey]=[];document.getElementById('periodSection').style.display='block';}
  periods[periodKey].push(newRow);
  if(activePeriod===periodKey){activeTransactions.push(newRow);editCount++;updateEditBar();}
  updateSidebar();
  if(!activePeriod) activatePeriod(periodKey);
  else if(activePeriod===periodKey) applyFilters();
  auditEntry('edit','Manual transaction added',desc+' — '+currencySymbol()+fmtAmt(Math.abs(parseFloat(amount))));
  saveTransactionsToCloud(periodKey,periods[periodKey]);
  document.getElementById('view-onboard').style.display='none';
  toggleManualEntry(); showToast('Transaction added: '+desc);
  refreshDependentViews();
}

// ============================================================
// SECTION 33: EXPORTS
// ============================================================
function exportCSV(){
  const txns=activeTransactions; if(!txns.length) return;
  const headers=['Date','Description','Amount','Category','Debit Acct #','Debit Account','Credit Acct #','Credit Account','Journal Note','Flag'];
  const rows=txns.map(r=>{const rule=JOURNAL_RULES[r.category]||{dr:'6950',cr:'1000',note:''};return[r.date,`"${(r.description||'').replace(/"/g,'""')}"`,parseFloat(r.amount||0).toFixed(2),`"${r.category||''}"`,rule.dr,`"${COA[rule.dr]?.name||''}"`,rule.cr,`"${COA[rule.cr]?.name||''}"`,`"${rule.note||''}"`,`"${r.flag&&r.flag.toLowerCase()!=='none'?r.flag:'Clear'}"`].join(',');});
  downloadFile([headers.join(','),...rows].join('\n'),'text/csv',`${settings.company.replace(/\s+/g,'-')}-transactions.csv`);
  auditEntry('export','Transactions CSV exported',activeTransactions.length+' rows'); showToast('CSV exported.');
}

function exportPDF(){
  const txns=activeTransactions; if(!txns.length) return;
  const expenses=txns.filter(r=>parseFloat(r.amount||0)>0);
  const total=expenses.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const flagged=txns.filter(r=>r.flag&&r.flag.toLowerCase()!=='none').length;
  const sym=currencySymbol(),period=activePeriod==='__ytd__'?'Year-to-Date':(activePeriod||'—');
  const rows=txns.map(r=>{const rule=JOURNAL_RULES[r.category]||{dr:'6950',cr:'1000',note:''};const hasFlag=r.flag&&r.flag.toLowerCase()!=='none';const isDeposit=parseFloat(r.amount||0)<0;return`<tr style="border-bottom:1px solid #eee;${hasFlag?'background:#fef8f7':''}"><td style="padding:6px 8px;font-size:11px;color:#888;white-space:nowrap">${r.date}</td><td style="padding:6px 8px;font-size:12px;font-weight:500">${r.description}</td><td style="padding:6px 8px;font-size:12px;font-family:monospace;white-space:nowrap;color:${isDeposit?'#1e6640':'inherit'}">${isDeposit?'+':''}${sym}${fmtAmt(Math.abs(parseFloat(r.amount||0)))}</td><td style="padding:6px 8px;font-size:11px;color:#555">${r.category||'—'}</td><td style="padding:6px 8px;font-size:10px;font-family:monospace;color:#1e3a7a">Dr.${rule.dr}</td><td style="padding:6px 8px;font-size:10px;font-family:monospace;color:#b83a20">Cr.${rule.cr}</td><td style="padding:6px 8px;font-size:10px;color:${hasFlag?'#b83a20':'#1e6640'}">${hasFlag?'⚠':'✓'}</td></tr>`;}).join('');
  const html=`<!DOCTYPE html><html><head><title>${settings.company} — Transaction Report</title><style>body{font-family:Georgia,serif;color:#111;padding:44px;background:#fff}h1{font-size:26px;margin-bottom:2px}h2{font-size:14px;font-weight:400;color:#666;margin-bottom:24px}.stats{display:flex;gap:36px;padding:14px 0;border-top:2px solid #111;border-bottom:1px solid #eee;margin-bottom:24px}.s label{font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#888;display:block;margin-bottom:2px}.s value{font-size:20px}table{width:100%;border-collapse:collapse}thead th{font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#888;padding:7px 8px;text-align:left;background:#f5f2ec}@media print{body{padding:20px}}</style></head><body><h1>${settings.company}</h1><h2>Transaction Report — ${period} · Generated ${new Date().toLocaleDateString()}</h2><div class="stats"><div class="s"><label>Total Expenses</label><value>${sym}${fmt(total)}</value></div><div class="s"><label>Transactions</label><value>${txns.length}</value></div><div class="s"><label>Flagged</label><value style="color:#b83a20">${flagged}</value></div></div><table><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Category</th><th>Debit</th><th>Credit</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:32px;padding-top:12px;border-top:1px solid #eee;font-family:monospace;font-size:10px;color:#bbb">Generated by LedgerAI v7.0 · Powered by Claude AI · ${settings.company}</div></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
  auditEntry('export','PDF report exported',period); showToast('PDF opened for printing.');
}

function downloadFile(content,type,filename){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}

// ============================================================
// SECTION 34: PLAID
// ============================================================
function initPlaid(){
  if(!settings.plaidLinkToken){showToast('Loading demo bank data — add Plaid Link Token in Settings to connect a real bank.');loadPlaidSandboxTransactions({});return;}
  if(!window.Plaid){const script=document.createElement('script');script.src='https://cdn.plaid.com/link/v2/stable/link-initialize.js';script.onload=()=>openPlaidLink();document.head.appendChild(script);}else openPlaidLink();
}
function openPlaidLink(){if(!window.Plaid){showToast('Plaid script failed to load.');return;}plaidHandler=window.Plaid.create({token:settings.plaidLinkToken,onSuccess:(publicToken,metadata)=>{showToast(`Bank connected: ${metadata.institution?.name||'Account'} — loading transactions…`);auditEntry('system','Bank connected via Plaid',metadata.institution?.name||'Unknown bank');loadPlaidSandboxTransactions(metadata);},onExit:err=>{if(err)showToast('Bank connection cancelled.');},onEvent:e=>console.log('Plaid:',e)});plaidHandler.open();}
function loadPlaidSandboxTransactions(metadata){
  const institutionName=metadata?.institution?.name||'Connected Bank';
  const now=new Date();
  const SANDBOX=[{desc:'ADP PAYROLL PROCESSING',cat:'Payroll',amt:12500},{desc:'WEWORK OFFICE LEASE',cat:'Rent & Facilities',amt:3200},{desc:'GOOGLE ADS Q1 CAMPAIGN',cat:'Advertising & Marketing',amt:2200},{desc:'AWS CLOUD SERVICES',cat:'Utilities & Hosting',amt:312},{desc:'JANE SMITH - INV #JS-001',cat:'Contractor / Professional Services',amt:1800},{desc:'CLIENT LUNCH CANOE RESTAURANT',cat:'Meals & Entertainment',amt:284},{desc:'RBC WIRE TRANSFER FEE',cat:'Bank & Finance Charges',amt:35},{desc:'ADOBE CC TEAM - 12 SEATS',cat:'Software & Subscriptions',amt:54.99},{desc:'SARA OKONKWO - INV #SO-022',cat:'Contractor / Professional Services',amt:2200},{desc:'NOBU RESTAURANT CLIENT DINNER',cat:'Meals & Entertainment',amt:412},{desc:'STAPLES BUSINESS ORDER',cat:'Office Supplies & Equipment',amt:87.50},{desc:'ADP PAYROLL PROCESSING',cat:'Payroll',amt:12500}];
  const month=String(now.getMonth()+1).padStart(2,'0'),year=now.getFullYear();
  const transactions=SANDBOX.map((t,i)=>({date:`${year}-${month}-${String(Math.min(i*2+1,28)).padStart(2,'0')}`,description:t.desc,amount:t.amt.toString(),category:t.cat,flag:t.cat==='Meals & Entertainment'?'Meals & entertainment — only 50% deductible per CRA/IRS':t.cat==='Contractor / Professional Services'?'Contractor payment — issue T4A if annual total ≥ $500 (CRA)':'none'}));
  const periodKey=`${year}-${month} (${institutionName})`;
  periods[periodKey]=transactions; activatePeriod(periodKey);
  showToast(`✓ ${transactions.length} transactions loaded from ${institutionName}`);
  auditEntry('load',`Plaid: ${transactions.length} transactions loaded`,institutionName,'',periodKey);
  showView(getProfileDashboard());
}

// ============================================================
// SECTION 35: SUPABASE AUTH + CLOUD SAVE
// ============================================================
function loadScript(src){return new Promise((resolve,reject)=>{if(document.querySelector(`script[src="${src}"]`)) return resolve();const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}

async function initAuth(){
  try{
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    const res=await fetch('/api/config');
    const conf=await res.json();
    if(!conf.supabaseUrl) return;
    sbClient=window.supabase.createClient(conf.supabaseUrl,conf.supabaseAnon);
    const{data:{session}}=await sbClient.auth.getSession();
    if(!session){window.location.href='auth.html';return;}
    currentUser=session.user; sessionToken=session.access_token;
    updateUserUI(); await loadUserData();
    sbClient.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')window.location.href='auth.html';if(session){currentUser=session.user;sessionToken=session.access_token;}});
  }catch(e){console.warn('Auth init failed — running in offline mode',e);}
}

function updateUserUI(){
  if(!currentUser) return;
  const name=currentUser.user_metadata?.full_name||currentUser.email?.split('@')[0]||'User';
  const co=document.getElementById('topbarCompany'); if(co) co.textContent=name;
  const btn=document.getElementById('signOutBtn'); if(btn) btn.style.display='inline-flex';
}

async function loadUserData(){
  if(!sessionToken) return;
  try{
    const res=await fetch('/api/db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'load_transactions',token:sessionToken})});
    const data=await res.json();
    if(!data.success||!data.transactions?.length){showToast('No saved data yet — load a file or try demo data to get started.');return;}
    const grouped={};
    data.transactions.forEach(t=>{const p=t.period||'Imported';if(!grouped[p])grouped[p]=[];grouped[p].push({date:t.date,description:t.description,amount:t.amount,category:t.category,flag:t.flag});});
    Object.entries(grouped).forEach(([period,txns])=>{periods[period]=txns;addPeriodToSidebar(period,txns.length);});
    const firstPeriod=Object.keys(grouped)[0];
    if(firstPeriod) activatePeriod(firstPeriod);
    showToast(`✓ Loaded ${data.transactions.length} saved transactions`);
    const sRes=await fetch('/api/db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'load_settings',token:sessionToken})});
    const sData=await sRes.json();
    if(sData.success&&sData.settings){settings.company=sData.settings.company||settings.company;settings.industry=sData.settings.industry||settings.industry;settings.currency=sData.settings.currency||settings.currency;settings.fiscalYear=sData.settings.fiscal_year||settings.fiscalYear;settings.aiMode=sData.settings.ai_mode||settings.aiMode;const co=document.getElementById('topbarCompany');if(co&&settings.company!=='Your Company')co.textContent=settings.company;}
  }catch(e){console.warn('Could not load saved data',e);showToast('Running offline — data will not be saved to cloud.');}
}

async function saveTransactionsToCloud(period,txns){if(!sessionToken||!txns?.length) return;try{await fetch('/api/db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save_transactions',token:sessionToken,data:{period,transactions:txns,accountType:'business'}})});}catch(e){console.warn('Could not save to cloud',e);}}
async function saveSettingsToCloud(){if(!sessionToken) return;try{await fetch('/api/db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save_settings',token:sessionToken,data:{company:settings.company,industry:settings.industry,currency:settings.currency,fiscalYear:settings.fiscalYear,aiMode:settings.aiMode}})});}catch(e){console.warn('Could not save settings',e);}}
async function signOut(){if(sbClient) await sbClient.auth.signOut();window.location.href='auth.html';}

// ============================================================
// SECTION 36: TOAST + HELPERS
// ============================================================
let toastTimer;
function showToast(msg){const el=document.getElementById('toast');if(!el) return;el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);}

// ============================================================
// SECTION 37: MOBILE
// ============================================================
function toggleSidebar(){const sidebar=document.getElementById('sidebar'),overlay=document.getElementById('sidebarOverlay'),isOpen=sidebar.classList.contains('open');sidebar.classList.toggle('open',!isOpen);overlay.classList.toggle('show',!isOpen);}
function initMobile(){const toggle=document.getElementById('menuToggle');if(!toggle) return;const mq=window.matchMedia('(max-width: 900px)');const update=()=>toggle.style.display=mq.matches?'flex':'none';mq.addEventListener('change',update);update();document.querySelectorAll('.nav-item').forEach(btn=>{btn.addEventListener('click',()=>{if(window.innerWidth<=900){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('show');}});});}

// ============================================================
// SECTION 38: INITIALIZATION
// ============================================================
renderCOA();
const savedProfile=localStorage.getItem('ledgerai_profile');
if(savedProfile){
  currentProfile=savedProfile;
  document.body.setAttribute('data-profile',currentProfile);
  showProfileNav();
  const lbl=document.getElementById('currentProfileLabel');
  if(lbl){const names={student:'Student',freelancer:'Freelancer',business:'Small Business',professional:'Accounting Professional'};lbl.textContent=names[currentProfile]||currentProfile;}
}else{const overlay=document.getElementById('profileSelectOverlay');if(overlay)overlay.classList.remove('hidden');}
auditEntry('system','LedgerAI session started','v7.0 — '+new Date().toLocaleDateString());
initMobile();
initAuth();