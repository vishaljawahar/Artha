# Bill Checklist Auto-Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a monthly log entry matching a Settings-configured rule (category + optional keyword) is created, the corresponding bill checklist item is auto-checked for that entry's month; deleting/editing away the last matching entry auto-unchecks it (manual ticks are never touched).

**Architecture:** A matching engine in `src/lib/bill-matching.ts` (pure match test + DB recompute) is invoked server-side after every transaction mutation and after bill-rule saves. `MonthlyBill` gains `matchCategoryId`/`matchKeyword`; `MonthlyBillPayment` gains `autoChecked` to distinguish engine-owned state from manual ticks. Engine failures never fail the parent request.

**Tech Stack:** Next.js 16 App Router API routes, Prisma v5 (PostgreSQL/Neon), Zod v4 (`.issues` not `.errors`), Jest (node env for integration via per-file docblock), shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-06-11-bill-checklist-autocheck-design.md` — read it first.

**Branch:** `feat/bill-autocheck` (already created; spec committed).

---

### Task 1: Schema migration — rule fields + autoChecked

**Files:**
- Modify: `prisma/schema.prisma` (models `MonthlyBill` ~line 239, `MonthlyBillPayment` ~line 256, `Category` ~line 140)

- [ ] **Step 1: Edit `MonthlyBill`** — add rule fields + relation. Replace the model body so it reads:

```prisma
model MonthlyBill {
  id              String   @id @default(uuid())
  userId          String
  name            String
  amount          Decimal? @db.Decimal(12, 2)
  dueDay          Int?
  isActive        Boolean  @default(true)
  sortOrder       Int      @default(0)
  matchCategoryId String?
  matchKeyword    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user          User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  matchCategory Category?            @relation(fields: [matchCategoryId], references: [id], onDelete: SetNull)
  payments      MonthlyBillPayment[]

  @@map("monthly_bills")
}
```

- [ ] **Step 2: Edit `MonthlyBillPayment`** — add `autoChecked Boolean @default(false)` directly under `paidAt DateTime?`.

- [ ] **Step 3: Edit `Category`** — add the inverse relation `monthlyBillRules MonthlyBill[]` next to the existing `budgetTargets BudgetTarget[]` line.

- [ ] **Step 4: Create the migration** (CLAUDE.md quirk: CLI may not load `.env.local`):

```bash
cd "/Users/vishal/Desktop/Tech Projects/Claude/Claude Code/Artha"
set -a; source .env.local; set +a
npx prisma migrate dev --name bill_autocheck_rules
```

Expected: migration created under `prisma/migrations/*_bill_autocheck_rules/` and applied; `prisma generate` runs automatically. Columns are nullable / defaulted → safe additive migration.

- [ ] **Step 5: Verify the client compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no NEW errors mentioning `matchCategoryId`, `matchKeyword`, or `autoChecked`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(bills): add auto-check rule fields and autoChecked flag to schema"
```

---

### Task 2: Pure match test — `transactionMatchesRule` (TDD)

**Files:**
- Create: `src/lib/bill-matching.ts` (partial — pure function only)
- Test: `tests/unit/billMatching.test.ts`

- [ ] **Step 1: Write the failing test** — create `tests/unit/billMatching.test.ts`:

```ts
/** @jest-environment node */

jest.mock("@/lib/db", () => ({ prisma: {} }))

import { transactionMatchesRule } from "@/lib/bill-matching"

const txn = (over: Partial<{ categoryId: string; description: string | null; subcategory: string | null }> = {}) => ({
  categoryId: "cat-utilities",
  description: "BESCOM bill June",
  subcategory: null,
  ...over,
})

