"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loan } from "./types"

const formSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
})

type FormValues = z.infer<typeof formSchema>

interface AddMemberDialogProps {
  loan: Loan
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export function AddMemberDialog({ loan, open, onOpenChange, onChanged }: AddMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  })

  useEffect(() => {
    if (open) form.reset({ email: "" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/loans/${loan.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to add member")
        return
      }

      toast.success("Member added")
      onChanged()
      onOpenChange(false)
      form.reset()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) form.reset() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Enter the email of an existing Artha user to share this loan with them.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="member@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => { onOpenChange(false); form.reset() }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
