'use client'

import { useState } from 'react'
import { Button } from './ui/Button'
import { useRouter } from 'next/navigation'

interface ProcessStatementButtonProps {
  statementId: string
}

export function ProcessStatementButton({ statementId }: ProcessStatementButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleProcess = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/process/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ statement_id: statementId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed')
      }

      // Refresh the page to show updated status
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button
        onClick={handleProcess}
        disabled={loading}
        className="text-xs"
      >
        {loading ? 'Processing...' : 'Process Now'}
      </Button>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}
