# Agent Integration Centre (AIC) - MVP-1

Pipeline runtime + registry + runs execution platform.

## Tech Stack

- **API Server**: TypeScript/Node.js (Express)
- **Orchestrator**: Python (FastAPI)
- **Database**: PostgreSQL
- **Queue**: Redis
- **Infrastructure**: Docker Compose

## 🚀 Quick Start

**👉 For detailed step-by-step instructions, see [QUICKSTART.md](./QUICKSTART.md)**

### Prerequisites

- Docker Desktop installed and running
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

### Quick Setup (5 minutes)

```bash
# 1. Start database services
docker-compose up -d postgres redis

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Run migrations
npx prisma migrate dev --name init

# 5. Start API server (in one terminal)
npm run dev

# 6. Start orchestrator (in another terminal)
cd orchestrator
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Full Docker Setup

```bash
# Start all services (PostgreSQL, Redis, API, Orchestrator)
docker-compose up -d

# Run database migrations
docker-compose exec api npx prisma migrate dev --name init

# View logs
docker-compose logs -f
```

### Local Development

#### API Server

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

#### Orchestrator

```bash
cd orchestrator
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## API Endpoints

### Health Check
- `GET /health` - API health check
- `GET http://localhost:8000/health` - Orchestrator health check

### Authentication
- `POST /api/v1/auth/tenants` - Create tenant
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/api-keys` - Create API key

### Pipelines
- `POST /api/v1/pipelines` - Create pipeline
- `GET /api/v1/pipelines` - List pipelines
- `GET /api/v1/pipelines/:id` - Get pipeline

### Runs
- `POST /api/v1/runs` - Create/start run
- `GET /api/v1/runs` - List runs
- `GET /api/v1/runs/:id` - Get run details
- `GET /api/v1/runs/:id/logs` - Get run logs

## Example: Creating and Running a Pipeline

### 1. Create Tenant

```bash
curl -X POST http://localhost:3000/api/v1/auth/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "tenantId": "<tenant-id-from-step-1>"
  }'
```

### 3. Create Pipeline (Startup Evaluator)

```bash
curl -X POST http://localhost:3000/api/v1/pipelines \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token-from-step-2>" \
  -d @pipelines/startup-evaluator.json
```

### 4. Start Run

```bash
curl -X POST http://localhost:3000/api/v1/runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "pipelineId": "<pipeline-id-from-step-3>",
    "inputs": {
      "idea": "Uber for Dogs"
    }
  }'
```

### 5. Check Run Status

```bash
curl http://localhost:3000/api/v1/runs/<run-id> \
  -H "Authorization: Bearer <token>"
```

## Pipeline JSON Schema

See `pipelines/startup-evaluator.json` for a complete example.

A pipeline consists of:
- `name`: Pipeline name
- `description`: Pipeline description
- `inputSchema`: JSON schema for inputs
- `outputSchema`: JSON schema for outputs
- `steps`: DAG with nodes (steps) and edges (dependencies)
- `policies`: Execution policies (allowed tools, max budget, etc.)

## Run Lifecycle

1. **queued** - Run is queued for execution
2. **running** - Run is executing
3. **needs_approval** - Run is waiting for human approval
4. **completed** - Run completed successfully
5. **failed** - Run failed with error
6. **cancelled** - Run was cancelled

## Week 1 Goals (Walking Skeleton)

✅ Create pipelines (JSON/DAG) and save to database
✅ Run pipelines and track execution
✅ Step-by-step execution with mock tools
✅ Run history, status tracking, cost tracking
✅ Basic RBAC and API keys

## Next Steps (Week 2) ✅

✅ Replace mock tools with real LLM integrations (OpenAI, Anthropic)
✅ Implement actual web search and competitor analysis tools
✅ Add artifact storage and management
✅ Implement approval workflow UI
✅ Add AG-UI components for embedding
✅ Build super aesthetic frontend with Next.js

## Frontend Application

A beautiful, modern frontend is now available in the `frontend/` directory.

### Quick Start

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3001` (or the port shown).

See [frontend/README.md](./frontend/README.md) for more details.

## New Features

### Real LLM Integrations
- OpenAI (GPT-4, GPT-3.5, GPT-4o)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku)
- Automatic cost tracking and token counting

### Real Tools
- **Web Search** - Powered by Tavily API
- **Competitor Analysis** - Advanced competitor research with LLM enhancement

### Artifact Storage
- Local file storage system
- API endpoints for artifact management
- Support for multiple artifact types

### Approval Workflow
- Full approval workflow API
- Beautiful approval UI component
- Real-time approval notifications

### AG-UI Components
- Embeddable run status badges
- Run status widgets
- Approval request components
- See `/app/embed` for examples

## Development Notes

- Database migrations: `npx prisma migrate dev`
- Database studio: `npx prisma studio`
- Logs location: `./logs/`
- Storage location: `./storage/`
"# agents" 
