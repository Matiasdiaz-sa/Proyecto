import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.environ.get("MONGO_URI", "")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "sentiment_db")

client: AsyncIOMotorClient = None


async def connect_to_mongo():
    global client
    client = AsyncIOMotorClient(
        MONGO_URI,
        tls=True,
        tlsAllowInvalidCertificates=True
    )


async def close_mongo_connection():
    global client
    if client:
        client.close()


def get_database():
    return client[MONGO_DB_NAME]
