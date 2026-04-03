# Artha — Build Summary
**Date:** 2026-04-03  
**Status:** All modules built, server running, 68/68 tests passing

---

## What Was Built

Artha is a full-stack personal finance tracker built with Next.js 14 App Router, replacing Vishal's Apple Notes finance tracking workflow. The app is live at `http://localhost:3000`.

---

## Modules

### Auth (pre-existing foundation)
- Registration with bcrypt (12 rounds), role assignment (first user = ADMIN)
- Login via NextAuth v5 credentials provider with JWT sessions
- Account lockout after 5 failed attempts (15-minute cooldown)
- Edge-compatible middleware protecting all page routes

### Monthly Log (`/monthly-log`)
**API routes:** `GET/POST /api/monthly-log/[year]/[month]` · `GET/POST /api/transactions` · `POST /api/transactions/bulk` · `PUT/DELETE /api/transactions/[id]`  
**Features:**
- Month-by-month navigation (← March 2026 →)
- Monthly header: income, EMI total, savings — upserted per month
- Summary strip: 6 KPIs (Income, EMI, Savings, Net Income, Expenditure, Surplus)
- Grouped view: transactions grouped by category with expandable sub-items
- Timeline view: all transactions in date order with category chips
- Quick-add dialog: date, category, subcategory, description, amount
- Bulk entry: paste comma-separated or `amount description` lines per category
- Edit and delete (with confirmation dialog) on each transaction

### Annual Hub (`/annual-hub`)
**API routes:** `GET/POST /api/annual-entries` · `PUT/DELETE /api/annual-entries/[id]`  
**Features:**
- Year navigation
- Two collapsible sections: Assets Deployed / Liabilities & Large Expenses
- Entries grouped by category within each section, each group collapsible
- Net line (Assets − Liabilities) with green/red/gray colour coding
- Add/Edit dialog with category autocomplete from existing entries

### Passive Income (`/passive-income`)
**API routes:** `GET/POST /api/passive-income` · `PUT/DELETE /api/passive-income/[id]`  
**Features:**
- Year navigation with total passive income badge
- 4 tabs: Bond Interest · SB Interest · Dividends · Other
- Bond Interest: month × source matrix table (rows = months, columns = bond sources)
- Dividends: grouped by month with per-stock subtotals
- SB Interest / Other: simple grouped list
- Add/Edit dialog with source type, source name, month, amount, received date, notes

### Wealth Tracker (`/wealth-tracker`)
**API routes:** `GET/POST /api/assets` · `PUT/DELETE /api/assets/[id]`  
**Features:**
- Net Worth header with last-updated date
- Asset allocation donut chart (Recharts PieChart) grouped by asset type
- Net worth trend line chart (Recharts LineChart) across all recorded snapshots
- Asset cards grid (current value, invested amount, gain/loss % per asset)
- Add Asset dialog with full form
- Update Snapshot dialog: lists all current assets with previous value, lets you enter new values — posts only changed records

### Dashboard (`/dashboard`)
**API route:** `GET /api/dashboard?year=`  
**Features:**
- Year navigation
- 5 KPI cards: Total Income, Total Savings, Total Expenditure, Total Surplus, Months Logged
- Monthly bar chart (Recharts BarChart): grouped bars for Income / EMI / Savings / Expenditure per month
- Expense donut chart: top categories by spend for the year
- Financial Health Scorecard: EMI-to-Income, Savings Rate, Expenditure-to-Net ratios with colour-coded badges and progress bars
- Recent transactions panel (last 5 entries)
- Empty state if no data logged for the year

---

## API Surface

| Route | Methods | Description |
|---|---|---|
| `/api/user/register` | POST | Create account |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth session handlers |
| `/api/monthly-log/[year]/[month]` | GET, POST | Monthly header + categories |
| `/api/transactions` | GET, POST | Transactions for a month |
| `/api/transactions/bulk` | POST | Multi-line bulk create |
| `/api/transactions/[id]` | PUT, DELETE | Edit/delete transaction |
| `/api/annual-entries` | GET, POST | Annual Hub entries |
| `/api/annual-entries/[id]` | PUT, DELETE | Edit/delete entry |
| `/api/passive-income` | GET, POST | Passive income entries |
| `/api/passive-income/[id]` | PUT, DELETE | Edit/delete entry |
| `/api/assets` | GET, POST | Asset snapshots |
| `/api/assets/[id]` | PUT, DELETE | Edit/delete asset record |
| `/api/dashboard` | GET | Aggregated dashboard data for a year |

