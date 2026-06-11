# Bill Checklist Auto-Check from Monthly Log — Design

**Date:** 2026-06-11
**Status:** Approved
**Module:** Bill Checklist + Monthly Log (single-user modules — per-user isolation rules apply)

## Problem

The Bill Checklist and the Monthly Log are disconnected. When Vishal logs a bill
payment as a monthly log entry (e.g. "BESCOM 1450" under *Utilities*), he must
also open the Bill Checklist and manually tick "Electricity" for that month.
The two records describe the same real-world event and should stay in sync
automatically.

## Decision summary (approved 2026-06-11)

1. **Link method: Settings-configured rules.** Each monthly bill can optionally
   carry a matching rule (category + optional keyword). Monthly log entries that
   match the rule auto-check the bill for the entry's month. (Alternatives
   considered: explicit bill picker in the Add Transaction dialog — rejected as
   extra friction per entry; name/description fuzzy matching — rejected as
   brittle.)
2. **Auto-uncheck: yes.** If the last matching entry for a month is deleted (or
   edited so it no longer matches), the bill flips back to unpaid — but only
   when the checked state was set automatically. Manual ticks are never touched.

## Data model

### `MonthlyBill` — add optional matching rule

```prisma
model MonthlyBill {
  // ... existing fields ...
  matchCategoryId String?
  matchKeyword    String?

  matchCategory Category? @relation(fields: [matchCategoryId], references: [id], onDelete: SetNull)
}
```

- `matchCategoryId = null` → no rule; the bill remains manual-only (today's behavior).
- `matchKeyword` is an optional refinement. Empty/null = *any* entry in the
  category matches. Non-empty = the keyword must appear (case-insensitive
  substring) in the entry's **description or subcategory**.
- `onDelete: SetNull` — deleting a category silently clears the rule; payments
  are untouched.
- `Category` gains the inverse relation `monthlyBillRules MonthlyBill[]`.

### `MonthlyBillPayment` — track how the state was set

```prisma
model MonthlyBillPayment {
  // ... existing fields ...
  autoChecked Boolean @default(false)
}
```

- `autoChecked = true` → the current `isPaid` state was produced by the
  matching engine and may be reverted by it.
- `autoChecked = false` → manual state; the engine's *recompute* never flips it.

One Prisma migration covers both changes.

## Matching engine — `src/lib/bill-matching.ts`

Server-side only; runs inside the same request as the transaction mutation.
No cron, no client logic.

### Pure match test (unit-testable)

An entry matches a bill iff:

- `bill.matchCategoryId === transaction.categoryId`, AND
- `bill.matchKeyword` is empty, OR it is contained case-insensitively in
  `transaction.description` or `transaction.subcategory`.

### Recompute — `recomputeBillPayment(userId, bill, year, month)`

Counts matching transactions for that user/bill/month (month derived from the
**transaction's `date`**, not request body params), then:

| Matching entries | Current payment state            | Action                                        |
| ---------------- | -------------------------------- | --------------------------------------------- |
| ≥ 1              | unpaid or missing                | upsert `isPaid=true, paidAt=now, autoChecked=true` |
| ≥ 1              | paid (manual or auto)            | leave as-is                                   |
| 0                | paid with `autoChecked=true`     | set `isPaid=false, paidAt=null, autoChecked=false` |
| 0                | paid with `autoChecked=false`    | leave as-is (manual tick wins)                |
| 0                | unpaid or missing                | leave as-is                                   |

### Trigger points

| Route                                   | After the mutation, recompute…                                              |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `POST /api/transactions`                | bills matching the new entry, for the entry's month                          |
| `POST /api/transactions/bulk`           | bills matching any created line (single category, date = today)              |
| `PUT /api/transactions/[id]`            | bills matching the *before* and *after* states, for both months if date moved |
| `DELETE /api/transactions/[id]`         | bills matching the deleted entry, for its month                              |
| `POST /api/settings/monthly-bills`      | when created with a rule: that bill, for the **current month** (server date)  |
| `PUT /api/settings/monthly-bills/[id]`  | when the rule changes: that bill, for the **current month** (so existing entries take effect immediately) |
| `PUT /api/bill-checklist/[id]` (manual) | no recompute; sets `autoChecked=false` — manual action takes ownership       |

Manual-vs-auto interplay (state-based, idempotent):

- A manual **tick** (`isPaid=true, autoChecked=false`) is never overridden —
  recompute leaves paid bills alone and auto-uncheck only touches
  `autoChecked=true` rows.
- A manual **untick** holds only while no trigger fires. If matching entries
  still exist for that month, the next trigger (new entry, entry edit, rule
  save) re-checks the bill — the checklist mirrors the ledger. To keep a bill
  unpaid while an entry matches, remove or edit the entry (or clear the rule).

Failure isolation: matching runs after the primary mutation succeeds; a
matching-engine error must not fail the transaction request (log in dev, return
success for the entry itself).

## UI

- **Settings → Monthly Bills tab:** optional "Auto-check rule" per bill —
  category dropdown (user's categories) + keyword text input, in both the add
  and edit forms. The bill list shows a compact rule summary (e.g.
  "Auto: Utilities · 'bescom'").
- **Bill Checklist page:** auto-checked items show a small emerald "auto" badge
  next to the paid state so manual and automatic ticks are distinguishable.
- **Monthly Log:** no UI change.

## Validation & security

- `matchKeyword` max 100 chars, trimmed; stored as entered, compared
  case-insensitively at match time.
- `matchCategoryId` must belong to the session user (verified on save).
- All engine queries scoped by `userId` — this is a single-user module; the
  Loan Tracker membership pattern does NOT apply.
- Existing year/month validation rules on bill-checklist routes stay intact.

## Testing

- **Unit (jsdom or node):** pure match test — category match, keyword in
  description, keyword in subcategory, case-insensitivity, empty keyword,
  non-matching category.
- **Integration (node, mocked `@/auth` + `@/lib/db` per existing pattern):**
  - create entry → bill checked (`autoChecked=true`)
  - create second matching entry, delete one → stays checked; delete last →
    unchecked
  - edit entry out of the rule (category/description/date-month) → unchecked
  - manual tick then delete matching entry → stays checked (manual tick wins)
  - manual untick then new matching entry → re-checked (ledger wins)
  - bulk entry → bill checked
  - rule saved in Settings → current month recomputed

## Edge cases

- One entry matching two bills → both check.
- Several entries matching one bill → checked until the last one is removed.
- Category deleted → rule cleared via `SetNull`; payment state untouched.
- Entry dated in a different month than the viewed log month → the bill is
  checked for the **entry's date month**.

## Out of scope (YAGNI)

- Amount-based matching or amount proximity checks.
- Retroactive recompute of past months when a rule is created (current month only).
- Auto-creating monthly log entries from checklist ticks (reverse direction).
