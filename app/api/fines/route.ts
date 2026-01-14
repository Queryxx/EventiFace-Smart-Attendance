import sql from "@/lib/db"

export async function GET(request: Request) {
  try {
    const query = `
      SELECT 
        f.id,
        f.student_id,
        s.student_number,
        s.first_name,
        s.last_name,
        (s.first_name || ' ' || s.last_name) as student_name,
        f.amount,
        f.reason,
        f.date,
        COALESCE(f.status, 'unpaid') as status,
        f.created_at
      FROM fines f 
      JOIN students s ON f.student_id = s.id
      ORDER BY f.created_at DESC
    `
    
    const fines = await sql(query)
    return Response.json(fines)
  } catch (error) {
    console.error("Error fetching fines:", error)
    return Response.json({ message: "Error fetching fines" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { student_id, amount, reason, date } = await request.json()

    if (!student_id || !amount || !reason) {
      return Response.json({ message: "Missing required fields" }, { status: 400 })
    }

    const result = await sql(
      `INSERT INTO fines (student_id, amount, reason, date, status, event_id, attendance_id)
       VALUES ($1, $2, $3, $4, 'unpaid', NULL, NULL) 
       RETURNING id, student_id, amount, reason, date, status`,
      [student_id, parseFloat(amount), reason, date || new Date().toISOString().split("T")[0]],
    )

    return Response.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating fine:", error)
    return Response.json({ message: "Error creating fine" }, { status: 500 })
  }
}