describe("transactionMatchesRule", () => {
  it("returns false when the bill has no rule", () => {
    expect(transactionMatchesRule({ matchCategoryId: null, matchKeyword: null }, txn())).toBe(false)
  })

  it("returns false when the category differs", () => {
    expect(transactionMatchesRule({ matchCategoryId: "cat-rent", matchKeyword: null }, txn())).toBe(false)
  })

  it("matches on category alone when keyword is empty", () => {
    expect(transactionMatchesRule({ matchCategoryId: "cat-utilities", matchKeyword: null }, txn())).toBe(true)
    expect(transactionMatchesRule({ matchCategoryId: "cat-utilities", matchKeyword: "  " }, txn())).toBe(true)
  })

  it("matches keyword case-insensitively in description", () => {
    expect(transactionMatchesRule({ matchCategoryId: "cat-utilities", matchKeyword: "bescom" }, txn())).toBe(true)
    expect(transactionMatchesRule({ matchCategoryId: "cat-utilities", matchKeyword: "BESCOM" }, txn())).toBe(true)
  })

  it("matches keyword in subcategory", () => {
    expect(
      transactionMatchesRule(
        { matchCategoryId: "cat-utilities", matchKeyword: "water" },
        txn({ description: "", subcategory: "Water board" })
      )
    ).toBe(true)
  })

  it("returns false when keyword appears nowhere", () => {
    expect(transactionMatchesRule({ matchCategoryId: "cat-utilities", matchKeyword: "airtel" }, txn())).toBe(false)
  })

  it("handles null description and subcategory", () => {
    expect(
      transactionMatchesRule(
        { matchCategoryId: "cat-utilities", matchKeyword: "bescom" },
        txn({ description: null, subcategory: null })
      )
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest tests/unit/billMatching.test.ts 2>&1 | tail -5
```

Expected: FAIL — cannot find module `@/lib/bill-matching`.

- [ ] **Step 3: Create `src/lib/bill-matching.ts`** with the pure function:

```ts
import { prisma } from "@/lib/db"

export interface BillMatchRule {
  matchCategoryId: string | null
  matchKeyword: string | null
}

export interface TransactionSnapshot {
  categoryId: string
  description: string | null
  subcategory: string | null
  date: Date
}

export function transactionMatchesRule(
  rule: BillMatchRule,
  txn: { categoryId: string; description: string | null; subcategory: string | null }
): boolean {
  if (!rule.matchCategoryId || rule.matchCategoryId !== txn.categoryId) return false
  const keyword = rule.matchKeyword?.trim().toLowerCase()
  if (!keyword) return true
  return [txn.description ?? "", txn.subcategory ?? ""].some((field) =>
    field.toLowerCase().includes(keyword)
  )
}
```

(`prisma` import is used by Task 3; the `jest.mock("@/lib/db")` in the test keeps it inert.)

- [ ] **Step 4: Run to verify it passes**

```bash
npx jest tests/unit/billMatching.test.ts 2>&1 | tail -5
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bill-matching.ts tests/unit/billMatching.test.ts
git commit -m "feat(bills): add pure rule-match test for bill auto-check"
```

---

### Task 3: Recompute + sync engine (TDD)

**Files:**
- Modify: `src/lib/bill-matching.ts`
- Test: `tests/integration/bill_autocheck_engine.test.ts`

- [ ] **Step 1: Write the failing tests** — create `tests/integration/bill_autocheck_engine.test.ts` covering the spec's decision table:

```ts
/** @jest-environment node */
/**
 * Engine tests for recomputeBillPayment / syncBillsForTransactions
 * Decision table: docs/superpowers/specs/2026-06-11-bill-checklist-autocheck-design.md
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    transaction: { count: jest.fn() },
    monthlyBill: { findMany: jest.fn() },
    monthlyBillPayment: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/db"
import {
  recomputeBillPayment,
  syncBillsForTransactions,
  safeSyncBillsForTransactions,
} from "@/lib/bill-matching"

const mockPrisma = prisma as jest.Mocked<typeof prisma>

const RULE_BILL = { id: "bill-1", matchCategoryId: "cat-utilities", matchKeyword: "bescom" }
const PAYMENT_KEY = {
  userId_monthlyBillId_year_month: {
    userId: "user-1",
    monthlyBillId: "bill-1",
    year: 2026,
    month: 6,
  },
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("recomputeBillPayment", () => {
  it("does nothing when the bill has no rule", async () => {
    await recomputeBillPayment("user-1", { id: "bill-1", matchCategoryId: null, matchKeyword: null }, 2026, 6)
    expect(mockPrisma.transaction.count).not.toHaveBeenCalled()
  })

  it("checks the bill when entries match and it is unpaid", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(1)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.monthlyBillPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: PAYMENT_KEY,
        create: expect.objectContaining({ isPaid: true, autoChecked: true }),
        update: expect.objectContaining({ isPaid: true, autoChecked: true }),
      })
    )
  })

  it("scopes the match count by user, category, keyword, and month window", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.transaction.count).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        categoryId: "cat-utilities",
        date: { gte: new Date(2026, 5, 1), lt: new Date(2026, 6, 1) },
        OR: [
          { description: { contains: "bescom", mode: "insensitive" } },
          { subcategory: { contains: "bescom", mode: "insensitive" } },
        ],
      },
    })
  })

  it("leaves an already-paid bill alone when entries match", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(2)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue({
      id: "pay-1", isPaid: true, autoChecked: false,
    })
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.monthlyBillPayment.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.monthlyBillPayment.update).not.toHaveBeenCalled()
  })

  it("unchecks an auto-checked bill when no entries match", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue({
      id: "pay-1", isPaid: true, autoChecked: true,
    })
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.monthlyBillPayment.update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: { isPaid: false, paidAt: null, autoChecked: false },
    })
  })

  it("never unchecks a manual tick", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue({
      id: "pay-1", isPaid: true, autoChecked: false,
    })
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.monthlyBillPayment.update).not.toHaveBeenCalled()
  })

  it("leaves unpaid bills alone when no entries match", async () => {
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue({
      id: "pay-1", isPaid: false, autoChecked: false,
    })
    await recomputeBillPayment("user-1", RULE_BILL, 2026, 6)
    expect(mockPrisma.monthlyBillPayment.update).not.toHaveBeenCalled()
    expect(mockPrisma.monthlyBillPayment.upsert).not.toHaveBeenCalled()
  })
})

describe("syncBillsForTransactions", () => {
  const SNAPSHOT = {
    categoryId: "cat-utilities",
    description: "BESCOM bill June",
    subcategory: null,
    date: new Date(2026, 5, 11),
  }

  it("recomputes only bills whose rule matches the snapshot", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-1", matchCategoryId: "cat-utilities", matchKeyword: "bescom" },
      { id: "bill-2", matchCategoryId: "cat-utilities", matchKeyword: "airtel" },
      { id: "bill-3", matchCategoryId: "cat-rent", matchKeyword: null },
    ])
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(1)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)

    await syncBillsForTransactions("user-1", [SNAPSHOT])

    expect(mockPrisma.monthlyBill.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isActive: true, matchCategoryId: { not: null } },
    })
    expect(mockPrisma.monthlyBillPayment.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.monthlyBillPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: PAYMENT_KEY })
    )
  })

  it("recomputes a bill-month only once across snapshots", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockResolvedValue([
      { id: "bill-1", matchCategoryId: "cat-utilities", matchKeyword: null },
    ])
    ;(mockPrisma.transaction.count as jest.Mock).mockResolvedValue(2)
    ;(mockPrisma.monthlyBillPayment.findUnique as jest.Mock).mockResolvedValue(null)

    await syncBillsForTransactions("user-1", [SNAPSHOT, { ...SNAPSHOT, description: "Water board" }])

    expect(mockPrisma.transaction.count).toHaveBeenCalledTimes(1)
  })

  it("skips DB work when there are no snapshots", async () => {
    await syncBillsForTransactions("user-1", [])
    expect(mockPrisma.monthlyBill.findMany).not.toHaveBeenCalled()
  })
})

describe("safeSyncBillsForTransactions", () => {
  it("swallows engine errors", async () => {
    ;(mockPrisma.monthlyBill.findMany as jest.Mock).mockRejectedValue(new Error("boom"))
    await expect(
      safeSyncBillsForTransactions("user-1", [
        { categoryId: "c", description: null, subcategory: null, date: new Date(2026, 5, 11) },
      ])
    ).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest tests/integration/bill_autocheck_engine.test.ts 2>&1 | tail -5
```

Expected: FAIL — `recomputeBillPayment` is not exported.

- [ ] **Step 3: Append the engine to `src/lib/bill-matching.ts`**:

```ts
type RuleBill = BillMatchRule & { id: string }

export async function recomputeBillPayment(
  userId: string,
  bill: RuleBill,
  year: number,
  month: number
): Promise<void> {
  if (!bill.matchCategoryId) return

  const keyword = bill.matchKeyword?.trim()
  const matchCount = await prisma.transaction.count({
    where: {
      userId,
      categoryId: bill.matchCategoryId,
      date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
      ...(keyword
        ? {
            OR: [
              { description: { contains: keyword, mode: "insensitive" } },
              { subcategory: { contains: keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  })

  const paymentKey = {
    userId_monthlyBillId_year_month: { userId, monthlyBillId: bill.id, year, month },
  }
  const existing = await prisma.monthlyBillPayment.findUnique({ where: paymentKey })

  if (matchCount > 0) {
    if (existing?.isPaid) return
    await prisma.monthlyBillPayment.upsert({
      where: paymentKey,
      create: {
        userId,
        monthlyBillId: bill.id,
        year,
        month,
        isPaid: true,
        paidAt: new Date(),
        autoChecked: true,
      },
      update: { isPaid: true, paidAt: new Date(), autoChecked: true },
    })
  } else if (existing?.isPaid && existing.autoChecked) {
    await prisma.monthlyBillPayment.update({
      where: { id: existing.id },
      data: { isPaid: false, paidAt: null, autoChecked: false },
    })
  }
}

export async function syncBillsForTransactions(
  userId: string,
  snapshots: TransactionSnapshot[]
): Promise<void> {
  if (snapshots.length === 0) return

  const bills = await prisma.monthlyBill.findMany({
    where: { userId, isActive: true, matchCategoryId: { not: null } },
  })
  if (bills.length === 0) return

  const recomputed = new Set<string>()
  for (const txn of snapshots) {
    const year = txn.date.getFullYear()
    const month = txn.date.getMonth() + 1
    for (const bill of bills) {
      if (!transactionMatchesRule(bill, txn)) continue
      const key = `${bill.id}:${year}-${month}`
      if (recomputed.has(key)) continue
      recomputed.add(key)
      await recomputeBillPayment(userId, bill, year, month)
    }
  }
}

export async function safeSyncBillsForTransactions(
  userId: string,
  snapshots: TransactionSnapshot[]
): Promise<void> {
  try {
    await syncBillsForTransactions(userId, snapshots)
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Bill auto-check sync error:", error)
    }
  }
}

export async function safeRecomputeBillPayment(
  userId: string,
  bill: RuleBill,
  year: number,
  month: number
): Promise<void> {
  try {
    await recomputeBillPayment(userId, bill, year, month)
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Bill auto-check recompute error:", error)
    }
  }
}
```

Notes for the engineer:
- Month attribution uses **local** getters and **local** month boundaries (`gte` first-of-month, `lt` first-of-next-month) — consistent with the existing month-range logic in `src/app/api/transactions/route.ts:32-33`, and end-exclusive so last-day entries always count.
- `recomputeBillPayment` re-counts from the DB, so it is idempotent and safe to call after create, update, or delete.

- [ ] **Step 4: Run to verify pass**

```bash
npx jest tests/integration/bill_autocheck_engine.test.ts tests/unit/billMatching.test.ts 2>&1 | tail -5
```

Expected: PASS (both suites).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bill-matching.ts tests/integration/bill_autocheck_engine.test.ts
git commit -m "feat(bills): add recompute + sync engine for bill auto-check"
```

---

### Task 4: Wire transaction routes (TDD)

**Files:**
- Modify: `src/app/api/transactions/route.ts` (POST, after create at line ~101)
- Modify: `src/app/api/transactions/[id]/route.ts` (PUT after update ~line 62, DELETE after delete ~line 90)
- Modify: `src/app/api/transactions/bulk/route.ts` (after createMany ~line 80)
- Test: `tests/integration/bill_autocheck_routes.test.ts`

- [ ] **Step 1: Write the failing tests** — create `tests/integration/bill_autocheck_routes.test.ts`. Mock the engine module (the engine's own logic is already covered by Task 3; here we assert the routes call it with correct snapshots):

```ts
/** @jest-environment node */
/**
 * Verifies transaction routes trigger the bill auto-check engine.
 */

jest.mock("@/auth", () => ({ auth: jest.fn() }))

jest.mock("@/lib/db", () => ({
  prisma: {
    category: { findFirst: jest.fn() },
    monthlyHeader: { findUnique: jest.fn() },
    transaction: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock("@/lib/bill-matching", () => ({
  safeSyncBillsForTransactions: jest.fn().mockResolvedValue(undefined),
}))

import { POST } from "@/app/api/transactions/route"
import { PUT, DELETE } from "@/app/api/transactions/[id]/route"
import { POST as BULK_POST } from "@/app/api/transactions/bulk/route"
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { safeSyncBillsForTransactions } from "@/lib/bill-matching"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = auth as jest.MockedFunction<any>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockSync = safeSyncBillsForTransactions as jest.MockedFunction<typeof safeSyncBillsForTransactions>

const MOCK_SESSION = {
  user: { id: "user-1", name: "Test User", email: "test@test.com" },
  expires: "2099-01-01",
} as any

const DB_TXN = {
  id: "txn-1",
  userId: "user-1",
  monthlyHeaderId: null,
  date: new Date("2026-06-11"),
  categoryId: "cat-1",
  subcategory: null,
  description: "BESCOM bill",
  amount: 1450,
  isBulk: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue(MOCK_SESSION)
  ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({ id: "cat-1", userId: "user-1" })
  ;(mockPrisma.monthlyHeader.findUnique as jest.Mock).mockResolvedValue(null)
})

describe("POST /api/transactions", () => {
  it("syncs bills with the created transaction snapshot", async () => {
    ;(mockPrisma.transaction.create as jest.Mock).mockResolvedValue(DB_TXN)
    const req = new NextRequest("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-06-11", categoryId: "cat-1", description: "BESCOM bill",
        amount: 1450, year: 2026, month: 6,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockSync).toHaveBeenCalledWith("user-1", [
      { categoryId: "cat-1", description: "BESCOM bill", subcategory: null, date: DB_TXN.date },
    ])
  })
})

describe("PUT /api/transactions/[id]", () => {
  it("syncs bills with before and after snapshots", async () => {
    const before = { ...DB_TXN, categoryId: "cat-old", description: "Old desc" }
    const after = { ...DB_TXN, categoryId: "cat-1", description: "New desc" }
    ;(mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValue(before)
    ;(mockPrisma.transaction.update as jest.Mock).mockResolvedValue(after)
    const req = new NextRequest("http://localhost/api/transactions/txn-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-06-11", categoryId: "cat-1", description: "New desc", amount: 1450 }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "txn-1" }) })
    expect(res.status).toBe(200)
    expect(mockSync).toHaveBeenCalledWith("user-1", [
      { categoryId: "cat-old", description: "Old desc", subcategory: null, date: before.date },
      { categoryId: "cat-1", description: "New desc", subcategory: null, date: after.date },
    ])
  })
})

describe("DELETE /api/transactions/[id]", () => {
  it("syncs bills with the deleted snapshot", async () => {
    ;(mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValue(DB_TXN)
    ;(mockPrisma.transaction.delete as jest.Mock).mockResolvedValue(DB_TXN)
    const req = new NextRequest("http://localhost/api/transactions/txn-1", { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "txn-1" }) })
    expect(res.status).toBe(200)
    expect(mockSync).toHaveBeenCalledWith("user-1", [
      { categoryId: "cat-1", description: "BESCOM bill", subcategory: null, date: DB_TXN.date },
    ])
  })
})

describe("POST /api/transactions/bulk", () => {
  it("syncs bills with one snapshot per created line", async () => {
    ;(mockPrisma.transaction.createMany as jest.Mock).mockResolvedValue({ count: 2 })
    const req = new NextRequest("http://localhost/api/transactions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: "1450 BESCOM bill\n300 Water board", categoryId: "cat-1", year: 2026, month: 6 }),
    })
    const res = await BULK_POST(req)
    expect(res.status).toBe(201)
    expect(mockSync).toHaveBeenCalledTimes(1)
    const [userId, snapshots] = mockSync.mock.calls[0]
    expect(userId).toBe("user-1")
    expect(snapshots).toHaveLength(2)
    expect(snapshots[0]).toMatchObject({ categoryId: "cat-1", description: "BESCOM bill", subcategory: null })
    expect(snapshots[1]).toMatchObject({ categoryId: "cat-1", description: "Water board", subcategory: null })
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest tests/integration/bill_autocheck_routes.test.ts 2>&1 | tail -10
```

Expected: FAIL — `mockSync` not called (routes don't import the engine yet).

- [ ] **Step 3: Wire `POST /api/transactions`** — in `src/app/api/transactions/route.ts`, add to imports:

```ts
import { safeSyncBillsForTransactions } from "@/lib/bill-matching"
```

then between `const transaction = await prisma.transaction.create({...})` and the final `return`:

```ts
  await safeSyncBillsForTransactions(userId, [
    {
      categoryId: transaction.categoryId,
      description: transaction.description,
      subcategory: transaction.subcategory,
      date: transaction.date,
    },
  ])
```

- [ ] **Step 4: Wire `PUT` and `DELETE` in `src/app/api/transactions/[id]/route.ts`** — same import. In PUT, between `const transaction = await prisma.transaction.update({...})` and `return`:

```ts
  await safeSyncBillsForTransactions(userId, [
    {
      categoryId: existing.categoryId,
      description: existing.description,
      subcategory: existing.subcategory,
      date: existing.date,
    },
    {
      categoryId: transaction.categoryId,
      description: transaction.description,
      subcategory: transaction.subcategory,
      date: transaction.date,
    },
  ])
```

In DELETE, between `await prisma.transaction.delete(...)` and `return`:

```ts
  await safeSyncBillsForTransactions(userId, [
    {
      categoryId: existing.categoryId,
      description: existing.description,
      subcategory: existing.subcategory,
      date: existing.date,
    },
  ])
```

- [ ] **Step 5: Wire `POST /api/transactions/bulk`** — same import. Between `const transactions = await prisma.transaction.createMany({...})` and `return`:

```ts
  await safeSyncBillsForTransactions(
    userId,
    parsedLines.map((item) => ({
      categoryId,
      description: item.description,
      subcategory: null,
      date: today,
    }))
  )
```

- [ ] **Step 6: Run new tests + the pre-existing transaction suite** (must stay green — its prisma mock lacks the bill models, but the routes only reach them through the mocked/safe engine):

```bash
npx jest tests/integration/bill_autocheck_routes.test.ts tests/integration/transactions.test.ts 2>&1 | tail -5
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/transactions tests/integration/bill_autocheck_routes.test.ts
git commit -m "feat(bills): trigger bill auto-check from transaction create/update/delete/bulk"
```

---

### Task 5: Manual toggle takes ownership + checklist GET exposes autoChecked (TDD)

**Files:**
- Modify: `src/app/api/bill-checklist/[id]/route.ts` (upsert ~lines 46-57)
- Modify: `src/app/api/bill-checklist/route.ts` (items mapping ~lines 47-58)
- Test: `tests/integration/bill_checklist.test.ts` (extend)

- [ ] **Step 1: Extend tests** — in `tests/integration/bill_checklist.test.ts`, add inside `describe("PUT /api/bill-checklist/[id]")`:

```ts
  it("marks manual toggles as not auto-checked", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findFirst as jest.Mock).mockResolvedValue(MOCK_BILL)
    ;(mockPrisma.monthlyBillPayment.upsert as jest.Mock).mockResolvedValue({})
    const req = new NextRequest("http://localhost/api/bill-checklist/bill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: 2026, month: 5, isPaid: true }),
    })
    await PUT(req, { params: Promise.resolve({ id: "bill-1" }) })
    expect(mockPrisma.monthlyBillPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ autoChecked: false }),
        update: expect.objectContaining({ autoChecked: false }),
      })
    )
  })
