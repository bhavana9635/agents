'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Loader2, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Pipeline {
  id: string
  name: string
  description?: string
  version: number
  inputSchema: any
}

interface CreateRunProps {
  onRunCreated: (runId: string) => void
}

export default function CreateRun({ onRunCreated }: CreateRunProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [inputs, setInputs] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    fetchPipelines()
  }, [])

  const fetchPipelines = async () => {
    try {
      const response = await api.get('/pipelines')
      setPipelines(response.data.data || [])
      if (response.data.data?.length > 0) {
        setSelectedPipeline(response.data.data[0].id)
        const schema = response.data.data[0].inputSchema
        if (typeof schema === 'string') {
          const parsed = JSON.parse(schema)
          initializeInputs(parsed)
        } else {
          initializeInputs(schema)
        }
      }
    } catch (error) {
      console.error('Failed to fetch pipelines', error)
      toast.error('Failed to load pipelines')
    } finally {
      setFetching(false)
    }
  }

  const initializeInputs = (schema: any) => {
    const newInputs: Record<string, any> = {}
    const properties = schema.properties || {}
    for (const key in properties) {
      const prop = properties[key]
      if (prop.type === 'string') {
        newInputs[key] = ''
      } else if (prop.type === 'number') {
        newInputs[key] = 0
      } else if (prop.type === 'boolean') {
        newInputs[key] = false
      } else if (prop.type === 'array') {
        newInputs[key] = []
      } else if (prop.type === 'object') {
        newInputs[key] = {}
      }
    }
    setInputs(newInputs)
  }

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipeline(pipelineId)
    const pipeline = pipelines.find(p => p.id === pipelineId)
    if (pipeline) {
      const schema = pipeline.inputSchema
      if (typeof schema === 'string') {
        const parsed = JSON.parse(schema)
        initializeInputs(parsed)
      } else {
        initializeInputs(schema)
      }
    }
  }

  const handleInputChange = (key: string, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPipeline) {
      toast.error('Please select a pipeline')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/runs', {
        pipelineId: selectedPipeline,
        inputs,
      })

      toast.success('Run created successfully!')
      onRunCreated(response.data.id)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create run')
    } finally {
      setLoading(false)
    }
  }

  const currentPipeline = pipelines.find(p => p.id === selectedPipeline)
  const inputSchema = currentPipeline?.inputSchema
    ? typeof currentPipeline.inputSchema === 'string'
      ? JSON.parse(currentPipeline.inputSchema)
      : currentPipeline.inputSchema
    : null

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (pipelines.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <p className="text-lg mb-2">No pipelines available</p>
        <p className="text-sm">Create a pipeline first to run it</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Create New Run</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Select Pipeline
        </label>
        <select
          value={selectedPipeline}
          onChange={(e) => handlePipelineChange(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {pipelines.map(pipeline => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.name} (v{pipeline.version})
            </option>
          ))}
        </select>
      </div>

      {inputSchema && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            Input Parameters
          </label>
          <div className="space-y-4">
            {Object.keys(inputSchema.properties || {}).map(key => {
              const prop = inputSchema.properties[key]
              const required = inputSchema.required?.includes(key)
              
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {key} {required && <span className="text-red-500">*</span>}
                    {prop.description && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                        {prop.description}
                      </span>
                    )}
                  </label>
                  {prop.type === 'string' && (
                    <textarea
                      value={inputs[key] || ''}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      required={required}
                      rows={4}
                      placeholder={prop.description || `Enter ${key}`}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  )}
                  {prop.type === 'number' && (
                    <input
                      type="number"
                      value={inputs[key] || ''}
                      onChange={(e) => handleInputChange(key, parseFloat(e.target.value) || 0)}
                      required={required}
                      placeholder={prop.description || `Enter ${key}`}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  )}
                  {prop.type === 'boolean' && (
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={inputs[key] || false}
                        onChange={(e) => handleInputChange(key, e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Enable {key}
                      </span>
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating Run...
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            Create Run
          </>
        )}
      </motion.button>
    </form>
  )
}
