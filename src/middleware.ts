import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

// Middleware uses only the Edge-compatible authConfig (no bcrypt, no Prisma).
// Route protection is handled by the `authorized` callback in auth.config.ts.
export default NextAuth(authConfig).auth

export const config = {
  // Exclude ALL /api routes — they handle their own auth.
  // Also exclude public PWA assets (manifest.json, /icons/**): iOS fetches these
  // unauthenticated, so they must NOT be auth-redirected — otherwise the manifest
  // returns a 307→/login, the installed app gets no `scope`, and it breaks out of
  // standalone into an in-app browser on navigation.
  // Middleware only protects page routes.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
}
