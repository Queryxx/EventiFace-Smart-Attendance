import sql from "@/lib/db"
import { cookies } from "next/headers"

async function checkRegistrarAccess() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("admin_session")?.value

    if (!sessionToken) return false

    const adminId = parseInt(sessionToken)
    if (isNaN(adminId)) return false

    const result = await sql("SELECT role FROM admins WHERE id = $1", [adminId])
    return result.length > 0 && ['superadmin', 'student_registrar'].includes(result[0].role)
  } catch (error) {
    console.error("Error checking registrar access:", error)
    return false
  }
}

export async function GET() {
  if (!(await checkRegistrarAccess())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    const courses = await sql("SELECT * FROM courses ORDER BY course_name")
    return Response.json(courses)
  } catch (error) {
    console.error("Error fetching courses:", error)
    return Response.json({ message: "Error fetching courses" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await checkRegistrarAccess())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    const { course_name, course_code } = await request.json()

    const result = await sql(
      `INSERT INTO courses (course_name, course_code)
       VALUES ($1, $2) RETURNING id`,
      [course_name, course_code],
    )

    return Response.json({ id: result[0].id }, { status: 201 })
  } catch (error) {
    console.error("Error creating course:", error)
    return Response.json({ message: "Error creating course" }, { status: 500 })
  }
}
