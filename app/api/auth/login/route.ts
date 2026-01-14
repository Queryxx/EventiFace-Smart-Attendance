import { verifyPassword } from "@/lib/auth"
import sql from "@/lib/db"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return Response.json({ message: "Missing username or password" }, { status: 400 })
    }

    const users = await sql("SELECT id, password_hash FROM admins WHERE username = $1", [username])

    if (users.length === 0) {
      return Response.json({ message: "Invalid credentials" }, { status: 401 })
    }

    const user = users[0]
    const isPasswordValid = await verifyPassword(password, user.password_hash)

    if (!isPasswordValid) {
      return Response.json({ message: "Invalid credentials" }, { status: 401 })
    }

    // Create session
    const sessionToken = String(user.id)
    const cookieStore = await cookies()
    cookieStore.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    })

    return Response.json({ message: "Login successful", success: true }, { status: 200 })
  } catch (error) {
    console.error("Login error:", error)
    return Response.json({ message: "Login failed" }, { status: 500 })
  }
}
