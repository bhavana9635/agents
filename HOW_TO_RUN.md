# How to Run the Agent Integration Centre

Complete step-by-step guide to run the entire application with all features.

## Prerequisites

- **Docker Desktop** installed and running
- **Node.js 20+** installed
- **Python 3.11+** installed
- **Git** (optional)

## Quick Start (5 Minutes)

### Step 1: Start Database Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait 10-15 seconds, then verify
docker-compose ps
```

### Step 2: Set Up Environment Variables

Create a `.env` file in the project root (`pvl/.env`):

```env
# Database & Redis
DATABASE_URL=postgresql://aic_user:aic_password@localhost:5432/aic_db
REDIS_URL=redis://localhost:6379

# API Server
PORT=3000
NODE_ENV=development
ORCHESTRATOR_URL=http://localhost:8000

# Authentication (generate secure random strings)
JWT_SECRET=your-super-secret-jwt-key-change-this
API_KEY_SECRET=your-api-key-encryption-secret-change-this

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./storage

# LLM Provider (REQUIRED - at least one)
# Get keys from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key-here

# OR use Anthropic instead:
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Web Search Tool (REQUIRED for web_search/competitor_analysis)
# Get key from: https://tavily.com
TAVILY_API_KEY=tvly-your-tavily-key-here
```

Create `orchestrator/.env`:

```env
API_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://aic_user:aic_password@localhost:5432/aic_db

# LLM Provider (same as above)
OPENAI_API_KEY=sk-your-openai-key-here
# OR
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Web Search
TAVILY_API_KEY=tvly-your-tavily-key-here
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Step 3: Install Backend Dependencies

```bash
# Install Node.js dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init
```

### Step 4: Start API Server

Open **Terminal 1**:

```bash
npm run dev
```

You should see: `AIC API Server running on port 3000`

### Step 5: Start Orchestrator

Open **Terminal 2**:

```bash
cd orchestrator

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
.\venv\Scripts\activate.bat
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start orchestrator
uvicorn main:app --reload --port 8000
```

You should see: `Uvicorn running on http://0.0.0.0:8000`

### Step 6: Start Frontend

Open **Terminal 3**:

```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

You should see: `Ready on http://localhost:3001` (or similar port)

## Verify Everything is Running

### Check Services

```bash
# API Health
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"aic-api"}

# Orchestrator Health
curl http://localhost:8000/health
# Expected: {"status":"ok","service":"aic-orchestrator"}

# Frontend (open in browser)
# http://localhost:3001
```

### Summary of Running Services

| Service | Port | URL | Status |
|---------|------|-----|--------|
| PostgreSQL | 5432 | localhost:5432 | ✅ Running |
| Redis | 6379 | localhost:6379 | ✅ Running |
| API Server | 3000 | http://localhost:3000 | ✅ Running |
| Orchestrator | 8000 | http://localhost:8000 | ✅ Running |
| Frontend | 3001 | http://localhost:3001 | ✅ Running |

## First Time Setup

### 1. Create a Tenant

```bash
curl -X POST http://localhost:3000/api/v1/auth/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "email": "admin@company.com",
    "password": "password123"
  }'
```

**Save the `tenantId` from the response!**

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "password123",
    "tenantId": "<your-tenant-id>"
  }'
```

**Save the `token` from the response!**

### 3. Create Pipeline

```bash
curl -X POST http://localhost:3000/api/v1/pipelines \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d @pipelines/startup-evaluator.json
```

**Save the `id` (pipeline ID) from the response!**

### 4. Run Pipeline

```bash
curl -X POST http://localhost:3000/api/v1/runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "pipelineId": "<pipeline-id>",
    "inputs": {
      "idea": "Uber for Dogs"
    }
  }'
```

### 5. View in Frontend

1. Open http://localhost:3001 in your browser
2. Login with:
   - Email: `admin@company.com`
   - Password: `password123`
   - Tenant ID: `<your-tenant-id>`
3. You'll see the dashboard with your runs!

## Using the Frontend

The frontend provides a beautiful UI for:

- **Dashboard** - View stats and overview
- **Runs** - See all runs, filter by status, view details
- **Pipelines** - Browse available pipelines
- **Create Run** - Start new pipeline executions
- **Approval Workflow** - Approve/reject runs that need approval

## Getting API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Add to `.env` files

### Anthropic API Key (Alternative)
1. Go to https://console.anthropic.com/settings/keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-ant-`)
5. Add to `.env` files

### Tavily API Key (for Web Search)
1. Go to https://tavily.com
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key
5. Copy the key (starts with `tvly-`)
6. Add to `.env` files

## Troubleshooting

### Port Already in Use

**Port 3000 in use:**
```bash
# Change PORT in .env file
PORT=3001
```

**Port 8000 in use:**
```bash
# Change port in orchestrator command
uvicorn main:app --reload --port 8001
```

### Database Connection Error

```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check if it's running
docker-compose ps
```

### Python Virtual Environment Issues

**Windows PowerShell execution policy error:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Python not found:**
```bash
# Use python3 instead
python3 -m venv venv
```

### Missing API Keys

If you don't have API keys yet:
- **LLM steps will fail** (you need at least one LLM provider)
- **Web search will use fallback mode** (mock results)
- **Competitor analysis will work** but without LLM enhancement

The app will still run, but pipeline executions with agent steps will fail.

### Frontend Can't Connect to API

1. Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
2. Ensure API server is running on port 3000
3. Check browser console for CORS errors

### Reset Everything

```bash
# Stop all services
docker-compose down -v

# Remove node_modules and reinstall
rm -rf node_modules
npm install

# Remove Python venv and reinstall
cd orchestrator
rm -rf venv
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt

# Start fresh
docker-compose up -d postgres redis
npx prisma migrate dev --name init
```

## Production Deployment

For production:

1. **Generate secure secrets:**
   ```bash
   # Generate JWT_SECRET
   openssl rand -base64 32
   
   # Generate API_KEY_SECRET
   openssl rand -base64 32
   ```

2. **Set environment variables** in your hosting platform

3. **Use proper storage** (S3, GCS) instead of local

4. **Set NODE_ENV=production**

5. **Configure CORS** properly

6. **Use HTTPS** for all services

## Quick Commands Reference

```bash
# Start database services
docker-compose up -d postgres redis

# Start API server
npm run dev

# Start orchestrator
cd orchestrator && uvicorn main:app --reload --port 8000

# Start frontend
cd frontend && npm run dev

# View database
npx prisma studio

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

## Next Steps

Once running:

1. **Explore the Frontend** - Beautiful UI at http://localhost:3001
2. **Try Different Ideas** - Run pipelines with various inputs
3. **Check Artifacts** - View stored artifacts from runs
4. **Test Approvals** - Create runs that require approval
5. **Embed Components** - Use AG-UI components in your apps

Enjoy! 🚀
