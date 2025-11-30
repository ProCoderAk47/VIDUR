# 🚀 VIDUR Backend — Full API Reference (Copy-paste cURL ready)

**Base URL:** `http://127.0.0.1:5000/api`
**Auth header (use in all protected requests):**

```
-H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

> All curl commands below use `-sS` for quieter output. Replace `<YOUR_JWT_TOKEN>` with your token or keep placeholder for testing.


# 🔐 Auth

Base path: `/api/auth`

### 1. Register — `POST /api/auth/register`

Create a new user.

**Request**

```bash
curl -sS -X POST http://127.0.0.1:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "judge1",
    "email": "judge1@example.com",
    "password": "strongpassword",
    "role": "judge"
  }'
```

**Success (201)**

```json
{
  "id": 1,
  "username": "judge1",
  "email": "judge1@example.com",
  "role": "judge"
}
```

**Errors**

* 400 missing fields
* 409 user exists

---

### 2. Login — `POST /api/auth/login`

Get access and refresh tokens.

**Request**

```bash
curl -sS -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "judge1",
    "password": "strongpassword"
  }'
```

**Success (200)**

```json
{
  "access_token": "eyJ...access...",
  "refresh_token": "eyJ...refresh...",
  "user": {
    "id": 1,
    "username": "judge1",
    "email": "judge1@example.com",
    "role": "judge"
  }
}
```

**Errors**

* 400 missing fields
* 401 invalid credentials

---

### 3. Refresh — `POST /api/auth/refresh`

Exchange refresh token for new access token.

**Request**

```bash
curl -sS -X POST http://127.0.0.1:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_REFRESH_TOKEN>"
```

**Success (200)**

```json
{ "access_token": "new_access_token" }
```

**Note:** `@jwt_required(refresh=True)` — use refresh token.

---

### 4. Me — `GET /api/auth/me`

Get current user info.

**Request**

```bash
curl -sS http://127.0.0.1:5000/api/auth/me \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success (200)** returns user object.

---

### 5. Logout — `POST /api/auth/logout`

Revoke current access token (adds JTI to blocklist).

**Request**

```bash
curl -sS -X POST http://127.0.0.1:5000/api/auth/logout \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success (200)**

```json
{ "msg": "access token revoked" }
```

---

# 🗂 Cases

Base path: `/api/case`

> All case endpoints require `Authorization: Bearer <YOUR_JWT_TOKEN>`

### 1. Create Case — `POST /api/case/`

**Request**

```bash
curl -sS -X POST http://127.0.0.1:5000/api/case/ \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "TEST-001",
    "title": "Contract Breach Case",
    "category": "Civil",
    "priority": "High",
    "status": "Under Analysis",
    "next_hearing": "2025-12-01"
  }'
```

**Success (201)** returns created case object.

**Errors**

* 400 missing case_id
* 400 case_id exists

---

### 2. List Cases — `GET /api/case/`

**Request**

```bash
curl -sS http://127.0.0.1:5000/api/case/ \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success (200)** returns JSON array of cases.

---

### 3. Get Case — `GET /api/case/<case_id>`

**Request**

```bash
curl -sS http://127.0.0.1:5000/api/case/TEST-001 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success (200)** single case JSON.

**Errors**

* 404 case not found

---

### 4. Update Case — `PUT /api/case/<case_id>`

**Request**

```bash
curl -sS -X PUT http://127.0.0.1:5000/api/case/TEST-001 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Ready for Hearing",
    "next_hearing": "2025-12-05"
  }'
```

**Success (200)** returns updated case.

---

### 5. Delete Case — `DELETE /api/case/<case_id>`

**Request**

```bash
curl -sS -X DELETE http://127.0.0.1:5000/api/case/TEST-001 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success (200)**

```json
{ "message": "Deleted" }
```

---

# 🧠 AI Pipeline

Base path: `/api/ai`

> All AI endpoints require `Authorization: Bearer <YOUR_JWT_TOKEN>`

### 1. Trigger Full Pipeline — `POST /api/ai/analyze/<case_id>`

Run evidence checker → summarizer → legal action agent.

**Request**

