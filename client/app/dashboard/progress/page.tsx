'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft, TrendingUp, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function ProgressPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [progress, setProgress] = useState<any>(null)
  const [detailedProgress, setDetailedProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchProgress()
  }, [user])

  const fetchProgress = async () => {
    try {
      const [progressRes, detailedRes] = await Promise.all([
        axios.get(`${API_URL}/progress`),
        axios.get(`${API_URL}/progress/detailed`)
      ])
      setProgress(progressRes.data)
      setDetailedProgress(detailedRes.data)
    } catch (error) {
      console.error('Error fetching progress:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const skillStatusData = detailedProgress?.skills?.reduce((acc: any, skill: any) => {
    acc[skill.status] = (acc[skill.status] || 0) + 1
    return acc
  }, {}) || {}

  const chartData = [
    { name: 'Completed', value: skillStatusData.completed || 0, color: '#10b981' },
    { name: 'In Progress', value: skillStatusData.in_progress || 0, color: '#0ea5e9' },
    { name: 'Not Started', value: skillStatusData.not_started || 0, color: '#9ca3af' },
  ]

  const timelineData = detailedProgress?.timeline?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    completed: item.completed
  })) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Progress Tracking</h1>
          <p className="text-gray-600">Monitor your upskilling journey</p>
        </div>

        {/* Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Overall Progress</h3>
              <TrendingUp className="text-primary-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-primary-700">{progress?.overallCompletion || 0}%</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${progress?.overallCompletion || 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Job Accessibility</h3>
              <BarChart3 className="text-green-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-green-700">{progress?.jobAccessibility || 0}%</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${progress?.jobAccessibility || 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Skills Completed</h3>
            <p className="text-3xl font-bold text-blue-700">
              {progress?.skillsCompleted || 0} / {progress?.totalSkills || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Remaining</h3>
            <p className="text-3xl font-bold text-orange-700">
              {(progress?.totalSkills || 0) - (progress?.skillsCompleted || 0)}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Progress Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Progress Timeline</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  name="Skills Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Skill Status Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Skill Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills List */}
        {detailedProgress?.skills && detailedProgress.skills.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills Breakdown</h2>
            <div className="space-y-3">
              {detailedProgress.skills.map((skill: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{skill.skill}</h3>
                    <p className="text-sm text-gray-600">
                      Priority: <span className="capitalize">{skill.priority}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      skill.status === 'completed' ? 'bg-green-100 text-green-800' :
                      skill.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {skill.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

