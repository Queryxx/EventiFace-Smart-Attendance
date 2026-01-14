"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { EventsTable } from "@/components/events-table"
import { EventForm } from "@/components/event-form"

interface Event {
  id?: string
  event_name: string
  event_date: string
  start_time: string
  end_time: string
  fine_amount: number
}

export default function EventsPage() {
  const [showForm, setShowForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleEdit(event: Event) {
    setSelectedEvent(event)
    setShowForm(true)
  }

  function handleSave() {
    setShowForm(false)
    setSelectedEvent(null)
    setRefreshKey((prev) => prev + 1)
  }

  function handleCancel() {
    setShowForm(false)
    setSelectedEvent(null)
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-background">
        <div className="max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Event Management</h1>
            <p className="text-muted-foreground">Schedule and manage academic events</p>
          </div>

          <div className="grid gap-6">
            {showForm && selectedEvent !== null && (
              <EventForm event={selectedEvent} onSave={handleSave} onCancel={handleCancel} />
            )}
            <EventsTable key={refreshKey} onEdit={handleEdit} onDelete={() => setRefreshKey((prev) => prev + 1)} />
          </div>
        </div>
      </div>
    </div>
  )
}
