from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.database import connect_to_mongo, close_mongo_connection
from app.routers import reviews, analysis, chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Conectar a MongoDB al arrancar
    await connect_to_mongo()
    yield
    # Cerrar conexión al apagar
    await close_mongo_connection()

app = FastAPI(
    title=os.getenv("PROJECT_NAME", "Sentiment AI System"),
    openapi_url=f"{os.getenv('API_V1_STR', '/api/v1')}/openapi.json",
    lifespan=lifespan
)

# CORS - allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://proyecto-spsj.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.get("/api/v1/health", tags=["healthcheck"])
def health_check():
    return {"status": "ok", "message": "Backend is running smoothly."}

@app.get("/", tags=["root"])
def read_root():
    return {"message": "Welcome to Sentiment AI System API"}

# Include Routers
app.include_router(reviews.router)
app.include_router(analysis.router)
app.include_router(chat.router)


#slow_api
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
