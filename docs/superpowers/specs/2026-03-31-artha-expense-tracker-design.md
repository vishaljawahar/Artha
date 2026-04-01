# Artha — Personal Finance Tracker: Design Spec
**Date:** 2026-03-31
**Status:** Approved
**Author:** Vishal (with Claude Code)

---

## Context

Vishal currently tracks personal finances across four Apple Notes documents: a monthly expense tracker, a yearly investments/liabilities tracker, an other-incomes tracker, and a consolidated master view. At year-end, all data is manually analysed (most recently via Claude, producing an HTML dashboard).

This is functional but fragile — data is unstructured text, analytics are manual, there is no historical trend view, and the system cannot be shared with family. The goal is to replace Apple Notes with a structured web app (**Artha**) that mirrors the existing workflow exactly but adds real-time analytics, multi-user support, and a foundation for a future iOS app.

**Outcome:** A web app that Vishal (and later his spouse and friends) can use daily to log expenses, track investments, monitor passive income, and get the same year-end financial dashboard — but at any point in time, not just December.

---

## Assumptions

1. Currency is INR throughout. No multi-currency support needed in v1.
2. Single admin (Vishal) can invite others. Invited users see only their own data.
3. Historical data import covers Jan–Mar 2026 only. Pre-2026 data stays in Apple Notes.
4. No mobile app in v1 — mobile-responsive web app only. API design is iOS-ready for later.
5. No real-time stock price integration in v1 — asset values are manually updated snapshots.
6. No bank account sync (no Plaid/Finvu integration) in v1 — all entries are manual or CSV-imported.

---

## App Identity

**Name:** Artha
*(Sanskrit: wealth, money, financial wellbeing — one of the four purusharthas)*

---

## Architecture

**Approach:** Next.js Full-Stack Monolith
Single repo, single deployment. Frontend (React) and backend (API routes) live together in one Next.js 14 App Router project.

```
[ Browser ] ──HTTPS──► [ Next.js on Vercel (free) ]
                            ├── React UI (App Router)
                            ├── API Routes (/api/...)
                            └── Prisma ORM
                                    │
                            [ Neon PostgreSQL (free) ]
```

**Why this approach:**
- Zero cost for the expected scale (≤20 users)
- No DevOps — `git push` deploys everything
- API routes are plain HTTP endpoints — a future iOS app calls them directly, no backend changes needed
- Vercel free tier handles this at 10× the expected traffic

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack, SSR + API routes |
| Language | TypeScript | Type safety from DB → API → UI |
| Styling | Tailwind CSS | Utility-first, dark mode built-in |
| Components | shadcn/ui (Radix UI) | Accessible, unstyled — code is owned |
| Charts | Recharts | React-native, all required chart types |
| Database | PostgreSQL via Neon | Serverless, free tier, always-on |
| ORM | Prisma | Parameterized queries, type-safe |
| Auth | NextAuth.js v5 | Email/password + Google OAuth ready |
| Deployment | Vercel | Auto-deploy on git push |
| Version control | GitHub | Free, Vercel integration |

---

## Modules

| Apple Notes Tracker | Artha Module | Purpose |
|---|---|---|
| Monthly Expense Tracker | **Monthly Log** | Income, EMI, savings, day-to-day expenses |
| Yearly Expense Tracker | **Annual Hub** | Large periodic expenses + yearly investments |
| Other Incomes | **Passive Income** | Bonds, dividends, SB interest, profits |
| Consolidated Tracker | **Dashboard** | Real-time analytics across all modules |
| *(not yet created)* | **Wealth Tracker** | Asset portfolio + net worth over time |

---

## Navigation Structure

```
Artha
├── 🏠  Dashboard         ← Home, real-time overview
├── 📅  Monthly Log       ← Month-by-month expense tracking
├── 📆  Annual Hub        ← Yearly large expenses & investments
├── 💰  Passive Income    ← Bonds, dividends, SB interest
├── 📈  Wealth Tracker    ← Assets, portfolio, net worth
└── ⚙️   Settings         ← Profile, categories, EMIs, budgets, users
```

Desktop: persistent left sidebar. Mobile: bottom tab bar (iOS-ready).

---

## Data Model

### `users`
```
id              uuid PK
name            varchar
email           varchar UNIQUE
password_hash   varchar
role            enum('admin', 'member')
created_at      timestamp
updated_at      timestamp
```

### `monthly_headers`
One row per user per month. Top-level income/EMI/savings summary.
```
id              uuid PK
user_id         uuid FK → users
year            int
month           int (1–12)
income          decimal(12,2)
emi_total       decimal(12,2)
savings         decimal(12,2)
created_at      timestamp
updated_at      timestamp

UNIQUE(user_id, year, month)
```
> **Computed (never stored):**
> `net_income = income − emi_total − savings`
> `total_expenditure = SUM(transactions WHERE user_id AND year AND month)`
> `surplus = net_income − total_expenditure`

