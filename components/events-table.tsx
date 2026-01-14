"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit2, Trash2, Plus, Play } from "lucide-react"
import { formatTo12Hour } from "@/lib/utils"

interface Event {
  id?: string
  event_name: string
  event_date: string
  start_time: string
  end_time: string
  fine_amount: number
  course_id?: string
  course_name?: string
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

export function EventsTable({ onEdit, onDelete }: { onEdit: (event: Event) => void; onDelete: (id: string) => void }) {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchEvents()
    fetchCourses()
  }, [])

  async function fetchEvents() {
    try {
      const response = await fetch("/api/events")
      const data = await response.json()
      setEvents(data)
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCourses() {
    try {
      const response = await fetch("/api/courses")
      const data = await response.json()
      setCourses(data)
    } catch (error) {
      console.error("Error fetching courses:", error)
    }
  }

  function getCourseName(courseId?: string) {
    if (!courseId) return "All Courses"
    const course = courses.find((c) => String(c.id) === String(courseId))
    return course?.course_name || "Unknown"
  }

  function handleStartAttendance(event: Event) {
    router.push(`/dashboard/detection?eventId=${event.id}`)
  }

  const filteredEvents = events.filter(
    (event) =>
      event.event_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await fetch(`/api/events/${id}`, { method: "DELETE" })
        setEvents(events.filter((e) => e.id !== id))
      } catch (error) {
        console.error("Error deleting event:", error)
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Events</CardTitle>
            <CardDescription>Manage events and attendance records</CardDescription>
          </div>
          <Button onClick={() => onEdit({} as Event)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Search by event name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No events found</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Fine Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.event_name}</TableCell>
                    <TableCell>{getCourseName(event.course_id)}</TableCell>
                    <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="text-sm space-y-2">
                        {/* AM Session */}
                        {event.am_in_start_time && (
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">AM</span>
                            <span className="text-gray-600">
                              <strong>IN:</strong> {event.am_in_start_time && formatTo12Hour(event.am_in_start_time)} - {event.am_in_end_time && formatTo12Hour(event.am_in_end_time)}
                            </span>
                            <span className="text-gray-600">
                              <strong>OUT:</strong> {event.am_out_start_time && formatTo12Hour(event.am_out_start_time)} - {event.am_out_end_time && formatTo12Hour(event.am_out_end_time)}
                            </span>
                          </div>
                        )}

                        {/* PM Session */}
                        {event.pm_in_start_time && (
                          <div className="flex items-center gap-2">
                            <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded">PM</span>
                            <span className="text-gray-600">
                              <strong>IN:</strong> {event.pm_in_start_time && formatTo12Hour(event.pm_in_start_time)} - {event.pm_in_end_time && formatTo12Hour(event.pm_in_end_time)}
                            </span>
                            <span className="text-gray-600">
                              <strong>OUT:</strong> {event.pm_out_start_time && formatTo12Hour(event.pm_out_start_time)} - {event.pm_out_end_time && formatTo12Hour(event.pm_out_end_time)}
                            </span>
                          </div>
                        )}

                        {/* Default times if no sessions configured */}
                        {!event.am_in_start_time && !event.pm_in_start_time && (
                          <span className="text-gray-500 italic">
                            {event.start_time && formatTo12Hour(event.start_time)} - {event.end_time && formatTo12Hour(event.end_time)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>₱{parseFloat(event.fine_amount.toString()).toFixed(2)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => event.id && handleStartAttendance(event)}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Start
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(event)} className="gap-2">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => event.id && handleDelete(event.id)}
                        className="gap-2 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
