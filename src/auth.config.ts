import type { NextAuthConfig } from "next-auth"

// Edge-compatible auth config — no Node.js-only imports (no bcrypt, no Prisma).
// Used by middleware. The full auth.ts spreads this and adds the Credentials provider.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage =
        nextUrl.pathname === "/login" || nextUrl.pathname === "/register"

      if (!isLoggedIn && !isAuthPage) return false // redirects to signIn (/login)
      if (isLoggedIn && isAuthPage)
        return Response.redirect(new URL("/dashboard", nextUrl))
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