```bash
curl -sS -X POST http://127.0.0.1:5000/api/ai/analyze/TEST-001 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "evidence_files": {
      "documents": ["/path/to/contract.txt"],
      "pdf": ["/path/to/agreement.pdf"],
      "images": [],
      "audio": [],
      "video": []
    },
    "force_reanalysis": false
  }'
```

**Success (200)** returns pipeline results and confidence scores:

```json
{
  "case_id": "TEST-001",
  "status": "completed",
  "stages": { ... },
  "analysis_results": {
    "evidence": { ... },
    "summary": { ... },
    "legal_suggestions": [ ... ]
  }
}
```

**Errors**

* 404 case not found
* 500 pipeline failure (analysis_error stored in case)

---

### 2. Get Evidence — `GET /api/ai/case/<case_id>/evidence`

**Request**

```bash
curl -sS http://127.0.0.1:5000/api/ai/case/TEST-001/evidence \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success (200)**

```json
{ "case_id":"TEST-001","evidence":{...},"confidence":0.92,"timestamp":"..." }
```

---

### 3. Get Summary — `GET /api/ai/case/<case_id>/summary`

**Request**

```bash
curl -sS http://127.0.0.1:5000/api/ai/case/TEST-001/summary \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success (200)** returns summary block and confidence.

---

### 4. Get Legal Actions — `GET /api/ai/case/<case_id>/legal-actions`

**Request**

```bash
curl -sS http://127.0.0.1:5000/api/ai/case/TEST-001/legal-actions \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success (200)** returns list of suggested actions.

---

### 5. Get Full Analysis — `GET /api/ai/case/<case_id>/full-analysis`

**Request**

```bash
curl -sS http://127.0.0.1:5000/api/ai/case/TEST-001/full-analysis \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success (200)** returns full case + analysis metadata.

**Errors**

* 400 if analysis not completed

---

### 6. Reanalyze (force) — `POST /api/ai/case/<case_id>/reanalyze`

**Request**

```bash
curl -sS -X POST http://127.0.0.1:5000/api/ai/case/TEST-001/reanalyze \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

This simply calls `/analyze/<case_id>` with `force_reanalysis = true`.

---

### 7. Health Check — `GET /api/ai/health`

Check AI components readiness.

**Request**

```bash
curl -sS http://127.0.0.1:5000/api/ai/health \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Success (200)**:

```json
{ "status":"healthy","agents":{...} }
```

---

# 📊 Dashboard

Base path: `/api/dashboard`

> Requires `Authorization: Bearer <YOUR_JWT_TOKEN>`

### 1. Stats — `GET /api/dashboard/stats`

```bash
curl -sS http://127.0.0.1:5000/api/dashboard/stats \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

Returns totals, priority breakdown, analysis status.

---

### 2. Workload Metrics — `GET /api/dashboard/workload-metrics`

```bash
curl -sS http://127.0.0.1:5000/api/dashboard/workload-metrics \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

Returns estimated hours, average case time.

---

### 3. Upcoming Hearings — `GET /api/dashboard/upcoming-hearings`

```bash
curl -sS http://127.0.0.1:5000/api/dashboard/upcoming-hearings \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### 4. AI Insights — `GET /api/dashboard/ai-insights/<case_id>`

```bash
curl -sS http://127.0.0.1:5000/api/dashboard/ai-insights/TEST-001 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

Returns summary, legal suggestions, evidence and statuses.

---

### 5. Case Counts — `GET /api/dashboard/case-counts`

```bash
curl -sS http://127.0.0.1:5000/api/dashboard/case-counts \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### 6. Category Distribution — `GET /api/dashboard/category-distribution`

```bash
curl -sS http://127.0.0.1:5000/api/dashboard/category-distribution \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### 7. Analysis Status — `GET /api/dashboard/analysis-status`

```bash
curl -sS http://127.0.0.1:5000/api/dashboard/analysis-status \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

# 🗓 Schedule (schedule.py)

Base path: `/api/schedule` — requires `Authorization: Bearer <YOUR_JWT_TOKEN>`

### 1. List Schedule — `GET /api/schedule/`

```bash
curl -sS http://127.0.0.1:5000/api/schedule/ \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### 2. By Date — `GET /api/schedule/by-date/<YYYY-MM-DD>`

