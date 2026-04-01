import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

// Middleware uses only the Edge-compatible authConfig (no bcrypt, no Prisma).
// Route protection is handled by the `authorized` callback in auth.config.ts.
export default NextAuth(authConfig).auth

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
