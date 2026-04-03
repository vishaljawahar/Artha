import { Skeleton } from "@/components/ui/skeleton"

interface KpiCardProps {
  label: string
  value: string
  valueColor?: string
  loading?: boolean
}

export function KpiCard({ label, value, valueColor = "text-gray-900", loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-8 w-32" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  )
}
