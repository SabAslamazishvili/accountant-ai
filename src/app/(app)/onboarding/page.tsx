'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function OnboardingPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    company_name: '',
    tin: '',
    business_type: '',
    registration_date: '',
    preferred_banks: [] as string[],
    rs_ge_username: '',
    rs_ge_password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleBankChange = (bank: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_banks: prev.preferred_banks.includes(bank)
        ? prev.preferred_banks.filter(b => b !== bank)
        : [...prev.preferred_banks, bank]
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.company_name) {
      newErrors.company_name = 'Company name is required'
    }

    if (!formData.tin) {
      newErrors.tin = 'TIN is required'
    } else if (!/^\d{9}$|^\d{11}$/.test(formData.tin)) {
      newErrors.tin = 'TIN must be 9 or 11 digits'
    }

    if (formData.preferred_banks.length === 0) {
      newErrors.preferred_banks = 'Select at least one bank'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/business/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ general: data.error || 'Failed to create business profile' })
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setErrors({ general: 'An error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Business Setup</h1>
          <p className="text-gray-600 mt-2">Complete your business profile to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input
              type="text"
              label="Company Name"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              placeholder="My Business LLC"
              error={errors.company_name}
              required
            />

            <Input
              type="text"
              label="Tax Identification Number (TIN)"
              name="tin"
              value={formData.tin}
              onChange={handleChange}
              placeholder="9 or 11 digits"
              error={errors.tin}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Type
              </label>
              <select
                name="business_type"
                value={formData.business_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type...</option>
                <option value="LLC">LLC</option>
                <option value="Sole Proprietor">Sole Proprietor</option>
                <option value="Corporation">Corporation</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <Input
              type="date"
              label="Registration Date"
              name="registration_date"
              value={formData.registration_date}
              onChange={handleChange}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Banks <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferred_banks.includes('tbc')}
                    onChange={() => handleBankChange('tbc')}
                    className="mr-2"
                  />
                  TBC Bank
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferred_banks.includes('bog')}
                    onChange={() => handleBankChange('bog')}
                    className="mr-2"
                  />
                  Bank of Georgia
                </label>
              </div>
              {errors.preferred_banks && (
                <p className="mt-1 text-sm text-red-600">{errors.preferred_banks}</p>
              )}
            </div>

            <div className="border-t pt-4 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">rs.ge Integration (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                rs.ge credentials are needed for automatic submission. You can add these later in Settings.
              </p>

              <div className="space-y-4">
                <Input
                  type="text"
                  label="rs.ge Username"
                  name="rs_ge_username"
                  value={formData.rs_ge_username}
                  onChange={handleChange}
                  placeholder="Service user"
                />

                <Input
                  type="password"
                  label="rs.ge Password"
                  name="rs_ge_password"
                  value={formData.rs_ge_password}
                  onChange={handleChange}
                  placeholder="Service password"
                />
              </div>
            </div>
          </div>

          {errors.general && (
            <div className="text-red-600 text-sm text-center">{errors.general}</div>
          )}

          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? 'Creating profile...' : 'Complete Setup'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
