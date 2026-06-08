# Artha — Personal Finance Tracker

**Artha** *(Sanskrit: wealth, financial wellbeing)* is a full-stack personal finance web app for tracking monthly expenses, annual investments, passive income, and net worth — all in one place.

Built as a structured replacement for manual finance tracking, with real-time analytics and a clean, mobile-responsive UI.

---

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Year-at-a-glance KPIs, monthly bar charts, expense donut, financial health scorecard |
| **Monthly Log** | Log daily expenses by category; track income, EMI, savings per month; grouped + timeline views |
| **Annual Hub** | Record yearly asset deployments and large liabilities; net position at a glance |
| **Passive Income** | Track bond interest, dividends, SB interest, and other income — with a bond matrix view |
| **Wealth Tracker** | Asset portfolio with allocation donut, net worth trend chart, and snapshot updates |
| **Loans** | Shared multi-user loan tracker — contribution ledger, planned/actual EMIs, disbursements, auto-computed per-member totals |
| **Bill Checklist** | Monthly paid/unpaid checklist for recurring bills |
| **Settings** | Manage categories, EMIs, budget targets, import CSV data, and update your profile |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Database:** PostgreSQL via [Neon](https://neon.tech) + Prisma ORM
- **Auth:** NextAuth v5 (JWT sessions, bcrypt passwords, account lockout)
- **UI:** shadcn/ui (Radix UI) + Tailwind CSS + Recharts v3
- **Testing:** Jest — 192 tests (187 passing; 5 pre-existing register-gate failures)

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)

### Setup

```bash
# Clone and install
git clone https://github.com/<your-username>/Artha.git
cd Artha
npm install

# Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, DIRECT_DATABASE_URL, NEXTAUTH_SECRET in .env.local

# Apply database migrations
npx prisma migrate deploy

# Start dev server
npm run dev
# → http://localhost:3000
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_DATABASE_URL` | Neon direct connection string (for migrations) |
| `NEXTAUTH_SECRET` | Random secret for JWT signing (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` for dev, HTTPS URL for production) |

---

## Commands

```bash
npm run dev           # Start dev server at localhost:3000
npm run build         # Production build
npm run lint          # ESLint
npm test              # Run the test suite
npm run test:coverage # Tests with coverage report
npx prisma studio     # Visual database browser
```

---

## Documentation

- [Build Summary](docs/build-summary.md) — what was built, architecture decisions, API surface, file structure
- [User Guide](docs/user-guide.md) — detailed guide on how to use every feature
- [Test Report](tests/report.md) — full test suite results (192 tests; 187 passing, 5 pre-existing register-gate failures)

---

## Security

- Passwords hashed with bcrypt (12 rounds)
- Account lockout after 5 failed login attempts (15-minute cooldown)
- Most data is scoped by `userId` — users can only access their own data. The **Loan Tracker is a shared resource** and instead uses **membership-based** access: every loan route verifies the caller is a member of that loan, and non-members get a 404 (no existence leak)
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- Input validation with Zod on all API routes

---

## Project Status

All modules are fully built and in active use, deployed to Vercel. This includes the **Loan Tracker** — Artha's first shared, multi-user resource (a loan co-owned by multiple users via membership, with a contribution ledger, planned/actual EMIs, disbursements, and auto-computed per-member totals).

**Pending:**
- Multi-user invite (admin can invite others by email)
- Budget alerts (amber at 80%, red at 100% of monthly target)
- Recurring transaction templates
