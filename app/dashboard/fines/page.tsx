"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { FineForm } from "@/components/fine-form"
import { FinesManager } from "@/components/fines-manager"

export default function FinesPage() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthorization()
  }, [])

  async function checkAuthorization() {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        if (['superadmin', 'fine_manager', 'receipt_manager'].includes(data.role)) {
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
      setAuthLoading(false)
    }
  }

  function handleSave() {
    setShowForm(false)
    setRefreshKey((prev) => prev + 1)
  }

  function handleCancel() {
    setShowForm(false)
  }

  if (authLoading) {
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
