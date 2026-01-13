import * as XLSX from 'xlsx'
import { parse } from 'csv-parse/sync'

export interface ParsedTransaction {
  date: Date
  description: string
  amount: number
  currency: string
}

export async function parseTBCStatement(fileBuffer: Buffer): Promise<ParsedTransaction[]> {
  try {
    // Try parsing as Excel first
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    // Find header row (contains "Date", "Description", "Amount", etc.)
    let headerIndex = -1
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i].map((cell: any) => String(cell).toLowerCase())
      if (row.some((cell: string) => cell.includes('date') || cell.includes('თარიღი')) &&
          row.some((cell: string) => cell.includes('amount') || cell.includes('თანხა'))) {
        headerIndex = i
        break
      }
    }

    if (headerIndex === -1) {
      throw new Error('Could not find header row in TBC statement')
    }

    const headers = data[headerIndex].map((h: any) => String(h).toLowerCase())
    const dateCol = headers.findIndex((h: string) => h.includes('date') || h.includes('თარიღი'))
    const descCol = headers.findIndex((h: string) => h.includes('description') || h.includes('დანიშნულება'))
    const amountCol = headers.findIndex((h: string) => h.includes('amount') || h.includes('თანხა'))
    const currencyCol = headers.findIndex((h: string) => h.includes('currency') || h.includes('ვალუტა'))

    if (dateCol === -1 || descCol === -1 || amountCol === -1) {
      throw new Error('Required columns not found in TBC statement')
    }

    const transactions: ParsedTransaction[] = []

    // Process data rows
    for (let i = headerIndex + 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue

      const dateStr = row[dateCol]
      const description = row[descCol] || ''
      const amountStr = row[amountCol]
      const currency = row[currencyCol] || 'GEL'

      if (!dateStr || !amountStr) continue

      // Parse date (handle DD.MM.YYYY or YYYY-MM-DD formats)
      let date: Date
      if (typeof dateStr === 'number') {
        // Excel date serial
        date = XLSX.SSF.parse_date_code(dateStr)
      } else {
        const dateString = String(dateStr)
        if (dateString.includes('.')) {
          const [day, month, year] = dateString.split('.')
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        } else {
          date = new Date(dateString)
        }
      }

      // Parse amount (handle both formats)
      let amount = typeof amountStr === 'number' ? amountStr : parseFloat(String(amountStr).replace(/,/g, ''))

      if (isNaN(amount)) continue

      transactions.push({
        date,
        description: String(description),
        amount,
        currency: String(currency)
      })
    }

    return transactions

  } catch (xlsxError) {
    // If Excel parsing fails, try CSV
    try {
      const csvData = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        delimiter: [',', ';', '\t']
      })

      const transactions: ParsedTransaction[] = []

      for (const row of csvData) {
        const r = row as any
        const dateStr = r.Date || r.date || r['თარიღი']
        const description = r.Description || r.description || r['დანიშნულება'] || ''
        const amountStr = r.Amount || r.amount || r['თანხა']
        const currency = r.Currency || r.currency || r['ვალუტა'] || 'GEL'

        if (!dateStr || !amountStr) continue

        // Parse date
        let date: Date
        if (dateStr.includes('.')) {
          const [day, month, year] = dateStr.split('.')
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        } else {
          date = new Date(dateStr)
        }

        const amount = parseFloat(String(amountStr).replace(/,/g, ''))
        if (isNaN(amount)) continue

        transactions.push({
          date,
          description,
          amount,
          currency
        })
      }

      return transactions

    } catch (csvError) {
      throw new Error('Failed to parse TBC statement as Excel or CSV')
    }
  }
}

export async function parseBOGStatement(fileBuffer: Buffer): Promise<ParsedTransaction[]> {
  // Bank of Georgia has similar format to TBC
  // For now, use the same parsing logic
  // Can be customized later if BOG has different format
  return parseTBCStatement(fileBuffer)
}
