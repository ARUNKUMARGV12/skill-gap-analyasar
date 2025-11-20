'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft, Briefcase, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function JobsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchJobs()
  }, [user])

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/jobs`)
      setJobs(response.data)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      toast.error('Failed to load job roles')
    }
  }

  const handleSelectJob = async (jobId: string) => {
    setSelectedJob(jobId)
    toast.success('Job role selected! Now analyze your skills.')
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Your Target Job Role</h1>
          <p className="text-gray-600 mb-8">Choose the job role you want to analyze your skills for</p>

          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No job roles available. Please contact admin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div
                  key={job._id}
                  onClick={() => handleSelectJob(job._id)}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    selectedJob === job._id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                    {selectedJob === job._id && (
                      <CheckCircle2 className="text-primary-600" size={24} />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{job.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Category:</span>
                      <span className="text-xs text-gray-700">{job.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Level:</span>
                      <span className="text-xs text-gray-700 capitalize">{job.experienceLevel}</span>
                    </div>
                    {job.requiredSkills && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Key Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {job.requiredSkills.slice(0, 3).map((skill: any, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                            >
                              {skill.skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedJob && (
            <div className="mt-8 text-center">
              <Link
                href="/dashboard/analysis"
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Analyze My Skills →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

