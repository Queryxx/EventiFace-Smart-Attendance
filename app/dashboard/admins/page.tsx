"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { AdminsTable } from "@/components/admins-table"
import { AdminForm } from "@/components/admin-form"
import { Button } from "@/components/ui/button"

interface Admin {
  id?: string
  username: string
  full_name: string
  email?: string
  role?: string
}

export default function AdminsPage() {
  const [showForm, setShowForm] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthorization()
  }, [])

  async function checkAuthorization() {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        if (data.role === 'superadmin') {
          setIsAuthorized(true)
        } else {
          router.push("/dashboard")
          return
        }
      } else {
        router.push("/login")
        return
      }
    } catch (error) {
      console.error("Error checking authorization:", error)
      router.push("/login")
      return
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="ml-64 flex-1 p-8 bg-background">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null // This won't render as user will be redirected
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-background">
        <div className="max-w-7xl">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Admin Users</h1>
                <p className="text-muted-foreground">Manage admin accounts and permissions</p>
              </div>
              <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90">
                Add New Admin
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            {showForm && (
              <AdminForm admin={selectedAdmin || undefined} onSave={handleSave} onCancel={handleCancel} />
            )}
            <AdminsTable key={refreshKey} onEdit={handleEdit} onDelete={() => setRefreshKey((prev) => prev + 1)} />
          </div>
        </div>
      </div>
    </div>
  )
}
