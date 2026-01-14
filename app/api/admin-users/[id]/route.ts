import sql from "@/lib/db"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { name, email } = await request.json()

    await sql("UPDATE admin_users SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3", [
      name,
      email,
      params.id,
    ])

    return Response.json({ message: "Admin updated" })
  } catch (error) {
    console.error("Error updating admin:", error)
    return Response.json({ message: "Error updating admin" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await sql("UPDATE admin_users SET is_active = false WHERE id = $1", [params.id])
    return Response.json({ message: "Admin deleted" })
  } catch (error) {
    console.error("Error deleting admin:", error)
    return Response.json({ message: "Error deleting admin" }, { status: 500 })
  }
}