```

and inside `describe("GET /api/bill-checklist")` extend the existing "returns active bills..." test's payment mock and assertion:

```ts
    // payment mock gains: autoChecked: true
    // add assertion:
    expect(body.items[0].autoChecked).toBe(true)
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest tests/integration/bill_checklist.test.ts 2>&1 | tail -5
```

Expected: FAIL on the two new assertions.

- [ ] **Step 3: Implement** — in `src/app/api/bill-checklist/[id]/route.ts` add `autoChecked: false` to both the `create` and `update` blocks of the upsert. In `src/app/api/bill-checklist/route.ts` add to the items mapping:

```ts
          autoChecked: payment?.autoChecked ?? false,
```

- [ ] **Step 4: Run to verify pass**

```bash
npx jest tests/integration/bill_checklist.test.ts 2>&1 | tail -5
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/bill-checklist tests/integration/bill_checklist.test.ts
git commit -m "feat(bills): manual checklist toggles take ownership; expose autoChecked"
```

---

### Task 6: Settings routes — rule fields, ownership check, current-month recompute (TDD)

**Files:**
- Modify: `src/app/api/settings/monthly-bills/route.ts` (POST)
- Modify: `src/app/api/settings/monthly-bills/[id]/route.ts` (PUT)
- Test: `tests/integration/settings_monthly_bills.test.ts` (extend)

- [ ] **Step 1: Extend tests** — in `tests/integration/settings_monthly_bills.test.ts`: add `category: { findFirst: jest.fn() }` to the prisma mock and mock the engine:

```ts
jest.mock("@/lib/bill-matching", () => ({
  safeRecomputeBillPayment: jest.fn().mockResolvedValue(undefined),
}))
```

Add tests (adapt MOCK constants to the file's existing ones):

```ts
import { safeRecomputeBillPayment } from "@/lib/bill-matching"
const mockRecompute = safeRecomputeBillPayment as jest.MockedFunction<typeof safeRecomputeBillPayment>

