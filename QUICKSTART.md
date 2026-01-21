# AIC MVP-1: Step-by-Step Quick Start Guide

Follow these steps to get the Agent Integration Centre running locally.

## Prerequisites

Before you begin, ensure you have:
- **Docker Desktop** installed and running
- **Node.js 20+** installed (for local development)
- **Git** installed

## Step 1: Check Docker is Running

Open a terminal and verify Docker is running:

```bash
docker ps
```

If Docker is not running, start Docker Desktop and wait for it to fully start.

## Step 2: Clone/Navigate to Project

If you haven't already, navigate to the project directory:

```bash
cd c:\Users\bhava\Downloads\pvl
```

## Step 3: Start Database Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d postgres redis
```

Wait about 10-15 seconds for the services to be ready. You can check their status:

```bash
docker-compose ps
```

You should see both `postgres` and `redis` with status "Up (healthy)".

## Step 4: Install Dependencies

Install Node.js dependencies:

```bash
npm install
```

This will install all TypeScript/Node.js packages.

## Step 5: Set Up Environment Variables

Create a `.env` file in the root directory (or copy from `.env.example` if it exists):

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Or manually create .env file with:
```

Create `.env` file with this content:

```env
DATABASE_URL="postgresql://aic_user:aic_password@localhost:5432/aic_db"
REDIS_URL="redis://localhost:6379"
PORT=3000
NODE_ENV=development
ORCHESTRATOR_URL="http://localhost:8000"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
API_KEY_SECRET=your-api-key-encryption-secret-change-this
LOG_LEVEL=info
STORAGE_TYPE=local
STORAGE_PATH=./storage
```

## Step 6: Generate Prisma Client

Generate the Prisma client for database access:

```bash
npx prisma generate
```

## Step 7: Run Database Migrations

Create the database tables:

```bash
npx prisma migrate dev --name init
```

This will:
- Create all database tables (tenants, users, pipelines, runs, etc.)
- Generate migration files in `prisma/migrations/`

## Step 8: Start API Server

Open a **new terminal window** (keep the first one open) and start the API server:

```bash
cd c:\Users\bhava\Downloads\pvl
npm run dev
```

You should see:
```
AIC API Server running on port 3000
```

The API server is now running at `http://localhost:3000`

## Step 9: Set Up Python Environment (for Orchestrator)

Open a **third terminal window** and navigate to the orchestrator directory:

```bash
cd c:\Users\bhava\Downloads\pvl\orchestrator
```

Create a Python virtual environment (recommended):

```bash
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1

# If you get an execution policy error, run:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

## Step 10: Start Orchestrator Service

In the same terminal (with venv activated), start the orchestrator:

```bash
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

The orchestrator is now running at `http://localhost:8000`

## Step 11: Verify Services are Running

Open a **fourth terminal** or use a browser/Postman to test:

### Test API Health:
```bash
curl http://localhost:3000/health
```
Expected response: `{"status":"ok","service":"aic-api"}`

### Test Orchestrator Health:
```bash
curl http://localhost:8000/health
```
Expected response: `{"status":"ok","service":"aic-orchestrator"}`

## Step 12: Create a Tenant

Create your first tenant (organization):

```bash
curl -X POST http://localhost:3000/api/v1/auth/tenants `
  -H "Content-Type: application/json" `
  -d '{\"name\": \"My Company\", \"email\": \"admin@company.com\", \"password\": \"password123\"}'
```

**Save the `tenantId` from the response!** You'll need it for the next step.

Expected response:
```json
{
  "tenantId": "uuid-here",
  "userId": "uuid-here",
  "message": "Tenant created successfully"
}
```

## Step 13: Login and Get Token

Login to get a JWT token:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\": \"admin@company.com\", \"password\": \"password123\", \"tenantId\": \"<your-tenant-id>\"}'
```

**Save the `token` from the response!** Replace `<your-tenant-id>` with the tenantId from Step 12.

Expected response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "admin@company.com",
    "roles": ["admin", "user"]
  }
}
```

## Step 14: Create a Pipeline

Create the "Startup Evaluator" pipeline:

```bash
curl -X POST http://localhost:3000/api/v1/pipelines `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <your-token>" `
  -d @pipelines/startup-evaluator.json
```

Replace `<your-token>` with the token from Step 13.

**Save the `id` from the response** - this is your pipeline ID.

Expected response:
```json
{
  "id": "pipeline-uuid",
  "name": "Startup Idea Evaluator",
  "version": 1,
  ...
}
```

## Step 15: Run a Pipeline

Start a pipeline execution with an idea:

```bash
curl -X POST http://localhost:3000/api/v1/runs `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <your-token>" `
  -d '{\"pipelineId\": \"<pipeline-id>\", \"inputs\": {\"idea\": \"Uber for Dogs\"}}'
