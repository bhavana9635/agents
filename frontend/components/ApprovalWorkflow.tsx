'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle2, XCircle, MessageSquare, Clock } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Approval {
  id: string
  runId: string
  stepId?: string
  decision?: string
  comment?: string
  createdAt: string
  decidedAt?: string
  approver?: {
    name?: string
    email: string
  }
}

interface ApprovalWorkflowProps {
  onRefresh: () => void
}

export default function ApprovalWorkflow({ onRefresh }: ApprovalWorkflowProps) {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null)
  const [comment, setComment] = useState('')

  useEffect(() => {
    fetchPendingApprovals()
    const interval = setInterval(fetchPendingApprovals, 3000) // Check every 3 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchPendingApprovals = async () => {
    try {
      // Fetch runs that need approval
      const runsResponse = await api.get('/runs?status=needs_approval&pageSize=10')
      const runs = runsResponse.data.data || []

      // Fetch approvals for each run
      const allApprovals: Approval[] = []
      for (const run of runs) {
        try {
          const approvalsResponse = await api.get(`/runs/${run.id}/approvals`)
          const pending = (approvalsResponse.data.approvals || []).filter(
            (a: Approval) => a.decision === 'pending' || !a.decision
          )
          allApprovals.push(...pending)
        } catch (error) {
          // Ignore errors for individual runs
        }
      }

      setApprovals(allApprovals)
      if (allApprovals.length > 0 && !selectedApproval) {
        setSelectedApproval(allApprovals[0])
      }
    } catch (error) {
      console.error('Failed to fetch approvals', error)
    }
  }

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedApproval) return

    setLoading(true)
    try {
      await api.patch(`/approvals/${selectedApproval.id}/decision`, {
        decision,
        comment: comment || undefined,
      })

      toast.success(`Request ${decision === 'approved' ? 'approved' : 'rejected'}`)
      setComment('')
      setSelectedApproval(null)
      fetchPendingApprovals()
      onRefresh()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update approval')
    } finally {
      setLoading(false)
    }
  }

  if (approvals.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 z-50 max-w-md w-full"
      >
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-yellow-200 dark:border-yellow-700 p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                Pending Approvals
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {approvals.length} request{approvals.length > 1 ? 's' : ''} awaiting your decision
              </p>
            </div>
          </div>

          {selectedApproval && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Requested {format(new Date(selectedApproval.createdAt), 'MMM d, HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Run ID: {selectedApproval.runId.substring(0, 8)}...
                </p>
                {selectedApproval.stepId && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Step: {selectedApproval.stepId}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Comment (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDecision('rejected')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDecision('approved')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </motion.button>
              </div>

              {approvals.length > 1 && (
                <div className="text-center">
                  <button
                    onClick={() => {
                      const currentIndex = approvals.indexOf(selectedApproval)
                      const nextIndex = (currentIndex + 1) % approvals.length
                      setSelectedApproval(approvals[nextIndex])
                      setComment('')
                    }}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Next approval ({approvals.length - 1} more)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
