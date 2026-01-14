"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { AdminsTable } from "@/components/admins-table"
import { AdminForm } from "@/components/admin-form"

interface Admin {
  id?: string
  username: string
  full_name: string
}

export default function AdminsPage() {
  const [showForm, setShowForm] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleEdit(admin: Admin) {
    setSelectedAdmin(admin)
    setShowForm(true)
  }

  function handleSave() {
    setShowForm(false)
    setSelectedAdmin(null)
    setRefreshKey((prev) => prev + 1)
  }

  function handleCancel() {
    setShowForm(false)
    setSelectedAdmin(null)
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-background">
        <div className="max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Admin Users</h1>
            <p className="text-muted-foreground">Manage admin accounts and permissions</p>
          </div>

          <div className="grid gap-6">
            {showForm && selectedAdmin !== null && (
              <AdminForm admin={selectedAdmin} onSave={handleSave} onCancel={handleCancel} />
            )}
            <AdminsTable key={refreshKey} onEdit={handleEdit} onDelete={() => setRefreshKey((prev) => prev + 1)} />
          </div>
        </div>
      </div>
    </div>
  )
}
