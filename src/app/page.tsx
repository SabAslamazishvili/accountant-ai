import { redirect } from 'next/navigation'
import { auth } from './api/auth/[...nextauth]/route'
import Link from 'next/link'

export default async function Home() {
  const session = await auth()

  // If logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Accountant AI
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Automate your Georgian tax declarations with AI-powered cashflow analysis
        </p>
        <div className="space-x-4">
          <Link
            href="/signup"
            className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI-Powered Analysis</h3>
            <p className="text-gray-600">Automatically categorize transactions using Claude AI</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Auto-Submit to rs.ge</h3>
            <p className="text-gray-600">Direct integration with Revenue Service of Georgia</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Deadline Reminders</h3>
            <p className="text-gray-600">Never miss a tax declaration deadline</p>
          </div>
        </div>
      </div>
    </div>
  )
}
