'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Search, Plus, Eye, Play } from 'lucide-react'
import api from '@/lib/api'
import { format } from 'date-fns'

interface Pipeline {
  id: string
  name: string
  description?: string
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function PipelineList() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchPipelines()
  }, [])

  const fetchPipelines = async () => {
    try {
      const response = await api.get('/pipelines')
      setPipelines(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch pipelines', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPipelines = pipelines.filter(pipeline => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        pipeline.name.toLowerCase().includes(query) ||
        pipeline.description?.toLowerCase().includes(query) ||
        pipeline.id.toLowerCase().includes(query)
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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pipelines</h2>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search pipelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPipelines.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">
            {searchQuery ? 'No pipelines found' : 'No pipelines available'}
          </div>
        ) : (
          filteredPipelines.map((pipeline, index) => (
            <motion.div
              key={pipeline.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {pipeline.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      v{pipeline.version}
                    </p>
                  </div>
                </div>
                {pipeline.isActive ? (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium rounded">
                    Inactive
                  </span>
                )}
              </div>

              {pipeline.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                  {pipeline.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-600">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {format(new Date(pipeline.updatedAt), 'MMM d, yyyy')}
                </span>
                <button className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  View
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
