import os
import asyncio
from typing import List, Dict, Optional
from groq import Groq

class LLMAnalysisService:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("Missing GROQ_API_KEY. Set it in backend/.env")
        self.client = Groq(api_key=api_key)
        self.model_name = "llama-3.1-8b-instant"
    
    async def analyze_search_results(self, prompt: str, search_results: Optional[List[Dict]] = None) -> str:
        """Generate brand intelligence insights. If search_results are provided, use them; otherwise rely on general knowledge and state confidence."""
        formatted_results = self._format_search_results(search_results or [])

        sources_block = f"\nUse these sources (titles, URLs, summaries):\n{formatted_results}\n" if formatted_results else "\nNo sources are provided. Base your answer on widely known information, note uncertainty, and include a Confidence score.\n"

        analysis_prompt = f"""
        Analyze the query: "{prompt}"

        Return clear, structured insight using these exact headings on their own lines:

        **Brand Intelligence Summary:**
        One concise paragraph with the answer.

        **Top 3 Options:**
        Numbered list as: 1. **Name**: One-line value proposition

        **Brand Signals:**
        Bullets like: **Brand**: Signal observed

        **Market Reality:**
        Bullets like: **Topic**: Fact or trend

        Optionally add:
        - Confidence: X/10
        - User Preferences: Key decision drivers
        - Pricing: Typical tiers
        - Opportunities: 2-3 concise growth opportunities
        - Risks: 2-3 concise watchouts

        {sources_block}
        """
        
        try:
            result = await self._call_groq(analysis_prompt)
            return result
        except Exception as e:
            print(f"Analysis error for prompt '{prompt}': {str(e)}")
            return f"Analysis failed: {str(e)}"
    
    def _format_search_results(self, results: List[Dict]) -> str:
        """Format search results for LLM consumption"""
        formatted = ""
        for i, result in enumerate(results[:5], 1):
            formatted += f"\n{i}. {result.get('title', 'No title')}\n"
            formatted += f"   URL: {result.get('url', 'No URL')}\n"
            formatted += f"   Summary: {result.get('snippet', 'No summary')}\n"
        return formatted
    
    async def _call_groq(self, prompt: str) -> str:
        """Call Groq API with simple retry logic.
        The Groq client is synchronous; run it in a thread to avoid blocking the event loop.
        """
        
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                completion = await asyncio.to_thread(
                    self.client.chat.completions.create,
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                    max_tokens=1500,
                    top_p=1,
                    stream=False,
                )
                
                response_text = completion.choices[0].message.content                
                if response_text and response_text.strip():
                    return response_text.strip()
                else:
                    if attempt < max_retries:
                        continue
                    raise Exception("Empty response from Groq after retries")
                    
            except Exception as e:
                if attempt < max_retries:
                    continue
                raise Exception(f"Groq API error after {max_retries + 1} attempts: {str(e)}")
        # Safety: satisfy type checker; logic above always returns or raises
        raise Exception("No response from Groq")
