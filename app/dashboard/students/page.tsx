"use client"

import { useState } from "react"
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
