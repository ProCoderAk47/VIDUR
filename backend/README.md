# Backend — VIDUR (Flask)

This folder contains the Flask backend for VIDUR.

Quick start (local dev):

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export FLASK_ENV=development
export JWT_SECRET_KEY="your_jwt_key"
# optional: export GEMINI_API_KEY="your_gemini_key"
python run.py
```

## Where to look:

- App factory: create_app — __init__.py
- Runner / DB init: run.py
- Services: services — evidence, summarizer, legal action
- Routes: routes — ai.py, case.py, upload.py, auth.py, dashboard.py, schedule.py

## Database:

- Default: SQLite at backend/app/database/db.sqlite3 created by run.py.

## Environment variables:

- FLASK_ENV, SQLALCHEMY_DATABASE_URI, JWT_SECRET_KEY, GEMINI_API_KEY

## Testing & logs:

- Watch stdout for pipeline progress. For debugging, enable FLASK_ENV=development.
