import { hashPassword } from "@/lib/auth"
import sql from "@/lib/db"

export async function GET() {
  try {
    const admins = await sql("SELECT id, username, full_name FROM admins ORDER BY full_name")
    return Response.json(admins)
  } catch (error) {
    console.error("Error fetching admins:", error)
    return Response.json({ message: "Error fetching admins" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { username, full_name, password } = await request.json()

    if (!username || !full_name || !password) {
      return Response.json({ message: "Missing required fields" }, { status: 400 })
    }

    const passwordHash = hashPassword(password)

    await sql("INSERT INTO admins (username, full_name, password_hash) VALUES ($1, $2, $3)", [username, full_name, passwordHash])

    return Response.json({ message: "Admin created" }, { status: 201 })
  } catch (error) {
    console.error("Error creating admin:", error)
    return Response.json({ message: "Error creating admin" }, { status: 500 })
  }
}
