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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!(await checkRegistrarAccess())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    const { section_name, course_id, capacity, instructor_name, semester } = await request.json()

    await sql(
      `UPDATE sections SET section_name = $1, course_id = $2, capacity = $3, instructor_name = $4, semester = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [section_name, course_id, capacity, instructor_name, semester, params.id],
    )

    return Response.json({ message: "Section updated" })
  } catch (error) {
    console.error("Error updating section:", error)
    return Response.json({ message: "Error updating section" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!(await checkRegistrarAccess())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    await sql("UPDATE sections SET is_active = false WHERE id = $1", [params.id])
    return Response.json({ message: "Section deleted" })
  } catch (error) {
    console.error("Error deleting section:", error)
    return Response.json({ message: "Error deleting section" }, { status: 500 })
  }
}
