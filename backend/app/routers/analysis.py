from fastapi import APIRouter, HTTPException
import asyncio
from datetime import datetime, timezone
from app.database import get_database
from app.schemas import AnalyzeRequest
from app.services.scraper import scrape_google_maps_reviews
from app.services.sentiment import analyze_reviews
from app.services.web_scraper import scrape_website_reviews

router = APIRouter()

@router.post("/api/v1/analyze", tags=["analysis"])
async def analyze_business(request: AnalyzeRequest):
    """
    Full analyst endpoint. Combines reviews from:
    - Google Maps (via Apify)
    - Business website (via web scraper)
    - Manually provided reviews
    Then runs AI analysis and returns a professional report.
    """
    all_reviews = []
    sources_used = []

    async def fetch_maps():
        limit = min(request.maps_limit or 100, 300)
        try:
            maps_reviews = await scrape_google_maps_reviews(request.maps_url, limit)
            for r in maps_reviews:
                r["source"] = "google_maps"
            if maps_reviews:
                db = get_database()
                collection = db["reviews"]
                docs = [{**r, "source_url": request.maps_url, "scraped_at": datetime.now(timezone.utc)} for r in maps_reviews]
                await collection.insert_many(docs)
            return maps_reviews, f"Google Maps ({len(maps_reviews)} reseñas)"
        except Exception as e:
            return [], f"Google Maps (error: {str(e)[:80]})"

    async def fetch_web():
        try:
            web_reviews = await scrape_website_reviews(request.website_url)
            for r in web_reviews:
                r["source"] = "website"
            return web_reviews, f"Sitio web ({len(web_reviews)} reseñas)"
        except Exception as e:
            return [], f"Sitio web (error: {str(e)[:80]})"

    tasks = []
    if request.maps_url:
        tasks.append(fetch_maps())
    if request.website_url:
        tasks.append(fetch_web())

    if tasks:
        results = await asyncio.gather(*tasks)
        for revs, source_msg in results:
            all_reviews.extend(revs)
            sources_used.append(source_msg)

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

    # Save to MongoDB reports collection if user_id is provided
    if request.user_id:
        try:
            db = get_database()
            rep_col = db["reports"]
            await rep_col.insert_one({
                "user_id": request.user_id,
                "business_name": request.business_name or "el negocio",
                "maps_url": request.maps_url,
                "report": report,
                "created_at": datetime.now(timezone.utc)
            })
        except Exception as e:
            print(f"Error saving report to DB: {e}")

    return {"status": "success", "report": report}
