# Week 1 Plan: "The Walking Skeleton"

## Goal
By Day 7, send a hardcoded JSON pipeline (Startup Evaluator) to the API, have the backend "fake run" it (step-by-step), and save the status to the database.

## Day-by-Day Breakdown

### Monday (Day 1): The Contract ✅
- [x] Finalize JSON schema (input_schema, steps, tool_name)
- [x] Set up monorepo with Docker Compose (Postgres + Redis)
- [x] Write full JSON file for "Startup Idea Evaluator" pipeline

**Deliverables:**
- `pipelines/startup-evaluator.json` - Complete pipeline definition
- `docker-compose.yml` - PostgreSQL + Redis setup

### Tuesday (Day 2): Database & API Basics ✅
- [x] Create database tables: Tenant, User, Pipeline, Run, StepRun
- [x] Build basic API endpoints (POST /pipelines, GET /pipelines, POST /runs)

**Deliverables:**
- Prisma schema with all tables
- TypeScript API server with Express
- Authentication middleware (JWT + API keys)

### Wednesday (Day 3): The Ingestion ✅
- [x] Build POST /pipelines API - upload JSON file, save to Postgres
- [x] Build Parser - read Pipeline from DB, parse steps array

**Deliverables:**
- Pipeline creation API
- Pipeline retrieval API
- Database migrations

### Thursday (Day 4): The Execution Loop ✅
- [x] Implement Step Runner:
  - type = "tool": Return mock data (e.g., "Search results for Google")
  - type = "agent": Return mock string "AI Analysis Complete"
- [x] Build simple Run List endpoint to see DB rows

**Deliverables:**
- Python orchestrator service (FastAPI)
- Step execution with mock tools/agents
- Run listing API

### Friday (Day 5): Connecting the Wires ✅
- [x] Connect the loop - when Step 1 finishes, automatically queue Step 2
- [x] Topological sort DAG execution
- [x] Run lifecycle states: queued → running → completed

**Deliverables:**
- DAG topological sort implementation
- Sequential step execution
- Status updates in database

### Saturday (Day 6): The "Hello World" Demo
- [ ] Test full flow: Send `{ "idea": "Uber for Dogs" }` to API
- [ ] Watch DB status change: Queued → Running → Completed
- [ ] See mock report in StepRun table

**Testing Steps:**
1. Create tenant: `POST /api/v1/auth/tenants`
2. Login: `POST /api/v1/auth/login`
3. Create pipeline: `POST /api/v1/pipelines` (use startup-evaluator.json)
4. Start run: `POST /api/v1/runs` with `{ "pipelineId": "...", "inputs": { "idea": "Uber for Dogs" } }`
5. Check run status: `GET /api/v1/runs/:id`
6. Verify steps executed in order

### Sunday (Day 7): Review & Rest
- [ ] Code review: Ensure run lifecycle states update correctly
- [ ] Plan Week 2: Replace mock tools with real LangChain calls

## Architecture

### Services
1. **API Server** (TypeScript/Express) - Port 3000
   - Pipeline CRUD
   - Run management
   - Authentication & RBAC

2. **Orchestrator** (Python/FastAPI) - Port 8000
   - Pipeline execution
   - Step execution
   - DAG topological sort

3. **PostgreSQL** - Port 5432
   - All persistent data

4. **Redis** - Port 6379
   - Queue management
   - Status updates (temporary)

## Quick Start

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec api npx prisma migrate dev

# Start API server (if not using Docker)
npm run dev

# Start orchestrator (if not using Docker)
cd orchestrator
pip install -r requirements.txt
uvicorn main:app --reload
```

## Testing the Flow

```bash
# 1. Create tenant
curl -X POST http://localhost:3000/api/v1/auth/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "email": "admin@test.com", "password": "test123"}'

# 2. Login (save tenantId from above)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "test123", "tenantId": "<tenantId>"}'

# 3. Create pipeline
curl -X POST http://localhost:3000/api/v1/pipelines \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d @pipelines/startup-evaluator.json

# 4. Start run
curl -X POST http://localhost:3000/api/v1/runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "pipelineId": "<pipelineId>",
    "inputs": {"idea": "Uber for Dogs"}
  }'

# 5. Check status
curl http://localhost:3000/api/v1/runs/<runId> \
  -H "Authorization: Bearer <token>"
```

## Week 2 Preview

- Replace mock tools with real LLM integrations (OpenAI, Anthropic)
- Implement actual web search and competitor analysis
- Add artifact storage
- Implement approval workflow
- Add AG-UI components
