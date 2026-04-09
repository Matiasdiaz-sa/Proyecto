import os
import httpx
from typing import List, Dict, Any

APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")

async def scrape_google_maps_reviews(maps_url: str, reviews_limit: int = 15) -> List[Dict[str, Any]]:
    """
    Scrapes reviews from a Google Maps URL using Apify's API.
    """
    if not APIFY_TOKEN:
        raise ValueError("La clave APIFY_TOKEN no está configurada en el servidor.")

    # Endpoint oficial de Apify para ejecutar un actor y esperar sus datos
    api_url = f"https://api.apify.com/v2/acts/compass~google-maps-reviews-scraper/run-sync-get-dataset-items"
    
    params = {
        "token": APIFY_TOKEN
    }

    # Input que le enviamos al robot de Apify
    payload = {
        "startUrls": [{"url": maps_url}],
        "maxReviews": reviews_limit,
        "language": "es"
    }

    # Este proceso puede tardar un poquito porque levanta un navegador fantasma real en Apify
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(api_url, params=params, json=payload)
        
        if response.status_code != 200 and response.status_code != 201:
            raise Exception(f"Error de Apify: {response.text}")
            
        data = response.json()
        
        # Apify devuelve directamente la lista de reseñas
        formatted_reviews = []
        for r in data:
            texto = r.get("textTranslated", r.get("text", ""))
            if texto and len(texto.strip()) > 2:
                formatted_reviews.append({
                    "author": r.get("name", "Anónimo"),
                    "rating": r.get("stars", 5),
                    "text": texto,
                    "datetime": r.get("publishedAtDate", "")
                })
        
        return formatted_reviews
