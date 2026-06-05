import { Sidebar } from "@/components/layout/Sidebar"
import { MobileNav } from "@/components/layout/MobileNav"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
