import asyncio
import json
import logging
import time
from typing import Callable, Dict, Optional, Set

from database import crud
from relay.config import Config
from relay.decoder import decode_telemetry_packet
from recorder.recorder import SessionRecorder

logger = logging.getLogger(__name__)

SESSION_GAP_SECONDS = 30
MOVING_SPEED_THRESHOLD = 15
IDLE_OUTING_END_SECONDS = 8


class AutoSessionTracker:
    def __init__(self, server: "F1RelayServer", port: int):
        self.server = server
        self.port = port
        self.active_session: Optional[Dict] = None
        self.active_outing: Optional[Dict] = None
        self.active_lap: Optional[Dict] = None
        self.last_packet_ts: float = 0.0
        self.last_motion_ts: Optional[float] = None
        self.last_lap_num: Optional[int] = None
        self.outing_counter: int = 0
        self.last_meta: Dict[str, Optional[str]] = {
            "session_uid": None,
            "track_name": None,
            "session_type_name": None,
        }

    def _driver_name(self) -> str:
        return self.server.resolve_driver_name(self.port)

    def _close_db_session(self):
        if not self.active_session or not self.active_session.get("db_session_id"):
            return

        db = self.server.db_session_factory()
        try:
            crud.close_session(
                db,
                self.active_session["db_session_id"],
                file_path=self.active_session["file_path"],
                session_type=self.active_session.get("session_type"),
                circuit=self.active_session.get("circuit"),
            )
        finally:
            db.close()

    def _create_db_session(self, circuit: str, session_type: str, session_uid: Optional[int]):
        if not self.server.db_session_factory:
            return None

        db = self.server.db_session_factory()
        try:
            driver_name = self._driver_name()
            user = crud.get_user_by_username(db, driver_name)
            if not user:
                return None

            division_id = None
            divisions = crud.get_user_divisions(db, user.id)
            if divisions:
                division_id = divisions[0].id

            session = crud.create_session(
                db,
                driver_id=user.id,
                division_id=division_id,
                session_type=session_type,
                circuit=circuit,
            )
            return session.id
        finally:
            db.close()

    def _update_db_session_metadata(self, circuit: str, session_type: str):
        if not self.server.db_session_factory or not self.active_session or not self.active_session.get("db_session_id"):
            return

        db = self.server.db_session_factory()
        try:
            session = db.query(crud.SessionModel).filter(
                crud.SessionModel.id == self.active_session["db_session_id"]
            ).first()
            if session:
                session.circuit = circuit
                session.session_type = session_type
                db.commit()
        finally:
            db.close()

    def _start_session(self, decoded: Dict, timestamp: float, reason: str):
        header = decoded.get("header", {})
        session_meta = decoded.get("session", {})
        circuit = session_meta.get("track_name") or self.last_meta.get("track_name") or "Unknown"
        session_type = session_meta.get("session_type_name") or self.last_meta.get("session_type_name") or "Unknown"
        session_uid = header.get("session_uid")

        if self.active_session:
            self._close_session(timestamp, "session_rotated")

        recorder = SessionRecorder(
            driver_name=self._driver_name(),
            circuit=circuit,
            session_type=session_type,
            session_uid=session_uid,
        )

        db_session_id = self._create_db_session(circuit, session_type, session_uid)
        self.active_session = {
            "recorder": recorder,
            "file_path": recorder.path,
            "driver_name": self._driver_name(),
            "circuit": circuit,
            "session_type": session_type,
            "session_uid": session_uid,
            "db_session_id": db_session_id,
            "started_at": timestamp,
            "reason": reason,
        }
        self.active_outing = None
        self.active_lap = None
        self.last_lap_num = None
        self.last_motion_ts = None
        self.outing_counter = 0
        recorder.write_session_meta({
            "port": self.port,
            "driver_name": self._driver_name(),
            "circuit": circuit,
            "session_type": session_type,
            "session_uid": session_uid,
            "reason": reason,
        }, timestamp=timestamp)
        recorder.write_event("session_start", {
            "port": self.port,
            "driver_name": self._driver_name(),
            "circuit": circuit,
            "session_type": session_type,
            "session_uid": session_uid,
            "reason": reason,
        }, timestamp=timestamp)
        logger.info("Sessione automatica avviata su porta %s: %s / %s", self.port, circuit, session_type)

    def _close_lap(self, timestamp: float, reason: str, force_kind: Optional[str] = None):
        if not self.active_lap:
            return

        final_lap = dict(self.active_lap)
        final_lap["ended_at"] = timestamp
        final_lap["reason"] = reason
        if force_kind:
            final_lap["kind"] = force_kind

        if self.active_session:
            self.active_session["recorder"].write_event("lap_end", final_lap, timestamp=timestamp)
        if self.active_outing is not None:
            self.active_outing.setdefault("laps", []).append(final_lap)
        self.active_lap = None

    def _start_lap(self, lap_data: Dict, timestamp: float):
        if self.active_outing is None:
            self._start_outing(timestamp, "lap_detected")

        lap_kind = "out_lap" if not self.active_outing.get("laps") else "push_lap"
        self.active_lap = {
            "kind": lap_kind,
            "lap_number": lap_data.get("current_lap_num"),
            "started_at": timestamp,
            "last_seen_at": timestamp,
            "last_lap_time_ms": lap_data.get("last_lap_time_ms"),
            "current_lap_time_ms": lap_data.get("current_lap_time_ms"),
            "sector1_time_ms": lap_data.get("sector1_time_ms"),
            "sector2_time_ms": lap_data.get("sector2_time_ms"),
            "lap_distance": lap_data.get("lap_distance"),
            "total_distance": lap_data.get("total_distance"),
            "pit_status": lap_data.get("pit_status"),
            "current_lap_invalid": lap_data.get("current_lap_invalid"),
            "sector": lap_data.get("sector"),
        }
        if self.active_session:
            self.active_session["recorder"].write_event("lap_start", self.active_lap, timestamp=timestamp)

    def _update_lap(self, lap_data: Dict, timestamp: float):
        if not self.active_lap:
            self._start_lap(lap_data, timestamp)
            return

        self.active_lap.update({
            "last_seen_at": timestamp,
            "last_lap_time_ms": lap_data.get("last_lap_time_ms"),
            "current_lap_time_ms": lap_data.get("current_lap_time_ms"),
            "sector1_time_ms": lap_data.get("sector1_time_ms"),
            "sector2_time_ms": lap_data.get("sector2_time_ms"),
            "lap_distance": lap_data.get("lap_distance"),
            "total_distance": lap_data.get("total_distance"),
            "pit_status": lap_data.get("pit_status"),
            "current_lap_invalid": lap_data.get("current_lap_invalid"),
            "sector": lap_data.get("sector"),
        })

    def _start_outing(self, timestamp: float, reason: str):
        if self.active_session is None or self.active_outing is not None:
            return

        self.outing_counter += 1

        self.active_outing = {
            "outing_index": self.outing_counter,
            "started_at": timestamp,
            "reason_start": reason,
            "laps": [],
        }
        if self.active_session:
            self.active_session["recorder"].write_event("outing_start", self.active_outing, timestamp=timestamp)

    def _close_outing(self, timestamp: float, reason: str):
        if self.active_outing is None:
            return

        if self.active_lap is not None:
            force_kind = "in_lap" if self.active_lap.get("kind") != "out_lap" else None
            self._close_lap(timestamp, reason, force_kind=force_kind)

        closing_outing = dict(self.active_outing)
        closing_outing["ended_at"] = timestamp
        closing_outing["reason_end"] = reason
        if self.active_session:
            self.active_session["recorder"].write_event("outing_end", closing_outing, timestamp=timestamp)
        self.active_outing = None

    def _close_session(self, timestamp: float, reason: str):
        if self.active_session is None:
            return

        if self.active_outing is not None:
            self._close_outing(timestamp, reason)
        if self.active_session and self.active_lap is not None:
            self._close_lap(timestamp, reason)

        self.active_session["recorder"].write_event("session_end", {
            "reason": reason,
            "ended_at": timestamp,
        }, timestamp=timestamp)
        self.active_session["recorder"].close()
        self._close_db_session()
        logger.info("Sessione automatica chiusa su porta %s (%s)", self.port, reason)
        self.active_session = None
        self.active_lap = None
        self.active_outing = None
        self.last_lap_num = None

    def _ensure_session(self, decoded: Dict, timestamp: float, reason: str = "auto"):
        header = decoded.get("header", {})
        session_meta = decoded.get("session", {})
        session_uid = header.get("session_uid")
        circuit = session_meta.get("track_name") or self.last_meta.get("track_name") or "Unknown"
        session_type = session_meta.get("session_type_name") or self.last_meta.get("session_type_name") or "Unknown"

        if self.active_session is None:
            self._start_session(decoded, timestamp, reason)
            return

        active_uid = self.active_session.get("session_uid")
        active_circuit = self.active_session.get("circuit")
        active_type = self.active_session.get("session_type")

        if session_uid is not None and session_uid == active_uid:
            if (active_circuit in {None, "Unknown", "unknown"} or active_type in {None, "Unknown", "unknown"}) and (
                circuit not in {None, "Unknown", "unknown"} or session_type not in {None, "Unknown", "unknown"}
            ):
                self.active_session["circuit"] = circuit
                self.active_session["session_type"] = session_type
                self.active_session["recorder"].circuit = circuit
                self.active_session["recorder"].session_type = session_type
                self._update_db_session_metadata(circuit, session_type)
                self.active_session["recorder"].write_event("session_metadata_update", {
                    "circuit": circuit,
                    "session_type": session_type,
                    "session_uid": session_uid,
                }, timestamp=timestamp)
            return

        if session_uid is not None and (session_uid != active_uid or circuit != active_circuit or session_type != active_type):
            self._close_session(timestamp, "metadata_change")
            self._start_session(decoded, timestamp, reason)

    def ingest(self, raw_data: bytes, decoded: Dict, timestamp: float):
        previous_packet_ts = self.last_packet_ts
        if self.active_session and previous_packet_ts and (timestamp - previous_packet_ts) > SESSION_GAP_SECONDS:
            self._close_session(previous_packet_ts, "gap_timeout")

        self.last_packet_ts = timestamp

        packet_id = decoded.get("packet_id")
        if packet_id == 1:
            self.last_meta = {
                "session_uid": decoded.get("header", {}).get("session_uid"),
                "track_name": decoded.get("session", {}).get("track_name"),
                "session_type_name": decoded.get("session", {}).get("session_type_name"),
            }
            self._ensure_session(decoded, timestamp, reason="session_packet")
            if self.active_session:
                self.active_session["recorder"].write_packet(raw_data, timestamp=timestamp)
                self.active_session["recorder"].write_session_meta({
                    "event": "session_metadata",
                    "session": decoded.get("session", {}),
                    "header": decoded.get("header", {}),
                }, timestamp=timestamp)
            return

        if self.active_session is None:
            self._ensure_session(decoded, timestamp, reason="auto")

        if self.active_session is None:
            return

        if self.active_session and self.active_session["recorder"]:
            self.active_session["recorder"].write_packet(raw_data, timestamp=timestamp)

        if packet_id == 2:
            lap_data = decoded.get("lap", {})
            lap_num = lap_data.get("current_lap_num")
            speed = decoded.get("channels", {}).get("speed") or 0

            if speed >= MOVING_SPEED_THRESHOLD:
                self.last_motion_ts = timestamp
                if self.active_outing is None:
                    self._start_outing(timestamp, "movement_detected")

            if self.active_outing is not None and lap_data.get("pit_status", 0) != 0:
                if self.last_motion_ts is None or (timestamp - self.last_motion_ts) >= 2:
                    self._close_outing(timestamp, "pit_status")

            if self.active_outing is not None and self.last_motion_ts is not None:
                if (timestamp - self.last_motion_ts) >= IDLE_OUTING_END_SECONDS:
                    self._close_outing(timestamp, "idle")

            if lap_num is not None:
                if self.last_lap_num is None:
                    self.last_lap_num = lap_num
                    self._start_lap(lap_data, timestamp)
                elif lap_num != self.last_lap_num:
                    self._close_lap(timestamp, "lap_number_changed")
                    self.last_lap_num = lap_num
                    self._start_lap(lap_data, timestamp)
                else:
                    self._update_lap(lap_data, timestamp)

        elif packet_id == 6:
            speed = decoded.get("channels", {}).get("speed") or 0
            if speed >= MOVING_SPEED_THRESHOLD:
                self.last_motion_ts = timestamp
                if self.active_outing is None:
                    self._start_outing(timestamp, "telemetry_motion")


