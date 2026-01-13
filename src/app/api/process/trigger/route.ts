import { NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { statement_id } = await req.json()

    if (!statement_id) {
      return NextResponse.json(
        { error: "Statement ID is required" },
        { status: 400 }
      )
    }

    // Get user and business
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { businesses: true }
    })

    if (!user || user.businesses.length === 0) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      )
    }

    const business = user.businesses[0]

    // Get statement
    const statement = await prisma.bankStatement.findUnique({
      where: { id: statement_id }
    })

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (statement.businessId !== business.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Trigger processing by calling the processing endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    console.log('Triggering processing for statement:', statement_id)
    console.log('Base URL:', baseUrl)

    const response = await fetch(`${baseUrl}/api/process/statement/${statement_id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('cookie') || ''
      }
    })

    const result = await response.json()

    console.log('Processing response:', response.status, result)

    if (!response.ok) {
      return NextResponse.json(
        {
          error: result.error || 'Processing failed to start',
          details: result.details || 'No additional details'
        },
        { status: response.status }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Processing started",
        result
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error("Trigger error:", error)
    return NextResponse.json(
      {
        error: "An error occurred",
        details: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
