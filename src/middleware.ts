import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

// Middleware uses only the Edge-compatible authConfig (no bcrypt, no Prisma).
// Route protection is handled by the `authorized` callback in auth.config.ts.
export default NextAuth(authConfig).auth

export const config = {
  // Exclude ALL /api routes — they handle their own auth.
  // Middleware only protects page routes.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
