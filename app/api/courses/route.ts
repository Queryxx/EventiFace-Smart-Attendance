import sql from "@/lib/db"

export async function GET() {
  try {
    const courses = await sql("SELECT * FROM courses ORDER BY course_name")
    return Response.json(courses)
  } catch (error) {
    console.error("Error fetching courses:", error)
    return Response.json({ message: "Error fetching courses" }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
