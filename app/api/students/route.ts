import sql from "@/lib/db"

export async function GET() {
  try {
    // Only select needed columns to reduce payload size
    const students = await sql("SELECT id, student_number, first_name, last_name, year_level, course_id, section_id, face_encoding FROM students ORDER BY first_name, last_name")
    return Response.json(students)
  } catch (error) {
    console.error("Error fetching students:", error)
    return Response.json({ message: "Error fetching students" }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const result = await sql(
      `INSERT INTO students (student_number, first_name, last_name, year_level, course_id, section_id, face_encoding, photo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        student_number,
        first_name,
        last_name,
        year_level || null,
        course_id || null,
        section_id || null,
        face_encoding ? face_encoding : null,
        photo || null,
      ],
    )

    return Response.json({ id: result[0].id }, { status: 201 })
  } catch (error) {
    console.error("Error creating student:", error)
    return Response.json({ message: "Error creating student" }, { status: 500 })
  }
}
