"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Trash2, ChevronUp, ChevronDown, Pencil, Check, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Category {
  id: string
  name: string
  icon: string | null
  sortOrder: number
  isDefault: boolean
}

export function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Add new category
  const [newIcon, setNewIcon] = useState("")
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null)
  const [editIcon, setEditIcon] = useState("")
  const [editName, setEditName] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/categories")
      if (!res.ok) throw new Error("Failed to load categories")
      const data = await res.json()
      setCategories(data.categories)
    } catch {
      toast.error("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error("Category name is required")
      return
    }
    setAdding(true)
    try {
      const res = await fetch("/api/settings/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), icon: newIcon.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add category")
        return
      }
      toast.success("Category added")
      setNewName("")
      setNewIcon("")
      await fetchCategories()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (cat: Category) => {
    setEditId(cat.id)
    setEditName(cat.name)
    setEditIcon(cat.icon ?? "")
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditName("")
    setEditIcon("")
  }

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      toast.error("Category name is required")
      return
    }
    setEditSaving(true)
    try {
      const res = await fetch(`/api/settings/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), icon: editIcon.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update category")
        return
      }
      toast.success("Category updated")
      setEditId(null)
      await fetchCategories()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setEditSaving(false)
    }
  }

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newCats = [...categories]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newCats.length) return

    const temp = newCats[index]
    newCats[index] = newCats[targetIndex]
    newCats[targetIndex] = temp
    setCategories(newCats)

    try {
      const res = await fetch("/api/settings/categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: newCats.map((c) => c.id) }),
      })
      if (!res.ok) {
        toast.error("Failed to reorder categories")
        await fetchCategories()
      }
    } catch {
      toast.error("Something went wrong")
      await fetchCategories()
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/settings/categories/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete category")
        return
      }
      toast.success("Category deleted")
      setDeleteTarget(null)
      await fetchCategories()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-md animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">
          {categories.length} {categories.length === 1 ? "category" : "categories"}
        </h2>
      </div>

      {/* Category list */}
      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
        {categories.map((cat, index) => (
          <div key={cat.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50">
            {/* Move buttons */}
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => handleMove(index, "up")}
                disabled={index === 0}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
                title="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleMove(index, "down")}
                disabled={index === categories.length - 1}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
                title="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {editId === cat.id ? (
              <>
                <Input
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  className="w-14 border-gray-200 text-center text-base"
                  placeholder="📦"
                  maxLength={2}
                />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 border-gray-200"
                  placeholder="Category name"
                />
                <button
                  onClick={() => handleSaveEdit(cat.id)}
                  disabled={editSaving}
                  className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                  title="Save"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="text-xl w-8 text-center">{cat.icon ?? "📦"}</span>
                <span className="flex-1 text-sm text-gray-800 font-medium">{cat.name}</span>
                <button
                  onClick={() => startEdit(cat)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(cat)}
                  className="text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}

        {categories.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No categories yet. Add one below.
          </div>
        )}
      </div>

      {/* Add new category */}
      <form onSubmit={handleAdd} className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
        <p className="text-xs font-medium text-gray-500 mb-3">Add New Category</p>
        <div className="flex items-center gap-3">
          <Input
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value)}
            className="w-14 border-gray-200 bg-white text-center text-base"
            placeholder="📦"
            maxLength={2}
          />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border-gray-200 bg-white"
            placeholder="Category name (e.g. Travel)"
          />
          <Button
            type="submit"
            disabled={adding}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            {adding ? "Adding..." : "Add"}
          </Button>
        </div>
      </form>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleteTarget?.name}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
