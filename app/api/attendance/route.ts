import sql from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")

    if (eventId) {
      // Fetch attendance for a specific event with student and event details
      const records = await sql(
        `SELECT 
          a.id,
          a.student_id,
          a.event_id,
          a.session,
          a.type,
          a.time_recorded,
          a.recorded_at,
          s.student_number,
          s.first_name,
          s.last_name,
          s.year_level,
          s.course_id,
          s.section_id,
          s.photo,
          e.event_date,
          e.fine_amount
         FROM attendance a
         LEFT JOIN students s ON a.student_id = s.id
         LEFT JOIN events e ON a.event_id = e.id
         WHERE a.event_id = $1 
         ORDER BY a.recorded_at DESC`,
        [eventId],
      )

      return Response.json(records)
    } else {
      // Fetch all attendance records with student and event details
      const records = await sql(
        `SELECT 
          a.id,
          a.student_id,
          a.event_id,
          a.session,
          a.type,
          a.time_recorded,
          a.recorded_at,
          s.student_number,
          s.first_name,
          s.last_name,
          s.year_level,
          s.course_id,
          s.section_id,
          s.photo,
          e.event_date,
          e.event_name,
          e.fine_amount,
          CASE 
            WHEN a.type = 'IN' THEN 'PRESENT'
            ELSE 'CHECKED_OUT'
          END as status
         FROM attendance a
         LEFT JOIN students s ON a.student_id = s.id
         LEFT JOIN events e ON a.event_id = e.id
         ORDER BY a.recorded_at DESC`,
      )

      return Response.json(records)
    }
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return Response.json({ message: "Error fetching attendance" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Handle both single record and array of records formats
    const records = Array.isArray(body) ? body : Array.isArray(body.records) ? body.records : [body]

    for (const record of records) {
      // If event_id is not provided, we still need it for the database constraint
      if (!record.event_id) {
        console.warn("No event_id provided for attendance record")
        continue
      }

      // Extract session (AM/PM) and type (IN/OUT) from record
      const session = record.session || "AM"
      const type = record.type || "IN"

      await sql(
        `INSERT INTO attendance (student_id, event_id, session, type, time_recorded)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (student_id, event_id, session, type) DO UPDATE
         SET time_recorded = NOW()`,
        [record.student_id, record.event_id, session, type],
      )
    }

    return Response.json({ message: "Attendance recorded" }, { status: 201 })
  } catch (error) {
    console.error("Error recording attendance:", error)
    return Response.json({ message: "Error recording attendance" }, { status: 500 })
  }
}
