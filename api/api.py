import asyncio
import logging
import os
import time
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from relay.auth import create_token, verify_token
from relay.decoder import decode_telemetry_packet
from recorder.recorder import read_session_packets, build_session_structure
from database.database import get_db
from database import crud
from sqlalchemy.orm import Session
from database.database import get_db, SessionLocal
from database.models import User, UserDivision
import bcrypt

logger = logging.getLogger(__name__)

app = FastAPI(title="Tatum Telemetry API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.tatumtelemetry.it",
        "https://tatumtelemetry.it",
        "https://tatum-telemetry.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
bearer = HTTPBearer()
relay_clients = {}
relay_decoded_clients = {}
relay_last_packet = {}
relay_driver_names = {}
relay_server = None

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

class BulkUserEntry(BaseModel):
    username: str
    password: str
    role: str
    is_admin: bool = False
    is_superuser: bool = False
    platform: Optional[str] = None
    team_category: Optional[str] = None
    division_id: Optional[int] = None

class BulkCreateUsersRequest(BaseModel):
    users: list[BulkUserEntry]

class CreateSessionRequest(BaseModel):
    division_id: int
    session_type: Optional[str] = None
    circuit: Optional[str] = None

class CloseSessionRequest(BaseModel):
    session_type: Optional[str] = None
    circuit: Optional[str] = None

class StartRecordingRequest(BaseModel):
    circuit: Optional[str] = None
    session_type: Optional[str] = None

class EndRecordingRequest(BaseModel):
    pass

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
            relay_driver_names[port] = user.username
    return {
        "token": token,
        "username": user.username,
        "role": user.role,
        "is_admin": user.is_admin,
        "platform": user.platform,
        "team_category": user.team_category,
        "port": port
    }

@app.get("/auth/client-token")
def client_token(user=Depends(get_current_user)):
    token = create_token(user.username, user.role)
    return {"token": token}

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
            "is_superuser": u.is_superuser,
            "is_active": u.is_active,
            "platform": u.platform,
            "team_category": u.team_category,
            "port": u.driver_port.port if u.driver_port else None,
            "divisions": [{"id": d.division_id} for d in u.divisions]
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

@app.post("/admin/users/bulk")
def bulk_create_users(
    req: BulkCreateUsersRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    results = []
    for entry in req.users:
        if crud.get_user_by_username(db, entry.username):
            results.append({"username": entry.username, "success": False, "error": "Username già esistente"})
            continue
        try:
            user = crud.create_user(
                db, entry.username, entry.password, entry.role,
                entry.is_admin, entry.platform, entry.team_category,
                is_superuser=entry.is_superuser
            )
            if user.role == "driver":
                port = crud.get_next_available_port(db)
                crud.assign_port(db, user.id, port)
            if entry.division_id:
                crud.assign_user_to_division(db, user.id, entry.division_id)
            results.append({"username": entry.username, "success": True, "id": user.id})
        except Exception as e:
            results.append({"username": entry.username, "success": False, "error": str(e)})
    created = sum(1 for r in results if r["success"])
    return {"created": created, "total": len(results), "results": results}



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

@app.get("/admin/divisions/{division_id}/members")
def get_division_members(
    division_id: int,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    division = crud.get_division_by_id(db, division_id)
    if not division:
        raise HTTPException(status_code=404, detail="Divisione non trovata")
    members = db.query(User).join(UserDivision).filter(
        UserDivision.division_id == division_id
    ).all()
    return {
        "division": {"id": division.id, "name": division.name, "simulator": division.simulator},
        "members": [
            {
                "id": u.id,
                "username": u.username,
                "role": u.role,
                "is_admin": u.is_admin,
                "is_active": u.is_active,
                "platform": u.platform,
                "team_category": u.team_category,
                "port": u.driver_port.port if u.driver_port else None
            } for u in members
        ]
    }

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
            # Online se ha ricevuto pacchetti negli ultimi 5 secondi
            last = relay_last_packet.get(port, 0) if port else 0
            online = (time.time() - last) < 5 if port else False
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

DRIVER_TIMEOUT_SECONDS = 10

@app.websocket("/ws/{pilot_port}")
async def websocket_endpoint(websocket: WebSocket, pilot_port: int):
    if pilot_port not in relay_clients:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    relay_clients[pilot_port].add(websocket)
    logger.info(f"Ingegnere connesso su porta {pilot_port}")

    # Log nel DB
    db = SessionLocal()
    conn_log = crud.log_connection(db, user_id=None, driver_port=pilot_port)
    db.close()

    async def receive_loop():
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass

    async def driver_watchdog():
        # Aspetta che il driver inizi a trasmettere
        while relay_last_packet.get(pilot_port, 0) == 0:
            await asyncio.sleep(1)
        # Monitora il timeout del driver
        while True:
            await asyncio.sleep(5)
            last = relay_last_packet.get(pilot_port, 0)
            if (time.time() - last) > DRIVER_TIMEOUT_SECONDS:
                logger.info(f"Driver porta {pilot_port} offline, disconnetto ingegnere")
                try:
                    await websocket.close(code=1001)
                except Exception:
                    pass
                return

    receiver = asyncio.ensure_future(receive_loop())
    watchdog = asyncio.ensure_future(driver_watchdog())

    try:
        await asyncio.wait([receiver, watchdog], return_when=asyncio.FIRST_COMPLETED)
    finally:
        for task in (receiver, watchdog):
            task.cancel()
        relay_clients[pilot_port].discard(websocket)
        db = SessionLocal()
        crud.close_connection(db, conn_log.id)
        db.close()
        logger.info(f"Ingegnere disconnesso da porta {pilot_port}")
@app.websocket("/ws/decoded/{pilot_port}")
async def websocket_decoded_endpoint(websocket: WebSocket, pilot_port: int):
    if pilot_port not in relay_decoded_clients:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    relay_decoded_clients[pilot_port].add(websocket)
    logger.info(f"Ingegnere decoded connesso su porta {pilot_port}")

    async def receive_loop():
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass

    async def driver_watchdog():
        while relay_last_packet.get(pilot_port, 0) == 0:
            await asyncio.sleep(1)
        while True:
            await asyncio.sleep(5)
            last = relay_last_packet.get(pilot_port, 0)
            if (time.time() - last) > DRIVER_TIMEOUT_SECONDS:
                logger.info(f"Driver porta {pilot_port} offline, disconnetto ingegnere decoded")
                try:
                    await websocket.close(code=1001)
                except Exception:
                    pass
                return

    receiver = asyncio.ensure_future(receive_loop())
    watchdog = asyncio.ensure_future(driver_watchdog())

    try:
        await asyncio.wait([receiver, watchdog], return_when=asyncio.FIRST_COMPLETED)
    finally:
        for task in (receiver, watchdog):
            task.cancel()
        relay_decoded_clients[pilot_port].discard(websocket)
        logger.info(f"Ingegnere decoded disconnesso da porta {pilot_port}")
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
            "session_type": s.session_type,
            "circuit": s.circuit,
            "started_at": s.started_at,
            "ended_at": s.ended_at,
            "file_path": s.file_path
        } for s in sessions
    ]}


