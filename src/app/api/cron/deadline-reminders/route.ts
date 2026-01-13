import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendDeadlineReminder } from "@/lib/email"

export async function GET(req: Request) {
  try {
    // Verify cron secret (Vercel Cron sends this header)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Calculate deadline for previous month
    // Georgian tax deadlines: 15th of following month
    // Example: January declarations due by February 15th
    const deadlineDay = 15
    const deadlineDate = new Date(currentYear, currentMonth - 1, deadlineDay)

    // Calculate days until deadline
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Get all businesses with users who have notification settings enabled
    const usersWithSettings = await prisma.notificationSettings.findMany({
      where: {
        emailReminders: true,
        reminderDaysBefore: {
          gte: daysUntilDeadline
        }
      },
      include: {
        user: {
          include: {
            businesses: true
          }
        }
      }
    })

    let remindersSent = 0

    for (const settings of usersWithSettings) {
      const user = settings.user
      if (user.businesses.length === 0) continue

      const business = user.businesses[0]

      // Check if there are pending declarations for the previous month
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear

      const pendingDeclarations = await prisma.declaration.findMany({
        where: {
          businessId: business.id,
          month: previousMonth,
          year: previousYear,
          status: {
            in: ['draft', 'reviewed']
          }
        }
      })

      // Also check if there's no bank statement uploaded for the month
      const bankStatement = await prisma.bankStatement.findFirst({
        where: {
          businessId: business.id,
          month: previousMonth,
          year: previousYear
        }
      })

      // Send reminder if:
      // 1. There are pending declarations, OR
      // 2. No bank statement uploaded yet
      if (pendingDeclarations.length > 0 || !bankStatement) {
        // Check if we already sent a notification recently (don't spam)
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: 'deadline_reminder',
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Within last 24 hours
            }
          }
        })

        if (!existingNotification) {
          // Create notification
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'deadline_reminder',
              title: 'Tax Declaration Deadline Approaching',
              message: `Reminder: Your tax declaration for ${previousMonth}/${previousYear} is due by ${deadlineDate.toLocaleDateString()}. ${daysUntilDeadline} days remaining.`,
              read: false,
              emailSent: false
            }
          })

          // Send email
          const emailSent = await sendDeadlineReminder(
            { email: user.email, name: user.name },
            { companyName: business.companyName },
            deadlineDate
          )

          if (emailSent) {
            // Update notification to mark email as sent
            await prisma.notification.updateMany({
              where: {
                userId: user.id,
                type: 'deadline_reminder',
                emailSent: false
              },
              data: {
                emailSent: true
              }
            })

            remindersSent++
          }
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        reminders_sent: remindersSent,
        date: now.toISOString()
      },
      { status: 200 }
    )

  } catch (error) {
    console.error("Cron job error:", error)
    return NextResponse.json(
      { error: "An error occurred during cron execution" },
      { status: 500 }
    )
  }
}
