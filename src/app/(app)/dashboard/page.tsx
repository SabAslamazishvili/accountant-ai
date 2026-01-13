import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export default async function DashboardPage() {
  const session = await auth()

  if (!session || !session.user?.email) {
    redirect('/login')
  }

  // Get user and business
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { businesses: true }
  })

  if (!user) {
    redirect('/login')
  }

  if (user.businesses.length === 0) {
    redirect('/onboarding')
  }

  const business = user.businesses[0]

  // Fetch recent bank statements
  const statements = await prisma.bankStatement.findMany({
    where: { businessId: business.id },
    orderBy: { uploadDate: 'desc' },
    take: 5
  })

  // Fetch recent declarations
  const declarations = await prisma.declaration.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  // Fetch notifications
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, read: false },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  // Calculate deadline for current month
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const deadlineDate = new Date(currentYear, currentMonth - 1, 15)
  const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'processed': case 'submitted': case 'accepted':
        return 'success'
      case 'processing': case 'reviewed':
        return 'info'
      case 'error': case 'rejected':
        return 'error'
      case 'uploaded': case 'draft':
        return 'warning'
      default:
        return 'default'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}</p>
          <p className="text-sm text-gray-500">{business.companyName}</p>
        </div>

        {daysUntilDeadline > 0 && daysUntilDeadline <= 7 && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Deadline Approaching
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Tax declaration deadline: {deadlineDate.toLocaleDateString()} ({daysUntilDeadline} days remaining)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <h3 className="text-sm font-medium text-gray-500">Total Declarations</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{declarations.length}</p>
          </Card>
          <Card>
            <h3 className="text-sm font-medium text-gray-500">Pending Reviews</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {declarations.filter(d => d.status === 'draft').length}
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-medium text-gray-500">Submitted This Year</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {declarations.filter(d => d.status === 'submitted' && d.year === currentYear).length}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recent Bank Statements</h2>
              <Link href="/upload">
                <Button>Upload New</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {statements.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No bank statements uploaded yet</p>
              ) : (
                statements.map(statement => (
                  <div key={statement.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{statement.bankSource.toUpperCase()} - {statement.month}/{statement.year}</p>
                      <p className="text-sm text-gray-500">{statement.fileName}</p>
                    </div>
                    <Badge variant={getBadgeVariant(statement.status)}>
                      {statement.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recent Declarations</h2>
              <Link href="/declarations">
                <Button variant="secondary">View All</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {declarations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No declarations yet</p>
              ) : (
                declarations.map(declaration => (
                  <Link key={declaration.id} href={`/review/${declaration.id}`}>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
                      <div>
                        <p className="font-medium">{declaration.declarationType} - {declaration.month}/{declaration.year}</p>
                        <p className="text-sm text-gray-500">₾{Number(declaration.taxAmount).toFixed(2)}</p>
                      </div>
                      <Badge variant={getBadgeVariant(declaration.status)}>
                        {declaration.status}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>

        {notifications.length > 0 && (
          <Card className="mt-6">
            <h2 className="text-xl font-bold mb-4">Notifications</h2>
            <div className="space-y-2">
              {notifications.map(notification => (
                <div key={notification.id} className="p-3 bg-blue-50 rounded">
                  <p className="font-medium text-blue-900">{notification.title}</p>
                  <p className="text-sm text-blue-700">{notification.message}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-6 flex gap-4">
          <Link href="/upload">
            <Button>Upload Bank Statement</Button>
          </Link>
          <Link href="/declarations">
            <Button variant="secondary">View Declarations</Button>
          </Link>
          <Link href="/settings">
            <Button variant="secondary">Settings</Button>
          </Link>
        </div>
    </div>
  )
}
