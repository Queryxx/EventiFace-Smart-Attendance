import sql from "@/lib/db"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { student_number, first_name, last_name, year_level, course_id, section_id, face_encoding, photo } =
      await request.json()

    // Validate required fields
    if (!student_number || !first_name || !last_name) {
      return Response.json(
        { message: "Student number, first name, and last name are required" },
        { status: 400 },
      )
    }

    await sql(
      `UPDATE students SET student_number = $1, first_name = $2, last_name = $3, year_level = $4, course_id = $5, section_id = $6, face_encoding = $7, photo = $8
       WHERE id = $9`,
      [
        student_number,
        first_name,
        last_name,
        year_level || null,
        course_id || null,
        section_id || null,
        face_encoding ? face_encoding : null,
        photo || null,
        params.id,
      ],
    )

    return Response.json({ message: "Student updated" })
  } catch (error) {
    console.error("Error updating student:", error)
    return Response.json({ message: "Error updating student" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await sql("UPDATE students SET is_active = false WHERE id = $1", [params.id])
    return Response.json({ message: "Student deleted" })
  } catch (error) {
    console.error("Error deleting student:", error)
    return Response.json({ message: "Error deleting student" }, { status: 500 })
  }
}
