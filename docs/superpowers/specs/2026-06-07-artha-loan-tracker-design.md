# Artha — Loan Tracker: Design Spec
**Date:** 2026-06-07
**Status:** Approved
**Author:** Artha Team

---

## Context

Two co-borrowers share a home loan and track their joint contributions to it in a single shared document. Both put money in (booking amount, installments, TDS, registration/agreement fees), the lender disburses tranches to the builder over time, and they split each month's EMI between them. The document is the only record of who paid what, and the running totals are tallied by hand.

This is functional but fragile in exactly the ways the rest of Artha already solved for single-user data — except this data is *not* single-user. Two people read and write the same loan, the totals drift whenever a number is added without re-tallying, and there is no per-person view of "how much have I contributed so far". Every other Artha module is strictly per-user (`WHERE userId = session.user.id`); a shared loan does not fit that rule.

**Outcome:** Artha's **first shared, multi-user resource**. A loan is co-owned by multiple Artha users via a membership table. Any member can record payments, EMIs, and disbursements; the module auto-computes every total (including a per-member contribution split) from the underlying ledger rows, so the figures are always correct. This replaces the manual shared record and generalises to any future shared loan.

---

## Assumptions

1. Currency is INR throughout. No multi-currency support.
2. A loan is shared between Artha users who **already have accounts** — there is no external/email-only participant. Members are added by **email lookup** against existing users.
3. This is a **contribution ledger**, not an amortization schedule. There is no principal/interest breakdown, no auto-generated repayment schedule, and no payoff projection. EMIs are tracked as planned-vs-actual amounts per member per month.
4. Sanctioned amount, interest rate, tenure, and planned EMI are stored as loan metadata for reference but are not used to derive a schedule.
5. Initial loans can be seeded from known historical data via a one-time idempotent script. All other loans are created in-app.
6. Light/dark theme is supported app-wide (light default), consistent with the rest of Artha.

---

## The Shared-Resource Decision

Every existing Artha module enforces isolation with a single rule: **every row has a `userId`, and every query filters on the session user's id.** Cross-user access is structurally impossible at the query level.

A shared loan breaks that rule deliberately. Two different users must see and mutate the *same* `Loan` row and its children. We cannot scope a loan by a single owner's `userId`, because that would lock the co-owner out.

**Decision: membership-based access via a `LoanMember` junction table.**

- A `Loan` has no owning `userId`. Instead, the many-to-many between users and loans is modelled by `LoanMember(userId, loanId, role)`.
- Access control moves from "does this row's `userId` match the session?" to **"is the session user a member of this loan?"**. A non-member is treated as if the loan does not exist — every loan route returns **404** (not 403) so membership is not even leaked.
- Two roles:
  - **OWNER** — can edit/delete the loan itself and add/remove members.
  - **MEMBER** — can add/edit payments, EMIs, and disbursements, but cannot change loan metadata or manage membership.
- The **last OWNER cannot be removed** — a loan must always have at least one owner.

**Why a junction table rather than an array of user ids on `Loan`:** the junction row is the natural home for the per-member `role`, gives us a unique constraint on `(loanId, userId)` to prevent duplicate membership, and lets contribution aggregation join cleanly on `userId`.

**Why 404 instead of 403 for non-members:** returning 403 ("forbidden") confirms the loan exists. 404 leaks nothing — a user who is not a member cannot distinguish "this loan id is not mine" from "this loan id does not exist".

---

## Tech Stack

Consistent with the rest of Artha — no new infrastructure.

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Full-stack, SSR + API routes |
| Language | TypeScript | Type safety from DB → API → UI |
| Styling | Tailwind CSS | Utility-first, light/dark via CSS variables |
| Components | shadcn/ui (Radix UI) | Accessible, slate base color |
| Charts | Recharts v3 | Contribution donut + planned-vs-actual bars |
| Database | PostgreSQL via Neon | Serverless, shared with all modules |
| ORM | Prisma v5 | Parameterized queries, type-safe |
| Auth | NextAuth v5 | JWT sessions; session user id drives membership checks |
| Deployment | Vercel | Auto-deploy on merge to `main` |

