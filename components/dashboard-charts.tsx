"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardData {
  totalStudents: number
  totalCourses: number
  totalEvents: number
  totalSections: number
  totalAttendance: number
  totalFines: number
  attendanceByStatus: Array<{ status: string; count: number }>
  finesByStatus: Array<{ status: string; count: number }>
  finesByCourse: Array<{ name: string; value: number }>
  monthlyAttendance: Array<{ month: string; present: number; am: number; pm: number }>
  studentStats: Array<{ name: string; value: number; color: string }>
}

interface DashboardChartsProps {
  data: DashboardData
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  const chartColors = [
    "hsl(var(--color-chart-1))",
    "hsl(var(--color-chart-2))",
    "hsl(var(--color-chart-3))",
    "hsl(var(--color-chart-4))",
    "hsl(var(--color-chart-5))",
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalStudents}</div>
          <p className="text-xs text-muted-foreground">Active enrollments</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalCourses}</div>
          <p className="text-xs text-muted-foreground">Courses offered</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalEvents}</div>
          <p className="text-xs text-muted-foreground">Scheduled events</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Fines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₱{(data.totalFines || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <p className="text-xs text-muted-foreground">Total fines collected</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function AttendanceChart({ data }: DashboardChartsProps) {
  const chartColors = ["hsl(var(--color-chart-1))", "hsl(var(--color-chart-2))", "hsl(var(--color-chart-3))"]

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Monthly Attendance Trend</CardTitle>
        <CardDescription>Students present per month (AM & PM sessions)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.monthlyAttendance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="present" fill={chartColors[0]} name="Total Present" />
            <Bar dataKey="am" fill={chartColors[1]} name="AM Session" />
            <Bar dataKey="pm" fill={chartColors[2]} name="PM Session" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function AttendanceStatusChart({ data }: DashboardChartsProps) {
  const chartColors = [
    "hsl(var(--color-chart-1))",
    "hsl(var(--color-chart-2))",
    "hsl(var(--color-chart-3))",
    "hsl(var(--color-chart-4))",
  ]

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Attendance by Status</CardTitle>
        <CardDescription>Current attendance distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.attendanceByStatus}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {data.attendanceByStatus.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function FinesChart({ data }: DashboardChartsProps) {
  // Don't render if there's no fines data
  if (!data.finesByStatus || data.finesByStatus.length === 0) {
    return null
  }

  const chartColors = ["hsl(var(--color-chart-1))", "hsl(var(--color-chart-2))", "hsl(var(--color-chart-3))"]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fines Status Distribution</CardTitle>
        <CardDescription>Fine payment status</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.finesByStatus}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill={chartColors[0]} name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function FinesByCourseChart({ data }: DashboardChartsProps) {
  // Check if data exists and has content
  if (!data?.finesByCourse || data.finesByCourse.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fines by Course</CardTitle>
          <CardDescription>Largest fines per course</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No fines data available</p>
        </CardContent>
      </Card>
    )
  }

  const chartColors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
    "#F8B88B",
    "#ABEBC6",
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fines by Course</CardTitle>
        <CardDescription>Largest fines per course</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.finesByCourse}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, value }) => `${name}: ₱${value.toFixed(0)}`}
            >
              {data.finesByCourse.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `₱${value.toFixed(2)}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function StudentComparisonChart({ data }: DashboardChartsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Attendance Comparison</CardTitle>
        <CardDescription>Present vs Absent Students</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.studentStats}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={2}
              label={({ name, value }) => `${name}: ${value} students`}
            >
              {data.studentStats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value} students`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