describe("auto-check rules", () => {
  it("rejects a rule whose category is not owned by the user", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/settings/monthly-bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Electricity", matchCategoryId: "cat-x", matchKeyword: "bescom" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it("creates a bill with a rule and recomputes the current month", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({ id: "cat-1", userId: "user-1" })
    ;(mockPrisma.monthlyBill.count as jest.Mock).mockResolvedValue(0)
    ;(mockPrisma.monthlyBill.create as jest.Mock).mockResolvedValue({
      id: "bill-1", userId: "user-1", name: "Electricity", amount: null, dueDay: null,
      isActive: true, sortOrder: 0, matchCategoryId: "cat-1", matchKeyword: "bescom",
      createdAt: new Date(), updatedAt: new Date(),
    })
    const req = new NextRequest("http://localhost/api/settings/monthly-bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Electricity", matchCategoryId: "cat-1", matchKeyword: "bescom" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockPrisma.monthlyBill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ matchCategoryId: "cat-1", matchKeyword: "bescom" }),
      })
    )
    const now = new Date()
    expect(mockRecompute).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ id: "bill-1", matchCategoryId: "cat-1" }),
      now.getFullYear(),
      now.getMonth() + 1
    )
  })

  it("recomputes when the rule changes on update", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findFirst as jest.Mock).mockResolvedValue({
      ...MOCK_BILL, matchCategoryId: null, matchKeyword: null,
    })
    ;(mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({ id: "cat-1", userId: "user-1" })
    ;(mockPrisma.monthlyBill.update as jest.Mock).mockResolvedValue({
      ...MOCK_BILL, matchCategoryId: "cat-1", matchKeyword: null,
    })
    const req = new NextRequest("http://localhost/api/settings/monthly-bills/bill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchCategoryId: "cat-1", matchKeyword: "" }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "bill-1" }) })
    expect(res.status).toBe(200)
    expect(mockRecompute).toHaveBeenCalledTimes(1)
  })

  it("does not recompute when the rule is unchanged", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION)
    ;(mockPrisma.monthlyBill.findFirst as jest.Mock).mockResolvedValue(MOCK_BILL)
    ;(mockPrisma.monthlyBill.update as jest.Mock).mockResolvedValue(MOCK_BILL)
    const req = new NextRequest("http://localhost/api/settings/monthly-bills/bill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: "bill-1" }) })
    expect(res.status).toBe(200)
    expect(mockRecompute).not.toHaveBeenCalled()
  })
})
```

If the file's existing `MOCK_BILL` lacks `matchCategoryId`/`matchKeyword`, add them as `null`.

- [ ] **Step 2: Run to verify failure**

```bash
npx jest tests/integration/settings_monthly_bills.test.ts 2>&1 | tail -10
```

Expected: new tests FAIL (schema rejects unknown keys is not the issue — fields are simply ignored and recompute never called).

- [ ] **Step 3: Implement POST** — in `src/app/api/settings/monthly-bills/route.ts`:

Add imports:

```ts
import { safeRecomputeBillPayment } from "@/lib/bill-matching"
```

Extend `createMonthlyBillSchema`:

```ts
  matchCategoryId: z.string().min(1).optional().nullable(),
  matchKeyword: z.string().trim().max(100, "Keyword must be 100 characters or fewer").optional().nullable(),
