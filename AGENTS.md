# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**Artha** is a personal finance tracker web app built for Vishal's personal use (≤20 users). It replaces manual Apple Notes tracking with a structured web app covering monthly expenses, annual entries, passive income, and wealth tracking.

Design spec: `docs/superpowers/specs/2026-03-31-artha-expense-tracker-design.md` — read this before implementing any feature module.

## Commands

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build
npm run lint      # ESLint (next/core-web-vitals + typescript)
npx prisma studio # Visual DB browser
npx prisma migrate dev --name <name>   # Create and apply migration
npx prisma migrate deploy              # Apply migrations in production
npx prisma generate                    # Regenerate client after schema changes
```

```bash
npm test               # Run all Jest tests (127 tests across 14 suites)
npm run test:coverage  # Run with coverage report
```

## Architecture

**Stack:** Next.js 14 (App Router) + TypeScript + Prisma v5 (PostgreSQL/Neon) + NextAuth v5 (beta) + shadcn/ui + Tailwind CSS

### Route Groups

- `src/app/(auth)/` — public routes: `/login`, `/register`. Centered card layout.
- `src/app/(app)/` — protected routes: `/dashboard`, `/monthly-log`, `/annual-hub`, `/passive-income`, `/wealth-tracker`, `/settings`. Sidebar + mobile nav layout.
- `src/app/api/` — API routes. **Excluded from middleware** — API routes handle their own auth via session checks.

### Auth Architecture (critical — Edge Runtime split)

NextAuth v5 requires splitting auth config due to Edge Runtime limitations:

- `src/auth.config.ts` — Edge-compatible config only (callbacks, pages). Used by middleware. No Node.js-only imports.
- `src/auth.ts` — Full config (spreads authConfig + adds Credentials provider with bcrypt). Used by API routes and server components.
- `src/middleware.ts` — Protects all page routes. Uses `auth.config.ts` only. Excludes `/api/**`, `_next/**`, `favicon.ico`.

**Session strategy:** JWT (not DB sessions). User `id` and `role` are injected into the JWT token and exposed on `session.user`.

**Account lockout:** 5 failed login attempts → 15-minute lockout. Fields `failedAttempts` and `lockoutUntil` on the `User` model.

### Database Layer

- `src/lib/db.ts` — Prisma singleton client (dev-mode logging). Always import from here.
- `prisma/schema.prisma` — 9 models: `User`, `MonthlyHeader`, `Transaction`, `Category`, `EMI`, `AnnualEntry`, `PassiveIncome`, `Asset`, `BudgetTarget`.
- `prisma/seed.ts` — Exports `DEFAULT_CATEGORIES` array. **Not a runnable seed script** — categories are seeded per-user at registration in the API route.

### Key Patterns

**User isolation:** Every DB query must include `WHERE userId = session.user.id`. Never query across users.

**API route auth pattern:**
```ts
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

**Validation:** Zod v4 schemas in `src/lib/validations.ts`. Use `.issues` (not `.errors`) for Zod v4 error access.

**UI components:** shadcn/ui with slate base color. Add new components via `npx shadcn@latest add <component>`. All components land in `src/components/ui/`.

### Feature Status

All modules are fully built and in active use. The app runs locally at localhost:3000 and is deployed to Vercel (main branch triggers auto-deploy).

**Complete:**
- Auth — register, login, JWT sessions, account lockout
- Dashboard — 6 KPI cards (Income, Savings, Expenditure, EMI, Surplus, Months Logged), monthly bar chart, expense donut, health scorecard, recent transactions
- Monthly Log — monthly header, grouped/timeline views, quick-add, bulk entry, edit/delete, **PDF export** (client-side via `jsPDF`, triggered from `MonthHeader`)
- Annual Hub — collapsible asset/liability sections, category grouping, add/edit/delete
- Passive Income — 4 tabs (bond matrix, SB interest, dividends, other), add/edit/delete
- Wealth Tracker — asset cards, allocation donut, net worth trend chart, update snapshot
- Settings — profile/password, category management, EMI manager, budget targets, CSV import
- Vercel deployment — connected to GitHub, main branch auto-deploys on merge

**Pending (future enhancements):**
- Multi-user invite (admin invites by email)
- Budget alerts (amber/red at 80%/100% of monthly target)
- Recurring transaction templates

### Security

Security hardening applied (commit b66cdef). Before touching auth or API routes, note:
- Security headers set in `next.config.mjs` — do not remove the `headers()` block
- Year params on GET routes must be validated as `year >= 1900 && year <= 2100`
- Bulk entry route has `MAX_BULK_LINES = 200` and `MAX_LINE_LENGTH = 500` caps — keep these
- Import route has a `rows.max(500)` cap — keep this
- Error catch blocks should only log in `process.env.NODE_ENV === "development"`
- Recharts custom tooltip/legend props must be typed as `any` (Recharts types are too narrow)
- **jsPDF font limitation:** jsPDF's built-in Helvetica font cannot render the `₹` symbol — it renders as a superscript glyph. Format INR amounts as plain numbers using `Intl.NumberFormat("en-IN")` with no currency prefix in any PDF output.

**Registration gate:** `POST /api/user/register` is permanently closed unless `REGISTRATION_OPEN=true` is set in the environment. To invite a new user: add `REGISTRATION_OPEN=true` in Vercel → share the `/register` link → remove the var once they've created their account. Never leave this var set permanently.

### Testing

Jest is configured. 127 tests pass (27 unit + 100 integration). Integration tests mock `@/auth` and `@/lib/db` and require `/** @jest-environment node */` per-file docblock (NextRequest needs Node globals, not jsdom). Unit tests run in jsdom. See `tests/report.md` for full pass/fail listing.

**Known TS quirk:** Zod v4 + react-hook-form v7 resolver type mismatch — use `zodResolver(schema) as Resolver<FormValues>` when using `Form` components. Import `type Resolver` from `react-hook-form`.

**Prisma quirk:** `model EMI` in schema → `prisma.eMI` at runtime (Prisma preserves model name casing). Use `prisma.eMI` not `prisma.emi`.

### Git & PR Workflow

**Never commit directly to `main`** — main is connected to Vercel production. All changes go through a branch.

- **Branch naming:** `fix/DD-MM-YYYY` for bug fixes (e.g. `fix/05-06-2026`), `feat/DD-MM-YYYY` or descriptive slug for features
- **PR process:** Vishal creates and merges PRs manually — do not open PRs via `gh` unless explicitly asked
- **Approvals:** Solo project, no branch protection requiring approvals — PRs can be merged directly without a review approval
- **Deploy trigger:** Merging a PR into `main` automatically triggers Vercel deployment

## UI / Design Conventions

- **Light theme only** — white backgrounds, gray text, light borders. No dark mode.
- **Accent color:** Emerald green for CTAs and active states.
- **shadcn/ui** with `default` style and `slate` base color.
- Sidebar for desktop, bottom nav for mobile.
- **Favicon:** Custom icon at `src/app/icon.png` (Next.js App Router auto-generates `<link rel="icon">` from this file). Do not add a `favicon.ico` alongside it — the browser will serve the cached `.ico` and ignore `icon.png`.
