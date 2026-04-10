import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGO_URI'))
    db = client['sentiment_db']
    await db.reviews.insert_one({'init': True})
    print('Collection created.')
    await db.reviews.delete_many({})
    print('Cleaned.')

if __name__ == '__main__':
    asyncio.run(run())
