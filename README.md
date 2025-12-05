# VIDUR™ — AI-Powered Judicial Assistant

Virtuous Intelligence for Data-Driven, Unbiased, and Reliable Justice System

This repository contains the VIDUR application: a full-stack project that provides
a web interface (frontend/) and a Flask-based backend (backend/) to manage legal
cases, upload evidence, run an AI analysis pipeline (Evidence Checker → Summarizer
→ Legal Action Agent), and generate reports.

## What it is

- Backend: Flask app implementing case management, evidence uploads, AI pipeline
  orchestration and API endpoints (see [`create_app`](backend/app/__init__.py) and [backend/run.py](backend/run.py)).
- Frontend: React + Vite single-page app providing UI for cases, schedules, evidence
  uploads, AI analysis and exports (entry: [frontend/src/main.tsx](frontend/src/main.tsx), config: [frontend/package.json](frontend/package.json)).
- Docs: API reference and usage examples in [docs/api.md](docs/api.md).

Core AI pipeline components are implemented under:
- Evidence services: [backend/app/services/evidence.py](backend/app/services/evidence.py)
- Summarizer and LLM helpers: [backend/app/llm_utils.py](backend/app/llm_utils.py)
- Legal action agent: [backend/app/services/legal_action.py](backend/app/services/legal_action.py)

## Quickstart — Run locally (dev container / Ubuntu)

Prerequisites:
- Python 3.10+ (or 3.x)
- Node.js + npm (or Bun/pnpm if you prefer)
- Git (optional)
- Recommended: run backend in a Python virtual environment

### Backend (development)

1. Open a terminal and change to the backend directory:
   cd backend

2. Create and activate a virtual environment:
   python3 -m venv venv
   source venv/bin/activate

3. Install Python dependencies:
   pip install -r requirements.txt
   (see [backend/requirements.txt](backend/requirements.txt))

4. Optional: set environment variables (recommended for production or custom config):
   - FLASK_ENV=development
   - SQLALCHEMY_DATABASE_URI (defaults to SQLite at backend/app/database/db.sqlite3)
   - JWT_SECRET_KEY (override default)
   - GEMINI_API_KEY (optional; used by some media transcription features in [backend/app/services/evidence.py](backend/app/services/evidence.py))
   export FLASK_ENV=development
   export JWT_SECRET_KEY="YOUR_SECRET"
   export GEMINI_API_KEY="YOUR_GEMINI_KEY"

5. Start the backend:
   cd backend
   python run.py
   - The script will create DB tables on first run (see [backend/run.py](backend/run.py)).
   - By default the Flask app listens on 0.0.0.0:5000 (API base: http://127.0.0.1:5000/api).

Notes: If you prefer the Flask CLI, you can also run the app via the module that
exposes `create_app` in [backend/app/__init__.py](backend/app/__init__.py).

### Frontend (development)

1. Open a new terminal and change to the frontend directory:
   cd frontend

2. Install dependencies:
   npm install
   (or `bun install` / `pnpm install` depending on your toolchain; see [frontend/package.json](frontend/package.json))

3. Run the dev server:
   npm run dev
   - Vite dev server is configured in [frontend/vite.config.ts](frontend/vite.config.ts).
   - Default frontend URL: http://localhost:8080 (proxied API requests go to http://127.0.0.1:5000).

4. Build for production:
   npm run build
   npm run preview

### Full workflow (typical)

1. Register an account via the frontend or call the auth endpoints (see [docs/api.md](docs/api.md)).
2. Create a case (`POST /api/case/`) or use the UI.
3. Upload evidence via the UI or upload endpoints ([backend/routes/upload.py](backend/app/routes/upload.py)).
4. Trigger AI analysis:
   POST /api/ai/analyze/<case_id> (see examples in [docs/api.md](docs/api.md)).
5. View analysis results in Case Detail page and export reports from the UI.

## API Documentation

Complete API reference with example cURL commands is available at:
- [docs/api.md](docs/api.md)

Important endpoints:
- Cases: `/api/case/` ([routes implemented in backend/app/routes/case.py](backend/app/routes/case.py))
- AI pipeline: `/api/ai/analyze/<case_id>` and related endpoints ([backend/app/routes/ai.py](backend/app/routes/ai.py))
- Uploads: `/api/upload/` ([backend/app/routes/upload.py](backend/app/routes/upload.py))
- Dashboard & schedule APIs: see [docs/api.md](docs/api.md)

## Data & Database

- Default DB: SQLite created at backend/app/database/db.sqlite3 by [backend/run.py](backend/run.py).
- Migrations: the repo includes simple migration helper scripts, e.g. [backend/migrate_add_owner_id.py](backend/migrate_add_owner_id.py) — always back up DB before running.

## Environment & Configuration Notes

- Most configuration lives in [backend/app/__init__.py](backend/app/__init__.py). Override by setting environment variables before running.
- LLM configuration and keys: [backend/app/llm_config.py](backend/app/llm_config.py) — set any required API keys (e.g., `GEMINI_API_KEY`) for optional features.

## Development tips

- Frontend dev server proxies API requests to the backend (see [frontend/vite.config.ts](frontend/vite.config.ts)).
- Backend logs long-running AI pipeline progress to stdout — check the backend terminal to follow pipeline stages.
- If analysis appears stale, use the re-analysis endpoint: `POST /api/ai/case/<case_id>/reanalyze` (see [docs/api.md](docs/api.md)).

## Contributing

- Follow the code organization: backend services under `backend/app/services/`, routes under `backend/app/routes/`, models under `backend/app/models/`, frontend components under `frontend/src/`.
- Run backend tests (if present) inside the venv and use the frontend dev server for UI changes.

## License & Notes

- Proprietary: see top-level LICENSE.
- This README is a developer-focused quickstart. For API usage examples, see [docs/api.md](docs/api.md).


## Links to key files and symbols:
- [`create_app`](backend/app/__init__.py) — [backend/app/__init__.py](backend/app/__init__.py)  
- [backend/run.py](backend/run.py)  
- [backend/app/services/evidence.py](backend/app/services/evidence.py)  
- [backend/app/llm_utils.py](backend/app/llm_utils.py)  
- [backend/app/services/legal_action.py](backend/app/services/legal_action.py)  
- [frontend/package.json](frontend/package.json)  
- [frontend/vite.config.ts](frontend/vite.config.ts)  
- [frontend/src/lib/api.ts](frontend/src/lib/api.ts)  
- [frontend/src/lib/fileUpload.ts](frontend/src/lib/fileUpload.ts)  
- [docs/api.md](docs/api.md)  
- [Tech Stuck.md](docs/Tech.md)