```

In POST, after parsing and before `prisma.monthlyBill.count`:

```ts
    const matchCategoryId = parsed.data.matchCategoryId ?? null
    const matchKeyword = matchCategoryId ? (parsed.data.matchKeyword?.trim() || null) : null

    if (matchCategoryId) {
      const category = await prisma.category.findFirst({
        where: { id: matchCategoryId, userId },
      })
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
    }
```

Add `matchCategoryId` and `matchKeyword` to the `create` data. After `create` and before `return`:

```ts
    if (bill.matchCategoryId) {
      const now = new Date()
      await safeRecomputeBillPayment(userId, bill, now.getFullYear(), now.getMonth() + 1)
    }
```

- [ ] **Step 4: Implement PUT** — in `src/app/api/settings/monthly-bills/[id]/route.ts`:

Same import. Extend `updateMonthlyBillSchema` with the same two fields. Replace the update block with:

```ts
    const { matchCategoryId: rawCategoryId, matchKeyword: rawKeyword, ...rest } = parsed.data

    let ruleUpdate: { matchCategoryId: string | null; matchKeyword: string | null } | undefined
    if (rawCategoryId !== undefined || rawKeyword !== undefined) {
      const matchCategoryId = rawCategoryId ?? null
      const matchKeyword = matchCategoryId ? ((rawKeyword ?? "").trim() || null) : null
      if (matchCategoryId) {
        const category = await prisma.category.findFirst({
          where: { id: matchCategoryId, userId },
        })
        if (!category) {
          return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }
      }
      ruleUpdate = { matchCategoryId, matchKeyword }
    }

    const bill = await prisma.monthlyBill.update({
      where: { id },
      data: { ...rest, ...(ruleUpdate ?? {}) },
    })

    const ruleChanged =
      ruleUpdate !== undefined &&
      (ruleUpdate.matchCategoryId !== existing.matchCategoryId ||
        ruleUpdate.matchKeyword !== existing.matchKeyword)
    if (ruleChanged && bill.matchCategoryId) {
      const now = new Date()
      await safeRecomputeBillPayment(userId, bill, now.getFullYear(), now.getMonth() + 1)
    }
