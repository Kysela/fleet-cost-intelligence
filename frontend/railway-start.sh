#!/bin/sh
# Railway startup script for frontend

echo "🚀 Starting Fleet Cost Intelligence Frontend..."

# Build the application
echo "📦 Building Vue application..."
npm run build

# Start preview server
echo "🎯 Starting preview server on port $PORT..."
npm run preview -- --host 0.0.0.0 --port ${PORT:-5000}
