"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface Student {
  id: string
  student_number: string
  first_name: string
  last_name: string
}

interface Fine {
  id?: string
  student_id: string
  amount: number
  reason: string
  date: string
}

export function FineForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [students, setStudents] = useState<Student[]>([])
  const [formData, setFormData] = useState<Fine>({
    student_id: "",
    amount: 0,
    reason: "",
    date: new Date().toISOString().split("T")[0],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchStudents()
  }, [])

  async function fetchStudents() {
    try {
      const response = await fetch("/api/students")
      const data = await response.json()
      setStudents(data)
    } catch (error) {
      console.error("Error fetching students:", error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!formData.student_id) {
      setError("Please select a student")
      return
    }
    if (!formData.amount || formData.amount <= 0) {
      setError("Please enter a valid fine amount")
      return
    }
    if (!formData.reason.trim()) {
      setError("Please enter a reason for the fine")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/fines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: parseInt(formData.student_id),
          amount: parseFloat(formData.amount.toString()),
          reason: formData.reason.trim(),
          date: formData.date,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.message || "Failed to add fine")
        return
      }

      onSave()
    } catch (err) {
      setError("An error occurred")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Fine</CardTitle>
        <CardDescription>Issue a fine to a student</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

          <div>
            <Label htmlFor="student">Student *</Label>
            <select
              id="student"
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 text-sm"
              required
            >
              <option value="">Select a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.student_number} - {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount (₱) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Reason for the fine"
              className="w-full border border-input rounded-md px-3 py-2 text-sm"
              rows={3}
              required
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Fine"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
