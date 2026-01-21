'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  PlayCircle, 
  History, 
  Settings, 
  LogOut,
  Plus,
  Filter,
  Search,
  ChevronRight,
  Activity,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import RunsList from './RunsList'
import PipelineList from './PipelineList'
import RunDetail from './RunDetail'
import CreateRun from './CreateRun'
import ApprovalWorkflow from './ApprovalWorkflow'
import toast from 'react-hot-toast'

type Tab = 'pipelines' | 'runs' | 'create'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('runs')
  const [selectedRun, setSelectedRun] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalRuns: 0,
    runningRuns: 0,
    completedRuns: 0,
    totalCost: 0,
  })
  const { logout, email } = useAuthStore()

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const [runsResponse] = await Promise.all([
        api.get('/runs?pageSize=100'),
      ])
      
      const runs = runsResponse.data.data || []
      const running = runs.filter((r: any) => r.status === 'running' || r.status === 'queued')
      const completed = runs.filter((r: any) => r.status === 'completed')
      const cost = runs.reduce((sum: number, r: any) => sum + (r.cost || 0), 0)

      setStats({
        totalRuns: runs.length,
        runningRuns: running.length,
        completedRuns: completed.length,
        totalCost: cost,
      })
    } catch (error) {
      console.error('Failed to fetch stats', error)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-lg z-40">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            AIC Platform
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{email}</p>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab('runs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'runs'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="font-medium">Runs</span>
          </button>

          <button
            onClick={() => setActiveTab('pipelines')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'pipelines'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Pipelines</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Create Run</span>
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Runs</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.totalRuns}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Running</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.runningRuns}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Completed</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.completedRuns}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Cost</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">${stats.totalCost.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6"
        >
          {activeTab === 'runs' && (
            <RunsList 
              onRunSelect={setSelectedRun}
              selectedRunId={selectedRun}
            />
          )}
          {activeTab === 'pipelines' && <PipelineList />}
          {activeTab === 'create' && (
            <CreateRun 
              onRunCreated={(runId) => {
                setSelectedRun(runId)
                setActiveTab('runs')
              }}
            />
          )}
        </motion.div>

        {/* Run Detail Modal */}
        {selectedRun && (
          <RunDetail
            runId={selectedRun}
            onClose={() => setSelectedRun(null)}
          />
        )}
      </div>

      {/* Approval Workflow - Show when run needs approval */}
      <ApprovalWorkflow onRefresh={fetchStats} />
    </div>
  )
}
