import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    BASE_PORT        = int(os.getenv("BASE_PORT", 20001))
    MAX_PILOTS       = int(os.getenv("MAX_PILOTS", 10))
    API_HOST         = os.getenv("API_HOST", "0.0.0.0")
    API_PORT         = int(os.getenv("API_PORT", 8000))
    JWT_SECRET       = os.getenv("JWT_SECRET", "CAMBIA_QUESTO_SEGRETO")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 24))
    SESSIONS_DIR     = os.getenv("SESSIONS_DIR", "recorder/sessions")