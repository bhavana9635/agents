# AIC Frontend

Modern, aesthetic frontend for the Agent Integration Centre built with Next.js 14, React, and Tailwind CSS.

## Features

- 🎨 **Super Aesthetic UI** - Modern, gradient-based design with smooth animations
- 📊 **Real-time Dashboard** - Live updates of runs, pipelines, and statistics
- ✅ **Approval Workflow UI** - Beautiful approval request components
- 🧩 **AG-UI Components** - Embeddable components for external applications
- 🌙 **Dark Mode Support** - Automatic dark mode based on system preferences
- 📱 **Responsive Design** - Works beautifully on all screen sizes

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running on `http://localhost:3000` (or configure `NEXT_PUBLIC_API_URL`)

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (or the port shown) in your browser.

### Build

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Components

### Main Components

- **Dashboard** - Main dashboard with stats and navigation
- **RunsList** - List of all runs with filtering and search
- **RunDetail** - Detailed view of a run with step-by-step execution
- **PipelineList** - List of available pipelines
- **CreateRun** - Form to create and start a new run
- **ApprovalWorkflow** - Floating approval request UI
- **Login** - Beautiful login page

### AG-UI Components (for embedding)

Located in `components/AGUI.tsx`:

- **RunStatusBadge** - Compact status badge
- **RunStatusWidget** - Full run status widget (compact or full)
- **ApprovalRequest** - Approval request component

See `app/embed/page.tsx` for usage examples.

## Usage Examples

### Using AG-UI Components in Your App

```tsx
import { RunStatusBadge, RunStatusWidget } from '@/components/AGUI'

// Compact badge
<RunStatusBadge 
  runId="your-run-id" 
  apiUrl="http://localhost:3000"
  onStatusChange={(status) => console.log(status)}
/>

// Full widget
<RunStatusWidget 
  runId="your-run-id" 
  apiUrl="http://localhost:3000"
  compact={false}
/>
```

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animations
- **Zustand** - State management
- **Axios** - HTTP client
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

## Project Structure

```
frontend/
├── app/              # Next.js app directory
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   ├── embed/        # Embed examples
│   └── globals.css   # Global styles
├── components/       # React components
│   ├── Dashboard.tsx
│   ├── RunsList.tsx
│   ├── RunDetail.tsx
│   ├── ApprovalWorkflow.tsx
│   └── AGUI.tsx      # Embeddable components
├── lib/              # Utilities
│   └── api.ts        # API client
└── store/            # State management
    └── authStore.ts
```

## License

MIT
