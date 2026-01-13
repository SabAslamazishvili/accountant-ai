import { NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { createCipheriv, randomBytes, scrypt } from "crypto"
import { promisify } from "util"

const scryptAsync = promisify(scrypt)

// Encrypt rs.ge credentials
async function encryptCredential(text: string): Promise<string> {
  const algorithm = 'aes-256-ctr'
  const secretKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this-in-production'

  const key = (await scryptAsync(secretKey, 'salt', 32)) as Buffer
  const iv = randomBytes(16)
  const cipher = createCipheriv(algorithm, key, iv)

  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])

  return iv.toString('hex') + ':' + encrypted.toString('hex')
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

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if user already has a business
    const existingBusiness = await prisma.business.findFirst({
      where: { userId: user.id }
    })

    if (existingBusiness) {
      return NextResponse.json(
        { error: "You already have a business profile" },
        { status: 409 }
      )
    }

    const {
      company_name,
      tin,
      business_type,
      registration_date,
      preferred_banks,
      rs_ge_username,
      rs_ge_password
    } = await req.json()

    // Validate required fields
    if (!company_name) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      )
    }

    if (!tin) {
      return NextResponse.json(
        { error: "TIN is required" },
        { status: 400 }
      )
    }

    // Validate Georgian TIN format (9 or 11 digits)
    const tinRegex = /^\d{9}$|^\d{11}$/
    if (!tinRegex.test(tin)) {
      return NextResponse.json(
        { error: "Invalid TIN format. Must be 9 or 11 digits" },
        { status: 400 }
      )
    }

    // Validate at least one bank selected
    if (!preferred_banks || preferred_banks.length === 0) {
      return NextResponse.json(
        { error: "At least one bank must be selected" },
        { status: 400 }
      )
    }

    // Encrypt rs.ge credentials if provided
    let encryptedUsername = null
    let encryptedPassword = null

    if (rs_ge_username) {
      encryptedUsername = await encryptCredential(rs_ge_username)
    }

    if (rs_ge_password) {
      encryptedPassword = await encryptCredential(rs_ge_password)
    }

    // Create business
    const business = await prisma.business.create({
      data: {
        userId: user.id,
        companyName: company_name,
        tin,
        businessType: business_type || null,
        registrationDate: registration_date ? new Date(registration_date) : null,
        preferredBanks: preferred_banks,
        rsGeUsername: encryptedUsername,
        rsGePassword: encryptedPassword,
      }
    })

    // Create default notification settings
    await prisma.notificationSettings.create({
      data: {
        userId: user.id,
      }
    })

    return NextResponse.json(
      {
        business: {
          id: business.id,
          company_name: business.companyName,
          tin: business.tin,
          business_type: business.businessType,
          registration_date: business.registrationDate,
          preferred_banks: business.preferredBanks,
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Business creation error:", error)
    return NextResponse.json(
      { error: "An error occurred while creating business profile" },
      { status: 500 }
    )
  }
}
