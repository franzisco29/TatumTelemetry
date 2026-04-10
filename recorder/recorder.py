import json
import logging
import os
import re
import struct
import time
from typing import Any, Dict, Optional

from relay.config import Config

logger = logging.getLogger(__name__)
config = Config()

NEW_FRAME_MAGIC = b"TRT1"
LEGACY_FRAME_MAGIC = b"TTLM"
NEW_FRAME_HEADER_STRUCT = struct.Struct("<4sBdI")
LEGACY_FRAME_HEADER_STRUCT = struct.Struct("<4sdI")
LEGACY_ASSUMED_PACKET_SIZE = 1349

RECORD_KIND_TELEMETRY = 1
RECORD_KIND_EVENT = 2
RECORD_KIND_SESSION = 3


def _sanitize_segment(value: str, fallback: str = "unknown") -> str:
    value = (value or fallback).strip()
    if not value:
        value = fallback
    value = value.replace(" ", "_")
    value = re.sub(r"[^A-Za-z0-9_\-]+", "_", value)
    value = re.sub(r"_+", "_", value)
    return value.strip("_") or fallback


def _decode_json_payload(payload: bytes) -> Dict[str, Any]:
    try:
        return json.loads(payload.decode("utf-8"))
    except Exception:
        return {"raw": payload.hex()}


def _encode_json_payload(data: Dict[str, Any]) -> bytes:
    return json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def iter_new_records(path: str, max_records: int = 200):
    records = []
    if max_records <= 0:
        return records

    with open(path, "rb") as handle:
        while len(records) < max_records:
            header = handle.read(NEW_FRAME_HEADER_STRUCT.size)
            if len(header) < NEW_FRAME_HEADER_STRUCT.size:
                break

            magic, kind, timestamp, length = NEW_FRAME_HEADER_STRUCT.unpack(header)
            if magic != NEW_FRAME_MAGIC:
                return []

            payload = handle.read(length)
            if len(payload) != length:
                break

            records.append({
                "kind": kind,
                "timestamp": timestamp,
                "payload": payload,
            })

    return records


def iter_legacy_packets(path: str, max_packets: int = 200):
    packets = []
    if max_packets <= 0:
        return packets

    with open(path, "rb") as handle:
        raw = handle.read(max_packets * LEGACY_ASSUMED_PACKET_SIZE)

    cursor = 0
    while cursor + LEGACY_ASSUMED_PACKET_SIZE <= len(raw) and len(packets) < max_packets:
        payload = raw[cursor: cursor + LEGACY_ASSUMED_PACKET_SIZE]
        packets.append({"timestamp": None, "payload": payload})
        cursor += LEGACY_ASSUMED_PACKET_SIZE
    return packets


def read_session_packets(path: str, max_packets: int = 200):
    records = iter_new_records(path, max_records=max_packets)
    if records:
        packets = [
            {"timestamp": record["timestamp"], "payload": record["payload"]}
            for record in records
            if record["kind"] == RECORD_KIND_TELEMETRY
        ]
        events = [
            {
                "timestamp": record["timestamp"],
                **_decode_json_payload(record["payload"]),
            }
            for record in records
            if record["kind"] in {RECORD_KIND_EVENT, RECORD_KIND_SESSION}
        ]
        return {
            "format": "trt-v1",
            "assumed_packet_size": None,
            "packets": packets,
            "events": events,
            "records": records,
        }

    legacy = iter_legacy_packets(path, max_packets=max_packets)
    return {
        "format": "legacy-fixed-size",
        "assumed_packet_size": LEGACY_ASSUMED_PACKET_SIZE,
        "packets": legacy,
        "events": [],
        "records": [],
    }


