import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.environ.get("MONGO_URI", "")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "sentiment_db")

client: AsyncIOMotorClient = None


async def connect_to_mongo():
    global client
    client = AsyncIOMotorClient(MONGO_URI)


async def close_mongo_connection():
    global client
    if client:
        client.close()


def get_database():
    return client[MONGO_DB_NAME]
