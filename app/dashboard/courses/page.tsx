"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { CoursesTable } from "@/components/courses-table"
import { CourseForm } from "@/components/course-form"
import { SectionsTable } from "@/components/sections-table"
import { SectionForm } from "@/components/section-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Course {
  id?: string
  course_name: string
  course_code: string
}

interface Section {
  id?: string
  section_name: string
  course_id: string
}

export default function CoursesPage() {
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [courseRefreshKey, setCourseRefreshKey] = useState(0)

  const [showSectionForm, setShowSectionForm] = useState(false)
  const [selectedSection, setSelectedSection] = useState<Section | null>(null)
  const [sectionRefreshKey, setSectionRefreshKey] = useState(0)

  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    fetchCourses()
  }, [courseRefreshKey])

  async function fetchCourses() {
    try {
      const response = await fetch("/api/courses")
      const data = await response.json()
      setCourses(data)
    } catch (error) {
      console.error("Error fetching courses:", error)
    }
  }

  function handleEditCourse(course: Course) {
    setSelectedCourse(course)
    setShowCourseForm(true)
  }

  function handleSaveCourse() {
    setShowCourseForm(false)
    setSelectedCourse(null)
    setCourseRefreshKey((prev) => prev + 1)
  }

  function handleCancelCourse() {
    setShowCourseForm(false)
    setSelectedCourse(null)
  }

  function handleEditSection(section: Section) {
    setSelectedSection(section)
    setShowSectionForm(true)
  }

  function handleSaveSection() {
    setShowSectionForm(false)
    setSelectedSection(null)
    setSectionRefreshKey((prev) => prev + 1)
  }

  function handleCancelSection() {
    setShowSectionForm(false)
    setSelectedSection(null)
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-background">
        <div className="max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Courses & Sections</h1>
            <p className="text-muted-foreground">Manage courses and their sections</p>
          </div>

          <Tabs defaultValue="courses" className="space-y-6">
            <TabsList>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="sections">Sections</TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="space-y-6">
              {showCourseForm && selectedCourse !== null && (
                <CourseForm course={selectedCourse} onSave={handleSaveCourse} onCancel={handleCancelCourse} />
              )}
              <CoursesTable
                key={courseRefreshKey}
                onEdit={handleEditCourse}
                onDelete={() => setCourseRefreshKey((prev) => prev + 1)}
              />
            </TabsContent>

            <TabsContent value="sections" className="space-y-6">
              {showSectionForm && selectedSection !== null && (
                <SectionForm
                  section={selectedSection}
                  courses={courses}
                  onSave={handleSaveSection}
                  onCancel={handleCancelSection}
                />
              )}
              <SectionsTable
                key={sectionRefreshKey}
                onEdit={handleEditSection}
                onDelete={() => setSectionRefreshKey((prev) => prev + 1)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

