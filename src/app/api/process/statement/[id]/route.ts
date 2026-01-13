import { NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { parseTBCStatement, parseBOGStatement } from "@/lib/bank-parser"
import { analyzeTransactions, calculateTaxes } from "@/lib/ai-processor"
import { sendProcessingComplete } from "@/lib/email"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Await params in Next.js 16
    const { id } = await params

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

    // Get bank statement
    const statement = await prisma.bankStatement.findUnique({
      where: { id }
    })

    if (!statement) {
      return NextResponse.json(
        { error: "Bank statement not found" },
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

    // Check if already processed
    if (statement.status === 'processed') {
      return NextResponse.json(
        { error: "Statement already processed" },
        { status: 400 }
      )
    }

    // Update status to processing
    await prisma.bankStatement.update({
      where: { id },
      data: { status: 'processing' }
    })

    try {
      // Download file from storage
      const response = await fetch(statement.fileUrl)
      if (!response.ok) {
        throw new Error('Failed to download file')
      }
      const fileBuffer = Buffer.from(await response.arrayBuffer())

      // Parse file based on bank source
      let parsedTransactions
      if (statement.bankSource === 'tbc') {
        parsedTransactions = await parseTBCStatement(fileBuffer)
      } else if (statement.bankSource === 'bog') {
        parsedTransactions = await parseBOGStatement(fileBuffer)
      } else {
        throw new Error('Unknown bank source')
      }

      // Analyze transactions with AI
      const analyzedTransactions = await analyzeTransactions(parsedTransactions)

      // Store transactions in database
      await prisma.transaction.createMany({
        data: analyzedTransactions.map(t => ({
          bankStatementId: statement.id,
          transactionDate: t.date,
          description: t.description,
          amount: t.amount,
          currency: t.currency,
          aiCategory: t.aiCategory,
          aiConfidence: t.aiConfidence,
          finalCategory: t.aiCategory // Initialize with AI category
        }))
      })

      // Calculate taxes
      const taxCalculations = await calculateTaxes(analyzedTransactions)

      // Create draft declarations
      const declarations: string[] = []

      // Create VAT declaration
      if (taxCalculations.vatAmount > 0) {
        await prisma.declaration.create({
          data: {
            businessId: business.id,
            bankStatementId: statement.id,
            declarationType: 'vat',
            month: statement.month,
            year: statement.year,
            status: 'draft',
            taxAmount: taxCalculations.vatAmount,
            declarationData: {
              totalIncome: taxCalculations.totalIncome,
              vatRate: 0.18,
              vatAmount: taxCalculations.vatAmount
            }
          }
        })
        declarations.push('vat')
      }

      // Create income tax declaration
      if (taxCalculations.incomeTaxAmount > 0) {
        await prisma.declaration.create({
          data: {
            businessId: business.id,
            bankStatementId: statement.id,
            declarationType: 'income_tax',
            month: statement.month,
            year: statement.year,
            status: 'draft',
            taxAmount: taxCalculations.incomeTaxAmount,
            declarationData: {
              totalIncome: taxCalculations.totalIncome,
              totalExpenses: taxCalculations.totalExpenses,
              profit: taxCalculations.totalIncome - taxCalculations.totalExpenses,
              taxRate: 0.15,
              taxAmount: taxCalculations.incomeTaxAmount
            }
          }
        })
        declarations.push('income_tax')
      }

      // Update statement status
      await prisma.bankStatement.update({
        where: { id },
        data: {
          status: 'processed',
          processedAt: new Date(),
          totalTransactions: analyzedTransactions.length
        }
      })

      // Create notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'processing_complete',
          title: 'Bank Statement Processed',
          message: `Your ${statement.bankSource.toUpperCase()} statement for ${statement.month}/${statement.year} has been processed. ${analyzedTransactions.length} transactions analyzed.`,
          read: false
        }
      })

      // Send email notification
      await sendProcessingComplete(
        { email: user.email, name: user.name },
        { companyName: business.companyName },
        {
          id: statement.id,
          month: statement.month,
          year: statement.year,
          totalTransactions: analyzedTransactions.length
        }
      )

      return NextResponse.json(
        {
          statement: {
            id: statement.id,
            status: 'processed',
            total_transactions: analyzedTransactions.length
          },
          declarations_created: declarations
        },
        { status: 200 }
      )

    } catch (processingError: any) {
      console.error("Processing error details:", processingError)

      // Update statement with error
      await prisma.bankStatement.update({
        where: { id },
        data: {
          status: 'error',
          errorMessage: processingError.message || 'Processing failed'
        }
      })

      return NextResponse.json(
        {
          error: processingError.message || 'Processing failed',
          details: processingError.stack || String(processingError)
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error("Processing error:", error)
    return NextResponse.json(
      {
        error: "An error occurred during processing",
        details: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
