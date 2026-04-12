from fastapi import APIRouter
from app.database import get_database

router = APIRouter()

@router.get("/api/v1/reports/{user_id}", tags=["reports"])
async def get_user_reports(user_id: str):
    """
    Returns the generated reports for a user.
    """
    db = get_database()
    collection = db["reports"]
    
    cursor = collection.find({"user_id": user_id}).sort("created_at", -1)
    
    reports = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        reports.append(doc)
        
    return {"status": "success", "reports": reports}
