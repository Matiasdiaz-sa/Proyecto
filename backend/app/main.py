from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title=os.getenv("PROJECT_NAME", "Sentiment AI System"),
    openapi_url=f"{os.getenv('API_V1_STR', '/api/v1')}/openapi.json"
)

# Set all CORS enabled origins
origins = [
    "http://localhost:3000",
    "https://dashboard.tu-dominio.com",
    # Add more origins from os.getenv("BACKEND_CORS_ORIGINS") later
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health", tags=["healthcheck"])
def health_check():
    return {"status": "ok", "message": "Backend is running smoothly."}

@app.get("/", tags=["root"])
def read_root():
    return {"message": "Welcome to Sentiment AI System API"}
