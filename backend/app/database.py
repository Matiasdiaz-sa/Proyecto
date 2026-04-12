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
    # Background index creation for optimal Workspace loading
    try:
        db = client[MONGO_DB_NAME]
        await db["reports"].create_index(
            [("user_id", 1), ("created_at", -1)],
            background=True
        )
    except Exception as e:
        print(f"Index creation failed: {e}")


async def close_mongo_connection():
    global client
    if client:
        client.close()


def get_database():
    return client[MONGO_DB_NAME]
