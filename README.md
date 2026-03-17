# LedgerAI — AI-Powered Bookkeeping & Audit Tool

> Built by **Zohaib Ghani** — BBA Accounting, Wilfrid Laurier University (Lazaridis School) · Pursuing CPA  
> [zohaibghani556@gmail.com](mailto:zohaibghani556@gmail.com) · 647-939-7278 · Vaughan, ON

**[→ Live App](https://ledger-ai-theta.vercel.app/app.html)** &nbsp;|&nbsp; **[→ Live Demo / Showcase](https://ledger-ai-theta.vercel.app/showcase.html)** &nbsp;|&nbsp; **[→ Landing Page](https://ledger-ai-theta.vercel.app)** &nbsp;|&nbsp; **[→ GitHub](https://github.com/zohaibghani556-web/LedgerAi)**

---

## What is LedgerAI?

LedgerAI is a browser-based accounting tool that turns raw transaction files into a complete set of GAAP-compliant financial reports. It integrates the Claude AI API for automated transaction categorization, applies a double-entry bookkeeping rules engine, and produces reports that mirror what professional accounting software generates — including audit working papers and AI-drafted management memos.

Built from two direct experiences: an audit internship at Muhammad Nusrullah CGA reviewing risk assessment frameworks and analyzing engagement files, and a bookkeeping role at Pesticon Pest Control reconciling payments manually. The inefficiencies observed firsthand are exactly what this tool addresses.

---

## Live Showcase

**[→ View Full Analysis Output](https://ledger-ai-theta.vercel.app/showcase.html)**

The showcase page demonstrates LedgerAI processing a realistic 169-transaction general ledger for a fictional digital marketing agency (Northgate Creative Inc., Q1 2024). The file contains:

- 80% uncategorized transactions in raw bank-statement format
- Credits, reversals, and period-end journal adjustments
- 10 genuine audit flags (Stripe fee reversal pattern, $18K capitalize-vs-expense decision, $12K severance disclosure, contractor 1099/T4A exposure across 15 payees)
- Advertising spend that increased 191% Jan→Mar with no corresponding revenue

The showcase page shows every output LedgerAI generates: dashboard metrics, category chart, monthly P&L, trial balance, working papers lead schedule, all 10 audit flags with accounting rationale, contractor table with T4A status, sample GAAP journal entries, AI-generated CFO memo, and audit trail log.

**[Download the GL file](https://ledger-ai-theta.vercel.app/sample-data/northgate-creative-q1-2024.csv)** and load it in the app to see everything generate live.

---

## Features

| Feature | Description |
|---|---|
| **Audit Working Papers** | Generates lead schedules (W/P Ref: LS-01), PBC checklists, and prior-period variance analysis. Significant variances flagged. PDF export. |
| **AI Memo Drafting** | Claude AI reads loaded financial data and drafts month-end client summaries, CFO variance memos, management letter bullets, and audit planning notes. |
| **Bank Connection (Plaid)** | Plaid integration pulls transactions directly from 12,000+ banks — same technology as QuickBooks. No CSV required. |
| **AI Categorization** | Claude API assigns expense categories with IRS/CRA compliance flags. Learns from existing categorizations in the file. |
| **GAAP Journal Entries** | Every transaction generates a double-entry journal entry using a numbered Chart of Accounts (1xxx–6xxx). |
| **Trial Balance** | Verifies Dr = Cr after all entries. Reports exact difference if out of balance. CSV + PDF export. |
| **P&L Statement** | Revenue → Gross Profit → Operating Expenses → Net Income. Multi-period YTD. PDF export. |
| **Cash Flow Statement** | Classifies each expense as Operating, Investing, or Financing. |
| **Budget vs Actual** | Set monthly budgets per category, track variance in real time with animated bars. |
| **Bank Reconciliation** | Fuzzy-matching algorithm matches transactions by amount, date (±5 days), and description. Flags unmatched items. |
| **Duplicate Detector** | Finds transactions with same amount + description within 7 days using Levenshtein similarity. |
| **Immutable Audit Trail** | Every edit, deletion, AI action, and export logged with timestamp and before/after values. Mirrors CAS 230 / ISA 230. |
| **Multi-Period Reporting** | Load Jan, Feb, Mar separately — switch periods or view YTD combined. |

---

## Technical Stack

**Frontend (Web App)**
- Vanilla JavaScript, HTML5, CSS3 — no frameworks, no build step
- [Claude API](https://docs.anthropic.com) (`claude-sonnet-4-20250514`) for AI categorization and memo drafting
- API calls routed through a secure Vercel serverless function — key never exposed to browser
- [Plaid Link](https://plaid.com/docs/link/) for bank account connection
- [Chart.js](https://www.chartjs.org/) for data visualization
- [PapaParse](https://www.papaparse.com/) for CSV parsing
- [SheetJS](https://sheetjs.com/) for Excel (XLSX/XLS) support

**Backend & Infrastructure**
- [Vercel](https://vercel.com) for hosting and serverless functions
- [Supabase](https://supabase.com) for user authentication and database (coming soon)
- [Stripe](https://stripe.com) for payments (coming soon)

**Data Analysis Layer (Python/SQL)**
- Python 3 with **pandas** for data manipulation
- **SQLite** for relational queries
- See [`analysis.ipynb`](analysis.ipynb) and [`analysis.sql`](analysis.sql)

---

## File Structure

```
ledgerai/
├── index.html                         ← Landing page
├── app.html                           ← Main application
├── app.js                             ← All application logic (~2,400 lines)
├── style.css                          ← Styles
├── showcase.html                      ← Full analysis demo (169-transaction GL)
├── vercel.json                        ← Vercel configuration
├── analysis.ipynb                     ← Python/pandas analysis notebook
├── analysis.sql                       ← SQL schema + 10 analysis queries
├── README.md
├── api/
│   └── claude.js                      ← Secure serverless proxy for Claude API
└── sample-data/
    ├── northgate-creative-q1-2024.csv ← Complex 169-txn test file (Q1 GL)
    ├── january-2024.csv               ← Standard format sample
    ├── february-2024.csv              ← February sample (prior period)
    ├── bank-statement-rbc.csv         ← Bank statement format
    └── quickbooks-export.csv          ← QuickBooks export format
```

---

## Security

API keys are never stored in the codebase or exposed to the browser. All Claude API calls are routed through a Vercel serverless function (`/api/claude`) which holds the key securely as an environment variable on the server. Users' data stays in their browser session — no data is sent to any third-party server except Anthropic's API for categorization requests.

---

## Running Locally

No server required for basic use. Clone the repo and open `index.html` in any browser.

```bash
git clone https://github.com/zohaibghani556-web/LedgerAi.git
cd LedgerAi
open index.html
```

Note: AI features require the Vercel deployment to work (the `/api/claude` proxy). They won't function when opening the HTML file directly unless you run a local server.

---

## Interview Talking Points

**On the journal entry engine:**
"Every transaction produces two ledger entries — a debit to an expense account and a credit to Cash or AP. I used a rules engine mapping 11 expense categories to specific GAAP account codes (1xxx–6xxx). The trial balance verifies Dr = Cr across all entries."

**On the audit working papers:**
"The working papers module generates the actual documents audit staff produce at the start of an engagement — lead schedules with prior-period variance analysis, PBC checklists pre-populated from the transaction data, and materiality-based flagging. This is the layer QuickBooks doesn't touch."

**On the AI memo drafting:**
"The tool reads the loaded financial data — category totals, variances, flagged items — and sends it to Claude with a structured prompt. It returns a draft CFO memo or management letter that the accountant reviews and edits. This mirrors what a senior would write but eliminates the first draft entirely."

**On the secure API architecture:**
"Rather than exposing the API key in the browser, I built a serverless proxy function on Vercel. The frontend calls my own endpoint, which holds the key as an environment variable and forwards the request to Anthropic. The key is never visible in the client."

**On the bank reconciliation:**
"The algorithm compares the internal ledger against the bank statement using a fuzzy match: amount within $0.01, date within 5 days, and Levenshtein description similarity score. Unmatched items on either side are flagged — this is what an accountant does manually at month-end close."

**On the Plaid integration:**
"Instead of requiring a CSV export, the tool integrates Plaid — the same API QuickBooks uses. The user authenticates through their bank's portal, Plaid returns structured transaction data, and LedgerAI maps it directly to expense categories. Credentials never touch the app."

**On the audit trail:**
"Every edit, deletion, AI categorization, and export is logged with timestamp and before/after values. Entries are immutable — this mirrors CAS 230 documentation requirements for working paper integrity."

---

## About

Zohaib Ghani is a third-year BBA Accounting student at Wilfrid Laurier University's Lazaridis School of Business, pursuing his CPA designation. Audit Internship at Muhammad Nusrullah CGA (2025) and prior bookkeeping experience at Pesticon Pest Control.
