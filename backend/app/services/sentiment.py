import os
import json
from typing import List, Dict, Any
from openai import AsyncOpenAI

client = AsyncOpenAI(
    api_key="ollama", # Not actually used by Ollama, but required by openai library
    base_url=os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
)

BATCH_SIZE = 30  # reviews per batch to stay within token limits


def _format_reviews_for_prompt(reviews: List[Dict[str, Any]]) -> str:
    lines = []
    for i, r in enumerate(reviews, 1):
        author = r.get("author", "Anónimo")
        rating = r.get("rating", "?")
        text = r.get("text", "").strip()
        if text:
            lines.append(f"{i}. [{rating}★] {author}: {text}")
    return "\n".join(lines)


async def _analyze_batch(reviews_text: str, language: str) -> Dict[str, Any]:
    """Analyze a single batch of reviews."""
    prompt = f"""You are an expert business analyst specializing in customer sentiment analysis.

Analyze the following customer reviews and respond ONLY with a valid JSON object.
IMPORTANT: Respond in {language}.

Reviews to analyze:
{reviews_text}

Return this exact JSON structure:
{{
  "sentiment_score": <float 0.0 to 10.0>,
  "sentiment_label": "<Muy Positivo|Positivo|Mixto|Negativo|Muy Negativo>",
  "positive_themes": ["theme1", "theme2", "theme3"],
  "negative_themes": ["theme1", "theme2"],
  "summary": "<2-3 sentence executive summary>"
}}"""

    response = await client.chat.completions.create(
        model=os.environ.get("OLLAMA_MODEL", "glm-5.1:cloud"),
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)


async def _detect_language(reviews: List[Dict[str, Any]]) -> str:
    """Detect the primary language from the reviews."""
    sample = " ".join([r.get("text", "")[:100] for r in reviews[:5]])
    prompt = f"""What language is this text? Reply with ONLY the language name in English (e.g. "Spanish", "English", "French", "Portuguese").
Text: {sample}"""
    
    response = await client.chat.completions.create(
        model=os.environ.get("OLLAMA_MODEL", "glm-5.1:cloud"),
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=10
    )
    return response.choices[0].message.content.strip()


async def analyze_reviews(
    reviews: List[Dict[str, Any]],
    business_name: str = "the business"
) -> Dict[str, Any]:
    """
    Main analysis function. Handles batching for large review sets
    and returns a full analyst report.
    """
    if not reviews:
        return {"error": "No reviews to analyze"}

    # Detect language from reviews
    language = await _detect_language(reviews)

    # Process in batches
    batches = [reviews[i:i + BATCH_SIZE] for i in range(0, len(reviews), BATCH_SIZE)]
    batch_results = []
    
    for batch in batches:
        text = _format_reviews_for_prompt(batch)
        result = await _analyze_batch(text, language)
        batch_results.append(result)

    # Aggregate batch results
    avg_score = sum(b.get("sentiment_score", 5) for b in batch_results) / len(batch_results)
    
    all_positive = []
    all_negative = []
    summaries = []
    
    for b in batch_results:
        all_positive.extend(b.get("positive_themes", []))
        all_negative.extend(b.get("negative_themes", []))
        summaries.append(b.get("summary", ""))

    # Final synthesis with OpenAI
    synthesis_prompt = f"""You are an expert business analyst. Create a final report for "{business_name}" based on these batch analyses.

Average sentiment score: {avg_score:.1f}/10
Positive themes found: {list(set(all_positive))}
Negative themes found: {list(set(all_negative))}
Batch summaries: {summaries}
Total reviews analyzed: {len(reviews)}

Respond in {language} with ONLY a valid JSON object:
{{
  "overall_score": <float 0.0 to 10.0>,
  "sentiment_label": "<label in {language}>",
  "positive_themes": ["top 5 unique positive themes"],
  "negative_themes": ["top 5 unique negative themes"],
  "executive_summary": "<professional 4-5 sentence summary as a business consultant>",
  "recommendations": ["3 specific, actionable improvement recommendations"],
  "language_detected": "{language}",
  "total_reviews_analyzed": {len(reviews)}
}}"""

    final_response = await client.chat.completions.create(
        model=os.environ.get("OLLAMA_MODEL", "glm-5.1:cloud"),
        messages=[{"role": "user", "content": synthesis_prompt}],
        temperature=0.4,
        response_format={"type": "json_object"}
    )
    
    return json.loads(final_response.choices[0].message.content)
