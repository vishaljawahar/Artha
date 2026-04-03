export interface Category {
  id: string
  userId: string
  name: string
  icon: string | null
  color: string | null
  sortOrder: number
  isDefault: boolean
}

export interface MonthlyHeader {
  id: string
  userId: string
  year: number
  month: number
  income: number
  emiTotal: number
  savings: number
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  userId: string
  monthlyHeaderId: string | null
  date: string
  categoryId: string
  subcategory: string | null
  description: string
  amount: number
  isBulk: boolean
  createdAt: string
  updatedAt: string
  category: Category | null
}
