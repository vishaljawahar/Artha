import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileTab } from "@/components/settings/ProfileTab"
import { CategoriesTab } from "@/components/settings/CategoriesTab"
import { EmiTab } from "@/components/settings/EmiTab"
import { BudgetTargetsTab } from "@/components/settings/BudgetTargetsTab"
import { MonthlyBillsTab } from "@/components/settings/MonthlyBillsTab"
import { ImportTab } from "@/components/settings/ImportTab"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const name = session.user.name ?? ""
  const email = session.user.email ?? ""

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile, categories, bills, EMIs, and data</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="emis">EMI Manager</TabsTrigger>
          <TabsTrigger value="bills">Bill Checklist</TabsTrigger>
          <TabsTrigger value="budget">Budget Targets</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab name={name} email={email} />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="emis">
          <EmiTab />
        </TabsContent>

        <TabsContent value="bills">
          <MonthlyBillsTab />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetTargetsTab />
        </TabsContent>

        <TabsContent value="import">
          <ImportTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
