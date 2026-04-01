import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const DEFAULT_CATEGORIES = [
  { name: "Electricity",        icon: "⚡", color: "#F59E0B", sortOrder: 1  },
  { name: "Internet",           icon: "🌐", color: "#3B82F6", sortOrder: 2  },
  { name: "Fuel",               icon: "⛽", color: "#EF4444", sortOrder: 3  },
  { name: "Toll",               icon: "🛣️",  color: "#8B5CF6", sortOrder: 4  },
  { name: "LPG",                icon: "🔥", color: "#F97316", sortOrder: 5  },
  { name: "Home Essentials",    icon: "🏠", color: "#10B981", sortOrder: 6  },
  { name: "Milk",               icon: "🥛", color: "#E2E8F0", sortOrder: 7  },
  { name: "Kid",                icon: "👶", color: "#EC4899", sortOrder: 8  },
  { name: "Health & Wellness",  icon: "💊", color: "#06B6D4", sortOrder: 9  },
  { name: "Newspaper",          icon: "📰", color: "#6B7280", sortOrder: 10 },
  { name: "Shopping",           icon: "🛍️",  color: "#F472B6", sortOrder: 11 },
  { name: "Eating Out",         icon: "🍽️",  color: "#FBBF24", sortOrder: 12 },
  { name: "Doctor",             icon: "🩺", color: "#34D399", sortOrder: 13 },
  { name: "Misc",               icon: "📦", color: "#94A3B8", sortOrder: 14 },
  { name: "Transport",          icon: "🚌", color: "#60A5FA", sortOrder: 15 },
  { name: "Vehicles",           icon: "🚗", color: "#A78BFA", sortOrder: 16 },
  { name: "Learning & Books",   icon: "📚", color: "#34D399", sortOrder: 17 },
  { name: "Subscriptions",      icon: "📱", color: "#818CF8", sortOrder: 18 },
]

async function main() {
  console.log("Seed script — DEFAULT_CATEGORIES exported for per-user seeding on registration.")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
