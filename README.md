# NASA Mission Control (Coding Challenge 2026)

A full-stack NASA data explorer built with:
- React (frontend)
- Node.js + Express (backend)

## Features

- APOD explorer
  - Single date fetch
  - Date-range fetch
  - Narrative analytics per APOD item
  - APOD visual charts
- NEO intelligence dashboard
  - Date range asteroid feed
  - Risk and velocity visualizations
- NASA media search
  - Keyword search
  - Exact date filter
  - Date range filter
  - Data visualizations
- Earth data
  - EPIC feed by date
  - Earth imagery by lat/lon/date
- 3D-style experience
  - 3D tilt cards
  - Animated Earth orbital scene
  - Layered depth effects and polished UI

## Project Structure

- `frontend/`
- `backend/`
- `README.md`

## Local Setup

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Create `backend/.env`:

```env
NASA_API_KEY=YOUR_NASA_API_KEY
```

Backend runs on `http://localhost:5001`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

Frontend runs on Vite default (`http://localhost:5173`).

## API Routes (Backend)

- `GET /api/apod`
  - Query: `date`, `startDate`, `endDate`, `count`, `thumbs`
- `GET /api/neo`
  - Query: `startDate`, `endDate`
- `GET /api/media`
  - Query: `q`, `page`, `limit`, `date`, `dateFrom`, `dateTo`, `yearStart`, `yearEnd`
- `GET /api/mars`
  - Query: `rover`, `earthDate`, `sol`, `camera`
- `GET /api/earth`
  - EPIC mode (default): `date`, `collection`
  - Imagery mode: `mode=imagery`, `lat`, `lon`, `date`, `dim`

## Quality Checks

```bash
cd frontend
npm run lint
npm run build
```

## Deployment

Suggested:
- Frontend: Vercel
- Backend: Render / Railway

