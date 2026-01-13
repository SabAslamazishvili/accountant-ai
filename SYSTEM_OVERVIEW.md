# Accountant AI - System Overview

## 🎯 What It Does

**Accountant AI** automates Georgian tax declarations for small businesses by:
1. Analyzing monthly cashflow data from bank statements
2. Using AI to categorize transactions according to Georgian tax law
3. Automatically generating and submitting tax declarations to rs.ge
4. Sending deadline reminders

## 🏗️ System Architecture

### Frontend (Next.js 16 + React 19)
- **Landing Page** - Marketing and feature overview
- **Authentication** - Email/password + Google OAuth
- **Dashboard** - Overview, stats, deadline warnings
- **Upload Page** - Bank statement file upload
- **Onboarding** - Business profile setup

### Backend (Next.js API Routes)
- **Auth API** - Registration, login, NextAuth integration
- **Business API** - Company profile management
- **Upload API** - File upload to Vercel Blob
- **Process API** - AI transaction analysis
- **Declaration API** - Submit to rs.ge

### Database (PostgreSQL via Vercel)
```
User → Business → BankStatement → Transaction
                      ↓
                  Declaration
                      ↓
                 Notification
```

### External Services
- **Vercel Blob** - Bank statement file storage
- **Anthropic Claude 3.5 Sonnet** - AI transaction categorization
- **rs.ge SOAP API** - Georgian tax submission
- **Resend** - Email notifications (optional)

## 📊 Data Flow

### 1. Upload Flow
```
User uploads statement
    ↓
Upload to Vercel Blob
    ↓
Create BankStatement record (status: 'uploaded')
    ↓
Auto-trigger processing
```

### 2. Processing Flow
```
Download statement from Blob
    ↓
Parse Excel/CSV (TBC or Bank of Georgia format)
    ↓
Send transactions to Claude AI
    ↓
AI categorizes each transaction:
    - Income (Services, Sales, Interest, Rental)
    - Expense (Supplies, Rent, Utilities, Salaries, etc.)
    - Non-taxable (Transfers, Loans)
    ↓
Calculate taxes:
    - VAT: 18% on taxable income
    - Income Tax: 15% on profit
    ↓
Create Transaction records
    ↓
Generate draft Declaration
    ↓
Update BankStatement status: 'processed'
```

### 3. Submission Flow
```
User reviews draft declaration
    ↓
Click "Submit to rs.ge"
    ↓
Decrypt stored rs.ge credentials (AES-256)
    ↓
Submit via SOAP API
    ↓
Update Declaration status: 'submitted'
    ↓
Send confirmation email
    ↓
Create audit log
```

## 🔐 Security Features

### Authentication
- **bcrypt password hashing** (12 rounds)
- **NextAuth session management**
- **OAuth integration** with Google
- **CSRF protection** via NextAuth

### Data Encryption
- **AES-256-CTR encryption** for rs.ge credentials
- **Secure key derivation** using scrypt
- **Environment variable** for encryption key

### Database
- **Row-level security** (planned)
- **Audit logging** for all submissions
- **No plain-text passwords**

## 🤖 AI Transaction Categorization

### How It Works

**Input to Claude:**
```json
{
  "date": "2025-01-15",
  "description": "Payment to Office Depot",
  "amount": -250.50,
  "currency": "GEL"
}
```

**AI Analysis:**
```json
{
  "ai_category": "Supplies",
  "ai_confidence": 0.95,
  "tax_treatment": "expense",
  "explanation": "Office supplies purchase"
}
```

### Georgian Tax Categories

**Income:**
- Services
- Product Sales
- Interest
- Rental Income

**Expenses:**
- Supplies
- Rent
- Utilities
- Salaries
- Software/Subscriptions
- Marketing
- Travel
- Professional Services

**Non-taxable:**
- Internal Transfers
- Loan Repayments
- Capital Transactions

### Tax Calculations

**VAT (Value Added Tax):**
```
VAT Amount = Total Taxable Income × 18%
```

**Income Tax:**
```
Profit = Total Income - Total Expenses
Income Tax = Profit × 15%
```

## 📅 Deadline Management

### Automatic Reminders

**Cron Job** runs daily at 9 AM:
```
Check users with deadline_reminders = true
    ↓
Calculate deadline (15th of following month)
    ↓
If deadline ≤ 7 days away AND no submission:
    Send email reminder
    Create notification
```

