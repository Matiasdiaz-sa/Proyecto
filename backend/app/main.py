from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import json
import os

from app.database import connect_to_mongo, close_mongo_connection, get_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Conectar a MongoDB al arrancar
    await connect_to_mongo()
    yield
    # Cerrar conexión al apagar
    await close_mongo_connection()


app = FastAPI(
    title=os.getenv("PROJECT_NAME", "Sentiment AI System"),
    openapi_url=f"{os.getenv('API_V1_STR', '/api/v1')}/openapi.json",
    lifespan=lifespan
)

# CORS - allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
from typing import Optional, List
from datetime import datetime, timezone


class ScrapeRequest(BaseModel):
    url: str
    limit: Optional[int] = 20


class AnalyzeRequest(BaseModel):
    business_name: Optional[str] = "el negocio"
    maps_url: Optional[str] = None
    maps_limit: Optional[int] = 100
    website_url: Optional[str] = None
    manual_reviews: Optional[List[str]] = []


from app.services.scraper import scrape_google_maps_reviews
from app.services.sentiment import analyze_reviews
from app.services.web_scraper import scrape_website_reviews


@app.post("/api/v1/reviews/scrape", tags=["reviews"])
async def scrape_reviews(request: ScrapeRequest):
    try:
        reviews = await scrape_google_maps_reviews(request.url, request.limit)

        # Guardar en MongoDB si hay reseñas
        if reviews:
            db = get_database()
            collection = db["reviews"]
            docs = []
            for r in reviews:
                docs.append({
                    **r,
                    "source_url": request.url,
                    "scraped_at": datetime.now(timezone.utc)
                })
            await collection.insert_many(docs)

        return {"status": "success", "count": len(reviews), "data": reviews}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/reviews", tags=["reviews"])
async def get_reviews(limit: int = 50):
    """Traer las últimas reseñas guardadas en MongoDB."""
    db = get_database()
    collection = db["reviews"]
    cursor = collection.find({}, {"_id": 0}).sort("scraped_at", -1).limit(limit)
    reviews = await cursor.to_list(length=limit)
    return {"status": "success", "count": len(reviews), "data": reviews}


@app.post("/api/v1/analyze", tags=["analysis"])
async def analyze_business(request: AnalyzeRequest):
    """
    Full analyst endpoint. Combines reviews from:
    - Google Maps (via Apify)
    - Business website (via web scraper)
    - Manually provided reviews
    Then runs AI analysis and returns a professional report.
    """
    from fastapi import HTTPException
    all_reviews = []
    sources_used = []

    # 1. Google Maps reviews
    if request.maps_url:
        try:
            limit = min(request.maps_limit or 100, 300)  # cap at 300
            maps_reviews = await scrape_google_maps_reviews(request.maps_url, limit)
            for r in maps_reviews:
                r["source"] = "google_maps"
            all_reviews.extend(maps_reviews)
            sources_used.append(f"Google Maps ({len(maps_reviews)} reseñas)")

            # Save to MongoDB
            if maps_reviews:
                db = get_database()
                collection = db["reviews"]
                docs = [{**r, "source_url": request.maps_url, "scraped_at": datetime.now(timezone.utc)} for r in maps_reviews]
                await collection.insert_many(docs)
        except Exception as e:
            sources_used.append(f"Google Maps (error: {str(e)[:80]})")

    # 2. Website reviews
    if request.website_url:
        try:
            web_reviews = await scrape_website_reviews(request.website_url)
            all_reviews.extend(web_reviews)
            sources_used.append(f"Sitio web ({len(web_reviews)} reseñas)")
        except Exception as e:
            sources_used.append(f"Sitio web (error: {str(e)[:80]})")

    # 3. Manual reviews
    if request.manual_reviews:
        for text in request.manual_reviews:
            if text.strip():
                all_reviews.append({
                    "author": "Manual",
                    "rating": None,
                    "text": text.strip(),
                    "datetime": "",
                    "source": "manual"
                })
        sources_used.append(f"Reseñas manuales ({len(request.manual_reviews)})")

    if not all_reviews:
        raise HTTPException(status_code=400, detail="No se encontraron reseñas para analizar. Verificá la URL de Maps o agregá reseñas manualmente.")

    # Run AI analysis
    try:
        report = await analyze_reviews(all_reviews, request.business_name or "el negocio")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis IA: {str(e)}")

    report["sources_used"] = sources_used
    report["total_reviews_combined"] = len(all_reviews)

    return {"status": "success", "report": report}


# ── CHAT ENDPOINT ──────────────────────────────────────────────────────────────

from app.services.chat import chat_with_analyst
from typing import List as PyList


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    business_name: Optional[str] = "el negocio"
    maps_url: Optional[str] = None
    maps_limit: Optional[int] = 50
    conversation_history: Optional[PyList[ChatMessage]] = []
    # If reviews are already loaded (embedded from previous scrape), pass them directly
    reviews: Optional[PyList[dict]] = None


@app.post("/api/v1/chat", tags=["chat"])
async def chat_endpoint(request: ChatRequest):
    """
    Conversational analyst chat. Loads reviews from Maps if maps_url provided
    (and they're not already passed in), then answers the user's question.
    """
    from fastapi import HTTPException

    reviews = request.reviews or []

    # Load from Maps if URL provided and no reviews passed
    if request.maps_url and not reviews:
        try:
            limit = min(request.maps_limit or 50, 300)
            reviews = await scrape_google_maps_reviews(request.maps_url, limit)

            # Save to MongoDB
            if reviews:
                db = get_database()
                collection = db["reviews"]
                docs = [
                    {**r, "source_url": request.maps_url, "scraped_at": datetime.now(timezone.utc)}
                    for r in reviews
                ]
                await collection.insert_many(docs)
        except Exception as e:
            # Don't hard-fail — respond with context of error
            reviews = []

    # Build history list for OpenAI
    history = [{"role": m.role, "content": m.content} for m in (request.conversation_history or [])]

    try:
        reply = await chat_with_analyst(
            message=request.message,
            conversation_history=history,
            reviews=reviews,
            business_name=request.business_name or "el negocio"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en chat IA: {str(e)}")

    return {
        "status": "success",
        "reply": reply,
        "reviews_loaded": len(reviews),
    }
