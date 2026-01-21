#!/bin/bash

# Script to create a demo tenant for testing

API_URL="${API_URL:-http://localhost:3000}"

echo "Creating demo tenant..."

RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/tenants" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Company",
    "email": "admin@demo.com",
    "password": "demo123"
  }')

TENANT_ID=$(echo $RESPONSE | grep -o '"tenantId":"[^"]*' | cut -d'"' -f4)

if [ -z "$TENANT_ID" ]; then
  echo "❌ Failed to create tenant"
  echo "$RESPONSE"
  exit 1
fi

echo "✅ Tenant created: $TENANT_ID"
echo ""
echo "Login to get a token:"
echo "curl -X POST $API_URL/api/v1/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\": \"admin@demo.com\", \"password\": \"demo123\", \"tenantId\": \"$TENANT_ID\"}'"
