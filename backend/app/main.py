from contextlib import asynccontextmanager
from fastapi import FastAPI
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
from typing import Optional
from datetime import datetime, timezone


class ScrapeRequest(BaseModel):
    url: str
    limit: Optional[int] = 20


from app.services.scraper import scrape_google_maps_reviews


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

