#!/bin/sh
# Railway startup script for backend

echo "🚀 Starting Fleet Cost Intelligence Backend..."

# Build the application
echo "📦 Building TypeScript..."
npm run build

# Start the server
echo "🎯 Starting production server..."
npm start
