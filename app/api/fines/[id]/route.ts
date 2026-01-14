import sql from "@/lib/db"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { status } = await request.json()

    if (!["paid", "unpaid"].includes(status)) {
      return Response.json({ message: "Invalid status" }, { status: 400 })
    }

    const result = await sql(
      "UPDATE fines SET status = $1 WHERE id = $2 RETURNING id, status",
      [status, params.id],
    )

    if (result.length === 0) {
      return Response.json({ message: "Fine not found" }, { status: 404 })
    }

    return Response.json(result[0])
  } catch (error) {
    console.error("Error updating fine:", error)
    return Response.json({ message: "Error updating fine" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await sql("DELETE FROM fines WHERE id = $1 RETURNING id", [params.id])

    if (result.length === 0) {
      return Response.json({ message: "Fine not found" }, { status: 404 })
    }

    return Response.json({ message: "Fine deleted" })
  } catch (error) {
    console.error("Error deleting fine:", error)
    return Response.json({ message: "Error deleting fine" }, { status: 500 })
  }
}
