# Fleet Cost Intelligence

AI-Powered Fleet Operations Decision Engine

**Live Demo:** https://chic-generosity-production.up.railway.app/

## What is this?

GPS tracking tells you **where vehicles are**. This application answers a more important question:

> **Where is the fleet losing money — and what should be fixed first?**

Fleet Cost Intelligence transforms raw GPS telemetry into quantified financial impact, operational risk, and actionable recommendations.

**Target Users:** Fleet managers operating 5–50 vehicles who need cost optimization insights, not just tracking data.

## Core Features

1. **GPS Data Integration** - Fetches data from 3 GPS Dozor API endpoints (vehicles, positions, tracks)
2. **Financial Analytics** - Computes operational metrics and quantifies idle time cost
3. **Risk Scoring** - Calculates efficiency (0-100) and risk scores for each vehicle
4. **AI Insights** - Generates executive recommendations using AI (with deterministic fallback)
5. **Interactive Visualizations**:
   - Cost bar charts (vehicle comparison)
   - Time utilization donut charts
   - Live vehicle map (Leaflet)
   - Efficiency rankings
   - Savings simulator

6. **User Filtering** - Date range picker, vehicle detail views, interactive simulations

## Technology Stack

**Frontend:** Vue 3, TypeScript, Pinia, Tailwind CSS, ECharts, Leaflet  
**Backend:** Node.js, Express, TypeScript  
**Testing:** 277 automated tests (Vitest)  
**Deployment:** Railway (monorepo with demo mode)

## Architecture

### Backend (Node.js + Express + TypeScript)
```
src/
├── api/           → GPS API client with demo mode
├── routes/        → REST API endpoints
├── services/      → Business logic orchestration
├── analytics/     → Metrics computation (base, derived, scores)
├── financial/     → Cost modeling
├── intelligence/  → AI integration (OpenAI + fallback)
├── config/        → Environment, cache, Redis
└── types/         → TypeScript definitions
```

**API Endpoints:**
- `GET /api/vehicles` - Vehicle list
- `GET /api/vehicles/live` - Live positions
- `GET /api/vehicles/:id/tracks` - Historical tracks
- `GET /api/analytics/vehicle/:id` - Vehicle analytics
- `GET /api/analytics/fleet` - Fleet metrics
- `POST /api/ai/insights` - AI-generated recommendations

### Frontend (Vue 3 + TypeScript)
```
src/
├── views/         → Fleet Overview, Vehicle Detail, Live Map
├── components/    → Reusable UI components
├── stores/        → Pinia state management
└── services/      → API client
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run build
npm start
```

### Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Running Tests
```bash
cd backend
npm run test:run  # 277 tests passing
```

## Demo Mode

The app includes realistic mock GPS data for instant deployment without API keys:

```env
DEMO_MODE=true
GPS_API_KEY=demo
```

No real GPS API access needed for showcase!

## AI Development

**Planning:** ChatGPT  
**Development:** Cursor with Claude Sonnet 4.5 and Opus 4.5  
**Time:** ~2 days with AI assistance

AI handled architecture, testing, TypeScript definitions, and optimization. Human decisions focused on product vision, metrics selection, and business logic.

## Project Statistics

- **277 automated tests** - Full coverage of analytics pipeline
- **~8,000 lines of code** - Backend + Frontend (excluding tests)
- **8 API endpoints** - Vehicles, analytics, AI insights

## License

MIT
