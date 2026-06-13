# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Artha** is a personal finance tracker web app built for Vishal's personal use (≤20 users). It replaces manual Apple Notes tracking with a structured web app covering monthly expenses, monthly bill payments, annual entries, passive income, and wealth tracking.

Design spec: `docs/superpowers/specs/2026-03-31-artha-expense-tracker-design.md` — read this before implementing any feature module.

## Commands

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build (also typechecks + lints — authoritative check)
npm run lint      # BROKEN on Next 16 ('next lint' was removed). Use `npx eslint .` or rely on `npm run build`
npx prisma studio # Visual DB browser
npx prisma migrate dev --name <name>   # Create and apply migration
npx prisma migrate deploy              # Apply migrations in production
npx prisma generate                    # Regenerate client after schema changes
npm run seed:birla                     # Seed the shared "Birla Ojasvi Home Loan" (idempotent; needs both users' accounts + .env.local loaded)
```

```bash
npm test               # Run Jest tests (213 tests; 5 pre-existing register.test.ts failures — see Testing)
npm run test:coverage  # Run with coverage report
```

## Architecture

**Stack:** Next.js 16 (App Router) + TypeScript + Prisma v5 (PostgreSQL/Neon) + NextAuth v5 (beta) + shadcn/ui + Tailwind CSS + recharts v3

> **Version note:** this repo is on **Next.js 16** and **recharts v3** (older notes said "Next 14"). Two consequences: `next lint` no longer exists (see Commands), and recharts v3 has chart-rendering gotchas (see Security/known-quirks).

### Route Groups

- `src/app/(auth)/` — public routes: `/login`, `/register`. Centered card layout.
- `src/app/(app)/` — protected routes: `/dashboard`, `/monthly-log`, `/annual-hub`, `/passive-income`, `/wealth-tracker`, `/loans`, `/loans/[id]`, `/bill-checklist`, `/settings`. Sidebar + mobile nav layout.
- `src/app/api/` — API routes. **Excluded from middleware** — API routes handle their own auth via session checks.

### Auth Architecture (critical — Edge Runtime split)

NextAuth v5 requires splitting auth config due to Edge Runtime limitations:

- `src/auth.config.ts` — Edge-compatible config only (callbacks, pages). Used by middleware. No Node.js-only imports.
- `src/auth.ts` — Full config (spreads authConfig + adds Credentials provider with bcrypt). Used by API routes and server components.
- `src/middleware.ts` — Protects all page routes. Uses `auth.config.ts` only. Excludes `/api/**`, `_next/**`, `favicon.ico`, **`manifest.json`, and `/icons/**`** (the PWA assets — see below). The matcher intercepts `/public` static files too, so any publicly-fetched asset must be added to the negative lookahead or it gets 307-redirected to `/login`. Pinned by `tests/unit/middlewareMatcher.test.ts` — keep it green.

**Session strategy:** JWT (not DB sessions). User `id` and `role` are injected into the JWT token and exposed on `session.user`.

**Account lockout:** 5 failed login attempts → 15-minute lockout. Fields `failedAttempts` and `lockoutUntil` on the `User` model.

### Database Layer

- `src/lib/db.ts` — Prisma singleton client (dev-mode logging). Always import from here.
- `prisma/schema.prisma` — 16 models: `User`, `MonthlyHeader`, `Transaction`, `Category`, `EMI`, `AnnualEntry`, `PassiveIncome`, `Asset`, `BudgetTarget`, `MonthlyBill`, `MonthlyBillPayment`, and the Loan Tracker set: `Loan`, `LoanMember`, `LoanPayment`, `EmiEntry`, `LoanDisbursement`.
- `prisma/seed.ts` — Exports `DEFAULT_CATEGORIES` array. **Not a runnable seed script** — categories are seeded per-user at registration in the API route.
- `prisma/seed-birla-ojasvi.ts` — One-time idempotent seed for the shared Birla Ojasvi home loan (run via `npm run seed:birla`). Instantiates its own `PrismaClient` (not the `@/lib/db` singleton, to avoid path-alias issues under ts-node). Skips if the loan already exists; aborts if either user account is missing.

**Monthly bill checklist data model:** `MonthlyBill` stores reusable bill definitions configured from Settings. `MonthlyBillPayment` stores month-specific paid/unpaid state with `@@unique([userId, monthlyBillId, year, month])`. `MonthlyBill.amount` and `MonthlyBill.dueDay` are optional because bill amounts and due dates can vary month to month. There are **no match-rule columns** on these models — the Monthly-Log → Bill auto-check (below) uses a hardcoded code-level mapping, not per-bill DB rules, and there is **no `autoChecked` flag** (check-only).

**Bill auto-check engine (`src/lib/bill-matching.ts`):** links the Monthly Log to the Bill Checklist via a **hardcoded** category→bill mapping (`BILL_AUTOCHECK_RULES`): Electricity / Newspaper / Internet / Milk match by category name (any subcategory); Vehicles **+ `Car wash` subcategory** → the `Car wash` bill. Matching (`findMatchingRule`) is case-/whitespace-insensitive on category, subcategory, and bill name. Transaction create/update/**bulk** routes call `safeSyncBillsForTransactions(userId, txns)` after the mutation; for each matched txn it ticks (`isPaid=true`) the user's active bill of that name for the txn's month (**UTC** attribution — `Transaction.date` is `@db.Date`/UTC-midnight, so `getUTC*` avoids an off-by-one-month). It loads categories+bills once and dedupes `(bill, year, month)`. **Check-only (deliberate design choice — see spec):** it **never un-ticks**, never clobbers an already-paid row (`paidAt` preserved), never touches non-matching bills, and the **delete route is NOT hooked**. There is no `autoChecked` flag and no Settings rule editor (both were considered and rejected for YAGNI). The `safe*` wrapper swallows engine errors so a sync failure can never fail the parent request. Bulk entries carry no subcategory, so the Vehicles/Car-wash rule never fires on bulk (category-only rules do). Spec: `docs/superpowers/specs/2026-06-13-bill-autocheck-and-timeline-darkmode-design.md`. Tests: `tests/integration/bill_autocheck_engine.test.ts` (mapping + tick/skip/no-op/dedupe/UTC) + `bill_autocheck_routes.test.ts` (route wiring).

**Loan Tracker data model (Artha's first SHARED resource):** `Loan` is read/write by multiple users via the `LoanMember` junction (`@@unique([loanId, userId])`, role OWNER|MEMBER). `LoanPayment` = one-off contributions; `EmiEntry` = monthly planned + actual per member (`@@unique([loanId, userId, year, month])`); `LoanDisbursement` = lender tranches. Loan children **cascade-delete** with the loan; user FKs (`createdBy`, `paidBy`, `EmiEntry.user`) use **RESTRICT** so deleting a user can't silently erase shared history. Enums: `LoanType`, `LoanRole`, `LoanPaymentType`. Note: `model EmiEntry` → `prisma.emiEntry` (the old single-user `model EMI` is still `prisma.eMI` — don't confuse them).

### Key Patterns

**User isolation (single-user modules):** Every DB query must include `WHERE userId = session.user.id`. Never query across users. This applies to all modules **except** the Loan Tracker.

**Membership-based isolation (Loan Tracker — `/api/loans/**` only):** A loan is a SHARED resource, so the per-row `userId` rule does NOT apply. Instead, every loan route proves the caller is a member of the loan before touching any loan data, via helpers in `src/lib/loan-access.ts`:
- `getLoanMembership(loanId, userId)` → the `LoanMember` row or null (`prisma.loanMember.findUnique` on the `loanId_userId` compound key).
- `assertMember(loanId, userId)` → membership or null; **route returns 404 if null** (never leak existence).
- `assertOwner(loanId, userId)` → membership only if role is OWNER, else null.
Pattern: `auth()` → 401 → `assertMember` → 404 if null → operate scoped by `loanId`. Owner-only actions (loan PUT/DELETE, add/remove member) call `assertMember` first (404), then `assertOwner` (403 if a member but not owner). Child routes (`[paymentId]`/`[emiId]`/`[disbId]`/`[memberId]`) additionally verify `child.loanId === id` (else 404). `src/lib/loan-summary.ts` holds the pure, unit-tested aggregation (`computeContributions`/`computeProgress`) that recomputes per-member totals from the ledger rows.

**API route auth pattern (single-user):**
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
- Annual Hub — collapsible asset/liability sections, category grouping, add/edit/delete, summary rows (Total = Assets + Liabilities, Net = Assets − Liabilities)
- Passive Income — 4 tabs (bond matrix, SB interest, dividends, other), add/edit/delete
- Wealth Tracker — asset cards, allocation donut, net worth trend chart, update snapshot
- Loan Tracker — **Artha's first shared multi-user resource.** List page + 5-tab detail (Overview, Payments, EMIs, Disbursements, Members). Membership-based access (OWNER/MEMBER); add members by email lookup; one-off payment ledger + planned/actual EMI pivot grid + lender disbursements; auto-computed per-member contribution totals (donut) + EMI planned-vs-actual bar chart. Seeded with the real Birla Ojasvi home loan (`npm run seed:birla`). The Payments table has a `TableFooter` **Total** row; the EMI pivot has a `TableFooter` **Total** row with per-member Planned/Paid subtotals + an overall total, and months are sorted **descending** (newest first). The Payments, EMIs, and Disbursements tabs each have a client-side **Export PDF** button (label hidden below `sm`) backed by the shared `src/components/loans/loan-pdf.ts` helper (`exportLoanPaymentsPdf` / `exportLoanEmisPdf` / `exportLoanDisbursementsPdf`), which mirrors the Monthly Log jsPDF style (dark header band, zebra rows, emerald total row, plain en-IN amounts — no `₹`). Disbursements has no total row by design (the "Disbursed vs Sanctioned" card already shows it).
- Bill Checklist — monthly paid/unpaid checklist for recurring bills, with month navigation, optional expected amounts/due days, and month-specific completion state. **Auto-check from Monthly Log (check-only):** adding/editing/bulk-adding a transaction whose category matches a hardcoded rule (Electricity/Newspaper/Internet/Milk by category; Vehicles + `Car wash` subcategory → `Car wash` bill) auto-ticks that bill for the entry's month. It **never un-ticks** (delete an entry → the tick stays; untick manually) and never overrides a manual tick. The mapping lives in code (`src/lib/bill-matching.ts`), not Settings — no per-bill rule editor, no "auto" badge. The checklist page reads fresh on mount, so auto-ticks just appear when you open it.
- Settings — profile/password, category management, EMI manager, bill checklist items, budget targets, CSV import
- Dark mode — toggle in Sidebar (desktop) and More menu (mobile/tablet). `ThemeProvider` from `next-themes` wraps the app in `src/app/layout.tsx`. CSS variables for both themes live in `src/app/globals.css`. Default is light; `enableSystem` is off. Custom dropdowns and native `<select>` elements must use CSS variable classes (`bg-popover`, `border-border`, `text-foreground`, `hover:bg-accent`) — never hardcode `bg-white` or `border-gray-200` in floating/overlay elements. **Recharts internals are a dark-mode blind spot a className grep can't catch:** `CartesianGrid stroke`, axis `tick.fill`, `Tooltip cursor.fill`, and Pie/Line dot `stroke` are inline hex props — they must use `hsl(var(--border|muted-foreground|accent|card))` (see `MonthlyChart.tsx` for the canonical pattern), NOT hardcoded light values like `#f1f5f9`/`#94a3b8`/`"white"`. **Data-series colors (bar/line/segment fills) are intentionally kept constant across themes** — don't convert those. The Monthly-Log `TransactionTimeline`/`HeaderForm`/`BulkEntryDialog` and the `TrendChart`/`EmiPlannedVsActualChart`/`ContributionChart`/`AllocationChart` chart internals were the last stragglers (fixed 2026-06-13); mirror `TransactionGrouped.tsx` for list/row dark-mode classes.
- Vercel deployment — connected to GitHub, main branch auto-deploys on merge
- PWA / Add-to-Home-Screen — installable as a standalone iPhone (and Android) app. Static `public/manifest.json` (`display: standalone`, `start_url: /dashboard`, white `background_color`/`theme_color`). Home-screen icons live in `public/icons/` (`icon-192.png`, `icon-512.png` for the manifest; `apple-touch-icon.png` 180×180 for iOS) and are generated from `src/app/icon.png` by `scripts/generate-pwa-icons.mjs` (re-run `node scripts/generate-pwa-icons.mjs` if the logo changes — sharp is already available via Next's image pipeline; no extra dep). The manifest link, `themeColor`, and Apple meta tags are wired through the Next 16 Metadata API in `src/app/layout.tsx` (`metadata.manifest`, `metadata.appleWebApp`, `metadata.icons.apple`, `viewport.themeColor`). **No service worker** by design — iOS installs from manifest + meta tags alone, and a caching SW would risk serving stale authenticated pages. See PWA note under Security/known-quirks.

**Pending (future enhancements):**
- Multi-user invite flow for non-members (the Loan Tracker adds existing accounts by email; there's still no self-serve invite for brand-new users — registration is gated by `REGISTRATION_OPEN`)
- Multiple loans / non-home loan types in active use (the model supports them; only the Birla Ojasvi home loan is seeded so far)
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
- **Recharts v3 chart-rendering gotchas:** a `<Pie>` renders empty (sector `<path>`s never drawn) unless you set `isAnimationActive={false}`; and `<ResponsiveContainer width="100%">` inside a fixed-width flex column can collapse to 0 width — use a fixed-size `<PieChart width={N} height={N}>` instead. Both were required to make the Wealth Tracker allocation donut render (`src/components/wealth-tracker/AllocationChart.tsx`). `LineChart`/`TrendChart` are unaffected.
- **jsPDF font limitation:** jsPDF's built-in Helvetica font cannot render the `₹` symbol — it renders as a superscript glyph. Format INR amounts as plain numbers using `Intl.NumberFormat("en-IN")` with no currency prefix in any PDF output. Both PDF exporters follow this: Monthly Log (`MonthHeader`) and the Loan Tracker tabs (`src/components/loans/loan-pdf.ts`).
- Bill checklist month/year API params must be validated (`year >= 1900 && year <= 2100`, `month >= 1 && month <= 12`) and every bill/payment query must include `userId`.
- **Bill auto-check (`src/lib/bill-matching.ts`):** the mapping is **hardcoded in code** — there is no user-supplied rule input to validate. Every engine query is `userId`-scoped, and bills are resolved per-user, so one user's transaction can never tick another user's bill (verified: a second account with the same categories but no matching bills no-ops). Routes must call the `safeSync*` wrapper (never the raw engine) so an engine failure can't fail the parent transaction request. Check-only: the engine has **no code path that sets `isPaid=false`**. The tests (`tests/integration/bill_autocheck_engine.test.ts`, `bill_autocheck_routes.test.ts`) pin this — keep them green.
- **Loan routes (`/api/loans/**`):** never query loan children without first proving membership via `loan-access` (404 for non-members, no existence leak); validate `year`/`month` on EMI routes; owner-only routes return 403 to members / 404 to non-members; child routes verify `child.loanId === id`. Recharts custom tooltip props typed `any`. The shared-resource integration tests (`tests/integration/loans.test.ts`) pin these guarantees — keep them green.

**Registration gate:** `POST /api/user/register` is permanently closed unless `REGISTRATION_OPEN=true` is set in the environment. To invite a new user: add `REGISTRATION_OPEN=true` in Vercel → share the `/register` link → remove the var once they've created their account. Never leave this var set permanently.

### Testing

Jest is configured. 213 tests, **208 pass**. The **5 failures are pre-existing** in `tests/integration/register.test.ts`: they expect 409/400/201 but get **403** because the `REGISTRATION_OPEN` gate short-circuits before the duplicate-email/validation logic — the tests predate the gate. (Fix = set `REGISTRATION_OPEN=true` in those tests' setup.) Integration tests mock `@/auth` and `@/lib/db` and require `/** @jest-environment node */` per-file docblock (NextRequest needs Node globals, not jsdom). Unit tests run in jsdom. See `tests/report.md` for full pass/fail listing.

**Known TS quirk:** Zod v4 + react-hook-form v7 resolver type mismatch — use `zodResolver(schema) as Resolver<FormValues>` when using `Form` components. Import `type Resolver` from `react-hook-form`.

**Prisma quirk:** `model EMI` in schema → `prisma.eMI` at runtime (Prisma preserves model name casing). Use `prisma.eMI` not `prisma.emi`.

**Migration quirk:** When adding Prisma migrations locally, the CLI may not automatically load `.env.local`. If `DIRECT_DATABASE_URL` is missing, load `.env.local` values before running `npx prisma migrate deploy` or `npx prisma migrate dev`.

**Lint quirk:** On Next.js 16 the `next lint` command was removed, so `npm run lint` fails with `Invalid project directory provided, no such directory: .../lint`. Lint with `npx eslint .` or rely on `npm run build` (it typechecks + lints).

### Git & PR Workflow

**Never commit directly to `main`** — main is connected to Vercel production. All changes go through a branch.

- **Branch naming:** `fix/DD-MM-YYYY` for bug fixes (e.g. `fix/05-06-2026`), `feat/DD-MM-YYYY` or descriptive slug for features
- **PR process:** Create a PR for main but do not merge the PR with main unless explicitly stated
- **Approvals:** Solo project, no branch protection requiring approvals — PRs can be merged directly without a review approval
- **Deploy trigger:** Merging a PR into `main` automatically triggers Vercel deployment
- **Keep this file current:** After completing a feature or a major bug fix, update `CLAUDE.md` in the same PR to reflect it — new modules/routes/models, changed patterns, and any non-obvious gotchas or constraints discovered (e.g. the root cause of a bug worth not re-introducing). Treat it as part of "done," not a follow-up. Skip purely trivial changes (typos, copy tweaks, minor style fixes).

## UI / Design Conventions

- **Light/dark theme** — default is light. Toggle available in Sidebar and mobile More menu. Use CSS variable-based Tailwind classes (`bg-background`, `bg-card`, `bg-popover`, `border-border`, `text-foreground`, `text-muted-foreground`, `hover:bg-accent`) so components adapt automatically. Never hardcode `bg-white`, `bg-gray-50`, or `border-gray-200` on floating elements (dropdowns, dialogs overlays, selects).
- **Accent color:** Emerald green for CTAs and active states.
- **shadcn/ui** with `default` style and `slate` base color.
- Sidebar for desktop (includes `Loans` 🏦 after Wealth Tracker), bottom nav for mobile/tablet. Mobile keeps four primary tabs and uses a `More` menu for secondary destinations (`Loans`, `Passive Income`, `Bill Checklist`, `Settings`, theme toggle, sign out).
- **Responsive:** All pages use `p-4 md:p-6` responsive padding. Main content area has `min-w-0 overflow-x-hidden` to prevent horizontal overflow on narrow viewports (iPad portrait).
- **Native `<input type="date">` on iOS Safari:** by default iOS center-aligns the value and inflates the control's height past the shared `Input`'s `h-10`, so date fields look taller/misaligned next to their grid neighbors. Fixed globally in `src/app/globals.css` with `input[type="date"|"time"|"datetime-local"] { -webkit-appearance: none; appearance: none }` + `::-webkit-date-and-time-value { text-align: left; margin: 0 }`. Keep these rules — they normalize date inputs app-wide (loan dialogs, loan edit, etc.) without removing the native picker. When two action buttons share a tab header on mobile, hide the secondary label below `sm` (`<span className="hidden sm:inline">`) so the header doesn't overflow narrow phones.
- **Favicon:** Custom icon at `src/app/icon.png` (Next.js App Router auto-generates `<link rel="icon">` from this file). Do not add a `favicon.ico` alongside it — the browser will serve the cached `.ico` and ignore `icon.png`.
- **PWA home-screen icons:** The source `src/app/icon.png` is a cream rounded tile with **transparent corners**; iOS renders transparent corners on a home-screen icon as black, so `scripts/generate-pwa-icons.mjs` flattens them onto the tile's cream (`#fce3c8`) and `contain`-fits to a square (no cropping) before iOS applies its own rounded mask. Do not point the manifest/apple-touch icons directly at the transparent `icon.png`. **Next 16 quirk:** `appleWebApp.capable: true` now emits only the standardized `<meta name="mobile-web-app-capable">`, not the legacy `apple-mobile-web-app-capable` — the latter is added manually via `metadata.other` in `src/app/layout.tsx` for older-iOS standalone support; keep both.
- **PWA standalone scope (critical):** `manifest.json` and `/icons/**` MUST stay excluded from the auth middleware matcher (`src/middleware.ts`). iOS fetches the manifest unauthenticated; if middleware 307-redirects it to `/login`, iOS can't read `scope`, falls back to legacy standalone mode, and the installed app **breaks out into an in-app browser on every navigation** (looks like the Safari address bar/toolbar returning). With the manifest reachable and `scope: "/"`, in-scope client-side (`next/link`) navigation stays inside the standalone app. After changing the manifest, you must delete and re-add the home-screen icon — iOS caches the manifest at install time.
