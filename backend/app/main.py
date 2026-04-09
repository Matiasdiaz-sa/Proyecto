from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title=os.getenv("PROJECT_NAME", "Sentiment AI System"),
    openapi_url=f"{os.getenv('API_V1_STR', '/api/v1')}/openapi.json"
)

# Set all CORS enabled origins
origins = [
    "http://localhost:3000",
    "https://dashboard.tu-dominio.com",
]

import json
import os

cors_origins_str = os.getenv("BACKEND_CORS_ORIGINS", "")
if cors_origins_str:
    try:
        origins_from_env = json.loads(cors_origins_str)
        origins.extend(origins_from_env)
    except json.JSONDecodeError:
        origins.append(cors_origins_str)


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health", tags=["healthcheck"])
def health_check():
    return {"status": "ok", "message": "Backend is running smoothly."}

@app.get("/", tags=["root"])
def read_root():
    return {"message": "Welcome to Sentiment AI System API"}

from pydantic import BaseModel
from typing import Optional

class ScrapeRequest(BaseModel):
    url: str
    limit: Optional[int] = 20

from app.services.scraper import scrape_google_maps_reviews

@app.post("/api/v1/reviews/scrape", tags=["reviews"])
async def scrape_reviews(request: ScrapeRequest):
    try:
        reviews = await scrape_google_maps_reviews(request.url, request.limit)
        return {"status": "success", "count": len(reviews), "data": reviews}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))
