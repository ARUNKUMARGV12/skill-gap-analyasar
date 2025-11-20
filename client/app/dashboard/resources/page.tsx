'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft, Search, Book } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function ResourcesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [skill, setSkill] = useState('')
  const [level, setLevel] = useState('intermediate')
  const [resources, setResources] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
  }, [user])

  const handleSearch = async () => {
    if (!skill.trim()) {
      toast.error('Please enter a skill')
      return
    }
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/resources/${encodeURIComponent(skill)}?level=${level}`)
      setResources(response.data.resources || [])
      if (!response.data.resources) {
        toast('No structured resources found. Try another skill or level.', { icon: 'ℹ️' })
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch resources')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Resources</h1>
          <p className="text-gray-600 mb-6">Find curated resources to upskill specific competencies</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            <input
              type="text"
              placeholder="e.g., React, SQL, Docker"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <Search size={18} />
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {resources && (
            <div className="space-y-4">
              {resources.length === 0 ? (
                <div className="text-center py-12 text-gray-600">No resources found</div>
              ) : (
                resources.map((res: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center">
                          <Book size={18} />
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">{res.type}</div>
                          <h3 className="text-lg font-semibold text-gray-900">{res.name}</h3>
                          {res.description && (
                            <p className="text-sm text-gray-600 mt-1">{res.description}</p>
                          )}
                        </div>
                      </div>
                      {res.url && (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                        >
                          Open
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

