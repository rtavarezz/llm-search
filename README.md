# Spice — Signal Detection

Search the web, analyze with an LLM, store insights, and present them in a clean UI.

Overview

- Search: Serper (Google) for top results (title, URL, snippet)
- Analyze: Groq (Llama 3.1 8B Instant) for a concise, structured insight
- Store: SQLite (`spice.db`) with prompts, raw results, and insights
- UI: React app that formats insights for quick scanning

Setup

Backend

1) `cd backend`
2) `python -m venv venv && source venv/bin/activate` (Windows: `venv\\Scripts\\activate`)
3) `pip install -r requirements.txt`
4) `cp .env.example .env` and set:
   - `GROQ_API_KEY` (https://console.groq.com/keys)
   - `SERPER_API_KEY` (https://serper.dev/api-key)
5) `python main.py` (serves `http://localhost:8000`)

Frontend

1) `cd frontend`
2) `npm install`
3) `npm start` (opens `http://localhost:3000`)

API

- `GET /health` — health check
- `GET /insights` — list stored insights (latest first)
- `POST /analyze` — body: `{ "prompts": ["best crm 2024"] }`

What it does

- Fetches top web results (Serper)
- Generates a structured insight (Groq)
- Stores prompt, results, and insight (SQLite)
- Renders a readable summary (React)

Architecture

See `ARCHITECTURE.md` for a simple diagram and data flow.