```

- [ ] **Step 5: Run to verify pass**

```bash
npx jest tests/integration/settings_monthly_bills.test.ts 2>&1 | tail -5
```

Expected: PASS (old + new tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/settings/monthly-bills tests/integration/settings_monthly_bills.test.ts
git commit -m "feat(bills): accept auto-check rules on bill create/update with current-month recompute"
```

---

### Task 7: Settings UI — rule editor + summary

**Files:**
- Modify: `src/components/settings/MonthlyBillsTab.tsx`

No new automated test (UI verified via build + manual run; the API contract is already tested).

- [ ] **Step 1: Extend the `MonthlyBill` interface and form state**:

```ts
interface MonthlyBill {
  id: string
  name: string
  amount: number | null
  dueDay: number | null
  isActive: boolean
  matchCategoryId: string | null
  matchKeyword: string | null
}

interface CategoryOption {
  id: string
  name: string
  icon: string | null
}

const EMPTY_FORM = {
  name: "",
  amount: "",
  dueDay: "",
  isActive: true,
  matchCategoryId: "",
  matchKeyword: "",
}
```

- [ ] **Step 2: Fetch categories once** — add state + fetch alongside `fetchBills`:

```ts
  const [categories, setCategories] = useState<CategoryOption[]>([])

  useEffect(() => {
    fetch("/api/settings/categories")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]))
  }, [])
```

