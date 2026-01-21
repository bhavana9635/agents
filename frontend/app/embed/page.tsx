'use client'

/**
 * Embed page - Example of how to use AG-UI components
 */

import { RunStatusBadge, RunStatusWidget, ApprovalRequest } from '@/components/AGUI'
import { useState } from 'react'

export default function EmbedPage() {
  const [runId, setRunId] = useState('')
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">AG-UI Embed Components</h1>
          <p className="text-slate-600 mb-6">
            Use these components to embed run status and approvals in your applications
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                API URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="http://localhost:3000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Run ID
              </label>
              <input
                type="text"
                value={runId}
                onChange={(e) => setRunId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter run ID to preview"
              />
            </div>
          </div>
        </div>

        {runId && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Run Status Badge</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Compact badge:</p>
                  <RunStatusBadge runId={runId} apiUrl={apiUrl} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Run Status Widget</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Compact widget:</p>
                  <RunStatusWidget runId={runId} apiUrl={apiUrl} compact />
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Full widget:</p>
                  <RunStatusWidget runId={runId} apiUrl={apiUrl} />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Usage Example</h2>
          <pre className="bg-slate-100 rounded-lg p-4 overflow-x-auto text-sm">
{`import { RunStatusBadge, RunStatusWidget, ApprovalRequest } from '@/components/AGUI'

// In your component:
<RunStatusBadge runId="run-id-here" apiUrl="http://localhost:3000" />
<RunStatusWidget runId="run-id-here" apiUrl="http://localhost:3000" compact />
<ApprovalRequest approvalId="approval-id" apiUrl="http://localhost:3000" />`}
          </pre>
        </div>
      </div>
    </div>
  )
}
