'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Upload, FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function ResumePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingResume, setExistingResume] = useState<any>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchResume()
  }, [user])

  const fetchResume = async () => {
    try {
      const response = await axios.get(`${API_URL}/resume`)
      setExistingResume(response.data)
      setResumeText(response.data.text || '')
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching resume:', error)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('resume', file)

    try {
      await axios.post(`${API_URL}/resume/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Resume uploaded successfully!')
      fetchResume()
      setFile(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveText = async () => {
    if (!resumeText.trim()) {
      toast.error('Please enter resume text')
      return
    }

    setLoading(true)
    try {
      await axios.put(`${API_URL}/resume/text`, { text: resumeText })
      toast.success('Resume saved successfully!')
      fetchResume()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Upload Your Resume</h1>

          {/* File Upload */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Resume (PDF, DOCX, or TXT)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
              <Upload className="mx-auto text-gray-400 mb-4" size={48} />
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Choose File
              </label>
              {file && (
                <p className="mt-2 text-sm text-gray-600">{file.name}</p>
              )}
            </div>
            {file && (
              <button
                onClick={handleUpload}
                disabled={loading}
                className="mt-4 w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Uploading...' : 'Upload Resume'}
              </button>
            )}
          </div>

          {/* Or Manual Entry */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Or Enter Resume Text Manually</h2>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={15}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Paste your resume content here..."
            />
            <button
              onClick={handleSaveText}
              disabled={loading || !resumeText.trim()}
              className="mt-4 w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Resume Text'}
            </button>
          </div>

          {/* Existing Resume Info */}
          {existingResume && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <FileText size={20} />
                <span className="font-medium">Resume Uploaded</span>
              </div>
              <p className="text-sm text-green-600">
                File: {existingResume.fileName}
              </p>
              <p className="text-sm text-green-600">
                Uploaded: {new Date(existingResume.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Next Step */}
          {existingResume && (
            <div className="mt-8 text-center">
              <Link
                href="/dashboard/jobs"
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Next: Select Job Role →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

