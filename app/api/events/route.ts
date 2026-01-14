import sql from "@/lib/db"

export async function GET() {
  try {
    const events = await sql("SELECT * FROM events ORDER BY event_date DESC")
    return Response.json(events)
  } catch (error) {
    console.error("Error fetching events:", error)
    return Response.json({ message: "Error fetching events" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const {
      event_name,
      event_date,
      start_time,
      end_time,
      fine_amount,
      course_id,
      am_in_start_time,
      am_in_end_time,
      am_out_start_time,
      am_out_end_time,
      pm_in_start_time,
      pm_in_end_time,
      pm_out_start_time,
      pm_out_end_time,
    } = await request.json()

    // Validate required fields
    if (!event_name || !event_date || !start_time || !end_time || fine_amount === undefined) {
      return Response.json(
        { message: "Event name, date, start time, end time, and fine amount are required" },
        { status: 400 },
      )
    }

    const result = await sql(
      `INSERT INTO events (
        event_name, 
        event_date, 
        start_time, 
        end_time, 
        fine_amount, 
        course_id,
        am_in_start_time,
        am_in_end_time,
        am_out_start_time,
        am_out_end_time,
        pm_in_start_time,
        pm_in_end_time,
        pm_out_start_time,
        pm_out_end_time
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
      [
        event_name,
        event_date,
        start_time,
        end_time,
        parseFloat(fine_amount),
        course_id || null,
        am_in_start_time || null,
        am_in_end_time || null,
        am_out_start_time || null,
        am_out_end_time || null,
        pm_in_start_time || null,
        pm_in_end_time || null,
        pm_out_start_time || null,
        pm_out_end_time || null,
      ],
    )

    return Response.json({ id: result[0].id }, { status: 201 })
  } catch (error) {
    console.error("Error creating event:", error)
    return Response.json({ message: "Error creating event" }, { status: 500 })
  }
}
