from fastapi import APIRouter, HTTPException
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