@app.post("/sessions")
def create_session_endpoint(
    req: CreateSessionRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea una nuova sessione per il driver attuale"""
    if user.role != "driver":
        raise HTTPException(status_code=403, detail="Solo driver possono creare sessioni")
    
    # Verifica che il driver appartenga alla divisione
    division = crud.get_division_by_id(db, req.division_id)
    if not division:
        raise HTTPException(status_code=404, detail="Divisione non trovata")
    
    user_divs = {d.id for d in crud.get_user_divisions(db, user.id)}
    if req.division_id not in user_divs:
        raise HTTPException(status_code=403, detail="Non appartenete a questa divisione")
    
    session = crud.create_session(
        db,
        driver_id=user.id,
        division_id=req.division_id,
        session_type=req.session_type,
        circuit=req.circuit
    )
    return {
        "id": session.id,
        "driver_id": session.driver_id,
        "division_id": session.division_id,
        "session_type": session.session_type,
        "circuit": session.circuit,
        "started_at": session.started_at,
        "message": "Sessione creata"
    }


@app.put("/sessions/{session_id}")
def update_session_endpoint(
    session_id: int,
    req: CloseSessionRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggiorna una sessione (es. per impostare il circuito al termine)"""
    session_obj = db.query(crud.SessionModel).filter(crud.SessionModel.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    
    if user.role == "driver" and session_obj.driver_id != user.id:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    if user.role != "driver":
        user_div_ids = {d.id for d in crud.get_user_divisions(db, user.id)}
        if session_obj.division_id not in user_div_ids:
            raise HTTPException(status_code=403, detail="Accesso negato")
    
    if req.session_type:
        session_obj.session_type = req.session_type
    if req.circuit:
        session_obj.circuit = req.circuit
    
    if req.session_type or req.circuit:
        db.commit()
    
    return {
        "message": "Sessione aggiornata",
        "session_type": session_obj.session_type,
        "circuit": session_obj.circuit
    }


@app.post("/sessions/start-recording")
def start_recording(
    req: StartRecordingRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """La registrazione è automatica: questo endpoint è mantenuto solo per compatibilità."""
    return {
        "message": "Registrazione automatica attiva: la sessione parte e si divide da sola su cambio circuito/sessione",
        "automatic": True,
    }


@app.post("/sessions/end-recording")
def end_recording(
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """La registrazione si chiude automaticamente quando la sessione finisce."""
    return {
        "message": "Registrazione automatica: non serve chiusura manuale",
        "automatic": True,
    }


@app.get("/sessions/{session_id}/download")
def download_session(session_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    session_obj = db.query(crud.SessionModel).filter(crud.SessionModel.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Sessione non trovata")

    if user.role == "driver" and session_obj.driver_id != user.id:
        raise HTTPException(status_code=403, detail="Accesso negato")

    if user.role != "driver":
        user_div_ids = {d.id for d in crud.get_user_divisions(db, user.id)}
        if session_obj.division_id not in user_div_ids:
            raise HTTPException(status_code=403, detail="Accesso negato")

    if not session_obj.file_path or not os.path.exists(session_obj.file_path):
        raise HTTPException(status_code=404, detail="File sessione non trovato")

    return FileResponse(
        session_obj.file_path,
        filename=os.path.basename(session_obj.file_path),
        media_type="application/octet-stream"
    )


@app.get("/sessions/{session_id}/decoded-preview")
def decoded_session_preview(
    session_id: int,
    max_packets: int = 200,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview best-effort: tenta decode sequenziale assumendo pacchetti di dimensione media costante."""
    session_obj = db.query(crud.SessionModel).filter(crud.SessionModel.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Sessione non trovata")

    if user.role == "driver" and session_obj.driver_id != user.id:
        raise HTTPException(status_code=403, detail="Accesso negato")

    if user.role != "driver":
        user_div_ids = {d.id for d in crud.get_user_divisions(db, user.id)}
        if session_obj.division_id not in user_div_ids:
            raise HTTPException(status_code=403, detail="Accesso negato")

    if not session_obj.file_path or not os.path.exists(session_obj.file_path):
        raise HTTPException(status_code=404, detail="File sessione non trovato")

    source = read_session_packets(session_obj.file_path, max_packets=max_packets)
    packets = []
    for item in source["packets"]:
        decoded = decode_telemetry_packet(item["payload"])
        if item["timestamp"] is not None:
            decoded["recorded_at"] = item["timestamp"]
        packets.append(decoded)

    return {
        "session_id": session_obj.id,
        "file_path": session_obj.file_path,
        "storage_format": source["format"],
        "assumed_packet_size": source["assumed_packet_size"],
        "events": source.get("events", []),
        "structure": build_session_structure(source.get("events", [])),
        "packets": packets,
    }


@app.get("/sessions/{session_id}/structure")
def session_structure(
    session_id: int,
    max_records: int = 2000,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_obj = _authorize_session_access(db, user, session_id)
    source = read_session_packets(session_obj.file_path, max_packets=max_records)
    structure = build_session_structure(source.get("events", []))

    return {
        "session_id": session_obj.id,
        "file_path": session_obj.file_path,
        "storage_format": source["format"],
        "events_count": len(source.get("events", [])),
        "structure": structure,
    }


def _authorize_session_access(db: Session, user, session_id: int):
    session_obj = db.query(crud.SessionModel).filter(crud.SessionModel.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail=f"Sessione {session_id} non trovata")

    if user.role == "driver" and session_obj.driver_id != user.id:
        raise HTTPException(status_code=403, detail="Accesso negato")

    if user.role != "driver":
        user_div_ids = {d.id for d in crud.get_user_divisions(db, user.id)}
        if session_obj.division_id not in user_div_ids:
            raise HTTPException(status_code=403, detail="Accesso negato")

    if not session_obj.file_path or not os.path.exists(session_obj.file_path):
        raise HTTPException(status_code=404, detail="File sessione non trovato")

    return session_obj


def _extract_series(decoded_packets: list[dict], channel: str) -> list[float | None]:
    out = []
    for packet in decoded_packets:
        value = packet.get("channels", {}).get(channel)
        if isinstance(value, bool):
            out.append(1.0 if value else 0.0)
        elif isinstance(value, (int, float)):
            out.append(float(value))
        else:
            out.append(None)
    return out


def _sample_series(series: list[float | None], source_pos: float) -> float | None:
    if not series:
        return None
    if len(series) == 1:
        return series[0]

    left_i = int(source_pos)
    right_i = min(left_i + 1, len(series) - 1)
    frac = source_pos - left_i

    left_v = series[left_i]
    right_v = series[right_i]

    if left_v is None and right_v is None:
        return None
    if left_v is None:
        return right_v
    if right_v is None:
        return left_v

    return left_v + (right_v - left_v) * frac


def _resample_series(series: list[float | None], target_points: int) -> list[float | None]:
    if target_points <= 0:
        return []
    if not series:
        return [None] * target_points
    if len(series) == target_points:
        return series
    if len(series) == 1:
        return [series[0]] * target_points

    out = []
    max_src = len(series) - 1
    max_dst = target_points - 1
    for i in range(target_points):
        pos = (i / max_dst) * max_src if max_dst > 0 else 0
        out.append(_sample_series(series, pos))
    return out


@app.get("/sessions/compare")
def compare_sessions(
    left_id: int,
    right_id: int,
    max_packets: int = 240,
    normalize: bool = False,
    normalized_points: int = 180,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    left_session = _authorize_session_access(db, user, left_id)
    right_session = _authorize_session_access(db, user, right_id)

    left_source = read_session_packets(left_session.file_path, max_packets=max_packets)
    right_source = read_session_packets(right_session.file_path, max_packets=max_packets)

    left_packets = [decode_telemetry_packet(item["payload"]) for item in left_source["packets"]]
    right_packets = [decode_telemetry_packet(item["payload"]) for item in right_source["packets"]]

    channels = ["speed", "engine_rpm", "throttle", "brake", "gear"]

    left_series = {channel: _extract_series(left_packets, channel) for channel in channels}
    right_series = {channel: _extract_series(right_packets, channel) for channel in channels}

    aligned_len = min(len(left_packets), len(right_packets))
    if normalize:
        points = max(10, min(2000, normalized_points))
        left_series = {channel: _resample_series(left_series[channel], points) for channel in channels}
        right_series = {channel: _resample_series(right_series[channel], points) for channel in channels}
        aligned_len = points

    labels = list(range(aligned_len))

    def _avg_abs_delta(channel: str):
        deltas = []
        for i in range(aligned_len):
            left_val = left_series[channel][i]
            right_val = right_series[channel][i]
            if left_val is None or right_val is None:
                continue
            deltas.append(abs(left_val - right_val))
        if not deltas:
            return None
        return round(sum(deltas) / len(deltas), 3)

    return {
        "left": {
            "session_id": left_session.id,
            "storage_format": left_source["format"],
            "sample_count": len(left_packets),
            "series": left_series,
        },
        "right": {
            "session_id": right_session.id,
            "storage_format": right_source["format"],
            "sample_count": len(right_packets),
            "series": right_series,
        },
        "overlay": {
            "aligned_length": aligned_len,
            "normalized": normalize,
            "avg_abs_delta_speed": _avg_abs_delta("speed"),
            "avg_abs_delta_rpm": _avg_abs_delta("engine_rpm"),
            "avg_abs_delta_throttle": _avg_abs_delta("throttle"),
            "avg_abs_delta_brake": _avg_abs_delta("brake"),
        },
        "labels": labels,
    }


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    platform: Optional[str] = None

class AdminUpdateUserRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    platform: Optional[str] = None
    team_category: Optional[str] = None

@app.patch("/auth/profile")
def update_profile(
    req: UpdateProfileRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updates = {}
    if req.username:
        existing = crud.get_user_by_username(db, req.username)
        if existing and existing.id != user.id:
            raise HTTPException(status_code=400, detail="Username già in uso")
        updates["username"] = req.username
    if req.platform:
        updates["platform"] = req.platform
    if req.password:
        import bcrypt
        updates["password_hash"] = bcrypt.hashpw(
            req.password.encode(), bcrypt.gensalt()
        ).decode()
    crud.update_user(db, user.id, **updates)
    return {"message": "Profilo aggiornato"}

@app.patch("/admin/users/{user_id}/full")
def admin_update_user(
    user_id: int,
    req: AdminUpdateUserRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    target = crud.get_user_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    # Superuser modificabile solo da se stesso
    if target.is_superuser and admin.id != target.id:
        raise HTTPException(status_code=403, detail="Non puoi modificare il superuser")
    updates = {}
    if req.username:
        existing = crud.get_user_by_username(db, req.username)
        if existing and existing.id != user_id:
            raise HTTPException(status_code=400, detail="Username già in uso")
        updates["username"] = req.username
    if req.password:
        import bcrypt
        updates["password_hash"] = bcrypt.hashpw(
            req.password.encode(), bcrypt.gensalt()
        ).decode()
    if req.role is not None: updates["role"] = req.role
    if req.is_admin is not None: updates["is_admin"] = req.is_admin
    if req.is_active is not None: updates["is_active"] = req.is_active
    if req.platform is not None: updates["platform"] = req.platform
    if req.team_category is not None: updates["team_category"] = req.team_category
    crud.update_user(db, user_id, **updates)

    # Assegna porta se diventa driver e non ne ha già una
    if req.role == "driver":
        existing_port = crud.get_port_by_user(db, user_id)
        if not existing_port:
            port = crud.get_next_available_port(db)
            crud.assign_port(db, user_id, port)

    # Rimuovi porta se torna engineer
    if req.role == "engineer":
        crud.remove_port(db, user_id)

    return {"message": "Utente aggiornato"}

@app.get("/driver/status")
def driver_status(user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "driver":
        raise HTTPException(status_code=403, detail="Solo per driver")
    dp = crud.get_port_by_user(db, user.id)
    if not dp:
        return {"online": False, "engineers_connected": 0, "port": None}
    port = dp.port
    engineers = len(relay_clients.get(port, set()))
    # Online se ha ricevuto un pacchetto negli ultimi 5 secondi
    last = relay_last_packet.get(port, 0)
    online = (time.time() - last) < 5
    return {
        "online": online,
        "engineers_connected": engineers,
        "port": port
    }

class ResetPasswordRequest(BaseModel):
    username: str
    old_password: str
    new_password: str

@app.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, req.username)
    if not user or not crud.verify_password(req.old_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    import bcrypt
    new_hash = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    crud.update_user(db, user.id, password_hash=new_hash)
    return {"message": "Password aggiornata"}


def create_app(clients: dict, decoded_clients: dict, last_packet: dict, relay_srv=None, driver_names=None):
    global relay_clients, relay_decoded_clients, relay_last_packet, relay_server, relay_driver_names
    relay_clients = clients
    relay_decoded_clients = decoded_clients
    relay_last_packet = last_packet
    relay_server = relay_srv
    if driver_names is not None:
        relay_driver_names = driver_names
    return app