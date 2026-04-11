import os
import json
from typing import List, Dict, Any
from openai import AsyncOpenAI

client = AsyncOpenAI(
    api_key="ollama", # Not actually used by Ollama, but required by openai library
    base_url=os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")
)


def _build_reviews_context(reviews: List[Dict[str, Any]], business_name: str) -> str:
    """Format reviews as a compact context block for the system prompt."""
    lines = []
    for i, r in enumerate(reviews[:150], 1):  # cap at 150 for token safety
        author = r.get("author", "Anónimo")
        rating = r.get("stars") or r.get("rating", "?")
        text = (r.get("text") or "").strip()
        source = r.get("source", "google_maps")
        if text:
            lines.append(f"[{i}] {rating}★ ({source}) - {author}: {text[:300]}")
    return "\n".join(lines)


SYSTEM_PROMPT_TEMPLATE = """Sos un analista experto en experiencia del cliente y reputación online.
Analizaste las reseñas del negocio "{business_name}" y generaste el siguiente informe:

INFORME DE ANÁLISIS:
- Puntaje general: {overall_score}/10
- Sentimiento: {sentiment_label}
- Resumen ejecutivo: {executive_summary}
- Puntos fuertes: {positive_themes}
- Áreas de mejora: {negative_themes}
- Recomendaciones: {recommendations}

RESEÑAS ORIGINALES ({review_count} reseñas):
---
{reviews_context}
---

INSTRUCCIONES:
- Respondé siempre en el mismo idioma que el usuario.
- Podés referenciar el informe que generaste o profundizar en las reseñas originales.
- Sé directo, profesional y útil como un consultor de negocio.
- Si el usuario pide más detalle sobre algo del informe, buscá ese dato en las reseñas.
- Si el usuario pregunta algo no relacionado con el negocio, redirigilo amablemente.
"""


async def chat_with_analyst(
    message: str,
    conversation_history: List[Dict[str, str]],
    reviews: List[Dict[str, Any]],
    business_name: str = "el negocio",
    analysis_report: Dict[str, Any] = None
) -> str:
    """
    Chat with the review analyst. Uses reviews and the pre-generated report as context.
    """
    reviews_context = _build_reviews_context(reviews, business_name)
    report = analysis_report or {}
    
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        business_name=business_name,
        review_count=len(reviews),
        overall_score=report.get("overall_score", "N/A"),
        sentiment_label=report.get("sentiment_label", "N/A"),
        executive_summary=report.get("executive_summary", "Aún no se generó un informe."),
        positive_themes=", ".join(report.get("positive_themes", [])) or "N/A",
        negative_themes=", ".join(report.get("negative_themes", [])) or "N/A",
        recommendations="; ".join(report.get("recommendations", [])) or "N/A",
        reviews_context=reviews_context if reviews_context else "No hay reseñas cargadas aún."
    )

    messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history (last 10 exchanges to keep tokens under control)
    for msg in conversation_history[-20:]:
        messages.append(msg)
    
    # Add current user message
    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model=os.environ.get("OLLAMA_MODEL", "glm-5.1:cloud"),
        messages=messages,
        temperature=0.6,
        max_tokens=600
    )

    return response.choices[0].message.content
