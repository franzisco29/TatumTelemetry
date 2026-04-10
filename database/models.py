from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    ForeignKey, Enum, Text
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class RoleEnum(str, enum.Enum):
    driver = "driver"
    engineer = "engineer"

class PlatformEnum(str, enum.Enum):
    PC = "PC"
    PS5 = "PS5"
    Xbox = "Xbox"

class TeamCategoryEnum(str, enum.Enum):
    Main = "Main"
    NextGen = "Next Gen"
    Test = "Test"

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True)
    username        = Column(String(50), unique=True, nullable=False)
    password_hash   = Column(String(255), nullable=False)
    role            = Column(Enum(RoleEnum), nullable=False)
    is_admin        = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    platform        = Column(Enum(PlatformEnum), nullable=True)
    team_category   = Column(Enum(TeamCategoryEnum), nullable=True)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    divisions       = relationship("UserDivision", back_populates="user")
    driver_port     = relationship("DriverPort", back_populates="user", uselist=False)
    sessions        = relationship("Session", back_populates="driver")
    connections     = relationship("Connection", back_populates="user")

class Division(Base):
    __tablename__ = "divisions"

    id          = Column(Integer, primary_key=True)
    name        = Column(String(100), unique=True, nullable=False)
    simulator   = Column(String(100), nullable=False)
    is_active   = Column(Boolean, default=True)

    users       = relationship("UserDivision", back_populates="division")
    sessions    = relationship("Session", back_populates="division")

class UserDivision(Base):
    __tablename__ = "user_divisions"

    user_id     = Column(Integer, ForeignKey("users.id"), primary_key=True)
    division_id = Column(Integer, ForeignKey("divisions.id"), primary_key=True)

    user        = relationship("User", back_populates="divisions")
    division    = relationship("Division", back_populates="users")

class DriverPort(Base):
    __tablename__ = "driver_ports"

    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("users.id"), unique=True)
    port        = Column(Integer, unique=True, nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    user        = relationship("User", back_populates="driver_port")

class Session(Base):
    __tablename__ = "sessions"

    id          = Column(Integer, primary_key=True)
    driver_id   = Column(Integer, ForeignKey("users.id"))
    division_id = Column(Integer, ForeignKey("divisions.id"))
    session_type = Column(String(50), nullable=True)  # Qualifica, Gara, Pratica, ecc.
    circuit     = Column(String(100), nullable=True)  # Nome del circuito
    started_at  = Column(DateTime, default=datetime.utcnow)
    ended_at    = Column(DateTime, nullable=True)
    file_path   = Column(Text, nullable=True)

    driver      = relationship("User", back_populates="sessions")
    division    = relationship("Division", back_populates="sessions")

class Connection(Base):
    __tablename__ = "connections"

    id              = Column(Integer, primary_key=True)
    user_id         = Column(Integer, ForeignKey("users.id"))
    connected_at    = Column(DateTime, default=datetime.utcnow)
    disconnected_at = Column(DateTime, nullable=True)
    driver_port     = Column(Integer, nullable=False)

    user            = relationship("User", back_populates="connections")