- [ ] **Step 3: Populate the form in `openEdit`**:

```ts
      matchCategoryId: bill.matchCategoryId ?? "",
      matchKeyword: bill.matchKeyword ?? "",
```

- [ ] **Step 4: Send rule fields in `handleSave`** — add to the JSON body:

```ts
          matchCategoryId: form.matchCategoryId || null,
          matchKeyword: form.matchCategoryId ? form.matchKeyword.trim() || null : null,
```

- [ ] **Step 5: Add the rule editor to the dialog** — after the Amount/DueDay grid, before the Active switch:

```tsx
            <div className="space-y-1.5">
              <Label htmlFor="bill-match-category" className="text-xs text-muted-foreground">
                Auto-check rule <span className="opacity-60">(optional)</span>
              </Label>
              <select
                id="bill-match-category"
                value={form.matchCategoryId}
                onChange={(e) => setForm((f) => ({ ...f, matchCategoryId: e.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="">No auto-check</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Monthly log entries in this category tick this bill automatically.
              </p>
            </div>
            {form.matchCategoryId && (
              <div className="space-y-1.5">
                <Label htmlFor="bill-match-keyword" className="text-xs text-muted-foreground">
                  Keyword filter <span className="opacity-60">(optional)</span>
                </Label>
                <Input
                  id="bill-match-keyword"
                  value={form.matchKeyword}
                  maxLength={100}
                  onChange={(e) => setForm((f) => ({ ...f, matchKeyword: e.target.value }))}
                  placeholder="e.g. bescom — leave blank to match any entry"
                  className="border-border"
                />
              </div>
            )}
```

