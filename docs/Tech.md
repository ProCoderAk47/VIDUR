# Tech Stuck — Full Technical Details

> NOTE: Filename intentionally "Tech Stuck.md" per repo request.

## Architecture Overview

- Monorepo with two main apps:
  - Backend: Flask REST API (Python) — located under [backend](http://_vscodecontentref_/47)
  - Frontend: React + Vite + TypeScript — located under [frontend](http://_vscodecontentref_/48)

- Backend responsibilities:
  - Case management (CRUD)
  - Evidence uploads and processing
  - AI pipeline orchestration (EvidenceChecker → Summarizer → LegalActionAgent)
  - JWT auth and session management
  - SQLite by default for local dev (`backend/app/database/db.sqlite3`)

- Frontend responsibilities:
  - SPA UI for cases, evidence upload, AI analysis, schedule/calendar
  - Exports (Markdown, HTML/PDF), file upload helpers, progress UI
  - Uses token-based auth stored in localStorage via [api.ts](http://_vscodecontentref_/49)

## Key Technologies

- Backend
  - Python 3.10+
  - Flask (app factory in [create_app](http://_vscodecontentref_/50))
  - Flask-JWT-Extended (JWT auth)
  - SQLAlchemy (ORM) — models in [models](http://_vscodecontentref_/51)
  - pdfplumber, optional Gemini integration for media transcription (see [backend/app/services/evidence.py](http://_vscodecontentref_/52))
  - LLM helpers / parsers in [llm_utils.py](http://_vscodecontentref_/53)
  - Services organized under [services](http://_vscodecontentref_/54)

- Frontend
  - React + TypeScript
  - Vite dev server (config: frontend/vite.config.ts)
  - Tailwind CSS + Radix UI primitives + lucide icons
  - React Query (or similar) for async data (see usage in pages)
  - Export utilities in [export.ts](http://_vscodecontentref_/55)

## Folder Map (high level)

- backend/
  - run.py — local runner / DB init
  - requirements.txt — Python dependencies
  - app/
    - [__init__.py](http://_vscodecontentref_/56) — [create_app](http://_vscodecontentref_/57)
    - llm_config.py — configure LLM keys (e.g., [GEMINI_API_KEY](http://_vscodecontentref_/58))
    - [llm_utils.py](http://_vscodecontentref_/59) — parsing & helpers
    - models/ — SQLAlchemy models (e.g., [case.py](http://_vscodecontentref_/60))
    - routes/ — API blueprints ([ai.py](http://_vscodecontentref_/61), [case.py](http://_vscodecontentref_/62), [upload.py](http://_vscodecontentref_/63), [auth.py](http://_vscodecontentref_/64), etc.)
    - services/ — evidence processing, summarizer, legal action agent

- frontend/
  - package.json — scripts & deps
  - [vite.config.ts](http://_vscodecontentref_/65) — dev server proxy
  - src/
    - lib/ — [api.ts](http://_vscodecontentref_/66), [export.ts](http://_vscodecontentref_/67), [fileUpload.ts](http://_vscodecontentref_/68)
    - pages/ — [Cases.tsx](http://_vscodecontentref_/69), [CaseDetail.tsx](http://_vscodecontentref_/70), [AIAnalysis.tsx](http://_vscodecontentref_/71), [EvidenceChecker.tsx](http://_vscodecontentref_/72)
    - components/ — ui primitives, layouts, evidence uploader
    - [App.tsx](http://_vscodecontentref_/73) — routes and protected routes

- docs/ — [api.md](http://_vscodecontentref_/74) (this file)
- [README.md](http://_vscodecontentref_/75) — repo quickstart

## Running Locally (Ubuntu dev container)

Backend (recommended inside a Python venv):
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# optional env vars
export FLASK_ENV=development
export JWT_SECRET_KEY="your_jwt"
export GEMINI_API_KEY="optional_gemini_key"
python run.py
# API: http://127.0.0.1:5000/api
```

Frontend:
```bash
cd frontend
npm install
npm run dev
# Dev UI: http://localhost:8080 (proxied to backend)
```

Build (frontend production preview):
```bash
npm run build
npm run preview
```

---
## Key Files & Symbols (open them directly)
- App factory: create_app — __init__.py
- Backend runner: run.py
- Evidence services: evidence.py
- LLM helpers: llm_utils.py
- Legal action agent: legal_action.py
- Frontend API client: api.ts
- Frontend export utils: export.ts
- Frontend upload helper: fileUpload.ts

--- 
## Environment Variables
- FLASK_ENV (development/production)
- SQLALCHEMY_DATABASE_URI (overrides default local sqlite)
- JWT_SECRET_KEY (override default in create_app)
- GEMINI_API_KEY
    Set these in your shell or within the container prior to starting the backend.

--- 
## LLM / External Integrations
- The project optionally integrates with Google Gemini (via google.generativeai) when GEMINI_API_KEY is set. See evidence.py and llm_utils.py.
- Response parsing utilities: ResponseParser.extract_sections

--- 
## Testing & Debugging
- Backend: run inside activated venv, inspect stdout logs for pipeline progress. DB created at backend/app/database/db.sqlite3 by run.py.
- Frontend: Vite console and browser dev tools. Proxy errors will indicate backend connectivity issues.

--- 
## Common Troubleshooting
- CORS / proxy: verify vite.config.ts proxy target matches backend host/port.
- Upload path issues: backend upload routes expect case_id and category; file path returned used by AI analyzer.
- Long running AI tasks: watch backend logs, consider enabling force_reanalysis to rerun pipeline.

--- 
## Contribution Notes
- New backend routes: add blueprint in routes and register in create_app.
- Add frontend UI components under components and wire routes in App.tsx.