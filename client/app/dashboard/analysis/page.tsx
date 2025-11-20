'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function AnalysisPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [analysis, setAnalysis] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [useCustomJob, setUseCustomJob] = useState(false)
  const [customJobTitle, setCustomJobTitle] = useState('')
  const [customJobDescription, setCustomJobDescription] = useState('')
  const [customJobSkills, setCustomJobSkills] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const [analysisRes, jobsRes] = await Promise.all([
        axios.get(`${API_URL}/analysis`).catch(() => null),
        axios.get(`${API_URL}/jobs`)
      ])
      
      if (analysisRes) {
        setAnalysis(analysisRes.data)
        if (analysisRes.data.jobRole) {
          if (analysisRes.data.jobRole.id) {
            setSelectedJobId(analysisRes.data.jobRole.id)
            setUseCustomJob(false)
          } else {
            // Custom job role
            setUseCustomJob(true)
            setCustomJobTitle(analysisRes.data.jobRole.title || '')
            setCustomJobDescription(analysisRes.data.jobRole.description || '')
          }
        }
      }
      setJobs(jobsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleAnalyze = async () => {
    if (!useCustomJob && !selectedJobId) {
      toast.error('Please select a job role or enter a custom one')
      return
    }

    if (useCustomJob) {
      if (!customJobTitle.trim()) {
        toast.error('Please enter a job title')
        return
      }
      if (!customJobDescription.trim()) {
        toast.error('Please enter a job description')
        return
      }
    }

    setAnalyzing(true)
    try {
      const payload = useCustomJob
        ? {
            customJobRole: {
              title: customJobTitle.trim(),
              description: customJobDescription.trim(),
              requiredSkills: customJobSkills
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(skill => ({
                  skill: skill.trim(),
                  level: 'intermediate',
                  importance: 'medium'
                }))
            }
          }
        : { jobRoleId: selectedJobId }

      const response = await axios.post(`${API_URL}/analysis`, payload)
      setAnalysis(response.data)
      toast.success('Skill gap analysis completed!')
      fetchData()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Analysis failed. Please try again.'
      toast.error(errorMessage)
      console.error('Analysis error:', error.response?.data || error)
    } finally {
      setAnalyzing(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Skill Gap Analysis</h1>

          {!analysis ? (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!useCustomJob}
                      onChange={() => setUseCustomJob(false)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Select from list</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={useCustomJob}
                      onChange={() => setUseCustomJob(true)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Enter custom job role</span>
                  </label>
                </div>

                {!useCustomJob ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Job Role
                    </label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Choose a job role...</option>
                      {jobs.map((job) => (
                        <option key={job._id} value={job._id}>
                          {job.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        value={customJobTitle}
                        onChange={(e) => setCustomJobTitle(e.target.value)}
                        placeholder="e.g., Senior Full Stack Developer"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Description *
                      </label>
                      <textarea
                        value={customJobDescription}
                        onChange={(e) => setCustomJobDescription(e.target.value)}
                        placeholder="Describe the job role, responsibilities, and requirements..."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Required Skills (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={customJobSkills}
                        onChange={(e) => setCustomJobSkills(e.target.value)}
                        placeholder="e.g., JavaScript, React, Node.js, MongoDB, Docker"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Separate skills with commas. If left empty, AI will analyze based on the description.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing || (!useCustomJob && !selectedJobId) || (useCustomJob && (!customJobTitle.trim() || !customJobDescription.trim()))}
                className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <TrendingUp size={20} />
                    Analyze Skill Gaps
                  </>
                )}
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <h2 className="text-lg font-semibold text-primary-900 mb-2">
                  Analysis for: {analysis.jobRole?.title || 'Selected Role'}
                </h2>
                {analysis.summary && (
                  <p className="text-sm text-primary-700">{analysis.summary}</p>
                )}
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Identified Skill Gaps</h2>
                <div className="space-y-4">
                  {analysis.gaps?.map((gap: any, idx: number) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{gap.skill}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(gap.priority)}`}>
                          {gap.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Current Level</p>
                          <p className="font-medium text-gray-900 capitalize">{gap.currentLevel}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Required Level</p>
                          <p className="font-medium text-primary-700 capitalize">{gap.requiredLevel}</p>
                        </div>
                      </div>

                      {gap.description && (
                        <p className="text-sm text-gray-600 mt-3">{gap.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setAnalysis(null)
                    setSelectedJobId('')
                    setUseCustomJob(false)
                    setCustomJobTitle('')
                    setCustomJobDescription('')
                    setCustomJobSkills('')
                    setAnalyzing(false)
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  New Analysis
                </button>
                {analysis.jobRole && (
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || (!useCustomJob && !selectedJobId && !analysis.jobRole?.id) || (useCustomJob && (!customJobTitle.trim() || !customJobDescription.trim()))}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {analyzing ? 'Re-analyzing...' : 'Re-analyze'}
                  </button>
                )}
                <Link
                  href="/dashboard/roadmap"
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Generate Roadmap →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

