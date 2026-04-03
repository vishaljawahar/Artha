# Artha — Test Report
**Date:** 2026-04-03
**Runner:** Jest 30
**Final result: 68 tests, 68 passed, 0 failed**

---

## Summary

| Suite | File | Tests | Passed | Failed |
|---|---|---|---|---|
| Unit | `formatINR.test.ts` | 6 | 6 | 0 |
| Unit | `computeCurrentPortfolio.test.ts` | 5 | 5 | 0 |
| Unit | `validations.test.ts` | 10 | 10 | 0 |
| Unit | `monthCalculations.test.ts` | 6 | 6 | 0 |
| Integration | `register.test.ts` | 5 | 5 | 0 |
| Integration | `transactions.test.ts` | 10 | 10 | 0 |
| Integration | `annualEntries.test.ts` | 8 | 8 | 0 |
| Integration | `passiveIncome.test.ts` | 9 | 9 | 0 |
| Integration | `assets.test.ts` | 9 | 9 | 0 |
| **TOTAL** | **9 suites** | **68** | **68** | **0** |

---

## Unit Tests

### `formatINR` — 6 tests
- ✅ formats zero → ₹0
- ✅ formats 1000 with Indian grouping → ₹1,000
- ✅ formats 100000 as 1 lakh → ₹1,00,000
- ✅ formats 10000000 as 1 crore → ₹1,00,00,000
- ✅ formats negative numbers
- ✅ returns a string

### `computeCurrentPortfolio` — 5 tests
- ✅ returns empty array for empty input
- ✅ returns single asset when only one exists
- ✅ returns the record with later recordedDate when same assetName has two records
- ✅ also selects later record when older is listed first in input
- ✅ handles multiple different assetNames independently

### `validations` — 10 tests
- ✅ loginSchema: passes with valid email and password
- ✅ loginSchema: fails with invalid email
- ✅ loginSchema: fails with empty password
- ✅ loginSchema: fails with missing email
- ✅ registerSchema: passes with valid name, email, and strong password
- ✅ registerSchema: fails when name is too short (1 char)
- ✅ registerSchema: fails when password has no uppercase letter
- ✅ registerSchema: fails when password has no number
- ✅ registerSchema: fails when password is too short (< 8 chars)
- ✅ registerSchema: fails with invalid email

### `monthCalculations` — 6 tests
- ✅ prevMonth: decrements month within same year
- ✅ prevMonth: wraps Jan to Dec of previous year
- ✅ prevMonth: handles Dec correctly
- ✅ nextMonth: increments month within same year
- ✅ nextMonth: wraps Dec to Jan of next year
- ✅ nextMonth: handles Jan correctly

---

## Integration Tests

All integration tests mock `@/auth` and `@/lib/db` (Prisma). They run in `jest-environment: node` (required for `NextRequest`/`NextResponse` to be available).

### `register.test.ts` — 5 tests
- ✅ returns 201 when registration data is valid and user does not exist
- ✅ returns 400 when email is invalid
- ✅ returns 400 when password is too weak (no uppercase)
- ✅ returns 400 when password has no number
- ✅ returns 409 when email already exists

### `transactions.test.ts` — 10 tests
- ✅ GET: returns 401 when not authenticated
- ✅ GET: returns 200 with transactions array when authenticated
- ✅ GET: returns 400 when year/month params are invalid
- ✅ POST: returns 401 when not authenticated
- ✅ POST: returns 201 when valid transaction is created
- ✅ POST: returns 400 when amount is missing
- ✅ DELETE: returns 200 when deleting own transaction
- ✅ DELETE: returns 403 when trying to delete another user's transaction
- ✅ DELETE: returns 404 when transaction does not exist
- ✅ DELETE: returns 401 when not authenticated

### `annualEntries.test.ts` — 8 tests
- ✅ GET: returns 401 when not authenticated
- ✅ GET: returns 200 with entries array when authenticated
- ✅ POST: returns 201 when valid entry is created
- ✅ POST: returns 400 when entryType is invalid
- ✅ POST: returns 401 when not authenticated
- ✅ DELETE: returns 200 when deleting own entry
- ✅ DELETE: returns 404 when entry does not exist
- ✅ DELETE: returns 401 when not authenticated

### `passiveIncome.test.ts` — 9 tests
- ✅ GET: returns 401 when not authenticated
- ✅ GET: returns 200 with passive income entries when authenticated
- ✅ GET: returns 400 when year param is missing
- ✅ POST: returns 201 when valid entry is created
- ✅ POST: returns 400 when sourceType is invalid
- ✅ POST: returns 401 when not authenticated
- ✅ DELETE: returns 200 when deleting own entry
- ✅ DELETE: returns 404 when entry does not exist
- ✅ DELETE: returns 401 when not authenticated

### `assets.test.ts` — 9 tests
- ✅ GET: returns 401 when not authenticated
- ✅ GET: returns 200 with assets array when authenticated
- ✅ POST: returns 201 when valid asset is created
- ✅ POST: returns 400 when assetName is missing
- ✅ POST: returns 401 when not authenticated
- ✅ DELETE: returns 200 when deleting own asset
- ✅ DELETE: returns 404 when asset does not exist
- ✅ DELETE: returns 404 when asset belongs to another user (by design — route returns 404 not 403 to avoid leaking ownership)
- ✅ DELETE: returns 401 when not authenticated

---

## Notes

- Integration tests use jest mocks for Prisma and NextAuth — they do not hit the real Neon database.
- `NextRequest` requires `@jest-environment node` — applied via per-file docblock on all integration tests.
- The `jest.config.ts` uses `next/jest.js` (ESM-compatible import) for Next.js 14 + Jest integration.
- No snapshot tests — all assertions are explicit value checks.
- Coverage not measured in this run; run `npm run test:coverage` to generate a coverage report.
