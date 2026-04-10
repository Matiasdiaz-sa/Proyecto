from pydantic import BaseModel
from typing import Optional, List

class ScrapeRequest(BaseModel):
    url: str
    limit: Optional[int] = 20

class AnalyzeRequest(BaseModel):
    business_name: Optional[str] = "el negocio"
    maps_url: Optional[str] = None
    maps_limit: Optional[int] = 100
    website_url: Optional[str] = None
    manual_reviews: Optional[List[str]] = []

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    business_name: Optional[str] = "el negocio"
    maps_url: Optional[str] = None
    maps_limit: Optional[int] = 50
    conversation_history: Optional[List[ChatMessage]] = []
    reviews: Optional[List[dict]] = None
    analysis_report: Optional[dict] = None