**Dashboard Warning:**
- Shows yellow banner if deadline ≤ 7 days
- Displays days remaining
- Prominent call-to-action

## 🌍 rs.ge Integration

### SOAP API

**Endpoint:** `https://api.rs.ge/service/declaration`

**Authentication:**
1. Login with stored credentials (encrypted)
2. Receive service token
3. Use token for declaration submission

**Submission XML:**
```xml
<SubmitDeclaration>
  <token>...</token>
  <declaration>
    <type>VAT</type>
    <tin>123456789</tin>
    <period>
      <month>1</month>
      <year>2025</year>
    </period>
    <taxAmount>1234.56</taxAmount>
  </declaration>
</SubmitDeclaration>
```

**Response:**
```xml
<response>
  <success>true</success>
  <confirmation>RS-2025-01-123456</confirmation>
</response>
```

## 📧 Email Notifications

### Types

**1. Deadline Reminder**
- Sent 7 days before deadline
- Includes company name, period, deadline date
- Link to dashboard

**2. Processing Complete**
- Sent after AI analysis finishes
- Shows transaction count
- Link to review declarations

**3. Submission Confirmation**
- Sent after successful rs.ge submission
- Includes confirmation number
- Declaration type and amount

### Configuration

Users can enable/disable:
- Email reminders
- SMS reminders (planned)
- In-app notifications

## 🔧 Environment Variables

### Required
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://...
ENCRYPTION_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

### Optional
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
```

## 📈 Performance Optimizations

### Next.js Optimizations
- **React Server Components** for faster page loads
- **Static page generation** where possible
- **API route caching** (planned)
- **Image optimization** via next/image

### Database Optimizations
- **Indexed queries** on user_id, business_id
- **Connection pooling** via Prisma
- **Read replicas** (planned)

### AI Optimization
- **Batch processing** of transactions
- **Caching** of similar categorizations (planned)
- **Fallback** to rule-based if API fails

## 🚀 Deployment

### Vercel Configuration

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "crons": [{
    "path": "/api/cron/deadline-reminders",
    "schedule": "0 9 * * *"
  }]
}
```

### Database Migrations

```bash
# Push schema to production
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### Deployment Process

1. Push code to GitHub
2. Create pull request
3. Merge to main
4. Vercel auto-deploys
5. Environment variables persist
6. Database connection maintained

## 🧪 Testing Checklist

### User Flow
- [ ] Register new account
- [ ] Complete onboarding
- [ ] Upload bank statement (TBC format)
- [ ] View processing results
- [ ] Review categorized transactions
- [ ] Submit declaration to rs.ge (test mode)
- [ ] Receive confirmation email

### Edge Cases
- [ ] Invalid file format
- [ ] File size > 10MB
- [ ] Invalid TIN format
- [ ] Expired rs.ge credentials
- [ ] Google OAuth failure
- [ ] Duplicate statement upload
- [ ] Processing timeout

## 📚 Technical Stack Summary

- **Framework:** Next.js 16.1.1 with App Router
- **Language:** TypeScript 5
- **Database:** PostgreSQL (Vercel Postgres)
- **ORM:** Prisma 5.22.0
- **Auth:** NextAuth.js v5 beta
- **AI:** Anthropic Claude 3.5 Sonnet
- **Storage:** Vercel Blob
- **Email:** Resend
- **Styling:** Tailwind CSS 4
- **Deployment:** Vercel
- **Region:** Washington D.C. (iad1)

## 🎯 Future Enhancements

### Planned Features
- [ ] Multi-currency support
- [ ] Receipt OCR scanning
- [ ] Expense categorization learning
- [ ] Monthly reports export (PDF)
- [ ] Multi-user businesses (accountant access)
- [ ] Mobile app (React Native)
- [ ] Slack/Teams integration
- [ ] Historical trend analysis
- [ ] Predictive tax estimates

### Technical Improvements
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Set up CI/CD pipeline
- [ ] Add error tracking (Sentry)
- [ ] Add analytics (Posthog)
- [ ] Implement rate limiting
- [ ] Add Redis caching
- [ ] Set up monitoring (Datadog)

## 📞 Support

For issues or questions:
- Check deployment logs: `vercel logs`
- View database: `npx prisma studio`
- Monitor cron jobs: Vercel dashboard

---

**Built with Claude Code** - AI-powered Georgian Tax Automation
