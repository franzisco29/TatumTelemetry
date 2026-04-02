import logging
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from relay.auth import create_token, verify_token
from database.database import get_db
from database import crud
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

app = FastAPI(title="F1 Telemetry API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer()
relay_clients = {}

# ── MODELS ─────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str
    is_admin: bool = False
    platform: Optional[str] = None
    team_category: Optional[str] = None

class UpdateUserRequest(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    platform: Optional[str] = None
    team_category: Optional[str] = None

class CreateDivisionRequest(BaseModel):
    name: str
    simulator: str

class AssignDivisionRequest(BaseModel):
    user_id: int
    division_id: int

# ── HELPERS ────────────────────────────────────────

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
):
    try:
        payload = verify_token(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Token non valido")
    user = crud.get_user_by_username(db, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utente non valido")
    return user

def require_admin(user=Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Accesso negato")
    return user

# ── AUTH ───────────────────────────────────────────

@app.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, req.username)
    if not user or not crud.verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabilitato")
    token = create_token(user.username, user.role)
    port = None
    if user.role == "driver":
        dp = crud.get_port_by_user(db, user.id)
        if dp:
            port = dp.port
    return {
        "token": token,
        "username": user.username,
        "role": user.role,
        "is_admin": user.is_admin,
        "platform": user.platform,
        "team_category": user.team_category,
        "port": port
    }

@app.get("/auth/me")
def me(user=Depends(get_current_user), db: Session = Depends(get_db)):
    port = None
    if user.role == "driver":
        dp = crud.get_port_by_user(db, user.id)
        if dp:
            port = dp.port
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "is_admin": user.is_admin,
        "platform": user.platform,
        "team_category": user.team_category,
        "port": port,
        "divisions": [
            {"id": d.id, "name": d.name, "simulator": d.simulator}
            for d in crud.get_user_divisions(db, user.id)
        ]
    }

# ── USERS (admin only) ─────────────────────────────

@app.get("/admin/users")
def get_users(admin=Depends(require_admin), db: Session = Depends(get_db)):
    users = crud.get_all_users(db)
    return {"users": [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "platform": u.platform,
            "team_category": u.team_category,
            "port": u.driver_port.port if u.driver_port else None
        } for u in users
    ]}

@app.post("/admin/users")
def create_user(
    req: CreateUserRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = crud.get_user_by_username(db, req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username già esistente")
    user = crud.create_user(
        db, req.username, req.password, req.role,
        req.is_admin, req.platform, req.team_category
    )
    if user.role == "driver":
        port = crud.get_next_available_port(db)
        crud.assign_port(db, user.id, port)
    return {"message": "Utente creato", "id": user.id}

@app.patch("/admin/users/{user_id}")
def update_user(
    user_id: int,
    req: UpdateUserRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    user = crud.update_user(db, user_id, **updates)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"message": "Utente aggiornato"}

@app.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    crud.delete_user(db, user_id)
    return {"message": "Utente eliminato"}

# ── DIVISIONS ──────────────────────────────────────

@app.get("/divisions")
def get_divisions(user=Depends(get_current_user), db: Session = Depends(get_db)):
    divisions = crud.get_all_divisions(db)
    return {"divisions": [
        {
            "id": d.id,
            "name": d.name,
            "simulator": d.simulator,
            "is_active": d.is_active
        }
        for d in divisions
    ]}

@app.post("/admin/divisions")
def create_division(
    req: CreateDivisionRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    division = crud.create_division(db, req.name, req.simulator)
    return {"message": "Divisione creata", "id": division.id}

@app.post("/admin/divisions/assign")
def assign_division(
    req: AssignDivisionRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    crud.assign_user_to_division(db, req.user_id, req.division_id)
    return {"message": "Utente assegnato alla divisione"}

# ── DRIVERS ────────────────────────────────────────

@app.get("/drivers")
def get_drivers(user=Depends(get_current_user), db: Session = Depends(get_db)):
    divisions = crud.get_user_divisions(db, user.id)
    drivers = []
    seen = set()
    for div in divisions:
        for driver in crud.get_drivers_in_division(db, div.id):
            if driver.id in seen:
                continue
            seen.add(driver.id)
            dp = crud.get_port_by_user(db, driver.id)
            port = dp.port if dp else None
            online = (
                port in relay_clients and
                len(relay_clients[port]) > 0
            ) if port else False
            drivers.append({
                "id": driver.id,
                "username": driver.username,
                "team_category": driver.team_category,
                "platform": driver.platform,
                "division": div.name,
                "port": port,
                "online": online
            })
    return {"drivers": drivers}

# ── WEBSOCKET ──────────────────────────────────────

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

# ── SESSIONS ───────────────────────────────────────

@app.get("/sessions")
def get_sessions(user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "driver":
        sessions = crud.get_sessions_by_driver(db, user.id)
    else:
        divisions = crud.get_user_divisions(db, user.id)
        sessions = []
        for div in divisions:
            sessions += crud.get_sessions_by_division(db, div.id)
    return {"sessions": [
        {
            "id": s.id,
            "driver_id": s.driver_id,
            "division_id": s.division_id,
            "started_at": s.started_at,
            "ended_at": s.ended_at,
            "file_path": s.file_path
        } for s in sessions
    ]}

def create_app(clients: dict):
    global relay_clients
    relay_clients = clients
    return app