import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters."
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter."
  if (!/[0-9]/.test(password)) return "Password must contain at least one number."
  return null
}

async function main() {
  const [email, newPassword] = process.argv.slice(2)

  if (!email || !newPassword) {
    console.error("Usage: npm run reset:password <email> <newPassword>")
    process.exit(1)
  }

  const validationError = validatePassword(newPassword)
  if (validationError) {
    console.error(`Invalid password: ${validationError}`)
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  })

  if (!user) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, failedAttempts: 0, lockoutUntil: null },
  })

  console.log(`Password reset successfully.`)
  console.log(`  Name:  ${user.name}`)
  console.log(`  Email: ${user.email}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
