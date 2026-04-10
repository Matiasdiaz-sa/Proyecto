from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from app.database import get_database
from app.schemas import ChatRequest
from app.services.chat import chat_with_analyst
from app.services.scraper import scrape_google_maps_reviews

router = APIRouter()

@router.post("/api/v1/chat", tags=["chat"])
async def chat_endpoint(request: ChatRequest):
    """
    Conversational analyst chat. Loads reviews from Maps if maps_url provided
    (and they're not already passed in), then answers the user's question.
    """
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

    # Build history list for Gemini/OpenAI
    history = [{"role": m.role, "content": m.content} for m in (request.conversation_history or [])]

    try:
        reply = await chat_with_analyst(
            message=request.message,
            conversation_history=history,
            reviews=reviews,
            business_name=request.business_name or "el negocio",
            analysis_report=request.analysis_report
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en chat IA: {str(e)}")

    return {
        "status": "success",
        "reply": reply,
        "reviews_loaded": len(reviews),
    }
