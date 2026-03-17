-- ============================================================
-- LedgerAI — SQL Schema & Analysis Queries
-- Database: SQLite (compatible with PostgreSQL with minor changes)
-- Author: Zohaib Ghani
-- Purpose: Demonstrates how transaction data would be stored
--          and analyzed in a real accounting data pipeline
-- ============================================================


-- ============================================================
-- SCHEMA — Table Definitions
-- This defines the structure of the database.
-- Think of each CREATE TABLE as defining a spreadsheet's columns.
-- ============================================================

-- Drop tables if they exist (so we can re-run this file cleanly)
DROP TABLE IF EXISTS journal_entries;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS periods;

-- PERIODS: Each accounting period (e.g. January 2024, February 2024)
CREATE TABLE periods (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,          -- e.g. "January 2024"
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    is_closed   INTEGER DEFAULT 0       -- 0 = open, 1 = closed/locked
);

-- ACCOUNTS: Chart of Accounts (GAAP numbered account structure)
CREATE TABLE accounts (
    code        TEXT PRIMARY KEY,       -- e.g. "6100"
    name        TEXT NOT NULL,          -- e.g. "Rent Expense"
    type        TEXT NOT NULL,          -- Asset, Liability, Equity, Revenue, Expense
    normal_bal  TEXT NOT NULL,          -- "debit" or "credit" (which side increases it)
    description TEXT
);

-- TRANSACTIONS: Every financial transaction
CREATE TABLE transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id   INTEGER REFERENCES periods(id),
    date        DATE NOT NULL,
    description TEXT NOT NULL,
    amount      REAL NOT NULL,          -- Always stored in USD, positive = expense
    category    TEXT,
    flag        TEXT DEFAULT 'none',
    is_edited   INTEGER DEFAULT 0,      -- 1 if manually edited after import
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- JOURNAL_ENTRIES: Double-entry bookkeeping records
-- Every transaction produces two journal entry lines (one debit, one credit)
CREATE TABLE journal_entries (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER REFERENCES transactions(id),
    account_code   TEXT REFERENCES accounts(code),
    debit_amount   REAL DEFAULT 0,
    credit_amount  REAL DEFAULT 0,
    entry_date     DATE NOT NULL,
    memo           TEXT
);


-- ============================================================
-- SEED DATA — Chart of Accounts
-- ============================================================

INSERT INTO accounts VALUES ('1000', 'Cash / Checking',              'Asset',     'debit',  'Primary operating bank account');
INSERT INTO accounts VALUES ('1200', 'Accounts Receivable',          'Asset',     'debit',  'Money owed by clients');
INSERT INTO accounts VALUES ('2000', 'Accounts Payable',             'Liability', 'credit', 'Money owed to vendors');
INSERT INTO accounts VALUES ('3000', 'Owner''s Equity',              'Equity',    'credit', 'Owner investment in the business');
INSERT INTO accounts VALUES ('4000', 'Service Revenue',              'Revenue',   'credit', 'Income from services rendered');
INSERT INTO accounts VALUES ('6000', 'Salaries Expense',             'Expense',   'debit',  'Employee wages and salaries');
INSERT INTO accounts VALUES ('6100', 'Rent Expense',                 'Expense',   'debit',  'Office and facility rent');
INSERT INTO accounts VALUES ('6200', 'Advertising Expense',          'Expense',   'debit',  'Marketing and advertising costs');
INSERT INTO accounts VALUES ('6210', 'Contractor Expense',           'Expense',   'debit',  'Independent contractor payments');
INSERT INTO accounts VALUES ('6300', 'Software & Subscriptions',     'Expense',   'debit',  'SaaS tools and software licenses');
INSERT INTO accounts VALUES ('6400', 'Office Supplies',              'Expense',   'debit',  'Stationery, equipment, supplies');
INSERT INTO accounts VALUES ('6500', 'Meals & Entertainment',        'Expense',   'debit',  '50% tax deductible per IRS rules');
INSERT INTO accounts VALUES ('6600', 'Travel Expense',               'Expense',   'debit',  'Business travel and lodging');
INSERT INTO accounts VALUES ('6700', 'Utilities & Hosting',          'Expense',   'debit',  'Internet, cloud hosting, utilities');
INSERT INTO accounts VALUES ('6800', 'Bank & Finance Charges',       'Expense',   'debit',  'Bank fees, wire fees, card fees');
INSERT INTO accounts VALUES ('6900', 'Miscellaneous Expense',        'Expense',   'debit',  'Expenses not fitting other categories');


