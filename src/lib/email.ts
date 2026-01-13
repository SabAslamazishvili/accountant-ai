import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface User {
  email: string
  name: string
}

interface Business {
  companyName: string
}

interface Declaration {
  id: string
  month: number
  year: number
  declarationType: string
  rsGeConfirmation?: string
}

interface BankStatement {
  id: string
  month: number
  year: number
  totalTransactions?: number
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/**
 * Send deadline reminder email
 */
export async function sendDeadlineReminder(
  user: User,
  business: Business,
  deadline: Date
): Promise<boolean> {
  if (!resend) {
    console.log('Email service not configured, skipping deadline reminder')
    return false
  }

  try {
    const month = monthNames[deadline.getMonth() - 1] // Deadline is for previous month
    const year = deadline.getFullYear()
    const deadlineStr = deadline.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .deadline { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tax Declaration Deadline Reminder</h1>
    </div>
    <div class="content">
      <p>Hello ${user.name},</p>

      <p>This is a reminder that your tax declaration deadline is approaching for ${business.companyName}.</p>

      <div class="deadline">
        <strong>Deadline:</strong> ${deadlineStr}<br>
        <strong>Period:</strong> ${month} ${year}
      </div>

      <p>Please ensure you upload your bank statement and review your declaration before the deadline to avoid penalties.</p>

      <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">Go to Dashboard</a>

      <p>If you have already submitted your declaration, please disregard this email.</p>

      <p>Best regards,<br>Accountant AI Team</p>
    </div>
    <div class="footer">
      <p>You're receiving this email because you have deadline reminders enabled.</p>
      <p>Manage your notification preferences in <a href="${process.env.NEXTAUTH_URL}/settings">Settings</a>.</p>
    </div>
  </div>
</body>
</html>
`

    await resend.emails.send({
      from: 'Accountant AI <noreply@accountant-ai.com>',
      to: user.email,
      subject: `Tax Declaration Deadline Reminder - ${month} ${year}`,
      html
    })

    return true
  } catch (error) {
    console.error('Failed to send deadline reminder:', error)
    return false
  }
}

/**
 * Send submission confirmation email
 */
export async function sendSubmissionConfirmation(
  user: User,
  business: Business,
  declaration: Declaration
): Promise<boolean> {
  if (!resend) {
    console.log('Email service not configured, skipping submission confirmation')
    return false
  }

  try {
    const month = monthNames[declaration.month - 1]
    const year = declaration.year

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .details { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Declaration Submitted Successfully</h1>
    </div>
    <div class="content">
      <p>Hello ${user.name},</p>

      <div class="success">
        <strong>Success!</strong> Your tax declaration has been submitted to rs.ge.
      </div>

      <div class="details">
        <strong>Company:</strong> ${business.companyName}<br>
        <strong>Period:</strong> ${month} ${year}<br>
        <strong>Declaration Type:</strong> ${declaration.declarationType}<br>
        ${declaration.rsGeConfirmation ? `<strong>Confirmation Number:</strong> ${declaration.rsGeConfirmation}` : ''}
      </div>

      <p>Your declaration has been successfully submitted to the Revenue Service of Georgia (rs.ge). Please keep this confirmation for your records.</p>

      <a href="${process.env.NEXTAUTH_URL}/declarations" class="button">View Declarations</a>

      <p>Best regards,<br>Accountant AI Team</p>
    </div>
    <div class="footer">
      <p>This is an automated confirmation email from Accountant AI.</p>
    </div>
  </div>
</body>
</html>
`

    await resend.emails.send({
      from: 'Accountant AI <noreply@accountant-ai.com>',
      to: user.email,
      subject: `Declaration Submitted - ${month} ${year}`,
      html
    })

    return true
  } catch (error) {
    console.error('Failed to send submission confirmation:', error)
    return false
  }
}

/**
 * Send processing complete notification
 */
export async function sendProcessingComplete(
  user: User,
  business: Business,
  statement: BankStatement
): Promise<boolean> {
  if (!resend) {
    console.log('Email service not configured, skipping processing complete email')
    return false
  }

  try {
    const month = monthNames[statement.month - 1]
    const year = statement.year

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .info { background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bank Statement Processed</h1>
    </div>
    <div class="content">
      <p>Hello ${user.name},</p>

      <p>Your bank statement for ${business.companyName} has been successfully processed.</p>

      <div class="info">
        <strong>Period:</strong> ${month} ${year}<br>
        <strong>Transactions:</strong> ${statement.totalTransactions || 0} transactions analyzed
      </div>

      <p>AI has categorized all transactions and generated draft declarations for your review.</p>

      <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">Review Declarations</a>

      <p>Best regards,<br>Accountant AI Team</p>
    </div>
    <div class="footer">
      <p>This is an automated notification from Accountant AI.</p>
    </div>
  </div>
</body>
</html>
`

    await resend.emails.send({
      from: 'Accountant AI <noreply@accountant-ai.com>',
      to: user.email,
      subject: `Bank Statement Processed - ${month} ${year}`,
      html
    })

    return true
  } catch (error) {
    console.error('Failed to send processing complete email:', error)
    return false
  }
}
