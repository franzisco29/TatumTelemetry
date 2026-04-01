from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from relay.auth import create_token, verify_token

app = FastAPI(title="F1 Telemetry API")
bearer = HTTPBearer()

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str  # "pilot" o "engineer"

# Utenti hardcoded per ora - in futuro: database
USERS = {
    "pilot1":    {"password": "CAMBIA", "role": "pilot"},
    "pilot2":    {"password": "CAMBIA", "role": "pilot"},
    "engineer1": {"password": "CAMBIA", "role": "engineer"},
}

@app.post("/auth/login")
def login(req: LoginRequest):
    user = USERS.get(req.username)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    token = create_token(req.username, user["role"])
    return {"token": token}

@app.get("/pilots")
def get_pilots(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    verify_token(creds.credentials)
    return {"pilots": list(USERS.keys())}

@app.get("/sessions")
def get_sessions(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    verify_token(creds.credentials)
    # TODO: lista file da recorder/sessions/
    return {"sessions": []}

def create_app():
    return app