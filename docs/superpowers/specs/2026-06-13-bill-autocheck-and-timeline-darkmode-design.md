# Design: Monthly-Log → Bill-Checklist auto-check + Timeline dark-mode fix

**Date:** 2026-06-13
**Branch:** `feat/bill-autocheck-darkmode`

## Context / important correction

CLAUDE.md previously described a "Bill auto-check engine (`src/lib/bill-matching.ts`)" with an
`autoChecked` flag, `MonthlyBill.matchCategoryId`/`matchKeyword` columns, a Settings rule editor,
and a suite of tests. **None of that existed in the codebase** — no such file, schema fields, spec,
or tests. Those CLAUDE.md sections (and the `project_bill_autocheck` memory note) were aspirational
and are corrected as part of this change. This feature is genuinely net-new and is intentionally
**simpler** than that fiction: a fixed, hardcoded mapping with check-only semantics, no schema change.

## Part A — Bill auto-check (check-only)

### Mapping (hardcoded, validated against real data 2026-06-13)

| Monthly-Log category | Subcategory constraint | Bill-checklist item |
|----------------------|------------------------|---------------------|
| Electricity          | any                    | Electricity         |
| Newspaper            | any                    | Newspaper           |
| Internet             | any                    | Internet            |
| Milk                 | any                    | Milk                |
| Vehicles             | **must be `Car wash`** | Car wash            |

All five bill names + categories exist verbatim for the primary user; the `Car wash` subcategory is
present with that exact casing. The second user has the categories but none of the bills → the
per-user bill lookup makes auto-check a graceful no-op for them.

### Engine — `src/lib/bill-matching.ts` (new)

- `BILL_AUTOCHECK_RULES` — the table above as data.
- `findMatchingRule(categoryName, subcategory)` — pure. Case-insensitive + trimmed compare on
  category name; if a rule declares a subcategory, the transaction's subcategory must also match
  (case-insensitive). Returns the rule or `null`. **Unit-tested.**
- `syncBillsForTransactions(userId, txns[])` where `txns` = `{ categoryId, subcategory, date }[]`:
  1. Map each txn → rule via its category **name** (load the user's categories once, id→name).
  2. For each match, compute `{ billName, year, month }`. **Month/year via UTC getters** because
     `Transaction.date` is `@db.Date` (stored at UTC midnight); local getters could shift the month.
  3. Dedupe `(billName, year, month)`.
  4. Load the user's active bills once; resolve each `billName` case-insensitively to a bill id.
     No bill → skip (no-op, no error).
  5. For each resolved `(billId, year, month)`: if a payment row already exists with `isPaid=true`,
     skip (don't churn `paidAt`); otherwise upsert `isPaid=true, paidAt=now`.
- `safeSyncBillsForTransactions(userId, txns[])` — wraps the above in try/catch; logs only when
  `NODE_ENV==="development"`; **never throws**. Routes call this so a sync failure can never fail the
  parent transaction write.

### Semantics (the "check-only" decision)

- Tick on **create**, **edit** (if the post-edit txn matches), and **bulk create**.
- **Never** un-tick. Delete route is **not** hooked.
- Idempotent and non-destructive: never touches non-matching bills, never overwrites an existing
  tick, never un-ticks a manual tick.
- All lookups are `userId`-scoped (preserves single-user isolation; this is not a shared resource).

### Hook points

- `POST /api/transactions` — after create, `safeSyncBillsForTransactions(userId, [created])`.
- `PUT /api/transactions/[id]` — after update, sync the updated row.
- `POST /api/transactions/bulk` — after createMany, sync all created rows.
- The Bill Checklist page reads fresh on mount, so no front-end change is needed to reflect ticks.
  No "auto" badge (no flag to drive one; out of scope by the check-only choice).

## Part B — Dark-mode fix + full verification

Dark mode was already implemented app-wide; a grep for hardcoded light-only classes
(`bg-white`, `bg-gray-*`, `border-gray-*`, `text-gray-*`, `divide-gray-*` without a `dark:` variant)
found offenders in **exactly three files, all in `monthly-log`**:

- `TransactionTimeline.tsx` — the reported bug (white card in dark mode).
- `HeaderForm.tsx`
- `BulkEntryDialog.tsx`

Fix: replace with the canonical CSS-variable + `dark:` pattern already used by the
already-correct sibling `TransactionGrouped.tsx`:
`bg-card` / `border-border` / `bg-muted` / `hover:bg-accent`, `text-foreground` /
`text-muted-foreground`, and the emerald subcategory chip
`... dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-400`, button hovers
`hover:bg-emerald-50 dark:hover:bg-emerald-950` / `hover:bg-red-50 dark:hover:bg-red-950`. The
inline category-color chip keeps its vivid brand colors but its **fallback** (unknown category)
moves to CSS vars so it is theme-aware.

`layout.tsx`'s `themeColor: "#ffffff"` is PWA metadata, intentional — left as-is.

Then runtime-verify every screen in dark mode (dashboard, monthly-log, annual-hub, passive-income,
wealth-tracker, loans + loan detail, bill-checklist, settings, login/register).

## Part C — Testing & wrap-up

- Unit tests for `findMatchingRule` (each rule; Vehicles+Car wash matches; Vehicles+GT / Vehicles+null
  do **not**; case-insensitivity; unknown category → null).
- Integration test for `syncBillsForTransactions` with mocked Prisma: ticks on match; no-op when bill
  missing; never un-ticks; skips already-paid; correct UTC month attribution; dedupes bulk.
- `npm run build` (authoritative typecheck + lint) and `npm test` (the 5 pre-existing
  `register.test.ts` failures remain; nothing else may regress).
- Update CLAUDE.md (correct the fictional auto-check section to describe what now actually exists) and
  the stale `project_bill_autocheck` memory note.
- Feature branch → PR, **do not merge**.
