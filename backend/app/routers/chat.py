from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from app.database import get_database
from app.schemas import ChatRequest
from app.services.chat import stream_chat_with_analyst
from app.services.scraper import scrape_google_maps_reviews

router = APIRouter()

@router.post("/api/v1/chat", tags=["chat"])
async def chat_endpoint(request: ChatRequest):
    """
    Conversational analyst chat. Loads reviews from Maps if maps_url provided
    (and they're not already passed in), then answers the user's question via streaming.
    """
    reviews = request.reviews or []

    # Load from Maps if URL provided and no reviews passed
    if request.maps_url and not reviews:
        try:
            limit = min(request.maps_limit or 50, 1000)
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

    # Build history list for Ollama
    history = [{"role": m.role, "content": m.content} for m in (request.conversation_history or [])]

    try:
        generator = stream_chat_with_analyst(
            message=request.message,
            conversation_history=history,
            reviews=reviews,
            business_name=request.business_name or "el negocio",
            analysis_report=request.analysis_report
        )
        return StreamingResponse(generator, media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en chat IA: {str(e)}")
