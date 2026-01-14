"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { FineForm } from "@/components/fine-form"
import { FinesManager } from "@/components/fines-manager"

export default function FinesPage() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSave() {
    setShowForm(false)
    setRefreshKey((prev) => prev + 1)
  }

  function handleCancel() {
    setShowForm(false)
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-background">
        <div className="max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Fines Management</h1>
            <p className="text-muted-foreground">Manage student fines and payments</p>
          </div>

          <div className="grid gap-6">
            {showForm && <FineForm onSave={handleSave} onCancel={handleCancel} />}
            <FinesManager 
              key={refreshKey}
              onRefresh={() => setRefreshKey((prev) => prev + 1)}
              onAddFine={() => setShowForm(true)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
