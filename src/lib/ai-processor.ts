import Anthropic from '@anthropic-ai/sdk'
import { ParsedTransaction } from './bank-parser'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface AnalyzedTransaction extends ParsedTransaction {
  aiCategory: string
  aiConfidence: number
  taxTreatment: string
}

export async function analyzeTransactions(
  transactions: ParsedTransaction[]
): Promise<AnalyzedTransaction[]> {
  if (transactions.length === 0) {
    return []
  }

  const prompt = `You are an expert Georgian tax accountant. Analyze these business transactions and categorize each one according to Georgian tax law.

For each transaction, provide:
1. Category (e.g., "Income - Services", "Expense - Supplies", "Expense - Utilities")
2. Confidence score (0.0 to 1.0)
3. Tax treatment (taxable income, deductible expense, exempt, non-taxable)

Georgian tax categories to use:

**Income categories:**
- Income - Services
- Income - Product Sales
- Income - Interest
- Income - Rental
- Income - Other

**Expense categories:**
- Expense - Supplies
- Expense - Rent
- Expense - Utilities
- Expense - Salaries
- Expense - Software
- Expense - Marketing
- Expense - Travel
- Expense - Other

**Non-taxable:**
- Internal Transfer
- Loan Repayment

Transactions to analyze:
${JSON.stringify(transactions.map((t, i) => ({
  index: i,
  date: t.date.toISOString().split('T')[0],
  description: t.description,
  amount: t.amount,
  currency: t.currency
})), null, 2)}

Return a JSON array with the exact same structure plus your analysis. For each transaction, add:
- "ai_category": string (the category from above)
- "ai_confidence": number (0.0 to 1.0)
- "tax_treatment": string (taxable income, deductible expense, exempt, non-taxable)

Respond ONLY with the JSON array, no other text.`

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Extract text from response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    // Parse JSON response
    let analyzedData: any[]
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
      if (jsonMatch) {
        analyzedData = JSON.parse(jsonMatch[1])
      } else {
        analyzedData = JSON.parse(responseText)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText)
      throw new Error('Failed to parse AI categorization response')
    }

    // Map analyzed data back to transactions
    const analyzedTransactions: AnalyzedTransaction[] = transactions.map((transaction, index) => {
      const analysis = analyzedData.find((a: any) => a.index === index) || {
        ai_category: 'Uncategorized',
        ai_confidence: 0.0,
        tax_treatment: 'unknown'
      }

      return {
        ...transaction,
        aiCategory: analysis.ai_category,
        aiConfidence: analysis.ai_confidence,
        taxTreatment: analysis.tax_treatment
      }
    })

    return analyzedTransactions

  } catch (error) {
    console.error('AI processing error:', error)

    // Fallback: return transactions with default categorization
    return transactions.map(transaction => ({
      ...transaction,
      aiCategory: transaction.amount > 0 ? 'Income - Other' : 'Expense - Other',
      aiConfidence: 0.3,
      taxTreatment: transaction.amount > 0 ? 'taxable income' : 'deductible expense'
    }))
  }
}

export async function calculateTaxes(transactions: AnalyzedTransaction[]): Promise<{
  vatAmount: number
  incomeTaxAmount: number
  totalIncome: number
  totalExpenses: number
}> {
  // Filter taxable income and deductible expenses
  const taxableIncome = transactions
    .filter(t => t.aiCategory.startsWith('Income -') && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const deductibleExpenses = transactions
    .filter(t => t.aiCategory.startsWith('Expense -') && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Georgian VAT rate: 18%
  const vatAmount = taxableIncome * 0.18

  // Simplified income tax calculation (15% on profit for general business)
  // In production, this should consider business type and tax regime
  const profit = taxableIncome - deductibleExpenses
  const incomeTaxAmount = Math.max(0, profit * 0.15)

  return {
    vatAmount,
    incomeTaxAmount,
    totalIncome: taxableIncome,
    totalExpenses: deductibleExpenses
  }
}
