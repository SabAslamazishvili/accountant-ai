import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export default async function ReviewDeclarationPage({
  params
}: {
  params: Promise<{ declarationId: string }>
}) {
  const session = await auth()

  if (!session || !session.user?.email) {
    redirect('/login')
  }

  const { declarationId } = await params

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { businesses: true }
  })

  if (!user || user.businesses.length === 0) {
    redirect('/onboarding')
  }

  const business = user.businesses[0]

  // Fetch declaration with associated data
  const declaration = await prisma.declaration.findUnique({
    where: { id: declarationId },
    include: {
      bankStatement: true
    }
  })

  if (!declaration) {
    redirect('/declarations')
  }

  // Verify ownership
  if (declaration.businessId !== business.id) {
    redirect('/declarations')
  }

  // Fetch all transactions for this bank statement
  const transactions = await prisma.transaction.findMany({
    where: { bankStatementId: declaration.bankStatementId },
    orderBy: { transactionDate: 'desc' }
  })

  // Group transactions by category
  const income = transactions.filter(t =>
    (t.finalCategory || t.aiCategory || '').startsWith('Income -')
  )
  const expenses = transactions.filter(t =>
    (t.finalCategory || t.aiCategory || '').startsWith('Expense -')
  )
  const other = transactions.filter(t => {
    const category = t.finalCategory || t.aiCategory || ''
    return !category.startsWith('Income -') && !category.startsWith('Expense -')
  })

  const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/declarations">
          <Button variant="secondary">← Back to Declarations</Button>
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Review Declaration
            </h1>
            <p className="text-gray-600">
              {monthNames[declaration.month - 1]} {declaration.year} - {declaration.declarationType.toUpperCase()}
            </p>
          </div>
          <Badge variant={
            declaration.status === 'submitted' || declaration.status === 'accepted' ? 'success' :
            declaration.status === 'rejected' ? 'error' :
            'warning'
          }>
            {declaration.status}
          </Badge>
        </div>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Income</h3>
          <p className="text-3xl font-bold text-green-600">₾{totalIncome.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">{income.length} transactions</p>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-600">₾{totalExpenses.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">{expenses.length} transactions</p>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Tax Amount</h3>
          <p className="text-3xl font-bold text-blue-600">₾{Number(declaration.taxAmount).toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">{declaration.declarationType}</p>
        </Card>
      </div>

      {/* Income Transactions */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">Income Transactions ({income.length})</h2>
        {income.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No income transactions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {income.map(transaction => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {new Date(transaction.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {transaction.description}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={transaction.userEdited ? 'info' : 'default'}>
                        {transaction.finalCategory || transaction.aiCategory}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                      ₾{Number(transaction.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`text-xs ${
                        Number(transaction.aiConfidence) > 0.8 ? 'text-green-600' :
                        Number(transaction.aiConfidence) > 0.6 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {transaction.aiConfidence ? (Number(transaction.aiConfidence) * 100).toFixed(0) + '%' : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Expense Transactions */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">Expense Transactions ({expenses.length})</h2>
        {expenses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No expense transactions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map(transaction => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {new Date(transaction.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {transaction.description}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={transaction.userEdited ? 'info' : 'default'}>
                        {transaction.finalCategory || transaction.aiCategory}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                      ₾{Math.abs(Number(transaction.amount)).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`text-xs ${
                        Number(transaction.aiConfidence) > 0.8 ? 'text-green-600' :
                        Number(transaction.aiConfidence) > 0.6 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {transaction.aiConfidence ? (Number(transaction.aiConfidence) * 100).toFixed(0) + '%' : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Other Transactions */}
      {other.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold mb-4">Other Transactions ({other.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {other.map(transaction => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {new Date(transaction.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {transaction.description}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="default">
                        {transaction.finalCategory || transaction.aiCategory || 'Uncategorized'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      ₾{Number(transaction.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`text-xs ${
                        Number(transaction.aiConfidence) > 0.8 ? 'text-green-600' :
                        Number(transaction.aiConfidence) > 0.6 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {transaction.aiConfidence ? (Number(transaction.aiConfidence) * 100).toFixed(0) + '%' : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      {declaration.status === 'draft' && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-1">Ready to Submit?</h3>
              <p className="text-sm text-blue-700">
                Review the transactions above. Once submitted, this declaration will be sent to rs.ge.
              </p>
            </div>
            <form action="/api/declaration/submit" method="POST">
              <input type="hidden" name="declaration_id" value={declaration.id} />
              <Button type="submit" className="whitespace-nowrap">
                Submit to rs.ge
              </Button>
            </form>
          </div>
        </Card>
      )}

      {declaration.status === 'submitted' && declaration.rsGeConfirmation && (
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-start">
            <svg className="h-6 w-6 text-green-600 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-1">Declaration Submitted</h3>
              <p className="text-sm text-green-700">
                Confirmation Number: <span className="font-mono font-semibold">{declaration.rsGeConfirmation}</span>
              </p>
              <p className="text-sm text-green-700 mt-1">
                Submitted on: {declaration.submittedAt ? new Date(declaration.submittedAt).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
