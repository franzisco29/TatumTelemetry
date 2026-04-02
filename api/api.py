from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from relay.auth import create_token, verify_token

import logging
logger = logging.getLogger(__name__)

app = FastAPI(title="F1 Telemetry API")
bearer = HTTPBearer()

# Riferimento agli engineers del relay - viene impostato da main.py
relay_engineers = {}

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str

class EngineerRegisterRequest(BaseModel):
    pilot_port: int
    engineer_ip: str
    engineer_port: int

# Utenti hardcoded per ora
USERS = {
    "pilot1":    {"password": "Tatum2024", "role": "pilot"},
    "pilot2":    {"password": "Tatum2024", "role": "pilot"},
    "engineer1": {"password": "Tatum2024", "role": "engineer"},
}

@app.post("/auth/login")
def login(req: LoginRequest):
    user = USERS.get(req.username)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    token = create_token(req.username, user["role"])
    return {"token": token}

@app.post("/engineer/register")
def register_engineer(
    req: EngineerRegisterRequest,
    creds: HTTPAuthorizationCredentials = Depends(bearer)
):
    verify_token(creds.credentials)
    port = req.pilot_port
    logger.info(f"Porte disponibili: {list(relay_engineers.keys())}")
    if port not in relay_engineers:
        raise HTTPException(status_code=404, detail=f"Porta {port} non esistente")
    relay_engineers[port].add((req.engineer_ip, req.engineer_port))
    logger.info(f"Ingegnere {req.engineer_ip}:{req.engineer_port} registrato su porta {port}")
    logger.info(f"Ingegneri attivi su porta {port}: {relay_engineers[port]}")
    return {"message": f"Registrato su pilota porta {port}"}

@app.delete("/engineer/unregister")
def unregister_engineer(
    req: EngineerRegisterRequest,
    creds: HTTPAuthorizationCredentials = Depends(bearer)
):
    verify_token(creds.credentials)
    port = req.pilot_port
    relay_engineers.get(port, set()).discard((req.engineer_ip, req.engineer_port))
    return {"message": "Disconnesso"}

@app.get("/pilots")
def get_pilots(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    verify_token(creds.credentials)
    return {"pilots": list(USERS.keys())}

@app.get("/sessions")
def get_sessions(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    verify_token(creds.credentials)
    return {"sessions": []}

def create_app(engineers: dict):
    global relay_engineers
    relay_engineers = engineers
    return app