# Artha — User Guide

This guide walks through every feature of Artha. All amounts are in INR (₹).

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Monthly Log](#3-monthly-log)
4. [Annual Hub](#4-annual-hub)
5. [Passive Income](#5-passive-income)
6. [Wealth Tracker](#6-wealth-tracker)
7. [Settings](#7-settings)

---

## 1. Getting Started

### Register

1. Open the app and click **Create an account**.
2. Enter your name, email, and a password (min 8 characters, must include uppercase + a number).
3. The first registered user gets the **Admin** role automatically.
4. You'll be redirected to the Dashboard on success.

### Login

1. Enter your email and password.
2. After 5 wrong attempts, your account locks for 15 minutes.

### Navigation

- **Desktop:** Persistent left sidebar with links to all 6 modules.
- **Mobile:** Bottom tab bar with the same 6 destinations.

---

## 2. Dashboard

The Dashboard gives you a full-year financial overview.

### Year Navigation

Use the **← / →** arrows at the top to switch between years. The page refreshes with data for the selected year.

### KPI Cards

Six summary cards at the top:

| Card | What it shows |
|---|---|
| Total Income | Sum of all income headers logged that year |
| Total Savings | Sum of all savings headers logged that year |
| Total Expenditure | Sum of all transactions for the year |
| Total EMI | Sum of all EMI deductions logged that year |
| Total Surplus | Net Income − Expenditure |
| Months Logged | Number of months with a monthly header entry |

### Monthly Bar Chart

Stacked grouped bars per month showing Income, EMI, Savings, and Expenditure. Hover over any bar for exact values.

### Expense Donut

Shows your top spending categories for the year by total amount. Hover for percentages.

### Financial Health Scorecard

Three ratio metrics with colour-coded badges:

- **EMI-to-Income:** Green < 30%, Amber 30–50%, Red > 50%
- **Savings Rate:** Green > 20%, Amber 10–20%, Red < 10%
- **Expenditure-to-Net Income:** Green < 70%, Amber 70–90%, Red > 90%

### Recent Transactions

The 5 most recently added transactions across all months, for a quick check.

---

## 3. Monthly Log

Track day-to-day expenses month by month.

### Navigating Months

Use **← / →** arrows to move between months. The page always opens on the current month.

### Monthly Header

At the top of each month, enter three values (edit anytime):

- **Income** — total salary/income received that month
- **EMI** — total EMI deductions that month
- **Savings** — amount transferred to savings/investments

Click **Save** to store. These flow into the Summary Strip and Dashboard.

### Summary Strip

Six auto-calculated KPIs based on your header + transactions:

- **Income, EMI, Savings** — from the header
- **Net Income** — Income − EMI − Savings
- **Expenditure** — sum of all transactions
- **Surplus** — Net Income − Expenditure

### Adding a Transaction

Click **Add Transaction** (top right). Fill in:

- **Date** — defaults to today
- **Amount (₹)** — required
- **Category** — searchable dropdown; type 1–2 letters to filter the list
- **Subcategory** — optional (e.g. "Fuel" under Transport)
- **Description** — optional (e.g. "Monthly grocery run")

Click **Add Transaction** to save.

### Bulk Entry

Click **Bulk Entry** to add many transactions for one category at once. Format each line as:

```
amount description
```

or comma-separated amounts:

```
500, 1200, 340
```

Select a category, paste the lines, and click **Import**. Each line becomes a separate transaction.

### Viewing Transactions

Toggle between two views using the buttons at the top:

- **Grouped** — transactions grouped by category, each group expandable. Shows per-category totals.
- **Timeline** — all transactions in date order with category chips.

### Editing or Deleting a Transaction

In either view, hover over a transaction to see **Edit** (pencil) and **Delete** (trash) icons. Edit opens the same dialog pre-filled. Delete shows a confirmation prompt.

---

## 4. Annual Hub

Track large annual investments, asset deployments, and big periodic expenses.

### Year Navigation

Use **← / →** to switch years.

### Two Sections

- **Assets Deployed** — PPF contributions, mutual fund SIPs, property payments, etc.
- **Liabilities & Large Expenses** — home loan, car loan, large one-off expenses

Both sections are collapsible. Within each, entries are grouped by category (also collapsible).

### Net Position

At the bottom, a colour-coded bar shows:

**Net = Assets − Liabilities**

- Green: net positive
- Red: net negative
- Gray: zero

### Adding an Entry

Click **Add Entry** (top right). Fill in:

- **Type** — Asset or Liability
- **Category** — type to autocomplete from your existing categories (e.g. "PPF", "House Related")
- **Particulars** — specific description (e.g. "Axis Nifty 50 SIP")
- **Amount (₹)** — required
- **Entry Date** — optional
- **Notes** — optional

### Editing or Deleting

Each entry row has **Edit** and **Delete** icons. Edit opens the dialog pre-filled.

---

## 5. Passive Income

Track all non-salary income: bond interest, savings bank interest, dividends, and other income.

### Year Navigation

The year selector shows the total passive income for that year as a badge.

### Four Tabs

#### Bond Interest

A **month × source** matrix table. Each row is a month (Jan–Dec), each column is a bond/source name. Cells show the interest received. Add entries via the **+ Add** button.

#### SB Interest

Savings bank interest entries grouped by bank/source. Shows totals per source.

#### Dividends

Entries grouped by month, with per-stock subtotals within each month.

#### Other

Catch-all for profits, rental income, freelance income, etc.

### Adding an Entry

Click **+ Add** in any tab. Fill in:

- **Source Type** — Bond Interest, SB Interest, Dividend, Profit, or Other
- **Source Name** — e.g. "HDFC Bank FD", "Infosys"
- **Year** — auto-filled
- **Month** — optional (leave blank for annual/lump sum entries)
- **Amount (₹)** — required
- **Received Date** — optional
- **Notes** — optional

### Editing or Deleting

Each row has **Edit** and **Delete** icons.

---

## 6. Wealth Tracker

Track your asset portfolio and net worth over time.

### Net Worth Header

Shows total current value across all assets and the date of the last snapshot.

### Asset Allocation Donut

Pie chart showing portfolio breakdown by asset type (PPF, Stocks, Mutual Funds, Gold, etc.).

### Net Worth Trend Chart

Line chart of total portfolio value across all recorded dates. Each "Update Snapshot" call adds a new data point.

### Asset Cards

Each asset shows:

- Asset name and type
- Current value
- Invested amount (if recorded)
- Gain/Loss in ₹ and % (colour-coded green/red)

### Adding an Asset

Click **Add Asset**. Fill in:

- **Asset Type** — PPF, Stocks, Bonds, US Stocks, Mutual Funds, Smallcase, LIC, Gold, Crypto, Property, Other
- **Asset Name** — e.g. "HDFC Nifty 50 Fund", "Sovereign Gold Bond 2025"
- **Current Value (₹)** — as of today
- **Invested Amount (₹)** — optional, for gain/loss calculation
- **Recorded Date** — defaults to today
- **Notes** — optional

### Updating a Snapshot

Click **Update Snapshot** to record today's values for all existing assets. A dialog lists every asset with its last recorded value. Enter the new current value for assets that changed. Only changed values are saved — unchanged assets are skipped.

This adds a new data point to the trend chart.

### Editing or Deleting an Asset

Use the **⋮** menu on each asset card to edit details or delete the asset record.

---

## 7. Settings

Manage your account and app configuration.

### Profile Tab

- **Update Name** — change your display name. Click **Save Name**.
- **Change Password** — enter your current password, then a new password (min 8 chars, uppercase + number required), then confirm. Click **Update Password**.

### Categories Tab

Manage the expense categories used in Monthly Log.

- **Reorder** — use the ↑ / ↓ arrows to move categories up or down. Order is saved immediately.
- **Edit** — click the pencil icon on any row to edit the name or emoji icon inline.
- **Add New Category** — fill in the name and optional emoji icon at the bottom and click **Add**.
- **Delete** — click the trash icon. If the category has any transactions, deletion is blocked (you'll see an error message). Move or delete those transactions first.

### EMI Manager Tab

Track active loan EMIs so you remember what's running and when they end.

- **Add EMI** — click **Add EMI**. Enter name (e.g. "Home Loan"), amount, start date, end date (optional), and whether it's active.
- **Months Remaining** — calculated automatically from end date.
- **Toggle Active** — use the switch on each row to mark an EMI as inactive without deleting it.
- **Show Inactive** — toggle at the top to reveal inactive EMIs.
- **Edit / Delete** — use the icons on each row.

### Budget Targets Tab

Set monthly spending limits per category for a given year.

- **Year Navigation** — use ← / → to set targets for any year.
- **Add Target** — click **Add Target**, pick a category, and enter the monthly amount.
- **Edit Inline** — click on any amount value in the table to edit it in place. Press Enter or click away to save.
- **Delete** — click the trash icon on any row.

Budget alerts (visual warnings when you approach or exceed targets) are a planned future feature.

### Import Data Tab

Bulk import historical transactions from a CSV file.

#### Download Template

Click **Download Template** to get a CSV file with the correct column headers:

```
date,category,subcategory,description,amount
```

#### Prepare Your CSV

- `date` — format: `YYYY-MM-DD` (e.g. `2026-01-15`)
- `category` — must match one of your existing category names (case-insensitive)
- `subcategory` — optional
- `description` — optional
- `amount` — positive number (e.g. `1500` or `1500.50`)

#### Upload and Import

1. Drag and drop your CSV file onto the upload area, or click to browse.
2. A **preview table** shows the first 10 rows and the total row count.
3. Review the preview to check it parsed correctly.
4. Click **Import** to create the transactions.
5. A result summary shows how many rows were imported, skipped (unknown category), and any row-level errors.

**Note:** The monthly header (income/EMI/savings) for each month in the CSV is not auto-created — you'll need to set those manually in Monthly Log after importing.

---

## Tips

- **Currency:** All amounts are in INR (₹). No multi-currency support.
- **Data isolation:** Each user's data is completely separate. If you invite others in future, they will see only their own entries.
- **Undo:** There is no undo. The delete confirmation dialogs are your safety net — read them before confirming.
- **Bulk import:** Match category names exactly (case-insensitive) to avoid skipped rows. Run a test import with 5–10 rows before importing your full history.