### `transactions`
Every individual expense entry. Core of the Monthly Log.
```
id              uuid PK
user_id         uuid FK → users
date            date
category_id     uuid FK → categories.id  -- FK by id; category name resolved at query time
subcategory     varchar nullable          -- e.g. "GT", "TVS" under Fuel
description     text                     -- e.g. "Car wash 3rd"
amount          decimal(12,2)
is_bulk         boolean DEFAULT false
created_at      timestamp
updated_at      timestamp
```

### `categories`
User-configurable expense categories. Pre-seeded from current tracker.
```
id              uuid PK
user_id         uuid FK → users
name            varchar
icon            varchar nullable
color           varchar nullable      -- hex for charts
sort_order      int
is_default      boolean DEFAULT false
created_at      timestamp
```

**Pre-seeded categories:**
Electricity · Internet · Fuel · Toll · LPG · Home Essentials · Milk · Kid · Health & Wellness · Newspaper · Shopping · Eating Out · Doctor · Misc · Transport · Vehicles · Learning & Books · Subscriptions

### `emis`
Active loan EMIs. Used to auto-populate emi_total in monthly headers.
```
id              uuid PK
user_id         uuid FK → users
name            varchar              -- "Home Loan", "Car Loan"
amount          decimal(12,2)
start_date      date
end_date        date nullable
is_active       boolean DEFAULT true
created_at      timestamp
```

### `annual_entries`
Large periodic expenses and yearly investments (Annual Hub).
```
id              uuid PK
user_id         uuid FK → users
year            int
entry_type      enum('asset', 'liability')
category        varchar              -- "House Related", "PPF", "Trips"
particulars     varchar              -- "Property Tax", "Pride Enchanta maintenance"
amount          decimal(12,2)
entry_date      date nullable
notes           text nullable
created_at      timestamp
updated_at      timestamp
```

### `passive_income`
Bond interest, dividends, SB interest, investment profits.
```
id              uuid PK
user_id         uuid FK → users
year            int
month           int nullable         -- null = annual/lump-sum
source_type     enum('bond_interest', 'sb_interest', 'dividend', 'profit', 'other')
source_name     varchar              -- "SBI Bond", "ITC", "Axis"
amount          decimal(12,2)
received_date   date nullable
notes           text nullable
created_at      timestamp
```

### `assets`
Periodic snapshots of portfolio value for Wealth Tracker.
```
id              uuid PK
user_id         uuid FK → users
recorded_date   date
asset_type      enum('ppf', 'stocks', 'bonds', 'us_stocks', 'mutual_funds',
                     'smallcase', 'lic', 'gold', 'crypto', 'property', 'other')
asset_name      varchar              -- "Groww MF", "Vested", "Pride Enchanta"
current_value   decimal(14,2)
invested_amount decimal(14,2) nullable
notes           text nullable
created_at      timestamp
```

### `budget_targets`
Monthly spend targets per category for budget alerts.
```
id              uuid PK
user_id         uuid FK → users
category_id     uuid FK → categories.id
year            int
month           int nullable         -- null = applies all months of year
target_amount   decimal(12,2)
created_at      timestamp
```

---

## Screen Designs

### Dashboard (Home)
- **Top bar:** Year selector · User avatar · Notifications bell
- **KPI row (5 cards):** Total Income · EMI Load % · Savings Rate · Day-to-Day Spend · Monthly Surplus
- **Charts:**
  - Full-width stacked bar: Income / EMI / Savings / Expenditure / Surplus per month
  - Surplus trend line (monthly) · Income allocation donut (full year)
  - Asset deployment pie · Large-ticket expenses breakdown
- **Financial Health Scorecard:** 3 gauge cards — EMI-to-Income · Savings Rate · Expenditure-to-Net-Income. Colour-coded green/amber/red.
- **Key observations panel:** Auto-generated financial flags (mirrors 2025 HTML dashboard logic)
- **Recent transactions:** Last 5 entries across all months
- **FAB:** Quick-add transaction, accessible from all screens

### Monthly Log
- **Top:** Month/year picker (`← March 2026 →`)
- **Summary strip:** Income · EMI · Savings · Net Income · Expenditure · Surplus
- **Two view modes (toggle):**
  - *Grouped:* Categories with expandable sub-items and per-category totals — mirrors Apple Notes layout
  - *Timeline:* All transactions in date order, each with category chip
- **Entry modes:**
  - *Quick-add (FAB):* date → category → subcategory → description → amount (5 taps)
  - *Bulk entry:* select category → textarea → parse comma-separated amounts → save as individual transactions
- **Footer:** Running total expenditure, updates live

### Annual Hub
- **Top:** Year picker
- **Two collapsible sections:** Assets Deployed · Liabilities & Large Expenses
- Each section: category rows with expandable sub-items, subtotals, section total
- **Net line:** Assets − Liabilities, colour-coded
- **Add entry form:** type · category · particulars · amount · date

### Passive Income
- **Top:** Year picker · Total passive income badge
- **Four tabs:** Bond Interest · SB Interest · Dividends · Other
- Bond Interest: monthly table (rows = Jan–Dec, columns = per bond source)
- Dividends: grouped by month, per-stock breakdown, annual total per stock
- SB Interest: periodic entries with date and bank name

