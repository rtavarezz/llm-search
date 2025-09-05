import os
from typing import List, Dict
import httpx


class WebSearchService:
    """Serper-based Google search wrapper.

    Returns a list of {title, url, snippet} dicts suitable for LLM conditioning.
    Requires SERPER_API_KEY in the environment.
    """

    def __init__(self):
        self.api_key: str = os.getenv("SERPER_API_KEY") or ""
        self.base_url = "https://google.serper.dev/search"
        if not self.api_key:
            raise RuntimeError("Missing SERPER_API_KEY. Set it in backend/.env")

    async def search_google(self, query: str, max_results: int = 5) -> List[Dict]:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    self.base_url,
                    json={"q": query, "num": max_results},
                    headers={
                        "X-API-KEY": self.api_key,
                        "Content-Type": "application/json",
                    },
                    timeout=10,
                )
                if resp.status_code != 200:
                    return []
                data = resp.json()
                return self._parse_serper_results(data)
        except Exception:
            return []

    def _parse_serper_results(self, data: Dict) -> List[Dict]:
        out: List[Dict] = []
        for item in (data.get("organic") or [])[:5]:
            out.append(
                {
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                }
            )
        return out
