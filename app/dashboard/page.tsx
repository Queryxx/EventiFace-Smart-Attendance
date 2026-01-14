import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import sql from "@/lib/db"
import { Sidebar } from "@/components/sidebar"
import { DashboardCharts, AttendanceChart, AttendanceStatusChart, FinesChart, FinesByCourseChart, StudentComparisonChart } from "@/components/dashboard-charts"

async function getDashboardData() {
  try {
    const totalStudents = await sql("SELECT COUNT(*) as count FROM students")
    const totalCourses = await sql("SELECT COUNT(*) as count FROM courses")
    const totalEvents = await sql("SELECT COUNT(*) as count FROM events")
    const totalSections = await sql("SELECT COUNT(*) as count FROM sections")
    const totalAttendance = await sql("SELECT COUNT(*) as count FROM attendance")

    // Fetch all courses for fine calculation
    const coursesData = await sql("SELECT id, course_name FROM courses")

    // Get ALL attendance records with session and type info
    const allAttendanceRecords = await sql(
      `SELECT 
        a.student_id,
        a.event_id,
        a.session,
        a.type,
        s.course_id,
        e.fine_amount
       FROM attendance a
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN events e ON a.event_id = e.id`
    )

    console.log("📊 Total raw attendance records:", allAttendanceRecords?.length)
    console.log("First record structure:", JSON.stringify(allAttendanceRecords?.[0], null, 2))
    console.log("Sample sessions in data:", [...new Set(allAttendanceRecords?.map((r: any) => r.session))].slice(0, 5))
    console.log("Sample types in data:", [...new Set(allAttendanceRecords?.map((r: any) => r.type))].slice(0, 5))
    
    // Debug: Show actual type values
    const typeValues = allAttendanceRecords?.map((r: any) => r.type)
    console.log("All type values sample:", typeValues?.slice(0, 10))
    console.log("Unique type values:", [...new Set(typeValues)])
    console.log("Count of type='IN':", allAttendanceRecords?.filter((r: any) => r.type === 'IN').length)
    console.log("Count of type='in':", allAttendanceRecords?.filter((r: any) => r.type === 'in').length)
    console.log("Count of type='OUT':", allAttendanceRecords?.filter((r: any) => r.type === 'OUT').length)
    console.log("Count of type='out':", allAttendanceRecords?.filter((r: any) => r.type === 'out').length)

    // Calculate fines by counting DISTINCT sessions per student-event (same as attendance page)
    // A session is counted as attended if there's ANY record (IN or OUT)
    const fineMap = new Map<string, { fine_amount: number; sessions: Set<string>; course_id: number }>()
    
    if (allAttendanceRecords && Array.isArray(allAttendanceRecords)) {
      allAttendanceRecords.forEach((record: any) => {
        const key = `${record.student_id}-${record.event_id}`
        if (!fineMap.has(key)) {
          fineMap.set(key, { fine_amount: Number(record.fine_amount) || 0, sessions: new Set(), course_id: record.course_id })
        }
        const entry = fineMap.get(key)
        if (entry && record.session) {
          entry.sessions.add(record.session) // Count any IN or OUT as attendance in that session
        }
      })
    }

    console.log("🔢 Student-event pairs with IN records:", fineMap.size)
    console.log("Sample pair:", fineMap.size > 0 ? Array.from(fineMap.entries())[0] : "no data")

    // Calculate total fines and fines by course
    // Count DISTINCT sessions per student-event as sessions attended
    let totalFinesAmount = 0
    const finesByCourseMap = new Map<number, { courseName: string; total: number }>()
    
    fineMap.forEach((entry) => {
      const sessionsAttended = entry.sessions.size // Count of distinct AM/PM sessions
      const sessionsMissed = 4 - sessionsAttended
      const fine = (Number(entry.fine_amount) / 4) * sessionsMissed
      totalFinesAmount += fine

      // Add to course totals
      const courseId = entry.course_id
      const course = coursesData.find((c: any) => c.id === courseId)
      const courseName = course ? course.course_name : `Course ${courseId}`
      
      if (!finesByCourseMap.has(courseId)) {
        finesByCourseMap.set(courseId, { courseName, total: 0 })
      }
      const courseEntry = finesByCourseMap.get(courseId)
      if (courseEntry) {
        courseEntry.total += fine
      }
    })

    // Convert to array and sort by total fines descending
    const finesByCourse = Array.from(finesByCourseMap.values())
      .sort((a, b) => b.total - a.total)
      .map(item => ({
        name: item.courseName,
        value: Math.round(item.total * 100) / 100
      }))

    console.log("💰 FINES CALCULATION:")
    console.log("Student-event pairs with fines:", fineMap.size)
    console.log("✅ TOTAL FINES CALCULATED:", totalFinesAmount)
    console.log("📈 Fines by Course (sample):", Array.from(finesByCourseMap.entries()).slice(0, 3))

    // Get student comparison data - students with fines vs without fines
    const studentComparison = await sql(`
      SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT CASE 
          WHEN a.student_id IS NOT NULL THEN s.id 
        END) as students_with_attendance,
        COUNT(DISTINCT CASE 
          WHEN a.student_id IS NOT NULL AND a.session IS NOT NULL THEN s.id 
        END) as students_present,
        COUNT(DISTINCT CASE 
          WHEN a.student_id IS NULL THEN s.id 
        END) as students_absent
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
    `)

    console.log("👥 Student Comparison Data:", studentComparison)

    const studentStats = [
      { name: "Present", value: Number(studentComparison[0]?.students_present) || 0, color: "#10b981" },
      { name: "Absent", value: Number(studentComparison[0]?.students_absent) || 0, color: "#ef4444" }
    ]

    // Get real monthly attendance data from database
    const monthlyData = await sql(`
      SELECT 
        DATE_TRUNC('month', a.recorded_at) as month,
        COUNT(DISTINCT a.student_id) as present,
        COUNT(DISTINCT CASE WHEN a.session = 'AM' THEN a.student_id END) as am_count,
        COUNT(DISTINCT CASE WHEN a.session = 'PM' THEN a.student_id END) as pm_count
      FROM attendance a
      WHERE a.recorded_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', a.recorded_at)
      ORDER BY month ASC
    `)

    // Format monthly data for chart
    const monthlyAttendance = monthlyData.map((row: any) => {
      const date = new Date(row.month)
      const monthName = date.toLocaleString('en-US', { month: 'short' })
      return {
        month: monthName,
        present: Number(row.present) || 0,
        am: Number(row.am_count) || 0,
        pm: Number(row.pm_count) || 0,
      }
    })

    console.log("📅 Monthly Attendance Data:", monthlyAttendance)

    return {
      totalStudents: totalStudents[0]?.count || 0,
      totalCourses: totalCourses[0]?.count || 0,
      totalEvents: totalEvents[0]?.count || 0,
      totalSections: totalSections[0]?.count || 0,
      totalAttendance: totalAttendance[0]?.count || 0,
      totalFines: totalFinesAmount,
      attendanceByStatus: [],
      finesByStatus: [],
      finesByCourse,
      monthlyAttendance,
      studentStats,
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return {
      totalStudents: 0,
      totalCourses: 0,
      totalEvents: 0,
      totalSections: 0,
      totalAttendance: 0,
      totalFines: 0,
      attendanceByStatus: [],
      finesByStatus: [],
      finesByCourse: [],
      monthlyAttendance: [],
      studentStats: [],
    }
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get("admin_session")

  if (!session) {
    redirect("/login")
  }

  const data = await getDashboardData()

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-8 bg-background">
        <div className="max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to the Smart Attendance System</p>
          </div>

          <DashboardCharts data={data} />

          <div className="grid gap-6 md:grid-cols-2">
            <AttendanceChart data={data} />
            <StudentComparisonChart data={data} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FinesChart data={data} />
          </div>

          <div className="grid gap-6 md:grid-cols-1">
            <FinesByCourseChart data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
