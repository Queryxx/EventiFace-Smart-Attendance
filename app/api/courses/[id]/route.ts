import sql from "@/lib/db"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { course_name, course_code } = await request.json()

    await sql(
      `UPDATE courses SET course_name = $1, course_code = $2 WHERE id = $3`,
      [course_name, course_code, params.id],
    )

    return Response.json({ message: "Course updated" })
  } catch (error) {
    console.error("Error updating course:", error)
    return Response.json({ message: "Error updating course" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await sql("DELETE FROM courses WHERE id = $1", [params.id])
    return Response.json({ message: "Course deleted" })
  } catch (error) {
    console.error("Error deleting course:", error)
    return Response.json({ message: "Error deleting course" }, { status: 500 })
  }
}