All API routes: (1) verify session, (2) scope all queries with `WHERE userId = session.user.id`.

---

## Key Decisions

| Decision | Rationale |
|---|---|
| Next.js 14 App Router monolith | Zero-cost deployment on Vercel; API routes are iOS-ready REST endpoints |
| Neon PostgreSQL via Prisma | ACID for financial data; relational model fits the domain cleanly |
| NextAuth v5 JWT strategy | Stateless sessions; no DB session table needed |
| Edge/Node split in auth config | NextAuth v5 requires `auth.config.ts` (Edge-safe) + `auth.ts` (Node-only, bcrypt) |
| Categories seeded per user at registration | Avoids a shared global seed; each user gets their own category list |
| Asset snapshots (append-only) | Preserves history; "current" portfolio computed client-side as latest per assetName |
| `z.coerce.number()` with explicit `Resolver<T>` cast | Zod v4 + react-hook-form v7 type inference mismatch requires the cast |
| `Array.from(new Set(...))` over spread | Avoids `--downlevelIteration` TS flag requirement |
| `@jest-environment node` per integration test | `NextRequest`/`NextResponse` require Node globals, not jsdom |

---

## How to Run

```bash
# Install dependencies
npm install

# Start dev server (requires .env.local with DATABASE_URL, DIRECT_DATABASE_URL, NEXTAUTH_SECRET)
npm run dev
# → http://localhost:3000

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Open Prisma Studio (visual DB browser)
export $(cat .env.local | grep -v '^#' | xargs) && npx prisma studio

# Apply any new migrations
export $(cat .env.local | grep -v '^#' | xargs) && npx prisma migrate dev --name <migration-name>
```

---

## File Structure

```
src/
  app/
    (auth)/login/          ← Login page
    (auth)/register/       ← Register page
    (app)/dashboard/       ← Dashboard (charts + KPIs)
    (app)/monthly-log/     ← Monthly expense log
    (app)/annual-hub/      ← Yearly entries
    (app)/passive-income/  ← Bond interest, dividends, etc.
    (app)/wealth-tracker/  ← Asset portfolio + net worth
    (app)/settings/        ← Placeholder (future)
    api/                   ← 13 REST API routes
  components/
    layout/                ← Sidebar + MobileNav
    ui/                    ← shadcn/ui components
    dashboard/             ← KpiCard, MonthlyChart, ExpenseDonut, HealthScorecard, RecentTransactions
    monthly-log/           ← MonthHeader, SummaryStrip, TransactionGrouped, TransactionTimeline, dialogs, types
    annual-hub/            ← EntrySection, YearNav, AddEditDialog
    passive-income/        ← BondInterestTable, DividendList, SimpleIncomeList, YearNav, AddEditDialog
    wealth-tracker/        ← AssetCard, AllocationChart, TrendChart, NetWorthHeader, AddAssetDialog, UpdateSnapshotDialog, types
  lib/
    db.ts                  ← Prisma singleton
    utils.ts               ← cn() helper
    validations.ts         ← Zod schemas (login, register)
  auth.ts                  ← Full NextAuth config (Node.js, bcrypt)
  auth.config.ts           ← Edge-safe NextAuth config (middleware only)
  middleware.ts            ← Route protection

prisma/
  schema.prisma            ← 9 models + enums
  migrations/              ← 2 applied migrations
  seed.ts                  ← Exports DEFAULT_CATEGORIES (imported at registration)

tests/
  unit/                    ← 4 suites, 27 tests
  integration/             ← 5 suites, 41 tests
  __mocks__/seed.ts        ← Test mock for prisma/seed
  report.md                ← Test results
```

---

## What's Not Yet Built

- **Settings page** — profile, category management, EMI manager, budget targets, CSV import, team/invite
- **Multi-user invite** — user invitation by email (admin-only)
- **CSV import** — bulk import Jan–Mar 2026 historical data
- **Budget alerts** — amber/red at 80%/100% of monthly category target
- **Recurring transaction templates** — auto-suggest subscriptions each month
