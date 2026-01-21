#!/bin/bash

# AIC MVP-1 Setup Script

set -e

echo "🚀 Setting up Agent Integration Centre (AIC) MVP-1"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start services
echo "📦 Starting Docker services (PostgreSQL, Redis)..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Install dependencies
echo "📥 Installing Node.js dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the API server: npm run dev"
echo "2. Start the orchestrator: cd orchestrator && pip install -r requirements.txt && uvicorn main:app --reload"
echo "3. Or start everything with Docker: docker-compose up"
