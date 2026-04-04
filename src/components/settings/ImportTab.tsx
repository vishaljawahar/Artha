"use client"

import { useState, useRef, useCallback } from "react"
import { toast } from "sonner"
import { Upload, Download, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ParsedRow {
  date: string
  categoryName: string
  subcategory?: string
  description?: string
  amount: number
  _raw?: string
  _error?: string
}

const CSV_HEADERS = "date,category,subcategory,description,amount"

function downloadTemplate() {
  const content = `${CSV_HEADERS}\n2026-01-15,Food,Groceries,Weekly grocery run,2500\n2026-01-20,Transport,Fuel,Car fuel,1800\n`
  const blob = new Blob([content], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "artha_import_template.csv"
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { rows: [], errors: ["Empty file"] }

  // Skip header row if present
  const dataLines = lines[0].toLowerCase().startsWith("date") ? lines.slice(1) : lines

  const rows: ParsedRow[] = []
  const errors: string[] = []

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]
    // Simple CSV parse — split by comma, handle quoted fields
    const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map((v) => v.replace(/^"|"$/g, "").trim()) ?? []

    if (cols.length < 2) {
      errors.push(`Row ${i + 1}: Too few columns`)
      continue
    }

    const [date, categoryName, subcategory, description, amountStr] = cols
    const amount = parseFloat(amountStr ?? "")

    if (!date || !categoryName) {
      errors.push(`Row ${i + 1}: Date and category are required`)
      continue
    }

    if (isNaN(amount) || amount <= 0) {
      errors.push(`Row ${i + 1}: Invalid amount "${amountStr}"`)
      continue
    }

    rows.push({
      date: date.trim(),
      categoryName: categoryName.trim(),
      subcategory: subcategory?.trim() || undefined,
      description: description?.trim() || undefined,
      amount,
    })
  }

  return { rows, errors }
}

export function ImportTab() {
  const [dragging, setDragging] = useState(false)
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    errors: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file")
      return
    }
    setFileName(file.name)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { rows, errors } = parseCSV(text)
      setParsed(rows)
      setParseErrors(errors)
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-selected
    e.target.value = ""
  }

  const handleClear = () => {
    setParsed(null)
    setParseErrors([])
    setFileName("")
    setImportResult(null)
  }

  const handleImport = async () => {
    if (!parsed || parsed.length === 0) return
    setImporting(true)
    try {
      const res = await fetch("/api/settings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Import failed")
        return
      }
      setImportResult(data)
      setParsed(null)
      setFileName("")
      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} transaction${data.imported !== 1 ? "s" : ""}`)
      }
    } catch {
      toast.error("Something went wrong during import")
    } finally {
      setImporting(false)
    }
  }

  const previewRows = parsed?.slice(0, 10) ?? []

  return (
    <div className="max-w-2xl space-y-6">
      {/* Template download */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div>
          <p className="text-sm font-medium text-gray-800">Download CSV Template</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Headers: date, category, subcategory, description, amount
          </p>
        </div>
        <Button
          onClick={downloadTemplate}
          variant="outline"
          size="sm"
          className="border-gray-200 text-gray-700 hover:bg-white"
        >
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
      </div>

      {/* Upload area */}
      {!parsed && !importResult && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-emerald-400 bg-emerald-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">
            Drag &amp; drop your CSV file here
          </p>
          <p className="text-xs text-gray-400 mt-1">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Parse errors (client-side) */}
      {parseErrors.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-1">
          <p className="text-sm font-medium text-amber-800">Parse warnings ({parseErrors.length})</p>
          <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
            {parseErrors.slice(0, 5).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {parseErrors.length > 5 && (
              <li>...and {parseErrors.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Preview table */}
      {parsed && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-800">{fileName}</span>
              <span className="text-xs text-gray-500">
                ({parsed.length} row{parsed.length !== 1 ? "s" : ""} ready to import)
              </span>
            </div>
            <button onClick={handleClear} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Category</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Subcategory</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.date}</td>
                    <td className="px-3 py-2 text-gray-700">{row.categoryName}</td>
                    <td className="px-3 py-2 text-gray-500">{row.subcategory ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-500 truncate max-w-[12rem]">{row.description ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                      ₹{row.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 10 && (
              <p className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
                Showing first 10 of {parsed.length} rows
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleImport}
              disabled={importing || parsed.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Upload className="h-4 w-4 mr-1.5" />
              {importing ? "Importing..." : `Import ${parsed.length} transaction${parsed.length !== 1 ? "s" : ""}`}
            </Button>
            <Button variant="outline" onClick={handleClear} className="border-gray-200 text-gray-600">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${importResult.imported > 0 ? "bg-emerald-500" : "bg-gray-400"}`} />
            <p className="text-sm font-medium text-gray-800">Import Complete</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
              <p className="text-xs text-emerald-600 font-medium">Imported</p>
              <p className="text-xl font-bold text-emerald-700">{importResult.imported}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
              <p className="text-xs text-amber-600 font-medium">Skipped</p>
              <p className="text-xl font-bold text-amber-700">{importResult.skipped}</p>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Errors:</p>
              <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
                {importResult.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {importResult.errors.length > 10 && (
                  <li>...and {importResult.errors.length - 10} more</li>
                )}
              </ul>
            </div>
          )}
          <Button
            variant="outline"
            onClick={handleClear}
            className="border-gray-200 text-gray-600 text-sm"
            size="sm"
          >
            Import Another File
          </Button>
        </div>
      )}
    </div>
  )
}