```

Replace:
- `<your-token>` with your token
- `<pipeline-id>` with the pipeline ID from Step 14

Expected response:
```json
{
  "id": "run-uuid",
  "pipelineId": "...",
  "status": "queued",
  ...
}
```

## Step 16: Check Run Status

Check the execution status:

```bash
curl http://localhost:3000/api/v1/runs/<run-id> `
  -H "Authorization: Bearer <your-token>"
```

Replace:
- `<run-id>` with the run ID from Step 15
- `<your-token>` with your token

You should see the run status change from:
1. `"queued"` → 
2. `"running"` → 
3. `"completed"` (with outputs)

Check the `steps` array to see each step's execution status.

## Step 17: View All Runs

List all runs for your tenant:

```bash
curl http://localhost:3000/api/v1/runs `
  -H "Authorization: Bearer <your-token>"
```

## Alternative: Using Docker Compose for Everything

If you want to run everything via Docker:

### Option A: Run Only Services (PostgreSQL + Redis)
```bash
docker-compose up -d postgres redis
# Then run API and Orchestrator locally (Steps 8-10)
```

### Option B: Run Everything in Docker
```bash
# Build and start all services
docker-compose up -d

# Run migrations inside API container
docker-compose exec api npx prisma migrate dev --name init

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

Then continue with Steps 12-17.

## Troubleshooting

### Port Already in Use
If port 3000 or 8000 is already in use:
- **Port 3000**: Change `PORT` in `.env` file
- **Port 8000**: Change port in orchestrator command: `--port 8001`

### Database Connection Error
- Ensure PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in `.env` matches docker-compose.yml
- Try: `docker-compose restart postgres`

### Redis Connection Error
- Ensure Redis is running: `docker-compose ps`
- Check REDIS_URL in `.env`

### Migration Errors
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or recreate from scratch
docker-compose down -v
docker-compose up -d postgres redis
npx prisma migrate dev --name init
```

### Python/Orchestrator Issues
- Make sure Python 3.11+ is installed: `python --version`
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`
- Check orchestrator logs for errors

### API Server Not Starting
- Check if port 3000 is free: `netstat -ano | findstr :3000`
- Check logs in terminal for errors
- Ensure all dependencies installed: `npm install`

## Next Steps

Once everything is running:

1. **Test Different Ideas**: Try running the pipeline with different startup ideas
2. **Check Database**: Use Prisma Studio to view data:
   ```bash
   npx prisma studio
   ```
   Opens at `http://localhost:5555`

3. **View Logs**: Check application logs in the terminal windows

4. **Explore API**: 
   - List pipelines: `GET /api/v1/pipelines`
   - Get pipeline details: `GET /api/v1/pipelines/:id`
   - List runs: `GET /api/v1/runs`

## Summary of Running Services

After completing all steps, you should have:

| Service | Port | URL | Status |
|---------|------|-----|--------|
| PostgreSQL | 5432 | localhost:5432 | ✅ Running |
| Redis | 6379 | localhost:6379 | ✅ Running |
| API Server | 3000 | http://localhost:3000 | ✅ Running |
| Orchestrator | 8000 | http://localhost:8000 | ✅ Running |

## Quick Test Script

Save this as `test.ps1` (PowerShell) to test all endpoints:

```powershell
$baseUrl = "http://localhost:3000"
$email = "admin@company.com"
$password = "password123"

# Create tenant
$tenant = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/tenants" -Method Post -ContentType "application/json" -Body (@{name="Test"; email=$email; password=$password} | ConvertTo-Json)
$tenantId = $tenant.tenantId
Write-Host "Tenant ID: $tenantId"

# Login
$login = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -ContentType "application/json" -Body (@{email=$email; password=$password; tenantId=$tenantId} | ConvertTo-Json)
$token = $login.token
Write-Host "Token: $token"

# Create pipeline
$pipelineJson = Get-Content "pipelines/startup-evaluator.json" -Raw
$headers = @{Authorization="Bearer $token"}
$pipeline = Invoke-RestMethod -Uri "$baseUrl/api/v1/pipelines" -Method Post -Headers $headers -ContentType "application/json" -Body $pipelineJson
$pipelineId = $pipeline.id
Write-Host "Pipeline ID: $pipelineId"

# Start run
$run = Invoke-RestMethod -Uri "$baseUrl/api/v1/runs" -Method Post -Headers $headers -ContentType "application/json" -Body (@{pipelineId=$pipelineId; inputs=@{idea="Uber for Dogs"}} | ConvertTo-Json)
$runId = $run.id
Write-Host "Run ID: $runId"

# Check status
Start-Sleep -Seconds 5
$status = Invoke-RestMethod -Uri "$baseUrl/api/v1/runs/$runId" -Headers $headers
Write-Host "Run Status: $($status.status)"
```

Run with: `.\test.ps1`
