import { hashPassword } from "@/lib/auth"
import sql from "@/lib/db"
import { cookies } from "next/headers"

async function checkSuperAdmin() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("admin_session")?.value

    if (!sessionToken) return false

    const adminId = parseInt(sessionToken)
    if (isNaN(adminId)) return false

    const result = await sql("SELECT role FROM admins WHERE id = $1", [adminId])
    return result.length > 0 && result[0].role === 'superadmin'
  } catch (error) {
    console.error("Error checking super admin:", error)
    return false
  }
}

export async function GET() {
  if (!(await checkSuperAdmin())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    const admins = await sql("SELECT id, username, full_name, email, role FROM admins ORDER BY full_name")
    return Response.json(admins)
  } catch (error) {
    console.error("Error fetching admins:", error)
    return Response.json({ message: "Error fetching admins" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await checkSuperAdmin())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    const { username, full_name, email, password, role } = await request.json()

    if (!username || !full_name || !email || !password || !role) {
      return Response.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ message: "Invalid email format" }, { status: 400 })
    }

    if (password.length < 6) {
      return Response.json({ message: "Password must be at least 4 characters" }, { status: 400 })
    }

    // Validate role
    const validRoles = ['superadmin', 'fine_manager', 'receipt_manager', 'student_registrar']
    if (!validRoles.includes(role)) {
      return Response.json({ message: "Invalid role" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await sql("SELECT id FROM admins WHERE username = $1 OR email = $2", [username, email])
    if (existingUser.length > 0) {
      return Response.json({ message: "Username or email already registered" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    await sql("INSERT INTO admins (username, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)", [username, email, passwordHash, full_name, role])

    return Response.json({ message: "Admin created" }, { status: 201 })
  } catch (error) {
    console.error("Error creating admin:", error)
    return Response.json({ message: "Error creating admin" }, { status: 500 })
  }
}
