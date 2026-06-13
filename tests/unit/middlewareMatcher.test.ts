import { readFileSync } from "fs"
import { join } from "path"

/**
 * The middleware `matcher` decides which request paths run through the auth gate.
 * PWA assets (`/manifest.json`, `/icons/**`) MUST be excluded — otherwise an
 * unauthenticated fetch (which is how iOS loads the manifest and home-screen
 * icons) is 307-redirected to /login, the installed app never gets a valid
 * `scope`, and it breaks out of standalone into an in-app browser on navigation.
 *
 * This reads the literal matcher string from src/middleware.ts (rather than
 * importing the module, which would pull in Edge-only NextAuth internals) and
 * models the path test Next applies.
 */
function getMatcherRegex(): RegExp {
  const src = readFileSync(join(process.cwd(), "src/middleware.ts"), "utf8")
  const m = src.match(/matcher:\s*\[\s*"([^"]+)"/)
  if (!m) throw new Error("Could not find a matcher string in src/middleware.ts")
  return new RegExp("^" + m[1] + "$")
}

describe("middleware matcher", () => {
  const re = getMatcherRegex()

  it("does NOT run middleware on PWA static assets (so iOS isn't auth-redirected away from them)", () => {
    expect(re.test("/manifest.json")).toBe(false)
    expect(re.test("/icons/apple-touch-icon.png")).toBe(false)
    expect(re.test("/icons/icon-192.png")).toBe(false)
    expect(re.test("/icons/icon-512.png")).toBe(false)
  })

  it("still protects app page routes", () => {
    expect(re.test("/dashboard")).toBe(true)
    expect(re.test("/monthly-log")).toBe(true)
    expect(re.test("/loans/123")).toBe(true)
  })

  it("still excludes framework internals and API routes", () => {
    expect(re.test("/api/transactions")).toBe(false)
    expect(re.test("/_next/static/chunk.js")).toBe(false)
    expect(re.test("/favicon.ico")).toBe(false)
  })
})
