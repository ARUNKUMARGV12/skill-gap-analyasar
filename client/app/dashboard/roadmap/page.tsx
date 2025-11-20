'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Youtube,
  Sparkles,
  ListChecks,
  PenSquare,
  Loader2,
  Play
} from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

type QuizQuestion = {
  question: string
  options: {
    A: string
    B: string
    C: string
    D: string
  }
  correctAnswer: keyof QuizQuestion['options']
  explanation?: string
  userAnswer?: string | null
  isCorrect?: boolean | null
}

type StepExtendedState = {
  playlists?: Array<{
    title: string
    channel: string
    url: string
    description: string
    videoCount?: string
    duration?: string
  }>
  playlistsLoading?: boolean
  playlistsError?: string | null
  quiz?: QuizQuestion[]
  quizLoading?: boolean
  quizError?: string | null
  quizResult?: {
    passed: boolean
    score: number
    correctCount: number
    totalQuestions: number
    questions: Array<{
      question: string
      userAnswer: string | null
      correctAnswer: string
      isCorrect: boolean | null
      explanation?: string
    }>
  }
  answers?: Record<number, string>
  submittingQuiz?: boolean
}

type StepStateMap = Record<number, StepExtendedState>

export default function RoadmapPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [roadmap, setRoadmap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [stepState, setStepState] = useState<StepStateMap>({})

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchRoadmap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchRoadmap = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/roadmap`)
      const roadmapData = response.data
      setRoadmap(roadmapData)
      initialiseStepState(roadmapData)
    } catch (error: any) {
      if (error.response?.status === 404) {
        setRoadmap(null)
        setStepState({})
      } else {
        console.error('Error fetching roadmap:', error)
        toast.error(error.response?.data?.message || 'Unable to load roadmap')
      }
    } finally {
      setLoading(false)
    }
  }

  const initialiseStepState = (roadmapData: any) => {
    const state: StepStateMap = {}
    roadmapData?.steps?.forEach((step: any, index: number) => {
      state[index] = {
        playlists: step.youtubePlaylists || [],
        quiz: step.quiz?.questions || [],
        quizResult: step.quiz?.passed
          ? {
              passed: true,
              score: 100,
              correctCount: step.quiz.questions?.length || 0,
              totalQuestions: step.quiz.questions?.length || 0,
              questions:
                step.quiz.questions?.map((q: any) => ({
                  question: q.question,
                  userAnswer: q.correctAnswer,
                  correctAnswer: q.correctAnswer,
                  isCorrect: true,
                  explanation: q.explanation
                })) || []
            }
          : undefined,
        answers: {}
      }
    })
    setStepState(state)
  }

  const ensureStepState = (stepIndex: number) => {
    setStepState((prev) => {
      if (prev[stepIndex]) return prev
      return {
        ...prev,
        [stepIndex]: {
          playlists: [],
          answers: {}
        }
      }
    })
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const response = await axios.post(`${API_URL}/roadmap`)
      setRoadmap(response.data)
      initialiseStepState(response.data)
      toast.success('Roadmap generated successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate roadmap')
    } finally {
      setGenerating(false)
    }
  }

  const handleUpdateStatus = async (stepIndex: number, status: string) => {
    try {
      const response = await axios.put(`${API_URL}/roadmap/step/${stepIndex}`, { status })
      const updatedProgress = response.data?.progress

      setRoadmap((prev: any) => {
        if (!prev) return prev
        const steps = [...prev.steps]
        steps[stepIndex] = {
          ...steps[stepIndex],
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : null
        }
        return {
          ...prev,
          steps,
          progress: updatedProgress || prev.progress
        }
      })

      toast.success('Progress updated!')
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update status'
      toast.error(message)
      if (error.response?.data?.requiresQuiz) {
        setExpandedStep(stepIndex)
      }
    }
  }

  const fetchPlaylists = async (stepIndex: number, force = false) => {
    ensureStepState(stepIndex)
    setStepState((prev) => ({
      ...prev,
      [stepIndex]: {
        ...prev[stepIndex],
        playlistsLoading: true,
        playlistsError: null
      }
    }))

    try {
      if (!force && roadmap?.steps?.[stepIndex]?.youtubePlaylists?.length) {
        setStepState((prev) => ({
          ...prev,
          [stepIndex]: {
            ...prev[stepIndex],
            playlists: roadmap.steps[stepIndex].youtubePlaylists,
            playlistsLoading: false
          }
        }))
        return
      }

      const response = await axios.get(`${API_URL}/roadmap/step/${stepIndex}/youtube`)
      const playlists = response.data?.playlists || []

      setRoadmap((prev: any) => {
        if (!prev) return prev
        const steps = [...prev.steps]
        steps[stepIndex] = {
          ...steps[stepIndex],
          youtubePlaylists: playlists
        }
        return { ...prev, steps }
      })

      setStepState((prev) => ({
        ...prev,
        [stepIndex]: {
          ...prev[stepIndex],
          playlists,
          playlistsLoading: false
        }
      }))
    } catch (error: any) {
      console.error('Error fetching YouTube playlists:', error)
      setStepState((prev) => ({
        ...prev,
        [stepIndex]: {
          ...prev[stepIndex],
          playlistsLoading: false,
          playlistsError: error.response?.data?.message || 'Unable to fetch playlists'
        }
      }))
      toast.error('Unable to fetch YouTube playlists')
    }
  }

  const generateQuizForStep = async (stepIndex: number) => {
    ensureStepState(stepIndex)
    setStepState((prev) => ({
      ...prev,
      [stepIndex]: {
        ...prev[stepIndex],
        quizLoading: true,
        quizError: null
      }
    }))

    try {
      const response = await axios.post(`${API_URL}/roadmap/step/${stepIndex}/quiz`)
      const questions: QuizQuestion[] = response.data?.questions || []

      setRoadmap((prev: any) => {
        if (!prev) return prev
        const steps = [...prev.steps]
        steps[stepIndex] = {
          ...steps[stepIndex],
          quiz: {
            ...steps[stepIndex]?.quiz,
            questions
          }
        }
        return { ...prev, steps }
      })

      setStepState((prev) => ({
        ...prev,
        [stepIndex]: {
          ...prev[stepIndex],
          quiz: questions,
          quizLoading: false,
          quizResult: undefined,
          answers: {}
        }
      }))

      toast.success('Quiz prepared for this skill!')
    } catch (error: any) {
      console.error('Error generating quiz:', error)
      setStepState((prev) => ({
        ...prev,
        [stepIndex]: {
          ...prev[stepIndex],
          quizLoading: false,
          quizError: error.response?.data?.message || 'Unable to generate quiz'
        }
      }))
      toast.error(error.response?.data?.message || 'Unable to generate quiz')
    }
  }

  const handleAnswerChange = (stepIndex: number, questionIndex: number, answer: string) => {
    ensureStepState(stepIndex)
    setStepState((prev) => ({
      ...prev,
      [stepIndex]: {
        ...prev[stepIndex],
        answers: {
          ...(prev[stepIndex]?.answers || {}),
          [questionIndex]: answer
        },
        quizResult: undefined
      }
    }))
  }

  const submitQuizAnswers = async (stepIndex: number) => {
    const stepData = stepState[stepIndex]
    const quizQuestions = stepData?.quiz

    if (!quizQuestions || quizQuestions.length === 0) {
      toast.error('Generate the quiz before submitting answers.')
      return
    }

    const answers = stepData.answers || {}
    const unanswered = quizQuestions.filter((_, idx) => !answers[idx])
    if (unanswered.length > 0) {
      toast.error('Please answer all questions before submitting.')
      return
    }

    setStepState((prev) => ({
      ...prev,
      [stepIndex]: {
        ...prev[stepIndex],
        submittingQuiz: true
      }
    }))

    try {
      const payload = Object.entries(answers).map(([questionIndex, answer]) => ({
        questionIndex: Number(questionIndex),
        answer
      }))

      const response = await axios.post(`${API_URL}/roadmap/step/${stepIndex}/quiz/submit`, {
        answers: payload
      })

      const result = response.data

      setRoadmap((prev: any) => {
        if (!prev) return prev
        const steps = [...prev.steps]
        steps[stepIndex] = {
          ...steps[stepIndex],
          quiz: {
            ...(steps[stepIndex]?.quiz || {}),
            passed: result.passed,
            passedAt: result.passed ? new Date().toISOString() : null,
            questions: (steps[stepIndex]?.quiz?.questions || []).map((q: any, idx: number) => ({
              ...q,
              userAnswer: answers[idx],
              isCorrect: result.questions[idx]?.isCorrect
            }))
          }
        }
        return { ...prev, steps }
      })

      setStepState((prev) => ({
        ...prev,
        [stepIndex]: {
          ...prev[stepIndex],
          submittingQuiz: false,
          quizResult: result
        }
      }))

      if (result.passed) {
        toast.success('Great job! You passed the quiz.')
      } else {
        toast('Review the explanations and try again.', { icon: '📝' })
      }
    } catch (error: any) {
      console.error('Submit quiz error:', error)
      toast.error(error.response?.data?.message || 'Unable to submit quiz')
      setStepState((prev) => ({
        ...prev,
        [stepIndex]: {
          ...prev[stepIndex],
          submittingQuiz: false
        }
      }))
    }
  }

  const handleToggleStep = (index: number) => {
    if (expandedStep === index) {
      setExpandedStep(null)
    } else {
      setExpandedStep(index)
      ensureStepState(index)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="text-green-600" size={18} />
      case 'in_progress':
        return <Play className="text-blue-600" size={18} />
      default:
        return <Clock className="text-gray-400" size={18} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const renderPlaylists = (stepIndex: number) => {
    const stepData = stepState[stepIndex]
    const playlists = stepData?.playlists || []
    const loading = stepData?.playlistsLoading
    const error = stepData?.playlistsError

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Youtube size={18} className="text-red-500" />
            Curated YouTube Playlists
          </h4>
          <button
            onClick={() => fetchPlaylists(stepIndex, true)}
            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <Sparkles size={14} />
            Refresh suggestions
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            Searching YouTube playlists...
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && playlists.length === 0 && (
          <button
            onClick={() => fetchPlaylists(stepIndex)}
            className="px-3 py-2 text-sm bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100"
          >
            Fetch recommended playlists
          </button>
        )}

        {!loading && playlists.length > 0 && (
          <div className="space-y-3">
            {playlists.map((playlist, idx) => (
              <div
                key={`${playlist.url}-${idx}`}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900">{playlist.title}</h5>
                    <p className="text-xs text-gray-500 mt-1">Channel: {playlist.channel}</p>
                    {playlist.description && (
                      <p className="text-sm text-gray-600 mt-2">{playlist.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                      {playlist.videoCount && <span>Videos: {playlist.videoCount}</span>}
                      {playlist.duration && <span>Duration: {playlist.duration}</span>}
                    </div>
                  </div>
                  <a
                    href={playlist.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Watch
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderQuiz = (stepIndex: number) => {
    const stepData = stepState[stepIndex]
    const quiz = stepData?.quiz || []
    const loadingQuiz = stepData?.quizLoading
    const quizResult = stepData?.quizResult
    const submitting = stepData?.submittingQuiz
    const quizPassed = quizResult?.passed || roadmap?.steps?.[stepIndex]?.quiz?.passed

    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ListChecks size={18} className="text-primary-600" />
            Skill Check Quiz
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => generateQuizForStep(stepIndex)}
              disabled={loadingQuiz}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-primary-200 text-primary-600 rounded-md hover:bg-primary-50 disabled:opacity-50"
            >
              <PenSquare size={14} />
              {quiz.length > 0 ? 'Regenerate quiz' : 'Generate quiz'}
            </button>
          </div>
        </div>

        {loadingQuiz && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            Crafting quiz questions...
          </div>
        )}

        {stepData?.quizError && <p className="text-sm text-red-600">{stepData.quizError}</p>}

        {quiz.length > 0 && (
          <div className="space-y-4">
            {quiz.map((question, qIdx) => {
              const selected = stepData.answers?.[qIdx]
              const result = quizResult?.questions?.[qIdx]
              const isCorrect = result?.isCorrect
              return (
                <div
                  key={qIdx}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {qIdx + 1}. {question.question}
                  </p>
                  <div className="mt-3 space-y-2">
                    {Object.entries(question.options).map(([optionKey, optionValue]) => {
                      const optionId = `step-${stepIndex}-question-${qIdx}-option-${optionKey}`
                      const isSelected = selected === optionKey
                      const isAnswerView = !!quizResult
                      const isOptionCorrect = result
                        ? optionKey === result.correctAnswer
                        : false
                      const optionClasses = [
                        'rounded-md border px-3 py-2 text-sm transition-colors',
                        isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200',
                        isAnswerView && isOptionCorrect ? 'border-green-500 bg-green-50' : '',
                        isAnswerView && isSelected && !isOptionCorrect ? 'border-red-400 bg-red-50' : ''
                      ].join(' ')

                      return (
                        <label key={optionKey} htmlFor={optionId} className={optionClasses}>
                          <div className="flex items-center gap-3">
                            <input
                              id={optionId}
                              type="radio"
                              name={`question-${stepIndex}-${qIdx}`}
                              value={optionKey}
                              checked={isSelected}
                              onChange={() => handleAnswerChange(stepIndex, qIdx, optionKey)}
                              disabled={!!quizResult}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="font-medium">{optionKey}.</span>
                            <span className="text-gray-700">{optionValue}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  {quizResult && result && (
                    <div className="mt-3 text-sm">
                      <p className={isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {isCorrect ? 'Correct!' : 'Not quite.'}
                      </p>
                      {result.explanation && (
                        <p className="text-gray-600 mt-1">{result.explanation}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {!quizResult && (
              <div className="flex items-center justify-end">
                <button
                  onClick={() => submitQuizAnswers(stepIndex)}
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Submit answers
                </button>
              </div>
            )}

            {quizResult && (
              <div className={`rounded-lg border p-4 ${quizPassed ? 'border-green-300 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                <p className="text-sm font-semibold text-gray-900">
                  {quizPassed ? 'Quiz passed!' : 'Quiz results'}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Score: {quizResult.score}% ({quizResult.correctCount} of {quizResult.totalQuestions} correct)
                </p>
                {!quizPassed && (
                  <p className="text-xs text-gray-500 mt-1">
                    You need at least 80% to pass. Review the explanations and try again.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading roadmap...
        </div>
      </div>
    )
  }

  if (!roadmap) {
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

          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={64} />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No Roadmap Found</h1>
            <p className="text-gray-600 mb-6">
              Generate a personalized learning roadmap based on your skill gaps
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {generating ? 'Generating...' : 'Generate Roadmap'}
            </button>
          </div>
        </div>
      </div>
    )
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Learning Roadmap</h1>
              <p className="text-gray-600 mt-1">Your personalized upskilling path</p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {generating ? 'Regenerating...' : 'Regenerate roadmap'}
            </button>
          </div>

          <div className="space-y-4">
            {roadmap.steps?.map((step: any, idx: number) => {
              const isExpanded = expandedStep === idx
              const statusColor = getStatusColor(step.status)
              return (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => handleToggleStep(idx)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-semibold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">{step.skill}</h3>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor} flex items-center gap-1`}>
                            {getStatusIcon(step.status)}
                            {step.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {step.description || 'Focus on mastering this competency to bridge your skill gap.'}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-6 bg-gray-50">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                          <div className="bg-white border border-gray-200 rounded-lg p-5">
                            <h4 className="text-sm font-semibold text-gray-900">Learning Focus</h4>
                            <p className="mt-2 text-sm text-gray-700">
                              {step.description || 'Build depth in this skill to close the identified gap. Start with the recommended resources and practice consistently.'}
                            </p>
                            <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                              <Clock size={14} />
                              Estimated time: {step.estimatedTime || 'N/A'}
                            </div>
                            {step.resources && step.resources.length > 0 && (
                              <div className="mt-4">
                                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                  Suggested milestones
                                </p>
                                <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                                  {step.resources.map((resource: string, rIdx: number) => (
                                    <li key={rIdx}>{resource}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="bg-white border border-gray-200 rounded-lg p-5">
                            {renderPlaylists(idx)}
                          </div>

                          <div className="bg-white border border-gray-200 rounded-lg p-5">
                            {renderQuiz(idx)}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-white border border-gray-200 rounded-lg p-5">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Step Actions</h4>
                            <div className="space-y-2">
                              {step.status !== 'in_progress' && (
                                <button
                                  onClick={() => handleUpdateStatus(idx, 'in_progress')}
                                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                  Start Learning
                                </button>
                              )}
                              {step.status === 'in_progress' && (
                                <button
                                  onClick={() => handleUpdateStatus(idx, 'not_started')}
                                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                                >
                                  Reset Step
                                </button>
                              )}
                              {step.status !== 'completed' && (
                                <button
                                  onClick={() => handleUpdateStatus(idx, 'completed')}
                                  className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                                >
                                  Mark Completed
                                </button>
                              )}
                              {step.status === 'completed' && (
                                <div className="w-full px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md border border-green-200 text-center">
                                  Step completed
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/dashboard/progress"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Check your progress dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

