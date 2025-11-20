'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { 
  Upload, 
  Briefcase, 
  TrendingUp, 
  BookOpen, 
  MessageCircle, 
  BarChart3,
  LogOut,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [resume, setResume] = useState<any>(null)
  const [jobRole, setJobRole] = useState<any>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    try {
      const [resumeRes, jobsRes, analysisRes, progressRes] = await Promise.all([
        axios.get(`${API_URL}/resume`).catch(() => null),
        axios.get(`${API_URL}/jobs`).catch(() => null),
        axios.get(`${API_URL}/analysis`).catch(() => null),
        axios.get(`${API_URL}/progress`).catch(() => null)
      ])

      if (resumeRes) setResume(resumeRes.data)
      if (analysisRes) {
        setAnalysis(analysisRes.data)
        if (analysisRes.data.jobRole) {
          setJobRole(analysisRes.data.jobRole)
        }
      }
      if (progressRes) setProgress(progressRes.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
    toast.success('Logged out successfully')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const steps = [
    { id: 1, title: 'Upload Resume', completed: !!resume, icon: Upload, link: '/dashboard/resume' },
    { id: 2, title: 'Select Job Role', completed: !!jobRole, icon: Briefcase, link: '/dashboard/jobs' },
    { id: 3, title: 'Analyze Skills', completed: !!analysis, icon: TrendingUp, link: '/dashboard/analysis' },
    { id: 4, title: 'View Roadmap', completed: progress?.overallCompletion > 0, icon: BookOpen, link: '/dashboard/roadmap' },
    { id: 5, title: 'Track Progress', completed: !!progress, icon: BarChart3, link: '/dashboard/progress' },
    { id: 6, title: 'AI Assistant', completed: false, icon: MessageCircle, link: '/dashboard/assistant' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary-700">Skill Gap Analyzer</h1>
            <p className="text-sm text-gray-600">Welcome back, {user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview */}
        {progress && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Overall Progress</h3>
                <TrendingUp className="text-primary-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-primary-700">{progress.overallCompletion}%</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.overallCompletion}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Job Accessibility</h3>
                <Briefcase className="text-green-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-green-700">{progress.jobAccessibility}%</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.jobAccessibility}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Skills Completed</h3>
                <CheckCircle2 className="text-blue-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-blue-700">
                {progress.skillsCompleted} / {progress.totalSkills || 0}
              </p>
            </div>
          </div>
        )}

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <Link
                key={step.id}
                href={step.link}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${step.completed ? 'bg-green-100' : 'bg-primary-100'}`}>
                    <Icon className={step.completed ? 'text-green-600' : 'text-primary-600'} size={24} />
                  </div>
                  {step.completed ? (
                    <CheckCircle2 className="text-green-600" size={20} />
                  ) : (
                    <Clock className="text-gray-400" size={20} />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {step.completed ? 'Completed' : 'Pending'}
                </p>
              </Link>
            )
          })}
        </div>

        {/* Quick Actions */}
        {analysis && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Skill Gaps Identified</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysis.gaps?.slice(0, 6).map((gap: any, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{gap.skill}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      gap.priority === 'critical' ? 'bg-red-100 text-red-700' :
                      gap.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      gap.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {gap.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Current: {gap.currentLevel} → Required: {gap.requiredLevel}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/dashboard/analysis"
              className="mt-4 inline-block text-primary-600 hover:text-primary-700 font-medium"
            >
              View all gaps →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