---

## Data Model

Five new Prisma models and three new enums. All financial amounts are `Decimal`. Loan children **cascade-delete** with the loan; user foreign keys use **RESTRICT** so a user who contributed to a shared loan cannot be deleted out from under the shared history.

### Enums

```prisma
enum LoanType {
  HOME
  CAR
  PERSONAL
  EDUCATION
  OTHER
}

enum LoanRole {
  OWNER
  MEMBER
}

enum LoanPaymentType {
  BOOKING
  INSTALLMENT
  TDS
  AGREEMENT
  FEE
  OTHER
}
```

### `Loan`

The shared loan. Has no owning `userId` — ownership is expressed through `LoanMember`.

```
id                uuid PK
name              varchar              -- "My Home Loan"
lender            varchar nullable     -- lender name
type              LoanType
sanctionedAmount  decimal(14,2)
interestRate      decimal(5,2) nullable
tenureMonths      int nullable
plannedEmi        decimal(12,2) nullable
startDate         date nullable
notes             text nullable
createdAt         timestamp
updatedAt         timestamp

members           LoanMember[]
payments          LoanPayment[]
emiEntries        EmiEntry[]
disbursements     LoanDisbursement[]
```

### `LoanMember`

The junction table that makes a loan shared. One row per (user, loan) with a role.

```
id        uuid PK
loanId    uuid FK → Loan        (onDelete: Cascade)
userId    uuid FK → User        (onDelete: Restrict)
role      LoanRole
createdAt timestamp

UNIQUE(loanId, userId)
```

### `LoanPayment`

A one-off contribution toward the loan by a specific member.

```
id          uuid PK
loanId      uuid FK → Loan       (onDelete: Cascade)
paidByUserId uuid FK → User      (onDelete: Restrict)  -- who paid
date        date
type        LoanPaymentType      -- booking / installment / TDS / agreement / fee / other
description varchar nullable
mode        varchar nullable     -- "Axis Bank Cheque", "UPI"
amount      decimal(12,2)
createdAt   timestamp
updatedAt   timestamp
```

### `EmiEntry`

Planned-vs-actual EMI share for one member in one month. The EMI pivot grid is built from these rows.

```
id          uuid PK
loanId      uuid FK → Loan       (onDelete: Cascade)
memberUserId uuid FK → User      (onDelete: Restrict)  -- whose share
year        int
month       int (1–12)
plannedAmount decimal(12,2)
paidAmount  decimal(12,2)
createdAt   timestamp
updatedAt   timestamp
```

### `LoanDisbursement`

A tranche released by the lender to the builder. Tracked against the sanctioned amount.

```
id        uuid PK
loanId    uuid FK → Loan         (onDelete: Cascade)
date      date
amount    decimal(14,2)
notes     text nullable
createdAt timestamp
updatedAt timestamp
```

> **Cascade vs RESTRICT rationale:** deleting a `Loan` should clean up all of its children (members, payments, EMI entries, disbursements) — hence `onDelete: Cascade` on the `loanId` FKs. But the *user* FKs (`paidByUserId`, `memberUserId`, `LoanMember.userId`) use `onDelete: Restrict`: a shared loan's history must not silently lose attribution if one participant's account is removed. The user has to be detached from the loan first.

---

## Access-Control Helper — `src/lib/loan-access.ts`

Membership checks are centralised so every route enforces them identically. Three functions:

| Function | Returns / throws | Use |
|---|---|---|
| `getLoanMembership(userId, loanId)` | the `LoanMember` row or `null` | low-level lookup |
| `assertMember(userId, loanId)` | the membership, or throws a 404-mapped error | gate read + member-write routes |
| `assertOwner(userId, loanId)` | the membership if role is OWNER, else throws | gate loan-edit/delete + member management |

`assertMember` is the workhorse — any route that reads a loan or writes a child row calls it first. `assertOwner` additionally checks `role === OWNER`. Both map a missing/insufficient membership to a **404** response so non-members cannot probe for loan existence.

---

