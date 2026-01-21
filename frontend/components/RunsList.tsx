'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  PlayCircle,
  Eye,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react'
import api from '@/lib/api'
import { format } from 'date-fns'

interface Run {
  id: string
  pipelineId: string
  pipeline?: {
    name: string
  }
  status: string
  cost: number
  tokensUsed: number
  latencyMs?: number
  startedAt?: string
  finishedAt?: string
  createdAt: string
}

interface RunsListProps {
  onRunSelect: (runId: string) => void
  selectedRunId: string | null
}

export default function RunsList({ onRunSelect, selectedRunId }: RunsListProps) {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [filter])

  const fetchRuns = async () => {
    try {
      const params: any = { pageSize: 50 }
      if (filter !== 'all') {
        params.status = filter
      }
      const response = await api.get('/runs', { params })
      setRuns(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch runs', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
      case 'queued':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
      case 'needs_approval':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-slate-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'needs_approval':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
    }
  }

  const filteredRuns = runs.filter(run => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        run.id.toLowerCase().includes(query) ||
        run.pipeline?.name.toLowerCase().includes(query) ||
        run.status.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Runs</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search runs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="needs_approval">Needs Approval</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredRuns.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            No runs found
          </div>
        ) : (
          filteredRuns.map((run, index) => (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onRunSelect(run.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedRunId === run.id
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                  : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {getStatusIcon(run.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {run.pipeline?.name || 'Unknown Pipeline'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                        {run.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      <span>ID: {run.id.substring(0, 8)}...</span>
                      {run.startedAt && (
                        <span>Started: {format(new Date(run.startedAt), 'MMM d, HH:mm')}</span>
                      )}
                      {run.cost > 0 && <span>Cost: ${run.cost.toFixed(2)}</span>}
                      {run.tokensUsed > 0 && <span>Tokens: {run.tokensUsed.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