```bash
curl -sS http://127.0.0.1:5000/api/schedule/by-date/2025-11-20 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### 3. By Range — `GET /api/schedule/by-range?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

```bash
curl -sS "http://127.0.0.1:5000/api/schedule/by-range?start_date=2025-11-20&end_date=2025-12-01" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### 4. Create Schedule — `POST /api/schedule/`

**Request**

```bash
curl -sS -X POST http://127.0.0.1:5000/api/schedule/ \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "TEST-001",
    "date": "2025-12-01",
    "start_time": "10:00",
    "end_time": "11:00",
    "event_type": "hearing",
    "description": "Initial hearing",
    "location": "Courtroom 1"
  }'
```

**Success (201)** returns schedule object.

---

### 5. Get Schedule — `GET /api/schedule/<id>`

```bash
curl -sS http://127.0.0.1:5000/api/schedule/1 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### 6. Update Schedule — `PUT /api/schedule/<id>`

```bash
curl -sS -X PUT http://127.0.0.1:5000/api/schedule/1 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "start_time": "10:30", "end_time": "11:30" }'
```

---

### 7. Delete Schedule — `DELETE /api/schedule/<id>`

```bash
curl -sS -X DELETE http://127.0.0.1:5000/api/schedule/1 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### 8. Check Conflicts — `GET /api/schedule/conflicts`

```bash
curl -sS http://127.0.0.1:5000/api/schedule/conflicts \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

Returns array of detected time overlaps.

---

# 📚 Common Schemas & Examples

### Case object (example)

```json
{
  "id": 1,
  "case_id": "TEST-001",
  "title": "Contract Breach Case",
  "category": "Civil",
  "priority": "High",
  "status": "Under Analysis",
  "next_hearing": "2025-12-01",
  "evidence_data": { ... },
  "summary_data": { ... },
  "legal_suggestions": [ ... ],
  "analysis_status": "completed",
  "analysis_timestamp": "2025-11-18T09:44:00Z"
}
```

### AI Legal Suggestion (example)

```json
{
  "suggested_action": "File for specific performance",
  "confidence": 78,
  "applicable_laws": [
    {
      "section": "73",
      "law_name": "Indian Contract Act, 1872",
      "description": "Compensation for breach of contract"
    }
  ],
  "reasoning": "Based on contract terms and precedent.",
  "next_steps": ["Gather evidence", "Draft petition"]
}
```

### Error response (standard)

```json
{
  "error": "Case not found"
}
```

---

# 🛠 Tips & Troubleshooting

* **Missing Authorization:** add header `-H "Authorization: Bearer <YOUR_JWT_TOKEN>"`
* **Token expired:** call `/api/auth/refresh` with refresh token.
* **"Case not found":** ensure `case_id` is exact.
* **Pipeline long-running:** analyze endpoint runs heavy tasks — watch logs; use `force_reanalysis` to re-run.
* **File uploads:** currently endpoints expect paths or service-level uploads; implement `/api/evidence/upload` if needed.
* **Local dev:** ensure `.env` has `FLASK_ENV=development` and `SQLALCHEMY_DATABASE_URI` points to local sqlite for fast testing.

---

# ✅ Handy Quick Sequence (copy-paste)

1. Register (optional)
2. Login → get access_token
3. Create case
4. Trigger AI analyze
5. Fetch full-analysis

Example sequence (replace tokens as directed):

```bash
# 1. Login (copy access_token from output)
curl -sS -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"judge1","password":"strongpassword"}' | jq

# 2. Create case
curl -sS -X POST http://127.0.0.1:5000/api/case/ \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"case_id":"TEST-001","title":"Contract Breach","category":"Civil","priority":"High"}' | jq

# 3. Analyze
curl -sS -X POST http://127.0.0.1:5000/api/ai/analyze/TEST-001 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"evidence_files":{"documents":[],"pdf":[]},"force_reanalysis":false}' | jq

# 4. Get full analysis
curl -sS http://127.0.0.1:5000/api/ai/case/TEST-001/full-analysis \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" | jq
```
