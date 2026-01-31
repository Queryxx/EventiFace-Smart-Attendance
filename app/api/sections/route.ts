import sql from "@/lib/db"
import { cookies } from "next/headers"

async function checkRegistrarAccess() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value

  if (!sessionId) {
    return false
  }

  const session = await sql("SELECT user_id FROM sessions WHERE id = $1 AND expires_at > NOW()", [sessionId])

  if (session.length === 0) {
    return false
  }

  const user = await sql("SELECT role FROM admins WHERE id = $1", [session[0].user_id])

  if (user.length === 0) {
    return false
  }

  return user[0].role === "superadmin" || user[0].role === "student_registrar"
}

export async function GET(request: Request) {
  if (!(await checkRegistrarAccess())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("course_id")

    let query = "SELECT * FROM sections"
    const params: any[] = []

    if (courseId) {
      query += " WHERE course_id = $1"
      params.push(courseId)
    }

    query += " ORDER BY section_name"

    const sections = await sql(query, params)
    return Response.json(sections)
  } catch (error) {
    console.error("Error fetching sections:", error)
    return Response.json({ message: "Error fetching sections" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await checkRegistrarAccess())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    const { section_name, course_id } = await request.json()

    // Validate inputs
    if (!section_name || !course_id) {
      return Response.json(
        { message: "Section name and course ID are required" },
        { status: 400 },
      )
    }

    const result = await sql(
      `INSERT INTO sections (section_name, course_id)
       VALUES ($1, $2) RETURNING id`,
      [section_name, parseInt(course_id, 10)],
    )

    return Response.json({ id: result[0].id }, { status: 201 })
  } catch (error) {
    console.error("Error creating section:", error)
    return Response.json({ message: "Error creating section" }, { status: 500 })
  }
}
