import { NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { put } from "@vercel/blob"

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { businesses: true }
    })

    if (!user || user.businesses.length === 0) {
      return NextResponse.json(
        { error: "Business profile not found" },
        { status: 404 }
      )
    }

    const business = user.businesses[0]

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const month = parseInt(formData.get('month') as string)
    const year = parseInt(formData.get('year') as string)
    const bankSource = formData.get('bank_source') as string

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      )
    }

    const fileName = file.name.toLowerCase()
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: "Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed" },
        { status: 400 }
      )
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Validate month and year
    if (!month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Invalid month" },
        { status: 400 }
      )
    }

    if (!year || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "Invalid year" },
        { status: 400 }
      )
    }

    // Validate bank source
    if (!bankSource || !['tbc', 'bog'].includes(bankSource)) {
      return NextResponse.json(
        { error: "Invalid bank source" },
        { status: 400 }
      )
    }

    // Upload file to Vercel Blob
    const fileBuffer = await file.arrayBuffer()
    const blob = await put(
      `statements/${business.id}/${year}-${month}-${Date.now()}-${file.name}`,
      fileBuffer,
      {
        access: 'public',
        addRandomSuffix: false
      }
    )

    // Create bank statement record
    const statement = await prisma.bankStatement.create({
      data: {
        businessId: business.id,
        month,
        year,
        bankSource,
        fileUrl: blob.url,
        fileName: file.name,
        status: 'uploaded'
      }
    })

    // Trigger async processing (fire and forget)
    fetch(`${process.env.NEXTAUTH_URL}/api/process/statement/${statement.id}`, {
      method: 'POST',
      headers: {
        'Cookie': req.headers.get('cookie') || ''
      }
    }).catch(err => console.error('Processing trigger failed:', err))

    return NextResponse.json(
      {
        statement: {
          id: statement.id,
          status: statement.status,
          file_name: statement.fileName
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "An error occurred during file upload" },
      { status: 500 }
    )
  }
}
