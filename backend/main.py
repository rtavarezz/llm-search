from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
import sqlite3
import json
from datetime import datetime
from dotenv import load_dotenv
from services.analysis import LLMAnalysisService
from services.search import WebSearchService
import os

load_dotenv()

app = FastAPI(title="Spice - AI Signal Detection", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompts: List[str]

class InsightResponse(BaseModel):
    id: int
    prompt: str
    insights: str
    search_results: Optional[List[dict]] = None
    created_at: str

@app.on_event("startup")
async def startup_event():
    # Initialize SQLite database
    conn = sqlite3.connect("spice.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            search_results TEXT,
            insights TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

@app.get("/")
async def root():
    return {"message": "Welcome to Spice - AI Signal Detection System"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/insights", response_model=List[InsightResponse])
async def get_insights():
    conn = sqlite3.connect("spice.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, prompt, search_results, insights, created_at FROM analyses ORDER BY created_at DESC")
    results = cursor.fetchall()
    conn.close()
    
    return [
        InsightResponse(
            id=row[0],
            prompt=row[1],
            search_results=(json.loads(row[2]) if row[2] else []),
            insights=row[3] or "Analysis pending...",
            created_at=row[4]
        )
        for row in results
    ]

@app.post("/analyze")
async def analyze_prompts(request: PromptRequest):
    """Search the web, analyze, and store insights."""
    analysis_service = LLMAnalysisService()
    try:
        search_service = WebSearchService()
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    results = []
    
    for prompt in request.prompts:
        try:
            # Retrieve web results
            search_results = await search_service.search_google(prompt)

            # Generate insights using retrieved results as context
            insights = await analysis_service.analyze_search_results(prompt, search_results)
            
            # Store in database
            conn = sqlite3.connect("spice.db")
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO analyses (prompt, search_results, insights) VALUES (?, ?, ?)",
                (prompt, json.dumps(search_results), insights)
            )
            conn.commit()
            analysis_id = cursor.lastrowid
            conn.close()
            
            results.append({
                "id": analysis_id,
                "prompt": prompt,
                "insights": insights,
                "search_results_count": len(search_results)
            })
            
        except Exception as e:
            results.append({
                "prompt": prompt,
                "error": str(e)
            })
    
    return {"results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
