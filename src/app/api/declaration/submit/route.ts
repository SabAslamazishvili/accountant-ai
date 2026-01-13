import { NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { rsgeClient } from "@/lib/rsge-client"
import { sendSubmissionConfirmation } from "@/lib/email"
import { createDecipheriv, scrypt } from "crypto"
import { promisify } from "util"

const scryptAsync = promisify(scrypt)

// Decrypt rs.ge credentials
async function decryptCredential(encryptedText: string): Promise<string> {
  const algorithm = 'aes-256-ctr'
  const secretKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this-in-production'

  const [iv, encrypted] = encryptedText.split(':')

  const key = (await scryptAsync(secretKey, 'salt', 32)) as Buffer
  const decipher = createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final()
  ])

  return decrypted.toString()
}

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { declaration_id } = await req.json()

    if (!declaration_id) {
      return NextResponse.json(
        { error: "Declaration ID is required" },
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

    // Get declaration
    const declaration = await prisma.declaration.findUnique({
      where: { id: declaration_id }
    })

    if (!declaration) {
      return NextResponse.json(
        { error: "Declaration not found" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (declaration.businessId !== business.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Check if already submitted
    if (declaration.status === 'submitted' || declaration.status === 'accepted') {
      return NextResponse.json(
        { error: "Declaration already submitted" },
        { status: 400 }
      )
    }

    // Check for rs.ge credentials
    if (!business.rsGeUsername || !business.rsGePassword) {
      return NextResponse.json(
        { error: "rs.ge credentials not configured. Please add them in Settings." },
        { status: 400 }
      )
    }

    // Decrypt credentials
    const rsGeUsername = await decryptCredential(business.rsGeUsername)
    const rsGePassword = await decryptCredential(business.rsGePassword)

    // Submit to rs.ge
    let result
    try {
      if (declaration.declarationType === 'vat') {
        result = await rsgeClient.submitVATDeclaration(
          {
            tin: business.tin,
            month: declaration.month,
            year: declaration.year,
            declarationType: 'VAT',
            taxAmount: Number(declaration.taxAmount),
            formData: declaration.declarationData as Record<string, any>
          },
          { username: rsGeUsername, password: rsGePassword }
        )
      } else if (declaration.declarationType === 'income_tax') {
        result = await rsgeClient.submitIncomeTaxDeclaration(
          {
            tin: business.tin,
            month: declaration.month,
            year: declaration.year,
            declarationType: 'INCOME_TAX',
            taxAmount: Number(declaration.taxAmount),
            formData: declaration.declarationData as Record<string, any>
          },
          { username: rsGeUsername, password: rsGePassword }
        )
      } else {
        return NextResponse.json(
          { error: "Unsupported declaration type" },
          { status: 400 }
        )
      }

      if (!result.success) {
        // If submission failed, keep as draft and return error
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'submission_error',
            title: 'Declaration Submission Failed',
            message: `Failed to submit declaration: ${result.error}`,
            read: false,
            relatedDeclarationId: declaration.id
          }
        })

        return NextResponse.json(
          { error: result.error || 'Submission failed' },
          { status: 502 }
        )
      }

      // Update declaration status
      await prisma.declaration.update({
        where: { id: declaration_id },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
          rsGeConfirmation: result.confirmation
        }
      })

      // Create success notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'submission_success',
          title: 'Declaration Submitted Successfully',
          message: `Your ${declaration.declarationType} declaration for ${declaration.month}/${declaration.year} has been submitted to rs.ge. Confirmation: ${result.confirmation}`,
          read: false,
          relatedDeclarationId: declaration.id
        }
      })

      // Send confirmation email
      await sendSubmissionConfirmation(
        { email: user.email, name: user.name },
        { companyName: business.companyName },
        {
          id: declaration.id,
          month: declaration.month,
          year: declaration.year,
          declarationType: declaration.declarationType,
          rsGeConfirmation: result.confirmation
        }
      )

      return NextResponse.json(
        {
          success: true,
          confirmation: result.confirmation,
          submitted_at: new Date().toISOString()
        },
        { status: 200 }
      )

    } catch (rsgeError: any) {
      console.error('rs.ge submission error:', rsgeError)

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'submission_error',
          title: 'Declaration Submission Failed',
          message: `Technical error during submission: ${rsgeError.message}`,
          read: false,
          relatedDeclarationId: declaration.id
        }
      })

      return NextResponse.json(
        { error: "rs.ge service error. Please try again later." },
        { status: 502 }
      )
    }

  } catch (error) {
    console.error("Submission error:", error)
    return NextResponse.json(
      { error: "An error occurred during submission" },
      { status: 500 }
    )
  }
}