-- ============================================================
-- ANALYSIS QUERIES
-- These are the 10 queries a real accounting analyst would run.
-- Each one answers a specific business question.
-- ============================================================


-- ──────────────────────────────────────────────────────────
-- QUERY 1: Total spending by category
-- Business question: "Where is most of our money going?"
-- This is the most basic summary every accountant produces.
-- ──────────────────────────────────────────────────────────
SELECT
    category,
    COUNT(*)                        AS transaction_count,
    ROUND(SUM(amount), 2)           AS total_spent,
    ROUND(AVG(amount), 2)           AS avg_transaction,
    ROUND(SUM(amount) * 100.0 /
        (SELECT SUM(amount) FROM transactions), 1) AS pct_of_total
FROM transactions
GROUP BY category
ORDER BY total_spent DESC;


-- ──────────────────────────────────────────────────────────
-- QUERY 2: Trial balance — do debits equal credits?
-- Business question: "Is our bookkeeping accurate?"
-- The defining check of double-entry accounting.
-- ──────────────────────────────────────────────────────────
SELECT
    account_code,
    a.name                          AS account_name,
    a.type                          AS account_type,
    ROUND(SUM(je.debit_amount), 2)  AS total_debits,
    ROUND(SUM(je.credit_amount), 2) AS total_credits,
    ROUND(SUM(je.debit_amount) - SUM(je.credit_amount), 2) AS net_balance
FROM journal_entries je
JOIN accounts a ON je.account_code = a.code
GROUP BY account_code, a.name, a.type
ORDER BY a.type, account_code;


-- ──────────────────────────────────────────────────────────
-- QUERY 3: Flag large transactions for review
-- Business question: "Which transactions need a second look?"
-- In audit work, sampling large transactions is standard procedure.
-- ──────────────────────────────────────────────────────────
SELECT
    date,
    description,
    amount,
    category,
    flag
FROM transactions
WHERE amount > 1000          -- materiality threshold
ORDER BY amount DESC;


-- ──────────────────────────────────────────────────────────
-- QUERY 4: Detect potential duplicate transactions
-- Business question: "Did we accidentally pay anything twice?"
-- Same amount + same description within 7 days = likely duplicate.
-- ──────────────────────────────────────────────────────────
SELECT
    t1.id           AS original_id,
    t2.id           AS duplicate_id,
    t1.date         AS original_date,
    t2.date         AS duplicate_date,
    t1.description,
    t1.amount,
    ABS(julianday(t1.date) - julianday(t2.date)) AS days_apart
FROM transactions t1
JOIN transactions t2
    ON  t1.id < t2.id                            -- avoid showing same pair twice
    AND t1.amount = t2.amount                    -- same amount
    AND t1.description = t2.description          -- same description
    AND ABS(julianday(t1.date) - julianday(t2.date)) <= 7  -- within 7 days
ORDER BY t1.description, t1.date;


-- ──────────────────────────────────────────────────────────
-- QUERY 5: Monthly P&L summary (multi-period)
-- Business question: "How did each month compare?"
-- Essential for management reporting.
-- ──────────────────────────────────────────────────────────
SELECT
    strftime('%Y-%m', date)         AS month,
    COUNT(*)                        AS num_transactions,
    ROUND(SUM(amount), 2)           AS total_expenses,
    ROUND(AVG(amount), 2)           AS avg_transaction_size,
    ROUND(MAX(amount), 2)           AS largest_transaction
