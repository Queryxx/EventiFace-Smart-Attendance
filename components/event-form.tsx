"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface Event {
  id?: string
  event_name: string
  event_date: string
  start_time: string
  end_time: string
  fine_amount: number
  course_id?: string
  am_in_start_time?: string
  am_in_end_time?: string
  am_out_start_time?: string
  am_out_end_time?: string
  pm_in_start_time?: string
  pm_in_end_time?: string
  pm_out_start_time?: string
  pm_out_end_time?: string
}

interface Course {
  id?: string
  course_name: string
}

export function EventForm({ event, onSave, onCancel }: { event?: Event; onSave: () => void; onCancel: () => void }) {
  const [formData, setFormData] = useState<Event>(
    event || {
      event_name: "",
      event_date: "",
      start_time: "",
      end_time: "",
      fine_amount: 0,
      course_id: "",
      am_in_start_time: "",
      am_in_end_time: "",
      am_out_start_time: "",
      am_out_end_time: "",
      pm_in_start_time: "",
      pm_in_end_time: "",
      pm_out_start_time: "",
      pm_out_end_time: "",
    },
  )
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (event) {
      setFormData(event)
    }
  }, [event])

  async function fetchCourses() {
    try {
      const response = await fetch("/api/courses")
      const data = await response.json()
      setCourses(data)
    } catch (error) {
      console.error("Error fetching courses:", error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Validate required fields
    if (!formData.event_name.trim()) {
      setError("Event name is required")
      return
    }
    if (!formData.event_date) {
      setError("Event date is required")
      return
    }
    if (!formData.start_time) {
      setError("Start time is required")
      return
    }
    if (!formData.end_time) {
      setError("End time is required")
      return
    }
    if (formData.fine_amount < 0) {
      setError("Fine amount cannot be negative")
      return
    }

    setLoading(true)

    try {
      const method = formData.id ? "PUT" : "POST"
      const url = formData.id ? `/api/events/${formData.id}` : "/api/events"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: formData.event_name.trim(),
          event_date: formData.event_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          fine_amount: parseFloat(formData.fine_amount.toString()),
          course_id: formData.course_id ? parseInt(formData.course_id, 10) : null,
          am_in_start_time: formData.am_in_start_time || null,
          am_in_end_time: formData.am_in_end_time || null,
          am_out_start_time: formData.am_out_start_time || null,
          am_out_end_time: formData.am_out_end_time || null,
          pm_in_start_time: formData.pm_in_start_time || null,
          pm_in_end_time: formData.pm_in_end_time || null,
          pm_out_start_time: formData.pm_out_start_time || null,
          pm_out_end_time: formData.pm_out_end_time || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.message || "Operation failed")
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
        <CardTitle>{formData.id ? "Edit Event" : "Add New Event"}</CardTitle>
        <CardDescription>Enter event information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

          <div>
            <Label htmlFor="event_name">Event Name *</Label>
            <Input
              id="event_name"
              value={formData.event_name}
              onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event_date">Event Date *</Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="fine_amount">Fine Amount *</Label>
              <Input
                id="fine_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.fine_amount}
                onChange={(e) => setFormData({ ...formData, fine_amount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="course">Course</Label>
            <select
              id="course"
              value={formData.course_id || ""}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select a course (optional)</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.course_name}
                </option>
              ))}
            </select>
          </div>

          {/* AM Session */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">AM Session</h3>
            
            {/* AM Check In */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-3 text-blue-700">Check In (AM)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="am_in_start">Start Time</Label>
                  <Input
                    id="am_in_start"
                    type="time"
                    value={formData.am_in_start_time || ""}
                    onChange={(e) => setFormData({ ...formData, am_in_start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="am_in_end">End Time</Label>
                  <Input
                    id="am_in_end"
                    type="time"
                    value={formData.am_in_end_time || ""}
                    onChange={(e) => setFormData({ ...formData, am_in_end_time: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* AM Check Out */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium mb-3 text-green-700">Check Out (AM)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="am_out_start">Start Time</Label>
                  <Input
                    id="am_out_start"
                    type="time"
                    value={formData.am_out_start_time || ""}
                    onChange={(e) => setFormData({ ...formData, am_out_start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="am_out_end">End Time</Label>
                  <Input
                    id="am_out_end"
                    type="time"
                    value={formData.am_out_end_time || ""}
                    onChange={(e) => setFormData({ ...formData, am_out_end_time: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PM Session */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 text-orange-600">PM Session</h3>
            
            {/* PM Check In */}
            <div className="mb-6 p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium mb-3 text-orange-700">Check In (PM)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pm_in_start">Start Time</Label>
                  <Input
                    id="pm_in_start"
                    type="time"
                    value={formData.pm_in_start_time || ""}
                    onChange={(e) => setFormData({ ...formData, pm_in_start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pm_in_end">End Time</Label>
                  <Input
                    id="pm_in_end"
                    type="time"
                    value={formData.pm_in_end_time || ""}
                    onChange={(e) => setFormData({ ...formData, pm_in_end_time: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* PM Check Out */}
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium mb-3 text-red-700">Check Out (PM)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pm_out_start">Start Time</Label>
                  <Input
                    id="pm_out_start"
                    type="time"
                    value={formData.pm_out_start_time || ""}
                    onChange={(e) => setFormData({ ...formData, pm_out_start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pm_out_end">End Time</Label>
                  <Input
                    id="pm_out_end"
                    type="time"
                    value={formData.pm_out_end_time || ""}
                    onChange={(e) => setFormData({ ...formData, pm_out_end_time: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Event"}
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
