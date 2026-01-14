import sql from "@/lib/db"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
  try {
    await sql("UPDATE sections SET is_active = false WHERE id = $1", [params.id])
    return Response.json({ message: "Section deleted" })
  } catch (error) {
    console.error("Error deleting section:", error)
    return Response.json({ message: "Error deleting section" }, { status: 500 })
  }
}
