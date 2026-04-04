"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ProfileTabProps {
  name: string
  email: string
}

export function ProfileTab({ name: initialName, email }: ProfileTabProps) {
  const [name, setName] = useState(initialName)
  const [nameLoading, setNameLoading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwLoading, setPwLoading] = useState(false)

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Name must be at least 2 characters")
      return
    }
    setNameLoading(true)
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update name")
        return
      }
      toast.success("Name updated successfully")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setNameLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    setPwLoading(true)
    try {
      const res = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to change password")
        return
      }
      toast.success("Password changed successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Update Name */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Profile</CardTitle>
          <CardDescription className="text-sm text-gray-500">Update your display name</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name" className="text-xs text-gray-600">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-gray-200"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Email</Label>
              <Input
                value={email}
                disabled
                className="border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400">Email cannot be changed</p>
            </div>
            <Button
              type="submit"
              disabled={nameLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {nameLoading ? "Saving..." : "Save Name"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Change Password</CardTitle>
          <CardDescription className="text-sm text-gray-500">
            Must be at least 8 characters with one uppercase letter and one number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-xs text-gray-600">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="border-gray-200"
                placeholder="Enter current password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs text-gray-600">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border-gray-200"
                placeholder="Enter new password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs text-gray-600">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-gray-200"
                placeholder="Confirm new password"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={pwLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {pwLoading ? "Updating..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
