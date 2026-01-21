'use client'

/**
 * AG-UI Components for Embedding
 * These components can be embedded in external applications
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight, DollarSign } from 'lucide-react'
import api from '@/lib/api'

interface RunStatus {
  id: string
  status: string
  pipeline?: {
    name: string
  }
  cost: number
  tokensUsed: number
  startedAt?: string
  finishedAt?: string
}

interface RunStatusBadgeProps {
  runId: string
  apiUrl?: string
  onStatusChange?: (status: string) => void
}

/**
 * Compact run status badge component for embedding
 */
export function RunStatusBadge({ runId, apiUrl, onStatusChange }: RunStatusBadgeProps) {
  const [run, setRun] = useState<RunStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (apiUrl) {
      // Override API URL if provided
      const originalBaseURL = api.defaults.baseURL
      api.defaults.baseURL = `${apiUrl}/api/v1`
      
      return () => {
        api.defaults.baseURL = originalBaseURL
      }
    }
  }, [apiUrl])

  useEffect(() => {
    fetchRunStatus()
    const interval = setInterval(fetchRunStatus, 2000) // Poll every 2 seconds
    return () => clearInterval(interval)
  }, [runId])

  const fetchRunStatus = async () => {
    try {
      const response = await api.get(`/runs/${runId}`)
      setRun(response.data)
      if (onStatusChange && response.data.status !== run?.status) {
        onStatusChange(response.data.status)
      }
    } catch (error) {
      console.error('Failed to fetch run status', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'needs_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />
      case 'failed':
        return <XCircle className="w-4 h-4" />
      case 'running':
        return <Clock className="w-4 h-4 animate-spin" />
      case 'needs_approval':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-slate-600"></div>
        <span className="text-slate-700">Loading...</span>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-sm">
        <XCircle className="w-4 h-4 text-slate-600" />
        <span className="text-slate-700">Run not found</span>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${getStatusColor(run.status)}`}>
      {getStatusIcon(run.status)}
      <span className="capitalize">{run.status}</span>
      {run.cost > 0 && (
        <span className="ml-2 text-xs opacity-75">
          ${run.cost.toFixed(2)}
        </span>
      )}
    </div>
  )
}

interface RunStatusWidgetProps {
  runId: string
  apiUrl?: string
  compact?: boolean
}

/**
 * Full run status widget component for embedding
 */
export function RunStatusWidget({ runId, apiUrl, compact = false }: RunStatusWidgetProps) {
  const [run, setRun] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (apiUrl) {
      const originalBaseURL = api.defaults.baseURL
      api.defaults.baseURL = `${apiUrl}/api/v1`
      return () => {
        api.defaults.baseURL = originalBaseURL
      }
    }
  }, [apiUrl])

  useEffect(() => {
    fetchRun()
    const interval = setInterval(fetchRun, 2000)
    return () => clearInterval(interval)
  }, [runId])

  const fetchRun = async () => {
    try {
      const response = await api.get(`/runs/${runId}`)
      setRun(response.data)
    } catch (error) {
      console.error('Failed to fetch run', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-4 text-red-700">
        Run not found
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">{run.pipeline?.name || 'Run'}</h3>
          <RunStatusBadge runId={runId} apiUrl={apiUrl} />
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500 mb-1">Cost</p>
            <p className="font-semibold text-slate-900">${run.cost?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Tokens</p>
            <p className="font-semibold text-slate-900">{run.tokensUsed?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Steps</p>
            <p className="font-semibold text-slate-900">{run.steps?.length || 0}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{run.pipeline?.name || 'Run'}</h3>
          <RunStatusBadge runId={runId} apiUrl={apiUrl} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Cost</p>
            <p className="text-lg font-semibold text-slate-900">${run.cost?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Tokens</p>
            <p className="text-lg font-semibold text-slate-900">{run.tokensUsed?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Steps</p>
            <p className="text-lg font-semibold text-slate-900">{run.steps?.length || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Latency</p>
            <p className="text-lg font-semibold text-slate-900">{run.latencyMs ? `${run.latencyMs}ms` : '-'}</p>
          </div>
        </div>
      </div>
      {run.steps && run.steps.length > 0 && (
        <div className="p-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Steps</h4>
          <div className="space-y-2">
            {run.steps.map((step: any, index: number) => (
              <div key={step.id} className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-semibold">
                  {index + 1}
                </div>
                <span className="flex-1 text-slate-700">{step.stepId}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  step.status === 'completed' ? 'bg-green-100 text-green-700' :
                  step.status === 'failed' ? 'bg-red-100 text-red-700' :
                  step.status === 'running' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {step.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Approval request component for embedding
 */
interface ApprovalRequestProps {
  approvalId: string
  apiUrl?: string
  onDecision?: (decision: 'approved' | 'rejected') => void
}

export function ApprovalRequest({ approvalId, apiUrl, onDecision }: ApprovalRequestProps) {
  const [approval, setApproval] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (apiUrl) {
      const originalBaseURL = api.defaults.baseURL
      api.defaults.baseURL = `${apiUrl}/api/v1`
      return () => {
        api.defaults.baseURL = originalBaseURL
      }
    }
  }, [apiUrl])

  useEffect(() => {
    fetchApproval()
  }, [approvalId])

  const fetchApproval = async () => {
    try {
      const response = await api.get(`/approvals/${approvalId}`)
      setApproval(response.data)
    } catch (error) {
      console.error('Failed to fetch approval', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setSubmitting(true)
    try {
      await api.patch(`/approvals/${approvalId}/decision`, {
        decision,
        comment: comment || undefined,
      })
      if (onDecision) {
        onDecision(decision)
      }
    } catch (error: any) {
      console.error('Failed to update approval', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !approval || approval.decision !== 'pending') {
    return null
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-yellow-900 mb-1">Approval Required</h4>
          <p className="text-sm text-yellow-700">
            Run {approval.runId.substring(0, 8)}... requires your approval
          </p>
        </div>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)..."
        rows={2}
        className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
      />
      <div className="flex gap-2">
        <button
          onClick={() => handleDecision('rejected')}
          disabled={submitting}
          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => handleDecision('approved')}
          disabled={submitting}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          Approve
        </button>
      </div>
    </div>
  )
}