## Aggregation Helper — `src/lib/loan-summary.ts`

All displayed totals are **computed from ledger rows**, never stored. The aggregation logic is pure (no DB access — it takes already-fetched rows and returns numbers), which makes it **unit-testable** in isolation.

| Function | Computes |
|---|---|
| `computeContributions(payments, emiEntries, members)` | total contributed, and a per-member split (payments by `paidByUserId` + EMI `paidAmount` by `memberUserId`) — feeds the Overview "Total Contributed" card and the contributions donut |
| `computeProgress(disbursements, sanctionedAmount)` | total disbursed and disbursed-vs-sanctioned percentage — feeds the progress bar |

Keeping these pure means the Overview tab is a thin render layer over deterministic functions, and the tricky money math is covered by unit tests rather than only exercised through the UI.

---

## API Surface — `/api/loans/**`

Every route resolves the session user first (`auth()` → 401 if no session), then enforces membership via the helpers. "Who's allowed" below is *in addition to* having a valid session.

| Method | Route | Purpose | Who's allowed |
|---|---|---|---|
| GET | `/api/loans` | List loans the caller is a member of | any member (scoped to own memberships) |
| POST | `/api/loans` | Create a loan (creator becomes OWNER) | any authenticated user |
| GET | `/api/loans/[loanId]` | Loan detail + members + aggregates | member only (else 404) |
| PATCH | `/api/loans/[loanId]` | Edit loan metadata | owner only (else 404) |
| DELETE | `/api/loans/[loanId]` | Delete loan (cascades children) | owner only (else 404) |
| GET | `/api/loans/[loanId]/payments` | List payments | member |
| POST | `/api/loans/[loanId]/payments` | Add payment | member |
| PATCH | `/api/loans/[loanId]/payments/[id]` | Edit payment | member |
| DELETE | `/api/loans/[loanId]/payments/[id]` | Delete payment | member |
| GET | `/api/loans/[loanId]/emis` | List EMI entries (pivot source) | member |
| POST | `/api/loans/[loanId]/emis` | Add/upsert an EMI entry | member |
| PATCH | `/api/loans/[loanId]/emis/[id]` | Edit EMI entry | member |
| DELETE | `/api/loans/[loanId]/emis/[id]` | Delete EMI entry | member |
| GET | `/api/loans/[loanId]/disbursements` | List disbursements | member |
| POST | `/api/loans/[loanId]/disbursements` | Add disbursement | member |
| PATCH | `/api/loans/[loanId]/disbursements/[id]` | Edit disbursement | member |
| DELETE | `/api/loans/[loanId]/disbursements/[id]` | Delete disbursement | member |
| GET | `/api/loans/[loanId]/members` | List members + roles | member |
| POST | `/api/loans/[loanId]/members` | Add member by email lookup | owner only |
| PATCH | `/api/loans/[loanId]/members/[id]` | Change a member's role | owner only |
| DELETE | `/api/loans/[loanId]/members/[id]` | Remove member (not the last owner) | owner only |

All input is validated with Zod before touching the DB, consistent with the rest of the app.

---

## Navigation

A new **Loans** destination (🏦 / Landmark icon) is added to:

- **Desktop:** the persistent left sidebar.
- **Mobile/tablet:** the **More** menu (alongside Passive Income, Bill Checklist, Settings).

```
Artha
├── 🏠  Dashboard
├── 📅  Monthly Log
├── 📆  Annual Hub
├── 🏦  Loans            ← shared multi-user loan tracker
├── 💰  Passive Income
├── 📈  Wealth Tracker
├── ✅  Bill Checklist
└── ⚙️   Settings
```

---

## Screen Designs

### Loans — List Page

- A card per loan the user is a member of: name, lender, type badge, sanctioned amount, and the user's role chip (OWNER / MEMBER).
- **Add Loan** button → dialog to create a new loan; the creator is automatically added as OWNER.
- Clicking a card opens the loan detail page.

### Loan Detail Page — 5 Tabs

