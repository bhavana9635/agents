'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Play, FileText, DollarSign } from 'lucide-react'
import api from '@/lib/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface StepRun {
  id: string
  stepId: string
  stepType: string
  toolUsed?: string
  status: string
  inputs: any
  outputs?: any
  cost: number
  tokensUsed: number
  latencyMs?: number
  errorMessage?: string
  startedAt?: string
  finishedAt?: string
  orderIndex: number
}

interface RunDetailProps {
  runId: string
  onClose: () => void
}

export default function RunDetail({ runId, onClose }: RunDetailProps) {
  const [run, setRun] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    fetchRunDetail()
    const interval = setInterval(fetchRunDetail, 2000) // Refresh every 2 seconds
    return () => clearInterval(interval)
  }, [runId])

  const fetchRunDetail = async () => {
    try {
      const response = await api.get(`/runs/${runId}`)
      setRun(response.data)
    } catch (error) {
      console.error('Failed to fetch run detail', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
    }
    setExpandedSteps(newExpanded)
  }

  const canStart = run?.status === 'queued' || run?.status === 'failed'

  const handleStart = async () => {
    if (!canStart || starting) return
    setStarting(true)
    try {
      await api.post(`/runs/${runId}/start`)
      toast.success('Run started')
      await fetchRunDetail()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start run')
    } finally {
      setStarting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
      case 'needs_approval':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-slate-400" />
    }
  }

  if (loading) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </motion.div>
      </AnimatePresence>
    )
  }

  if (!run) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {run.pipeline?.name || 'Run Details'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                ID: {run.id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canStart && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStart}
                  disabled={starting}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {starting ? 'Starting…' : run.status === 'failed' ? 'Retry' : 'Start'}
                </motion.button>
              )}
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Run Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(run.status)}
                  <p className="font-semibold text-slate-900 dark:text-white capitalize">{run.status}</p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Cost</p>
                <p className="font-semibold text-slate-900 dark:text-white">${run.cost?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tokens</p>
                <p className="font-semibold text-slate-900 dark:text-white">{run.tokensUsed?.toLocaleString() || '0'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Latency</p>
                <p className="font-semibold text-slate-900 dark:text-white">{run.latencyMs ? `${run.latencyMs}ms` : '-'}</p>
              </div>
            </div>

            {/* Steps */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Steps</h3>
              <div className="space-y-3">
                {run.steps?.map((step: StepRun, index: number) => (
                  <div
                    key={step.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleStep(step.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-sm font-semibold text-purple-600 dark:text-purple-400">
                          {step.orderIndex + 1}
                        </div>
                        {getStatusIcon(step.status)}
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-slate-900 dark:text-white">{step.stepId}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{step.stepType}</p>
                        </div>
                        {step.cost > 0 && (
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            ${step.cost.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {expandedSteps.has(step.id) ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    {expandedSteps.has(step.id) && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700 space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Inputs</p>
                          <pre className="text-xs bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-600 overflow-x-auto">
                            {JSON.stringify(step.inputs, null, 2)}
                          </pre>
                        </div>
                        {step.outputs && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Outputs</p>
                            <pre className="text-xs bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-600 overflow-x-auto">
                              {JSON.stringify(step.outputs, null, 2)}
                            </pre>
                          </div>
                        )}
                        {step.errorMessage && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                            <p className="text-xs font-semibold text-red-800 dark:text-red-400 mb-1">Error</p>
                            <p className="text-xs text-red-700 dark:text-red-300">{step.errorMessage}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
