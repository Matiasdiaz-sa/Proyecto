import os
import httpx
from typing import List, Dict, Any

OUTSCRAPER_API_KEY = os.environ.get("OUTSCRAPER_API_KEY", "")

async def scrape_google_maps_reviews(maps_url: str, reviews_limit: int = 20) -> List[Dict[str, Any]]:
    """
    Scrapes reviews from a Google Maps URL using the Outscraper API.
    """
    if not OUTSCRAPER_API_KEY:
        raise ValueError("La clave OUTSCRAPER_API_KEY no está configurada en el servidor.")

    api_url = "https://api.outscraper.com/maps/reviews-v3"
    
    params = {
        "query": maps_url,
        "reviewsLimit": reviews_limit,
        "async": "false" 
    }

    headers = {
        "X-API-KEY": OUTSCRAPER_API_KEY
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(api_url, params=params, headers=headers)
        
        if response.status_code != 200:
            raise Exception(f"Error de Outscraper: {response.text}")
            
        data = response.json()
        
        # Estructura devuelta por Outscraper
        if "data" in data and len(data["data"]) > 0:
            place_data = data["data"][0]
            reviews_list = place_data.get("reviews_data", [])
            
            formatted_reviews = []
            for r in reviews_list:
                # Solo guardamos reseñas que tengan texto útil
                texto = r.get("review_text", "")
                if texto and len(texto.strip()) > 2:
                    formatted_reviews.append({
                        "author": r.get("author_title", "Anónimo"),
                        "rating": r.get("review_rating", 5),
                        "text": texto,
                        "datetime": r.get("review_datetime_utc", "")
                    })
            
            return formatted_reviews
        
        return []
