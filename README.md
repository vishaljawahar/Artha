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
| **Settings** | Manage categories, EMIs, budget targets, import CSV data, and update your profile |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Database:** PostgreSQL via [Neon](https://neon.tech) + Prisma ORM
- **Auth:** NextAuth v5 (JWT sessions, bcrypt passwords, account lockout)
- **UI:** shadcn/ui (Radix UI) + Tailwind CSS + Recharts
- **Testing:** Jest — 127 tests, 100% passing

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)

### Setup

```bash
# Clone and install
git clone https://github.com/vishaljawahar/Artha.git
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
npm test              # Run all 127 tests
npm run test:coverage # Tests with coverage report
npx prisma studio     # Visual database browser
```

---

## Documentation

- [Build Summary](docs/build-summary.md) — what was built, architecture decisions, API surface, file structure
- [User Guide](docs/user-guide.md) — detailed guide on how to use every feature
- [Test Report](tests/report.md) — full test suite results (127 tests across 14 suites)

---

## Security

- Passwords hashed with bcrypt (12 rounds)
- Account lockout after 5 failed login attempts (15-minute cooldown)
- All data scoped by `userId` — users can only access their own data
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- Input validation with Zod on all API routes

---

## Project Status

All 6 modules are fully built and tested. The app runs locally. Vercel deployment is the next planned step.

**Pending:**
- Vercel deployment
- Multi-user invite (admin can invite others by email)
- Budget alerts (amber at 80%, red at 100% of monthly target)
- Recurring transaction templates
