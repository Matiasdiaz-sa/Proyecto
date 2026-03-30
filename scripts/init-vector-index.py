import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def index_vector():
    client = AsyncIOMotorClient(os.getenv("MONGO_URI"))
    db = client[os.getenv("MONGO_DB_NAME", "sentiment_db")]
    
    # Parámetros del índice (Manejo para text-embedding-3-small u otro con 1536 dimensiones)
    search_index_model = {
        "name": "vector_index",
        "definition": {
            "fields": [
                {
                    "type": "vector",
                    "path": "embedding",
                    "numDimensions": 1536,
                    "similarity": "cosine"
                }
            ]
        }
    }
    
    try:
        await db.reviews.create_search_index(search_index_model)
        print("Vector search index successfully mapped.")
    except Exception as e:
        print(f"Index error: {e}")

if __name__ == "__main__":
    asyncio.run(index_vector())
