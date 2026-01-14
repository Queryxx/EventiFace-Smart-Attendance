"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatReadableDate, formatTo12Hour } from "@/lib/utils"

interface SessionTime {
  in?: string
  out?: string
}

interface SessionData {
  AM: SessionTime
  PM: SessionTime
}

interface GroupedAttendance {
  student_id: number
  student_number: string
  first_name: string
  last_name: string
  course_id: number
  year_level: number
  section_id: number
  photo: string
  event_id: number
  event_date: string
  event_name: string
  fine_amount: number
  sessions: SessionData
  sessionsAttended: number
}

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [groupedRecords, setGroupedRecords] = useState<GroupedAttendance[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterEvent, setFilterEvent] = useState("all")
  const [filterCourse, setFilterCourse] = useState("all")
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Fetch attendance records
        const attendanceRes = await fetch("/api/attendance")
        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json()
          setAttendanceRecords(attendanceData)
          
          // Group records by student and event
          const grouped = groupAttendanceByStudent(attendanceData)
          setGroupedRecords(grouped)
        }

        // Fetch courses
        const coursesRes = await fetch("/api/courses")
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json()
          setCourses(coursesData)
        }

        // Fetch events
        const eventsRes = await fetch("/api/events")
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          setEvents(eventsData)
        }

        // Fetch sections
        const sectionsRes = await fetch("/api/sections")
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json()
          setSections(sectionsData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const groupAttendanceByStudent = (records: any[]): GroupedAttendance[] => {
    const groupMap = new Map<string, any>()

    records.forEach((record) => {
      const key = `${record.student_id}-${record.event_id}`
      
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          student_id: record.student_id,
          student_number: record.student_number,
          first_name: record.first_name,
          last_name: record.last_name,
          course_id: record.course_id,
          year_level: record.year_level,
          section_id: record.section_id,
          photo: record.photo,
          event_id: record.event_id,
          event_date: record.event_date,
          event_name: record.event_name,
          fine_amount: record.fine_amount || 0,
          sessions: {
            AM: {},
            PM: {},
          },
          sessionsAttended: 0,
        })
      }

      const grouped = groupMap.get(key)
      const session = record.session || "AM"
      const type = record.type || "IN"
      const time = record.time_recorded
        ? new Date(record.time_recorded).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : ""

      if (type === "IN") {
        grouped.sessions[session].in = time
      } else if (type === "OUT") {
        grouped.sessions[session].out = time
      }
    })

    // Calculate sessions attended (count non-empty session data)
    groupMap.forEach((record) => {
      let count = 0
      if (record.sessions.AM.in || record.sessions.AM.out) count++
      if (record.sessions.PM.in || record.sessions.PM.out) count++
      record.sessionsAttended = count
    })

    return Array.from(groupMap.values())
  }

  // Helper function to abbreviate course names
  const abbreviateCourseName = (fullName: string): string => {
    const abbreviations: { [key: string]: string } = {
      "Bachelor of Science in Information Technology": "BSIT",
      "Bachelor of Science in Computer Science": "BSCS",
      "Bachelor of Science in Information Systems": "BSIS",
      "Bachelor of Arts": "BA",
      "Bachelor of Science": "BS",
      "Master of Science": "MS",
      "Master of Business Administration": "MBA",
    }

    // Check for exact matches first
    if (abbreviations[fullName]) {
      return abbreviations[fullName]
    }

    // If no exact match, return original
    return fullName
  }

  // Helper function to get course name by ID
  const getCourseName = (courseId: number) => {
    const course = courses.find((c) => c.id === courseId)
    if (!course) return "N/A"
    return abbreviateCourseName(course.course_name)
  }

  // Helper function to get section name by ID
  const getSectionName = (sectionId: number) => {
    const section = sections.find((s) => s.id === sectionId)
    return section ? section.section_name : "N/A"
  }

  // Filter records based on search term and filters
  const filteredRecords = groupedRecords.filter((record) => {
    const matchesSearch =
      record.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.student_number?.includes(searchTerm)

    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "present" && record.sessionsAttended >= 2) ||
      (filterStatus === "partial" && record.sessionsAttended === 1) ||
      (filterStatus === "absent" && record.sessionsAttended === 0)

    const matchesEvent = filterEvent === "all" || record.event_id.toString() === filterEvent

    const matchesCourse = filterCourse === "all" || record.course_id.toString() === filterCourse

    return matchesSearch && matchesStatus && matchesEvent && matchesCourse
  })

  // Calculate fine based on sessions MISSED (not attended)
  const calculateFinePerSession = (totalFine: number, sessionsAttended: number) => {
    // Fine is calculated for sessions NOT attended
    // If attended 1 session out of 4, they missed 3 sessions
    // Fine = (totalFine / 4) * sessionsNotAttended
    const sessionsMissed = 4 - sessionsAttended
    return (totalFine / 4) * sessionsMissed
  }

  const getStatusColor = (sessionsAttended: number) => {
    if (sessionsAttended === 0) {
      return "bg-red-100 text-red-800"
    } else if (sessionsAttended === 1) {
      return "bg-yellow-100 text-yellow-800"
    } else {
      return "bg-green-100 text-green-800"
    }
  }

  const getStatusText = (sessionsAttended: number) => {
    if (sessionsAttended === 0) return "ABSENT"
    if (sessionsAttended === 1) return "PARTIAL"
    if (sessionsAttended === 2) return "PRESENT"
    if (sessionsAttended === 3) return "PRESENT"
    return "FULL PRESENT"
  }

  // Export to Excel function
  const exportToExcel = () => {
    try {
      // Create CSV content
      const headers = ['ID', 'Name', 'Course', 'Section', 'Event', 'AM IN', 'AM OUT', 'PM IN', 'PM OUT', 'Status', 'Fine']
      const rows = filteredRecords.map((record) => {
        const amIn = record.sessions?.AM?.in ? formatTo12Hour(record.sessions.AM.in) : 'ABSENT'
        const amOut = record.sessions?.AM?.out ? formatTo12Hour(record.sessions.AM.out) : 'ABSENT'
        const pmIn = record.sessions?.PM?.in ? formatTo12Hour(record.sessions.PM.in) : 'ABSENT'
        const pmOut = record.sessions?.PM?.out ? formatTo12Hour(record.sessions.PM.out) : 'ABSENT'
        const fineAmount = calculateFinePerSession(record.fine_amount || 0, record.sessionsAttended)

        return [
          record.student_number,
          `${record.last_name}, ${record.first_name}`,
          getCourseName(record.course_id),
          getSectionName(record.section_id),
          record.event_name || 'N/A',
          amIn,
          amOut,
          pmIn,
          pmOut,
          getStatusText(record.sessionsAttended),
          `P ${fineAmount.toFixed(2)}`,
        ]
      })

      // Convert to CSV
      const csvContent = [
        [`Attendance Records Report - ${new Date().toLocaleDateString()}`],
        [],
        [headers.join(',')],
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `attendance-records-${new Date().toLocaleDateString()}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setExportDialogOpen(false)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Error exporting to Excel. Please try again.')
    }
  }

  // Export to PDF function
  const exportToPDF = async () => {
    setExportDialogOpen(false)
    try {
      const jsPDF = (await import('jspdf')).jsPDF
      const autoTable = (await import('jspdf-autotable')).default
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      let currentY = 10

      // Add Logo from public folder
      try {
        const logoPath = 'public/pdf-logo.png'
        const response = await fetch('/pdf-logo.png')
        const blob = await response.blob()
        const reader = new FileReader()
        
        await new Promise<void>((resolve, reject) => {
          reader.onload = () => {
            try {
              const logoWidth = 28
              const logoHeight = 28
              const logoX = (pageWidth - logoWidth) / 2
              pdf.addImage(reader.result as string, 'PNG', logoX, currentY, logoWidth, logoHeight)
              currentY += logoHeight + 3
              resolve()
            } catch (error) {
              reject(error)
            }
          }
          reader.onerror = () => reject(new Error('Failed to read logo'))
          reader.readAsDataURL(blob)
        })
      } catch (error) {
        console.log('Logo not loaded, continuing without it:', error)
        currentY += 3
      }

      // Add Title and Description centered
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Attendance Records Report', pageWidth / 2, currentY, { align: 'center' })
      currentY += 6

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const selectedEvent = events.find((e) => e.id.toString() === filterEvent)
      const eventDescription = selectedEvent ? `Record of Attendance within: ${selectedEvent.event_name}` : 'Record of Attendance'
      pdf.text(eventDescription, pageWidth / 2, currentY, { align: 'center' })
      currentY += 5

      // Date info
      pdf.setFontSize(9)
      pdf.text(`Date Generated: ${new Date().toLocaleDateString()} | Total Records: ${filteredRecords.length}`, pageWidth / 2, currentY, { align: 'center' })
      currentY += 2

      // Prepare table data
      const tableData = filteredRecords.map((record) => {
        const amIn = record.sessions?.AM?.in ? formatTo12Hour(record.sessions.AM.in) : 'ABSENT'
        const amOut = record.sessions?.AM?.out ? formatTo12Hour(record.sessions.AM.out) : 'ABSENT'
        const pmIn = record.sessions?.PM?.in ? formatTo12Hour(record.sessions.PM.in) : 'ABSENT'
        const pmOut = record.sessions?.PM?.out ? formatTo12Hour(record.sessions.PM.out) : 'ABSENT'
        const fineAmount = calculateFinePerSession(record.fine_amount || 0, record.sessionsAttended)

        return [
          String(record.student_number || ''),
          `${record.last_name || ''}, ${record.first_name || ''}`,
          String(getCourseName(record.course_id) || 'N/A'),
          String(getSectionName(record.section_id) || 'N/A'),
          String(record.event_name || 'N/A'),
          String(amIn),
          String(amOut),
          String(pmIn),
          String(pmOut),
          String(getStatusText(record.sessionsAttended)),
          `P ${fineAmount.toFixed(2)}`,
        ]
      })

      // Calculate available width (landscape A4: 297mm)
      const marginLeft = 8
      const marginRight = 8
      const availableWidth = pageWidth - marginLeft - marginRight

      // Create table using autoTable
      autoTable(pdf, {
        startY: currentY + 2,
        head: [['ID', 'Name', 'Course', 'Section', 'Event', 'AM IN', 'AM OUT', 'PM IN', 'PM OUT', 'Status', 'Fine']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 2,
          halign: 'center',
          valign: 'middle',
          lineColor: [30, 100, 160],
          lineWidth: 0.5,
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 1.5,
          halign: 'center',
          valign: 'middle',
          lineColor: [180, 180, 180],
          lineWidth: 0.3,
        },
        alternateRowStyles: {
          fillColor: [240, 245, 250],
        },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.08 },
          1: { cellWidth: availableWidth * 0.15, halign: 'left' },
          2: { cellWidth: availableWidth * 0.10 },
          3: { cellWidth: availableWidth * 0.08 },
          4: { cellWidth: availableWidth * 0.12 },
          5: { cellWidth: availableWidth * 0.08 },
          6: { cellWidth: availableWidth * 0.08 },
          7: { cellWidth: availableWidth * 0.08 },
          8: { cellWidth: availableWidth * 0.08 },
          9: { cellWidth: availableWidth * 0.08 },
          10: { cellWidth: availableWidth * 0.09, halign: 'right' },
        },
        margin: { top: 28, right: marginRight, bottom: 12, left: marginLeft },
        didDrawPage: function (data: any) {
          // Footer
          const pageSize = pdf.internal.pageSize
          const pageHeight = pageSize.getHeight()
          const pageWidth = pageSize.getWidth()
          pdf.setFontSize(8)
          pdf.setTextColor(100, 100, 100)
          pdf.text(
            `Page ${data.pageNumber}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
          )
        },
      })

      pdf.save(`attendance-records-${new Date().toLocaleDateString()}.pdf`)
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      alert('Error exporting to PDF. Please try again.')
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-background">
        <div className="max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Attendance Management</h1>
            <p className="text-muted-foreground">View all student attendance records</p>
          </div>

          <Tabs defaultValue="all-attendance" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all-attendance">All Attendance Records</TabsTrigger>
            </TabsList>

            <TabsContent value="all-attendance" className="space-y-4">
              {/* Summary Stats - Moved to top */}
              {!loading && groupedRecords.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-600 font-semibold mb-1">PRESENT</p>
                    <p className="text-2xl font-bold text-green-700">
                      {filteredRecords.filter((r) => r.sessionsAttended >= 2).length}
                    </p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm text-yellow-600 font-semibold mb-1">PARTIAL</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      {filteredRecords.filter((r) => r.sessionsAttended === 1).length}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-red-600 font-semibold mb-1">ABSENT</p>
                    <p className="text-2xl font-bold text-red-700">
                      {filteredRecords.filter((r) => r.sessionsAttended === 0).length}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-600 font-semibold mb-1">TOTAL FINES</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ₱{filteredRecords.reduce((sum, r) => sum + calculateFinePerSession(r.fine_amount, r.sessionsAttended), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex gap-4 mb-6 items-center flex-wrap">
                <Input
                  placeholder="Search by student name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 min-w-[250px]"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-input rounded-md bg-background text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="partial">Partial</option>
                  <option value="absent">Absent</option>
                </select>
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="px-4 py-2 border border-input rounded-md bg-background text-sm"
                >
                  <option value="all">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {abbreviateCourseName(course.course_name)}
                    </option>
                  ))}
                </select>
                <select
                  value={filterEvent}
                  onChange={(e) => setFilterEvent(e.target.value)}
                  className="px-4 py-2 border border-input rounded-md bg-background text-sm"
                >
                  <option value="all">All Events</option>
                  {events && events.length > 0 ? (
                    events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.event_name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No events available</option>
                  )}
                </select>
                <Button
                  onClick={() => setExportDialogOpen(true)}
                  disabled={filteredRecords.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  📥 Export
                </Button>
              </div>

              {/* Export Format Dialog */}
              <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Attendance Records</DialogTitle>
                    <DialogDescription>
                      Choose the format you want to export the attendance records in.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-4 justify-center mt-6">
                    <Button
                      onClick={exportToPDF}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                    >
                      📄 Export as PDF
                    </Button>
                    <Button
                      onClick={exportToExcel}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                    >
                      📊 Export as Excel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Attendance Table */}
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <Table className="w-full" id="attendance-table">
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="font-bold">Photo</TableHead>
                      <TableHead className="font-bold">Student ID</TableHead>
                      <TableHead className="font-bold">Student Name</TableHead>
                      <TableHead className="font-bold">Course</TableHead>
                      <TableHead className="font-bold">Section</TableHead>
                      <TableHead className="font-bold">Year</TableHead>
                      <TableHead className="font-bold">Event</TableHead>
                      <TableHead className="font-bold">Event Date</TableHead>
                      <TableHead className="font-bold">AM Session</TableHead>
                      <TableHead className="font-bold">PM Session</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="font-bold">Fine per Session</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8">
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                          No attendance records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            {record.photo ? (
                              <img
                                src={record.photo}
                                alt={`${record.first_name} ${record.last_name}`}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
                                {record.first_name?.charAt(0)}{record.last_name?.charAt(0)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900">
                            {record.student_number}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {record.last_name}, {record.first_name}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {getCourseName(record.course_id)}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {getSectionName(record.section_id)}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                              Year {record.year_level}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-700 font-medium whitespace-nowrap">
                            {record.event_name || "N/A"}
                          </TableCell>
                          <TableCell>
                            {record.event_date
                              ? formatReadableDate(record.event_date)
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            <div className="space-y-1">
                              <div>
                                IN: {record.sessions.AM.in ? (
                                  <span className="text-green-700 font-semibold">{formatTo12Hour(record.sessions.AM.in)}</span>
                                ) : (
                                  <span className="text-red-700 font-bold">- A</span>
                                )}
                              </div>
                              <div>
                                OUT: {record.sessions.AM.out ? (
                                  <span className="text-green-700 font-semibold">{formatTo12Hour(record.sessions.AM.out)}</span>
                                ) : (
                                  <span className="text-red-700 font-bold">- A</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            <div className="space-y-1">
                              <div>
                                IN: {record.sessions.PM.in ? (
                                  <span className="text-green-700 font-semibold">{formatTo12Hour(record.sessions.PM.in)}</span>
                                ) : (
                                  <span className="text-red-700 font-bold">- A</span>
                                )}
                              </div>
                              <div>
                                OUT: {record.sessions.PM.out ? (
                                  <span className="text-green-700 font-semibold">{formatTo12Hour(record.sessions.PM.out)}</span>
                                ) : (
                                  <span className="text-red-700 font-bold">- A</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(record.sessionsAttended)}`}>
                              {getStatusText(record.sessionsAttended)}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900">
                            ₱{calculateFinePerSession(record.fine_amount, record.sessionsAttended).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