FROM transactions
GROUP BY strftime('%Y-%m', date)
ORDER BY month;


-- ──────────────────────────────────────────────────────────
-- QUERY 6: Meals & Entertainment — tax deductibility report
-- Business question: "How much of M&E can we actually deduct?"
-- IRS rule: only 50% of M&E is tax deductible.
-- ──────────────────────────────────────────────────────────
SELECT
    date,
    description,
    ROUND(amount, 2)                AS total_amount,
    ROUND(amount * 0.50, 2)         AS deductible_portion,
    ROUND(amount * 0.50, 2)         AS non_deductible_portion
FROM transactions
WHERE category = 'Meals & Entertainment'
ORDER BY date;


-- ──────────────────────────────────────────────────────────
-- QUERY 7: Contractor payments — 1099 threshold check
-- Business question: "Which contractors need a 1099-NEC?"
-- IRS requires a 1099 for any contractor paid $600+ in a year.
-- ──────────────────────────────────────────────────────────
SELECT
    description                     AS contractor_name,
    COUNT(*)                        AS num_payments,
    ROUND(SUM(amount), 2)           AS total_paid,
    CASE
        WHEN SUM(amount) >= 600 THEN 'YES — 1099 Required'
        ELSE 'No — under $600 threshold'
    END                             AS form_1099_required
FROM transactions
WHERE category = 'Contractor / Professional Services'
GROUP BY description
ORDER BY total_paid DESC;


-- ──────────────────────────────────────────────────────────
-- QUERY 8: Expense trend — week-over-week
-- Business question: "Is spending accelerating or slowing down?"
-- Useful for cash flow management.
-- ──────────────────────────────────────────────────────────
SELECT
    strftime('%W', date)            AS week_number,
    MIN(date)                       AS week_start,
    COUNT(*)                        AS num_transactions,
    ROUND(SUM(amount), 2)           AS weekly_spend
FROM transactions
GROUP BY strftime('%W', date)
ORDER BY week_number;


-- ──────────────────────────────────────────────────────────
-- QUERY 9: Accounts payable aging — unpaid invoices
-- Business question: "What do we owe and how overdue is it?"
-- AP aging is a core report in every accounting system.
-- ──────────────────────────────────────────────────────────
SELECT
    description,
    date                            AS invoice_date,
    ROUND(amount, 2)                AS amount_owing,
    CAST(julianday('now') - julianday(date) AS INTEGER) AS days_outstanding,
    CASE
        WHEN julianday('now') - julianday(date) <= 30  THEN '0-30 days'
        WHEN julianday('now') - julianday(date) <= 60  THEN '31-60 days'
        WHEN julianday('now') - julianday(date) <= 90  THEN '61-90 days'
        ELSE 'Over 90 days'
    END                             AS aging_bucket
FROM transactions
WHERE category IN ('Contractor / Professional Services', 'Accounts Payable')
ORDER BY days_outstanding DESC;


-- ──────────────────────────────────────────────────────────
-- QUERY 10: Audit sample — statistical selection
-- Business question: "Which transactions should an auditor test?"
-- Real audit sampling: select all items over materiality threshold
-- plus every 5th item below it (systematic sampling).
-- ──────────────────────────────────────────────────────────
SELECT
    id,
    date,
    description,
    ROUND(amount, 2)                AS amount,
    category,
    CASE
        WHEN amount >= 1000 THEN 'Selected — over materiality threshold'
        WHEN id % 5 = 0     THEN 'Selected — systematic sample (every 5th)'
        ELSE 'Not selected'
    END                             AS audit_selection
FROM transactions
WHERE amount >= 1000
   OR id % 5 = 0
ORDER BY amount DESC;
