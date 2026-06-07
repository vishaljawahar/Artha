"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loan } from "./types"
import { AddMemberDialog } from "./AddMemberDialog"

interface MembersTabProps {
  loan: Loan
  onChanged: () => void
  isOwner: boolean
}

export function MembersTab({ loan, onChanged, isOwner }: MembersTabProps) {
  const [addOpen, setAddOpen] = useState(false)

  const handleRemove = async (memberId: string) => {
    try {
      const res = await fetch(`/api/loans/${loan.id}/members/${memberId}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? "Failed to remove member")
        return
      }
      toast.success("Member removed")
      onChanged()
    } catch {
      toast.error("Failed to remove member")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Members</h2>
        {isOwner && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            size="sm"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {loan.members.map((m) => {
          const isSelf = m.userId === loan.currentUserId
          return (
            <div key={m.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{m.user.name}</p>
                  {m.role === "OWNER" ? (
                    <Badge className="text-xs font-medium px-2 py-0.5 rounded-full border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
                      Owner
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                    >
                      Member
                    </Badge>
                  )}
                  {isSelf && (
                    <span className="text-xs text-muted-foreground">(You)</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{m.user.email}</p>
              </div>

              {isOwner && !isSelf && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Member</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remove <strong>{m.user.name}</strong> from this loan? They will lose access to it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleRemove(m.id)}
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )
        })}
      </div>

      <AddMemberDialog
        loan={loan}
        open={addOpen}
        onOpenChange={setAddOpen}
        onChanged={onChanged}
      />
    </div>
  )
}