### Wealth Tracker
- **Net Worth header:** Large prominent number, date of last update
- **Asset allocation donut chart**
- **Asset cards grid:** per asset — current value · invested amount · gain/loss %
- **Net worth trend line chart:** across all recorded snapshots
- **Update Snapshot button:** form to enter current values; previous snapshot preserved

### Settings
- **Profile:** name, email, password change
- **Categories:** add / rename / reorder / delete; assign icon + colour
- **EMI Manager:** list of active EMIs with tenure remaining
- **Budget Targets:** monthly target per category; alerts at 80% and 100%
- **Team:** invite users by email (admin only); member list
- **Import Data:** CSV upload for Jan–Mar 2026; downloadable template
- **Export:** any month or full year as PDF or CSV

---

## Additional Features

| Feature | Description |
|---|---|
| Recurring templates | Mark subscriptions (iCloud, Claude, F1) as recurring; auto-suggested each month |
| EMI calendar | Visual timeline of active loans with end dates and months remaining |
| Budget alerts | Amber at 80%, red at 100% of monthly target per category |
| Year-over-year comparison | Dashboard toggle to overlay two years on any chart |
| Dark mode | Default dark theme matching existing HTML dashboard aesthetic |
| Mobile-responsive layout | Sidebar → bottom nav on small screens; iOS PWA-ready |

---

## Security Design

### Authentication
- Passwords hashed with **bcrypt** (12 salt rounds) — never stored plain
- Rate limiting on login: max 5 failed attempts per IP per 15 min → lockout
- JWT tokens in **HTTP-only cookies** (not accessible to JavaScript)
- Access tokens: 15 min expiry. Refresh tokens: 7 days.
- HTTPS enforced by Vercel (TLS 1.2+, auto-renewed SSL cert)
- Optional 2FA via email OTP (recommended for admin account)

### Authorisation
- Every API route: (1) session check → (2) `WHERE user_id = session.user.id` on every query
- No cross-user data access — structurally impossible at the query level
- Admin role required for user invite and member management

### Data & API
- **Prisma ORM:** parameterized queries — SQL injection structurally impossible
- **Zod validation:** every API route validates input schema before touching DB
- **Neon:** data encrypted at rest (AES-256); connection string in Vercel encrypted env vars
- CSRF protection via NextAuth (built-in)
- React escapes all output by default — XSS prevention
- No sensitive data in URL parameters; all financial data via POST body

### Secrets
- All secrets (DATABASE_URL, NEXTAUTH_SECRET) in Vercel encrypted environment variables
- `.env` in `.gitignore` — never committed
- GitHub Dependabot enabled for CVE alerts

---

## Infrastructure & Cost

### Phase 1 — Launch (≤20 users)

| Item | Service | Monthly | Annual |
|---|---|---|---|
| App hosting + functions | Vercel Free | ₹0 | ₹0 |
| PostgreSQL database | Neon Free (0.5GB) | ₹0 | ₹0 |
| Version control + CI/CD | GitHub Free | ₹0 | ₹0 |
| Custom domain *(optional)* | Hostinger `.com` | ~₹58 | ~₹700 |
| **Total** | | **₹0–₹58/month** | **₹0–₹700/year** |

### Phase 2 — Scale (100+ users, if needed)

| Option | Services | Monthly |
|---|---|---|
| Managed cloud | Vercel Pro + Neon Launch | ~₹3,265 |
| Self-hosted VPS | Hetzner CX21 (2 vCPU, 4GB) | ~₹700 |

---

## Data Import Plan (Jan–Mar 2026)

CSV upload via Settings → Import Data.
Downloadable template with columns: `date, category, subcategory, description, amount`.
Monthly headers (income, EMI, savings) entered manually per month.
Estimated manual entry time via bulk mode: ~20–30 minutes total for 3 months.

---

## Future iOS App Path

- Next.js API routes at `/api/...` are plain HTTP REST endpoints
- A React Native or Swift client calls the same endpoints with no backend changes
- NextAuth JWT tokens work identically from mobile clients
- No architectural changes required — backend is already mobile-ready from day one

---

## Verification Plan

After implementation, verify end-to-end:

1. **Auth:** Register → login → logout → wrong password → lockout after 5 attempts
2. **Monthly Log:** Create March 2026 header → add transactions (quick-add + bulk) → verify surplus calculation
3. **Annual Hub:** Add PPF asset + property tax liability → verify net difference
4. **Passive Income:** Add bond interest for 3 months → verify annual total
5. **Wealth Tracker:** Add asset snapshot → update values → verify net worth trend chart updates
6. **Dashboard:** Verify all KPI cards, charts, and health scorecard reflect entered data correctly
7. **Multi-user:** Invite second user → log in as second user → confirm data isolation (User A cannot see User B's data)
8. **Import:** Upload Jan–Mar 2026 CSV → verify transactions appear correctly in Monthly Log
9. **Security:** Attempt to access `/api/transactions` without auth → expect 401
10. **Mobile:** Open app on iPhone Safari → verify layout, FAB, and all navigation work correctly
