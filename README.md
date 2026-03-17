# LedgerAI — AI-Powered Bookkeeping Tool

> Built by **Zohaib Ghani** — BBA Accounting, Wilfrid Laurier University (Lazaridis School of Business) · Pursuing CPA  
> [zohaibghani556@gmail.com](mailto:zohaibghani556@gmail.com) · Vaughan, ON

**[→ Live Demo](https://your-url-here.netlify.app)** &nbsp;|&nbsp; **[→ Analysis Notebook](analysis.ipynb)**

---

## What is LedgerAI?

LedgerAI is a browser-based accounting tool that turns raw transaction files into a complete set of GAAP-compliant financial reports. It integrates the Claude AI API for automated transaction categorization, applies a double-entry bookkeeping rules engine, and produces five core reports that mirror what professional accounting software generates.

Built to demonstrate how modern AI can reduce manual bookkeeping work without sacrificing accuracy or auditability — a problem I observed firsthand during my bookkeeping role at Pesticon Pest Control and my audit internship at Muhammad Nusrullah CGA.

---

## Features

| Feature | Description |
|---|---|
| **AI Categorization** | Claude API reads each transaction description and assigns the correct expense category. Manual override always available. |
| **GAAP Journal Entries** | Every transaction generates a proper double-entry journal entry using a numbered Chart of Accounts (1xxx–6xxx). |
| **Trial Balance** | Verifies total debits = total credits after all entries. Reports the exact difference if out of balance. |
| **P&L Statement** | Revenue → Gross Profit → Operating Expenses → Net Income with net margin %. |
| **Cash Flow Statement** | Classifies each expense as Operating, Investing, or Financing activity. |
| **Budget vs Actual** | Set monthly budgets per category, track variance in real time. |
| **Bank Reconciliation** | Upload a bank statement CSV — algorithm matches transactions by amount and date proximity, flags unmatched items on either side. |
| **Duplicate Detector** | Finds transactions with the same amount and description within 7 days. |
| **Audit Trail** | Every edit, deletion, AI categorization, and export is logged with a timestamp and before/after values. |
| **Multi-Period Reporting** | Load January, February, March separately — switch between periods or view Year-to-Date combined. |

---

## Technical Stack

**Frontend (Web App)**
- Vanilla JavaScript, HTML5, CSS3 — no frameworks
- [Claude API](https://docs.anthropic.com) (`claude-sonnet-4-20250514`) for AI categorization
- [Chart.js](https://www.chartjs.org/) for data visualization
- [PapaParse](https://www.papaparse.com/) for CSV parsing
- [SheetJS](https://sheetjs.com/) for Excel (XLSX/XLS) support

**Data Analysis Layer (Python/SQL)**
- Python 3 with **pandas** for data manipulation
- **SQLite** via Python's built-in `sqlite3` module for relational data storage
- **matplotlib** for charting
- See [`analysis.ipynb`](analysis.ipynb) and [`analysis.sql`](analysis.sql)

---

## File Structure

```
ledgerai/
├── index.html              ← Landing page
├── app.html                ← Main application
├── app.js                  ← All application logic (~1,700 lines)
├── style.css               ← Styles
├── analysis.ipynb          ← Python/pandas analysis notebook
├── analysis.sql            ← SQL schema + 10 analysis queries
├── sample-data/
│   ├── january-2024.csv         ← Standard format sample
│   ├── bank-statement-rbc.csv   ← Bank statement format (RBC style)
│   └── quickbooks-export.csv    ← QuickBooks export format
└── README.md
```

---

## Supported File Formats

LedgerAI auto-detects the format of any uploaded file. It handles:

| Format | Example Columns | Notes |
|---|---|---|
| Standard CSV | `Date, Description, Amount, Category` | Most basic format |
| Bank Statement | `Transaction Date, Withdrawals, Deposits, Balance` | Junk header rows auto-stripped |
| QuickBooks Export | `Num, Date, Name, Memo, Debit, Credit` | Name + Memo combined into description |
| Sage / GL Export | `Entry#, Date, Reference, Description, Debit, Credit` | Split debit/credit handled |
| Excel (XLSX/XLS) | Any of the above | Multi-sheet: picks sheet with most valid rows |

**Date formats handled:** `2024-01-15`, `01/15/2024`, `Jan 15/24`, `15-Jan-2024`, `20240115`, Excel serial numbers

---

## GAAP Chart of Accounts

| Code | Account | Type |
|---|---|---|
| 1000 | Cash / Checking | Asset |
| 1200 | Accounts Receivable | Asset |
| 2000 | Accounts Payable | Liability |
| 3000 | Owner's Equity | Equity |
| 4000 | Service Revenue | Revenue |
| 6000 | Salaries Expense | Expense |
| 6100 | Rent Expense | Expense |
| 6200 | Advertising Expense | Expense |
| 6210 | Contractor Expense | Expense |
| 6300 | Software & Subscriptions | Expense |
| 6500 | Meals & Entertainment | Expense |
| 6600 | Travel Expense | Expense |
| 6800 | Bank & Finance Charges | Expense |

---

## Compliance Flags

The rules engine automatically flags transactions that have tax or legal implications:

- **Meals & Entertainment** — flagged as 50% tax deductible per IRS rules
- **Contractor payments ≥ $600** — flagged for 1099-NEC filing requirement
- **Potential duplicate payments** — same amount + description within 7 days

---

## Running the Python Analysis Notebook

If you want to run the Python analysis layer locally:

```bash
# 1. Install dependencies
pip install pandas matplotlib jupyter

# 2. Open the notebook
jupyter notebook analysis.ipynb

# 3. In Cell 2, update the CSV path to point at your file
CSV_FILE = 'sample-data/january-2024.csv'
```

To run the SQL queries:

```bash
# Using SQLite command line
sqlite3 ledgerai.db < analysis.sql

# Or in Python
import sqlite3, pandas as pd
conn = sqlite3.connect('ledgerai.db')
df = pd.read_sql("SELECT * FROM transactions", conn)
```

---

## Running the Web App Locally

No server required. Just open `index.html` in any browser.

For the AI categorization feature, you need an Anthropic API key:
1. Get one at [console.anthropic.com](https://console.anthropic.com)
2. Open the app → Settings → paste your API key
3. The tool works fully without an API key using the built-in rules engine

---

## Interview Talking Points

*(These are the concepts behind the code — worth understanding before any interview)*

**On the journal entry engine:**  
"Every transaction produces two ledger entries — a debit to an expense account and a credit to either Cash or Accounts Payable, depending on whether it's been paid. I used a rules engine that maps 11 expense categories to specific GAAP account codes. The trial balance then verifies that total debits equal total credits across all entries."

**On the bank reconciliation algorithm:**  
"The algorithm compares two datasets — the internal ledger and the bank statement. For each bank entry, it searches the ledger for a match within a $0.01 tolerance on amount and a 3-day window on date. Unmatched items on either side are flagged. This mirrors what an accountant does manually during month-end close."

**On the audit trail:**  
"In assurance work, documentation of every change is critical for audit quality management standards. The trail logs the timestamp, action type, and before/after values for every edit, deletion, AI categorization, and export. Entries can't be deleted — only the entire log can be cleared with a confirmation step."

**On the Python/SQL layer:**  
"The web app handles the UI. The Python notebook demonstrates how the same data would flow through a real accounting pipeline — loading into a relational database, running SQL queries for expense classification and variance analysis, and applying audit sampling methodology from CAS 530."

---

## About

Zohaib Ghani is a third-year BBA student at Wilfrid Laurier University's Lazaridis School of Business, concentrating in Accounting and pursuing his CPA designation. He completed an audit internship at Muhammad Nusrullah CGA reviewing risk assessment frameworks and analyzing engagement files, and prior to that processed and reconciled payments in a bookkeeping role at Pesticon Pest Control.

LedgerAI was built to bridge the gap between accounting fundamentals and modern AI tooling — demonstrating that automation and professional accounting standards are complementary, not in conflict.
