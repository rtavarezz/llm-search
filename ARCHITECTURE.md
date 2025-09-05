# Architecture

Components

- Frontend: React (TS), renders insights, calls backend
- Backend: FastAPI, orchestrates search + analysis, stores data
- LLM: Groq (Llama 3.1 8B Instant)
- Search: Serper (Google) for lightweight retrieval
- Storage: SQLite (`spice.db`)

Data Flow

```
User → React → POST /analyze → FastAPI
                      │
                      ├─→ Serper (search: title/url/snippet)
                      ├─→ Groq (LLM: structured insight)
                      └─→ SQLite (store prompt, results, insight)

React ← GET /insights ← FastAPI (latest first)
```

Notes

- Keep searches small (top 5) for speed; enough to ground the summary.
- Schema includes raw `search_results` for traceability and future UI (“View sources”).
- Groq call is run off the event loop (thread) to keep FastAPI responsive.