#### Overview
- **Total Contributed** card with a **per-member split**.
- **Disbursed vs Sanctioned** progress (amount + percentage bar).
- **EMIs paid** summary.
- **This month: planned vs paid**.
- **Contributions-by-member donut** (Recharts pie).
- **EMI Planned-vs-Actual bar chart** (Recharts bar).

#### Payments
- Table of one-off contributions: date, type (booking/installment/TDS/agreement/fee/other), description, who paid, mode (e.g. "Axis Bank Cheque", "UPI"), amount.
- Add / edit / delete (any member).

#### EMIs
- A **pivot grid**: rows = months, columns = each member's **Planned** and **Paid** share, plus a **monthly total** column.
- Tracks planned + actual per member per month. Add / edit (any member).

#### Disbursements
- Table of lender → builder tranches: date, amount, notes.
- Add / edit / delete (any member).

#### Members
- List of members with their roles.
- Owners can **add a member by email** (must be an existing Artha account) and **remove** members. The **last owner cannot be removed**. Members see the list read-only.

> **Recharts v3 gotcha (carried over from Wealth Tracker):** a `<Pie>` renders empty unless `isAnimationActive={false}` is set, and `<ResponsiveContainer width="100%">` inside a fixed-width flex column can collapse to 0 width. The contributions donut therefore uses a **fixed-size `<PieChart width={N} height={N}>`** with `isAnimationActive={false}`, matching `AllocationChart.tsx`. The bar chart (`LineChart`/`BarChart` family) is unaffected.

---

## Seed Script

A one-time, **idempotent** script can be used to seed a loan with known historical data (members, payments, EMI entries, disbursements).

- **Requires all member accounts to exist** — the script looks users up by email to create the `LoanMember` rows.
- **Idempotent:** if the loan has already been seeded, the script **skips** rather than duplicating rows, so it is safe to re-run.

---

## Security Design

The Loan Tracker is the one place where the app's "scope everything by `userId`" rule does not apply, so its access model is worth stating explicitly.

- **Membership-based authorization:** every `/api/loans/**` route resolves the session user, then calls `assertMember` (read + member-write) or `assertOwner` (loan edit/delete + member management) before any DB work. There is no path that reads or mutates loan data without a membership check.
- **No existence leak:** non-members and insufficient-role callers receive **404**, never 403 — so loan ids cannot be probed.
- **Last-owner protection:** the member-remove route refuses to remove the final OWNER.
- **RESTRICT on user FKs:** shared-loan history is protected — a participant cannot be deleted while still attached to a loan.
- **Prisma parameterized queries + Zod validation** on every route, consistent with the rest of Artha.

---

## Testing

- **Pure aggregation logic** (`computeContributions`, `computeProgress` in `loan-summary.ts`) is covered by unit tests — deterministic functions over fixed input rows.
- **Access helpers** (`assertMember` / `assertOwner` → 404 for non-members and insufficient role) are tested.
- The overall suite is now **192 tests (187 passing; 5 pre-existing register-gate failures unrelated to loans)**.

---

## Verification Plan

After implementation, verify end-to-end:

1. **Create:** User A creates a loan → A is OWNER → loan appears on A's list page.
2. **Membership isolation:** User C (not a member) requests the loan id → **404**.
3. **Add member:** A adds User B by email → B is MEMBER → loan appears on B's list page.
4. **Member write:** B adds a payment and an EMI entry → both appear; A sees them too.
5. **Role gate:** B (MEMBER) attempts to edit loan metadata or add a member → **404**.
6. **Aggregation:** add payments + EMI paid amounts for A and B → Overview "Total Contributed" and the per-member donut match the ledger sums.
7. **Progress:** add disbursements → disbursed-vs-sanctioned bar reflects the totals.
8. **Last-owner protection:** attempt to remove the only OWNER → rejected.
9. **Cascade:** delete a loan → all payments, EMI entries, disbursements, and memberships are removed.
10. **Seed:** run the seed script twice → first seeds loan data, second is a no-op (idempotent).
11. **Charts:** confirm the contributions donut renders (fixed-size PieChart + `isAnimationActive={false}`) and the planned-vs-actual bars draw correctly.
