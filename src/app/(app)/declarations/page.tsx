import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export default async function DeclarationsPage() {
  const session = await auth()

  if (!session || !session.user?.email) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { businesses: true }
  })

  if (!user || user.businesses.length === 0) {
    redirect('/onboarding')
  }

  const business = user.businesses[0]

  // Fetch all declarations
  const declarations = await prisma.declaration.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: 'desc' }
  })

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'submitted': case 'accepted':
        return 'success'
      case 'reviewed':
        return 'info'
      case 'rejected':
        return 'error'
      case 'draft':
        return 'warning'
      default:
        return 'default'
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tax Declarations</h1>
          <p className="text-gray-600">View and manage your tax declarations</p>
        </div>
        <Link href="/upload">
          <Button>Upload New Statement</Button>
        </Link>
      </div>

      {declarations.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No declarations</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by uploading a bank statement.</p>
            <div className="mt-6">
              <Link href="/upload">
                <Button>Upload Bank Statement</Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {declarations.map(declaration => (
            <Card key={declaration.id}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {declaration.declarationType.toUpperCase()} Declaration
                    </h3>
                    <Badge variant={getBadgeVariant(declaration.status)}>
                      {declaration.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Period</p>
                      <p className="font-medium">
                        {monthNames[declaration.month - 1]} {declaration.year}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Tax Amount</p>
                      <p className="font-medium text-lg">
                        ₾{Number(declaration.taxAmount).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="font-medium">
                        {new Date(declaration.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {declaration.rsGeConfirmation && (
                      <div>
                        <p className="text-gray-500">Confirmation</p>
                        <p className="font-medium text-xs">
                          {declaration.rsGeConfirmation}
                        </p>
                      </div>
                    )}
                  </div>

                  {declaration.notes && (
                    <div className="mt-3 text-sm text-gray-600">
                      <p className="font-medium">Notes:</p>
                      <p>{declaration.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {declaration.status === 'draft' && (
                    <>
                      <Link href={`/review/${declaration.id}`}>
                        <Button variant="secondary" className="text-sm">
                          Review
                        </Button>
                      </Link>
                      <form action="/api/declaration/submit" method="POST">
                        <input type="hidden" name="declaration_id" value={declaration.id} />
                        <Button type="submit" className="text-sm">
                          Submit
                        </Button>
                      </form>
                    </>
                  )}
                  {declaration.status === 'submitted' && (
                    <Badge variant="success">✓ Submitted</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/dashboard">
          <Button variant="secondary">← Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
