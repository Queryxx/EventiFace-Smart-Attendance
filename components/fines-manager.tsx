"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Download, Check } from "lucide-react"
import { exportFineReceiptPDF, exportMultipleFinesPDF } from "@/lib/fine-pdf"

interface Fine {
  id: string
  student_id: number
  student_number: string
  student_name: string
  amount: number
  reason: string
  date: string
  status: "paid" | "unpaid"
}

export function FinesManager({ onRefresh, onAddFine }: { onRefresh: () => void; onAddFine?: () => void }) {
  const [fines, setFines] = useState<Fine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFines, setSelectedFines] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    reason: "",
    date: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    fetchFines()
  }, [])

  async function fetchFines() {
    try {
      const response = await fetch("/api/fines")
      const data = await response.json()
      setFines(data)
    } catch (error) {
      console.error("Error fetching fines:", error)
    } finally {
      setLoading(false)
    }
  }

  function toggleSelectFine(id: string) {
    const newSelected = new Set(selectedFines)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedFines(newSelected)
  }

  function toggleSelectAll() {
    if (selectedFines.size === filteredFines.length) {
      setSelectedFines(new Set())
    } else {
      setSelectedFines(new Set(filteredFines.map((f) => f.id)))
    }
  }

  async function handleDeleteFine(id: string) {
    if (confirm("Are you sure you want to delete this fine?")) {
      try {
        const response = await fetch(`/api/fines/${id}`, { method: "DELETE" })
        if (response.ok) {
          fetchFines()
        }
      } catch (error) {
        console.error("Error deleting fine:", error)
      }
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      const response = await fetch(`/api/fines/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      })
      if (response.ok) {
        fetchFines()
      }
    } catch (error) {
      console.error("Error updating fine:", error)
    }
  }

  function handleExportSelected() {
    const selectedList = filteredFines.filter((f) => selectedFines.has(f.id))
    if (selectedList.length === 1) {
      exportFineReceiptPDF(selectedList[0])
    } else if (selectedList.length > 1) {
      exportMultipleFinesPDF(selectedList)
    }
  }

  const filteredFines = fines.filter(
    (fine) =>
      fine.student_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.reason.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Manage Fines</CardTitle>
            <CardDescription>Add and track student fines</CardDescription>
          </div>
          <Button onClick={onAddFine} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Fine
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search by student number, name, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {selectedFines.size > 0 && (
            <Button onClick={handleExportSelected} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export ({selectedFines.size})
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading fines...</div>
        ) : filteredFines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No fines found</div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedFines.size === filteredFines.length && filteredFines.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>Student #</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFines.map((fine) => (
                  <TableRow key={fine.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedFines.has(fine.id)}
                        onChange={() => toggleSelectFine(fine.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{fine.student_number}</TableCell>
                    <TableCell>{fine.student_name}</TableCell>
                    <TableCell>{fine.reason}</TableCell>
                    <TableCell className="font-semibold">₱{Number(fine.amount).toFixed(2)}</TableCell>
                    <TableCell>{new Date(fine.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          fine.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {fine.status === "paid" ? (
                          <>
                            <Check className="h-3 w-3" />
                            Paid
                          </>
                        ) : (
                          "Unpaid"
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportFineReceiptPDF(fine)}
                          title="Download receipt"
                          className="gap-1"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {fine.status === "unpaid" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkPaid(fine.id)}
                            title="Mark as paid"
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFine(fine.id)}
                          title="Delete fine"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
