"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { StudentsTable } from "@/components/students-table"
import { StudentForm } from "@/components/student-form"

interface Student {
  id?: string
  student_number: string
  first_name: string
  last_name: string
  year_level?: number
  course_id?: string
  section_id?: string
}

export default function StudentsPage() {
  const [showForm, setShowForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
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
        if (['superadmin', 'student_registrar'].includes(data.role)) {
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

  function handleEdit(student: Student) {
    setSelectedStudent(student)
    setShowForm(true)
  }

  function handleSave() {
    setShowForm(false)
    setSelectedStudent(null)
    setRefreshKey((prev) => prev + 1)
  }

  function handleCancel() {
    setShowForm(false)
    setSelectedStudent(null)
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
            <h1 className="text-3xl font-bold">Student Management</h1>
            <p className="text-muted-foreground">Add, edit, and manage student records</p>
          </div>

          <div className="grid gap-6">
            {showForm && selectedStudent !== null && (
              <StudentForm student={selectedStudent} onSave={handleSave} onCancel={handleCancel} />
            )}
            <StudentsTable key={refreshKey} onEdit={handleEdit} onDelete={() => setRefreshKey((prev) => prev + 1)} />
          </div>
        </div>
      </div>
    </div>
  )
}