def build_session_structure(events: list[Dict[str, Any]]) -> Dict[str, Any]:
    structure: Dict[str, Any] = {
        "session": {},
        "outings": [],
    }
    active_outing: Optional[Dict[str, Any]] = None
    active_lap: Optional[Dict[str, Any]] = None

    def close_active_lap(fallback_ts: Optional[float] = None):
        nonlocal active_lap, active_outing
        if active_lap is None:
            return
        if active_lap.get("ended_at") is None:
            active_lap["ended_at"] = fallback_ts
        if active_outing is not None:
            active_outing.setdefault("laps", []).append(active_lap)
        active_lap = None

    def close_active_outing(fallback_ts: Optional[float] = None):
        nonlocal active_outing
        if active_outing is None:
            return
        close_active_lap(fallback_ts)
        if active_outing.get("ended_at") is None:
            active_outing["ended_at"] = fallback_ts
        structure["outings"].append(active_outing)
        active_outing = None

    for event in events:
        event_type = event.get("event_type")
        payload = event.get("payload", {}) or {}
        timestamp = event.get("timestamp")
        if not event_type:
            continue

        if event_type == "session_open":
            structure["session"].update(payload)
            structure["session"]["started_at"] = timestamp
            continue

        if event_type == "session_start":
            structure["session"].update(payload)
            structure["session"]["started_at"] = timestamp
            continue

        if event_type == "session_metadata_update":
            structure["session"].update(payload)
            continue

        if event_type == "session_end":
            structure["session"]["ended_at"] = payload.get("ended_at", timestamp)
            close_active_outing(timestamp)
            continue

        if event_type == "outing_start":
            close_active_outing(timestamp)
            active_outing = {
                "outing_index": payload.get("outing_index", len(structure["outings"]) + 1),
                "started_at": payload.get("started_at", timestamp),
                "ended_at": None,
                "reason_start": payload.get("reason_start"),
                "reason_end": None,
                "laps": [],
            }
            continue

        if event_type == "lap_start":
            if active_outing is None:
                active_outing = {
                    "outing_index": len(structure["outings"]) + 1,
                    "started_at": timestamp,
                    "ended_at": None,
                    "reason_start": "inferred_from_lap",
                    "reason_end": None,
                    "laps": [],
                }
            close_active_lap(timestamp)
            active_lap = {
                "lap_number": payload.get("lap_number"),
                "kind": payload.get("kind"),
                "started_at": payload.get("started_at", timestamp),
                "ended_at": None,
                "current_lap_invalid": payload.get("current_lap_invalid"),
                "last_lap_time_ms": payload.get("last_lap_time_ms"),
                "sector1_time_ms": payload.get("sector1_time_ms"),
                "sector2_time_ms": payload.get("sector2_time_ms"),
                "reason": None,
            }
            continue

        if event_type == "lap_end":
            if active_lap is None:
                active_lap = {
                    "lap_number": payload.get("lap_number"),
                    "kind": payload.get("kind"),
                    "started_at": payload.get("started_at"),
                    "ended_at": payload.get("ended_at", timestamp),
                    "current_lap_invalid": payload.get("current_lap_invalid"),
                    "last_lap_time_ms": payload.get("last_lap_time_ms"),
                    "sector1_time_ms": payload.get("sector1_time_ms"),
                    "sector2_time_ms": payload.get("sector2_time_ms"),
                    "reason": payload.get("reason"),
                }
                if active_outing is None:
                    active_outing = {
                        "outing_index": len(structure["outings"]) + 1,
                        "started_at": payload.get("started_at", timestamp),
                        "ended_at": None,
                        "reason_start": "inferred_from_lap",
                        "reason_end": None,
                        "laps": [],
                    }
            else:
                active_lap.update({
                    "ended_at": payload.get("ended_at", timestamp),
                    "current_lap_invalid": payload.get("current_lap_invalid", active_lap.get("current_lap_invalid")),
                    "last_lap_time_ms": payload.get("last_lap_time_ms", active_lap.get("last_lap_time_ms")),
                    "sector1_time_ms": payload.get("sector1_time_ms", active_lap.get("sector1_time_ms")),
                    "sector2_time_ms": payload.get("sector2_time_ms", active_lap.get("sector2_time_ms")),
                    "reason": payload.get("reason"),
                })
            close_active_lap(timestamp)
            continue

        if event_type == "outing_end":
            if active_outing is None:
                active_outing = {
                    "outing_index": payload.get("outing_index", len(structure["outings"]) + 1),
                    "started_at": payload.get("started_at"),
                    "ended_at": payload.get("ended_at", timestamp),
                    "reason_start": payload.get("reason_start"),
                    "reason_end": payload.get("reason_end"),
                    "laps": [],
                }
            else:
                active_outing["ended_at"] = payload.get("ended_at", timestamp)
                active_outing["reason_end"] = payload.get("reason_end")
            close_active_outing(timestamp)

    if active_lap is not None:
        close_active_lap()
    if active_outing is not None:
        close_active_outing()

    structure["session"]["outings_count"] = len(structure["outings"])
    structure["session"]["laps_count"] = sum(len(outing.get("laps", [])) for outing in structure["outings"])
    return structure


class SessionRecorder:
    def __init__(
        self,
        driver_name: str,
        circuit: str = None,
        session_type: str = None,
        session_uid: Optional[int] = None,
    ):
        self.driver_name = _sanitize_segment(driver_name)
        self.circuit = _sanitize_segment(circuit or "unknown")
        self.session_type = _sanitize_segment(session_type or "unknown")
        self.session_uid = session_uid
        self.file = None
        self.path = None
        self._open_file()

    def _open_file(self):
        os.makedirs(config.SESSIONS_DIR, exist_ok=True)
        ts = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{self.driver_name}_{self.circuit}_{self.session_type}_{ts}.trt"
        self.path = os.path.join(config.SESSIONS_DIR, filename)
        self.file = open(self.path, "wb")
        self.write_event("session_open", {
            "driver_name": self.driver_name,
            "circuit": self.circuit,
            "session_type": self.session_type,
            "session_uid": self.session_uid,
        })
        logger.info("Sessione aperta: %s", self.path)

    def _write_record(self, kind: int, payload: bytes, timestamp: Optional[float] = None):
        if not self.file:
            return
        current_timestamp = time.time() if timestamp is None else timestamp
        header = NEW_FRAME_HEADER_STRUCT.pack(NEW_FRAME_MAGIC, kind, current_timestamp, len(payload))
        self.file.write(header)
        self.file.write(payload)

    def write_packet(self, data: bytes, timestamp: Optional[float] = None):
        self._write_record(RECORD_KIND_TELEMETRY, data, timestamp=timestamp)

    def write_event(self, event_type: str, payload: Optional[Dict[str, Any]] = None, timestamp: Optional[float] = None):
        event_payload = {
            "event_type": event_type,
            "payload": payload or {},
        }
        self._write_record(RECORD_KIND_EVENT, _encode_json_payload(event_payload), timestamp=timestamp)

    def write_session_meta(self, payload: Dict[str, Any], timestamp: Optional[float] = None):
        self._write_record(RECORD_KIND_SESSION, _encode_json_payload(payload), timestamp=timestamp)

    def close(self):
        if self.file:
            try:
                self.write_event("session_close", {
                    "driver_name": self.driver_name,
                    "circuit": self.circuit,
                    "session_type": self.session_type,
                    "session_uid": self.session_uid,
                })
            finally:
                self.file.close()
                self.file = None
                logger.info("Sessione chiusa: %s_%s_%s", self.driver_name, self.circuit, self.session_type)