class F1RelayServer:
    def __init__(
        self,
        config: Config,
        db_session_factory: Optional[Callable[[], object]] = None,
        driver_name_resolver: Optional[Callable[[int], str]] = None,
    ):
        self.config = config
        self.db_session_factory = db_session_factory
        self.driver_name_resolver = driver_name_resolver or (lambda port: f"port_{port}")
        self.websocket_clients: Dict[int, Set] = {}
        self.decoded_websocket_clients: Dict[int, Set] = {}
        self.last_packet: Dict[int, float] = {}
        self.trackers: Dict[int, AutoSessionTracker] = {}

    def resolve_driver_name(self, port: int) -> str:
        try:
            return self.driver_name_resolver(port) or f"port_{port}"
        except Exception:
            return f"port_{port}"

    async def start(self):
        loop = asyncio.get_event_loop()
        for i in range(self.config.MAX_PILOTS):
            port = self.config.BASE_PORT + i
            self.websocket_clients[port] = set()
            self.decoded_websocket_clients[port] = set()
            self.last_packet[port] = 0
            self.trackers[port] = AutoSessionTracker(self, port)
            await loop.create_datagram_endpoint(
                lambda p=port: F1UDPProtocol(
                    p,
                    self,
                ),
                local_addr=("0.0.0.0", port)
            )
            logger.info(f"Relay attivo sulla porta {port}")


class F1UDPProtocol(asyncio.DatagramProtocol):
    def __init__(self, port: int, server: F1RelayServer):
        self.port = port
        self.server = server
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data: bytes, addr: tuple):
        timestamp = time.time()
        self.server.last_packet[self.port] = timestamp

        decoded = decode_telemetry_packet(data)
        tracker = self.server.trackers.get(self.port)
        if tracker is not None:
            try:
                tracker.ingest(data, decoded, timestamp)
            except Exception as exc:
                logger.warning("Errore tracker porta %s: %s", self.port, exc)

        clients = self.server.websocket_clients.get(self.port, set())
        decoded_clients = self.server.decoded_websocket_clients.get(self.port, set())
        dead = set()
        for ws in clients:
            try:
                asyncio.ensure_future(ws.send_bytes(data))
            except Exception as exc:
                logger.warning(f"Client disconnesso: {exc}")
                dead.add(ws)
        clients -= dead

        if decoded_clients:
            dead_decoded = set()
            for ws in decoded_clients:
                try:
                    asyncio.ensure_future(ws.send_text(json.dumps(decoded)))
                except Exception as exc:
                    logger.warning(f"Client disconnesso (decoded): {exc}")
                    dead_decoded.add(ws)
            decoded_clients -= dead_decoded