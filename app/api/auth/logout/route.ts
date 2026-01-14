import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete("admin_session")

  return Response.json({ message: "Logout successful" }, { status: 200 })
}
