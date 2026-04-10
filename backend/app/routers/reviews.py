from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from app.database import get_database
from app.schemas import ScrapeRequest
from app.services.scraper import scrape_google_maps_reviews

router = APIRouter()

@router.post("/api/v1/reviews/scrape", tags=["reviews"])
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
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/v1/reviews", tags=["reviews"])
async def get_reviews(limit: int = 50):
    """Traer las últimas reseñas guardadas en MongoDB."""
    db = get_database()
    collection = db["reviews"]
    cursor = collection.find({}, {"_id": 0}).sort("scraped_at", -1).limit(limit)
    reviews = await cursor.to_list(length=limit)
    return {"status": "success", "count": len(reviews), "data": reviews}
