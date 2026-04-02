import bcrypt
from sqlalchemy.orm import Session
from database.models import User, Division, UserDivision, DriverPort, Session as SessionModel, Connection
from datetime import datetime

# ── USERS ──────────────────────────────────────────

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_all_users(db: Session):
    return db.query(User).all()

def create_user(db: Session, username: str, password: str, role: str,
                is_admin: bool = False, platform: str = None,
                team_category: str = None):
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = User(
        username=username,
        password_hash=hashed,
        role=role,
        is_admin=is_admin,
        platform=platform,
        team_category=team_category
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def update_user(db: Session, user_id: int, **kwargs):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    for key, value in kwargs.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)
    if user:
        db.delete(user)
        db.commit()

# ── DIVISIONS ──────────────────────────────────────

def get_all_divisions(db: Session):
    return db.query(Division).all()

def get_division_by_id(db: Session, division_id: int):
    return db.query(Division).filter(Division.id == division_id).first()

def create_division(db: Session, name: str, simulator: str):
    division = Division(name=name, simulator=simulator)
    db.add(division)
    db.commit()
    db.refresh(division)
    return division

def assign_user_to_division(db: Session, user_id: int, division_id: int):
    existing = db.query(UserDivision).filter_by(
        user_id=user_id, division_id=division_id
    ).first()
    if not existing:
        ud = UserDivision(user_id=user_id, division_id=division_id)
        db.add(ud)
        db.commit()

def get_user_divisions(db: Session, user_id: int):
    return db.query(Division).join(UserDivision).filter(
        UserDivision.user_id == user_id
    ).all()

def get_drivers_in_division(db: Session, division_id: int):
    return db.query(User).join(UserDivision).filter(
        UserDivision.division_id == division_id,
        User.role == "driver",
        User.is_active == True
    ).all()

# ── DRIVER PORTS ───────────────────────────────────

def assign_port(db: Session, user_id: int, port: int):
    dp = DriverPort(user_id=user_id, port=port)
    db.add(dp)
    db.commit()
    db.refresh(dp)
    return dp

def get_port_by_user(db: Session, user_id: int):
    return db.query(DriverPort).filter(DriverPort.user_id == user_id).first()

def get_next_available_port(db: Session, base_port: int = 20001) -> int:
    used = {dp.port for dp in db.query(DriverPort).all()}
    port = base_port
    while port in used:
        port += 1
    return port

# ── SESSIONS ───────────────────────────────────────

def create_session(db: Session, driver_id: int, division_id: int, file_path: str = None):
    session = SessionModel(
        driver_id=driver_id,
        division_id=division_id,
        file_path=file_path
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def close_session(db: Session, session_id: int, file_path: str = None):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if session:
        session.ended_at = datetime.utcnow()
        if file_path:
            session.file_path = file_path
        db.commit()

def get_sessions_by_driver(db: Session, driver_id: int):
    return db.query(SessionModel).filter(SessionModel.driver_id == driver_id).all()

def get_sessions_by_division(db: Session, division_id: int):
    return db.query(SessionModel).filter(SessionModel.division_id == division_id).all()

# ── CONNECTIONS ────────────────────────────────────

def log_connection(db: Session, user_id: int, driver_port: int):
    conn = Connection(user_id=user_id, driver_port=driver_port)
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn

def close_connection(db: Session, connection_id: int):
    conn = db.query(Connection).filter(Connection.id == connection_id).first()
    if conn:
        conn.disconnected_at = datetime.utcnow()
        db.commit()