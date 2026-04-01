import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { prisma } from "@/lib/db"
import bcrypt from "bcrypt"
import { loginSchema } from "@/lib/validations"

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MINUTES = 15

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        // Check lockout
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          throw new Error("Account locked. Try again in 15 minutes.")
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash)

        if (!passwordMatch) {
          const newFailedAttempts = user.failedAttempts + 1
          const shouldLock = newFailedAttempts >= LOCKOUT_THRESHOLD

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedAttempts: newFailedAttempts,
              lockoutUntil: shouldLock
                ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
                : null,
            },
          })
          return null
        }

        // Reset failed attempts on success
        await prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: 0, lockoutUntil: null },
        })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
})
