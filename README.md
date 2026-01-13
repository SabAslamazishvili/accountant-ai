# Accountant AI - Georgian Tax Declaration Automation

AI-powered system that automates monthly tax declarations for Georgian small businesses by analyzing cashflow data from TBC Bank and Bank of Georgia, then submitting to the Revenue Service of Georgia (rs.ge).

## Features

- **AI-Powered Transaction Analysis**: Automatically categorize transactions using Claude 3.5 Sonnet
- **Multi-Bank Support**: Upload statements from TBC Bank and Bank of Georgia
- **Automatic Tax Calculations**: Georgian VAT (18%) and Income Tax calculations
- **rs.ge Integration**: Direct submission to Revenue Service of Georgia via SOAP API
- **Deadline Reminders**: Email and in-app notifications for upcoming deadlines
- **OAuth Authentication**: Sign in with Google or email/password
- **Encrypted Credentials**: Secure storage of rs.ge service user credentials

## Tech Stack

- **Framework**: Next.js 16.0.1 (App Router, React 19.2.0)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **AI**: Anthropic Claude API
- **Storage**: Vercel Blob
- **Email**: Resend
- **Styling**: Tailwind CSS 4

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Anthropic API key
- (Optional) Google OAuth credentials
- (Optional) Vercel Blob token
- (Optional) Resend API key

### Installation

1. Clone the repository and navigate to the directory

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## License

MIT
