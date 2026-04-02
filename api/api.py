import logging
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from relay.auth import create_token, verify_token

logger = logging.getLogger(__name__)

app = FastAPI(title="F1 Telemetry API")
bearer = HTTPBearer()

relay_clients = {}

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str

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

@app.get("/pilots")
def get_pilots(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    verify_token(creds.credentials)
    return {"pilots": list(USERS.keys())}

@app.websocket("/ws/{pilot_port}")
async def websocket_endpoint(websocket: WebSocket, pilot_port: int):
    if pilot_port not in relay_clients:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    relay_clients[pilot_port].add(websocket)
    logger.info(f"Ingegnere connesso su porta {pilot_port} - totale: {len(relay_clients[pilot_port])}")

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        relay_clients[pilot_port].discard(websocket)
        logger.info(f"Ingegnere disconnesso da porta {pilot_port}")


def create_app(clients: dict):
    global relay_clients
    relay_clients = clients
    return app