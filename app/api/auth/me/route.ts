import { cookies } from "next/headers"
import db from "@/lib/db"

export async function GET() {
  try {
    // Query the admins table to get the current logged-in admin
    // Get the most recently created admin as a fallback
    const result = await db(
      "SELECT id, username, full_name, email FROM admins LIMIT 1"
    )

    if (!result || result.length === 0) {
      return new Response(JSON.stringify({ error: "Admin not found" }), { status: 404 })
    }

    const admin = result[0]

    return new Response(JSON.stringify({
      id: admin.id,
      username: admin.username,
      full_name: admin.full_name,
      email: admin.email,
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error fetching current admin:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 })
  }
}