(Native `<select>` uses CSS-variable classes per the dark-mode convention — never `bg-white`/`border-gray-200`.)

- [ ] **Step 6: Show the rule summary in the bill list** — under the existing due-day/amount line:

```tsx
              {bill.matchCategoryId && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
                  Auto: {categories.find((c) => c.id === bill.matchCategoryId)?.name ?? "category"}
                  {bill.matchKeyword ? ` · "${bill.matchKeyword}"` : ""}
                </p>
              )}
```

- [ ] **Step 7: Build check**

```bash
npm run build 2>&1 | tail -15
```

Expected: build succeeds (typecheck + lint clean).

- [ ] **Step 8: Commit**

```bash
git add src/components/settings/MonthlyBillsTab.tsx
git commit -m "feat(bills): auto-check rule editor and summary in Settings"
```

---

### Task 8: Checklist UI — auto badge

**Files:**
- Modify: `src/app/(app)/bill-checklist/page.tsx`

- [ ] **Step 1: Extend `ChecklistItem`** — add `autoChecked: boolean`.

- [ ] **Step 2: Update `handleToggle` success-mapping** to also carry the flag:

```ts
            ? { ...entry, isPaid: data.payment.isPaid, paidAt: data.payment.paidAt, autoChecked: data.payment.autoChecked }
```

- [ ] **Step 3: Render the badge** — next to the bill name `<p>` (inside the same flex row, immediately after the name):

```tsx
                  <p className={`text-sm font-medium truncate ${item.isPaid ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {item.name}
                    {item.isPaid && item.autoChecked && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 no-underline dark:bg-emerald-950 dark:text-emerald-400 align-middle">
                        auto
                      </span>
                    )}
                  </p>
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | tail -15
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/bill-checklist/page.tsx"
git commit -m "feat(bills): show auto badge on auto-checked checklist items"
```

---

### Task 9: Full verification + docs + memory

**Files:**
- Modify: `CLAUDE.md` (Artha project file — Feature Status, Security, data-model notes)
- Modify: `tests/report.md` (if counts are listed)
- Memory: `/Users/vishal/.claude/projects/-Users-vishal-Desktop-Tech-Projects-Claude-Claude-Code-Artha/memory/`

- [ ] **Step 1: Run the full suite**

```bash
npm test 2>&1 | tail -15
```

Expected: all suites pass EXCEPT the 5 pre-existing `register.test.ts` failures (REGISTRATION_OPEN gate — documented in CLAUDE.md). No other failures.

- [ ] **Step 2: Production build**

```bash
npm run build 2>&1 | tail -10
```

Expected: success.

- [ ] **Step 3: Update Artha `CLAUDE.md`**:
  - **Database layer:** note `MonthlyBill.matchCategoryId`/`matchKeyword` (auto-check rule, SetNull on category delete) and `MonthlyBillPayment.autoChecked`.
  - **Feature Status → Bill Checklist:** describe the auto-check link (Settings rule → transaction mutations recompute via `src/lib/bill-matching.ts`; manual ticks protected; auto badge).
  - **Security section:** add bullet — bill auto-check rules must verify `matchCategoryId` ownership; engine failures must never fail the parent transaction request (`safeSync*` wrappers).

- [ ] **Step 4: Save a memory** — new file `project_bill_autocheck.md` describing the non-obvious semantics (state-based recompute, manual-tick protection via `autoChecked`, ledger-wins on manual untick) + index line in `MEMORY.md`.

- [ ] **Step 5: Commit docs**

```bash
git add CLAUDE.md tests/report.md
git commit -m "docs: document bill checklist auto-check feature"
```

---

### Task 10: Push branch + PR to main

- [ ] **Step 1: Push**

```bash
git push -u origin feat/bill-autocheck
```

- [ ] **Step 2: Create the PR** (explicitly requested by Vishal this time):

```bash
gh pr create --base main --title "feat: auto-check bill checklist items from monthly log entries" --body "$(cat <<'EOF'
## Summary
- Settings-configured auto-check rules (category + optional keyword) per monthly bill
- Monthly log entry create/edit/delete/bulk now auto-checks/unchecks the matching bill for that entry's month
- Manual ticks are never overridden; auto-checked items show an "auto" badge
- Spec: docs/superpowers/specs/2026-06-11-bill-checklist-autocheck-design.md

## Test plan
- [ ] npm test (new: billMatching unit, engine + route integration suites)
- [ ] npm run build
- [ ] Manual: configure rule in Settings, add matching entry in Monthly Log, verify checklist auto-ticks; delete entry, verify untick

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Report the PR URL to Vishal** (he merges manually; merge to main auto-deploys via Vercel).
