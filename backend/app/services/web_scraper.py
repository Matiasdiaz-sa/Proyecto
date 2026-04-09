import httpx
import re
from typing import List, Dict, Any


# Common HTML patterns for review content
REVIEW_SELECTORS = [
    # Generic review text patterns
    r'class=["\'][^"\']*review[^"\']*["\']',
    r'class=["\'][^"\']*comment[^"\']*["\']',
    r'class=["\'][^"\']*opinion[^"\']*["\']',
    r'class=["\'][^"\']*testimon[^"\']*["\']',
    r'itemprop=["\']reviewBody["\']',
    r'itemprop=["\']description["\']',
]


def _clean_text(text: str) -> str:
    """Remove excess whitespace and HTML artifacts."""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()


def _extract_texts_from_html(html: str) -> List[str]:
    """
    Extract review-like text blocks from raw HTML.
    Looks for common review patterns without requiring BS4.
    """
    texts = []
    
    # Try structured data first (JSON-LD)
    json_ld_pattern = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE)
    for block in json_ld_pattern:
        try:
            import json
            data = json.loads(block)
            # Handle both single object and list
            items = data if isinstance(data, list) else [data]
            for item in items:
                # Look for review arrays
                reviews = item.get("review", [])
                if isinstance(reviews, list):
                    for rev in reviews:
                        body = rev.get("reviewBody", "") or rev.get("description", "")
                        if body and len(body) > 20:
                            texts.append(_clean_text(body))
                elif isinstance(reviews, dict):
                    body = reviews.get("reviewBody", "")
                    if body and len(body) > 20:
                        texts.append(_clean_text(body))
        except Exception:
            pass

    # If JSON-LD found reviews, return them
    if texts:
        return texts

    # Fallback: extract text from review-like elements using regex
    # Find blocks that have both a star/rating indicator and text nearby
    # Look for paragraphs with 50+ chars that aren't nav/header/footer
    paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', html, re.DOTALL | re.IGNORECASE)
    for p in paragraphs:
        clean = _clean_text(p)
        # Filter: must be 50-1000 chars, looks like a review
        if 50 < len(clean) < 1000:
            texts.append(clean)

    # Deduplicate and limit
    seen = set()
    unique = []
    for t in texts:
        if t not in seen:
            seen.add(t)
            unique.append(t)
    
    return unique[:100]  # Max 100 from web


async def scrape_website_reviews(website_url: str) -> List[Dict[str, Any]]:
    """
    Scrapes reviews from a business website.
    Looks for structured JSON-LD data and common review HTML patterns.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
    }

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        try:
            response = await client.get(website_url, headers=headers)
            if response.status_code != 200:
                return []
            html = response.text
        except Exception as e:
            raise ValueError(f"No se pudo acceder al sitio web: {str(e)}")

    texts = _extract_texts_from_html(html)

    reviews = []
    for text in texts:
        if len(text.strip()) > 30:
            reviews.append({
                "author": "Cliente del sitio web",
                "rating": None,  # Unknown from website
                "text": text,
                "datetime": "",
                "source": "website"
            })

    return reviews
