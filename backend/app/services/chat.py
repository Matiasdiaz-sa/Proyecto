import os
import json
from typing import List, Dict, Any
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))


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
Tenés acceso a las reseñas reales del negocio "{business_name}".
Tu rol es responder preguntas de forma conversacional, concisa y profesional, como si fueras un consultor de negocio.

CONTEXTO - RESEÑAS DEL NEGOCIO ({review_count} reseñas):
---
{reviews_context}
---

INSTRUCCIONES:
- Respondé siempre en el mismo idioma que el usuario.
- Basá tus respuestas EXCLUSIVAMENTE en las reseñas provistas. 
- Si no tenés suficiente info para responder algo, decilo claramente.
- Podés hacer análisis, detectar patrones, sugerir mejoras, comparar aspectos, generar reportes, etc.
- Sé directo y útil. No uses frases genéricas de relleno.
- Si el usuario pregunta algo que no está relacionado con las reseñas, redirigilo amablemente.
"""


async def chat_with_analyst(
    message: str,
    conversation_history: List[Dict[str, str]],
    reviews: List[Dict[str, Any]],
    business_name: str = "el negocio"
) -> str:
    """
    Chat with the review analyst. Uses reviews as context via system prompt.
    """
    reviews_context = _build_reviews_context(reviews, business_name)
    
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        business_name=business_name,
        review_count=len(reviews),
        reviews_context=reviews_context if reviews_context else "No hay reseñas cargadas aún."
    )

    messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history (last 10 exchanges to keep tokens under control)
    for msg in conversation_history[-20:]:
        messages.append(msg)
    
    # Add current user message
    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.6,
        max_tokens=600
    )

    return response.choices[0].message.content
