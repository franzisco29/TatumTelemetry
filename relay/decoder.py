import struct
import time
from typing import Any, Dict


HEADER_STRUCT = struct.Struct("<HBBBBBQfIIBB")
SESSION_PACKET_ID = 1
LAP_PACKET_ID = 2
CAR_TELEMETRY_PACKET_ID = 6

SESSION_PACKET_PREFIX_STRUCT = struct.Struct("<BbbBHBbBHHBBBBBB")
LAP_DATA_STRUCT = struct.Struct("<IIHBHBIIfff" + ("B" * 15) + "HHB")
CAR_TELEMETRY_STRUCT = struct.Struct("<HfffBbHBB4H4B4BH4f4B")

TRACK_NAMES = {
    0: "Melbourne",
    1: "Paul Ricard",
    2: "Shanghai",
    3: "Sakhir",
    4: "Catalunya",
    5: "Monaco",
    6: "Montreal",
    7: "Silverstone",
    8: "Hockenheim",
    9: "Hungaroring",
    10: "Spa",
    11: "Monza",
    12: "Singapore",
    13: "Suzuka",
    14: "Abu Dhabi",
    15: "Texas",
    16: "Brazil",
    17: "Austria",
    18: "Sochi",
    19: "Mexico",
    20: "Baku",
    21: "Sakhir Short",
    22: "Silverstone Short",
    23: "Texas Short",
    24: "Suzuka Short",
    25: "Hanoi",
    26: "Zandvoort",
    27: "Imola",
    28: "Jeddah",
    29: "Miami",
    30: "Las Vegas",
    31: "Losail",
    32: "Jeddah Short",
    33: "Portimao",
    34: "Shanghai Short",
    35: "COTA",
    36: "COTA Short",
    37: "Qatar Short",
    38: "Las Vegas Short",
    39: "Imola Short",
    40: "Catalunya Short",
}

SESSION_TYPE_NAMES = {
    0: "unknown",
    1: "practice_1",
    2: "practice_2",
    3: "practice_3",
    4: "short_qualifying",
    5: "qualifying",
    6: "one_shot_qualifying",
    7: "race",
    8: "race_2",
    9: "time_trial",
}


def _default_payload(data: bytes) -> Dict[str, Any]:
    return {
        "type": "unknown",
        "timestamp": time.time(),
        "packet_length": len(data),
        "packet_id": None,
        "channels": {
            "speed": None,
            "throttle": None,
            "brake": None,
            "steer": None,
            "gear": None,
            "engine_rpm": None,
            "drs_active": None,
            "rev_lights_percent": None,
            "engine_temperature": None,
            "brake_temperature_fl": None,
            "brake_temperature_fr": None,
            "brake_temperature_rl": None,
            "brake_temperature_rr": None,
            "tyre_temperature_fl": None,
            "tyre_temperature_fr": None,
            "tyre_temperature_rl": None,
            "tyre_temperature_rr": None,
            "tyre_pressure_fl": None,
            "tyre_pressure_fr": None,
            "tyre_pressure_rl": None,
            "tyre_pressure_rr": None,
        },
    }


def _session_type_name(session_type: int) -> str:
    return SESSION_TYPE_NAMES.get(session_type, f"session_{session_type}")


def _track_name(track_id: int) -> str:
    return TRACK_NAMES.get(track_id, f"track_{track_id}")


def _decode_session_packet(data: bytes, payload: Dict[str, Any]) -> Dict[str, Any]:
    packet_base = HEADER_STRUCT.size
    if len(data) < packet_base + SESSION_PACKET_PREFIX_STRUCT.size:
        payload["type"] = "session-truncated"
        return payload

    session_prefix = SESSION_PACKET_PREFIX_STRUCT.unpack_from(data, packet_base)
    (
        weather,
        track_temperature,
        air_temperature,
        total_laps,
        track_length,
        session_type,
        track_id,
        formula,
        session_time_left,
        session_duration,
        pit_speed_limit,
        game_paused,
        is_spectating,
        spectator_car_index,
        sli_pro_native_support,
        num_marshal_zones,
    ) = session_prefix

    payload["type"] = "session"
    payload["session"] = {
        "weather": int(weather),
        "track_temperature": int(track_temperature),
        "air_temperature": int(air_temperature),
        "total_laps": int(total_laps),
        "track_length": int(track_length),
        "session_type_id": int(session_type),
        "session_type_name": _session_type_name(int(session_type)),
        "track_id": int(track_id),
        "track_name": _track_name(int(track_id)),
        "formula": int(formula),
        "session_time_left": int(session_time_left),
        "session_duration": int(session_duration),
        "pit_speed_limit": int(pit_speed_limit),
        "game_paused": bool(game_paused),
        "is_spectating": bool(is_spectating),
        "spectator_car_index": int(spectator_car_index),
        "sli_pro_native_support": bool(sli_pro_native_support),
        "num_marshal_zones": int(num_marshal_zones),
    }
    payload["channels"].update({
        "track_id": int(track_id),
        "track_name": _track_name(int(track_id)),
        "session_type_id": int(session_type),
        "session_type_name": _session_type_name(int(session_type)),
        "track_length": int(track_length),
    })
    return payload


def _decode_lap_packet(data: bytes, payload: Dict[str, Any]) -> Dict[str, Any]:
    packet_base = HEADER_STRUCT.size
    player_car_index = payload.get("header", {}).get("player_car_index", 0)
    required_size = packet_base + (player_car_index + 1) * LAP_DATA_STRUCT.size + 2
    if len(data) < required_size:
        payload["type"] = "lap-truncated"
        return payload

    offset = packet_base + player_car_index * LAP_DATA_STRUCT.size
    lap = LAP_DATA_STRUCT.unpack_from(data, offset)
    (
        last_lap_time_in_ms,
        current_lap_time_in_ms,
        sector1_time_in_ms,
        sector1_time_minutes,
        sector2_time_in_ms,
        sector2_time_minutes,
        delta_to_car_in_front_in_ms,
        delta_to_race_leader_in_ms,
        lap_distance,
        total_distance,
        safety_car_delta,
        car_position,
        current_lap_num,
        pit_status,
        num_pit_stops,
        sector,
        current_lap_invalid,
        penalties,
        total_warnings,
        corner_cutting_warnings,
        num_unserved_drive_through_pens,
        num_unserved_stop_go_pens,
        grid_position,
        driver_status,
        result_status,
        pit_lane_timer_active,
        pit_lane_time_in_lane_in_ms,
        pit_stop_timer_in_ms,
        pit_stop_should_serve_pen,
    ) = lap

    lap_info = {
        "last_lap_time_ms": int(last_lap_time_in_ms),
        "current_lap_time_ms": int(current_lap_time_in_ms),
        "sector1_time_ms": int(sector1_time_in_ms),
        "sector1_time_minutes": int(sector1_time_minutes),
        "sector2_time_ms": int(sector2_time_in_ms),
        "sector2_time_minutes": int(sector2_time_minutes),
        "delta_to_car_in_front_ms": int(delta_to_car_in_front_in_ms),
        "delta_to_race_leader_ms": int(delta_to_race_leader_in_ms),
        "lap_distance": round(float(lap_distance), 3),
        "total_distance": round(float(total_distance), 3),
        "safety_car_delta": round(float(safety_car_delta), 3),
        "car_position": int(car_position),
        "current_lap_num": int(current_lap_num),
        "pit_status": int(pit_status),
        "num_pit_stops": int(num_pit_stops),
        "sector": int(sector),
        "current_lap_invalid": bool(current_lap_invalid),
        "penalties": int(penalties),
        "total_warnings": int(total_warnings),
        "corner_cutting_warnings": int(corner_cutting_warnings),
        "num_unserved_drive_through_pens": int(num_unserved_drive_through_pens),
        "num_unserved_stop_go_pens": int(num_unserved_stop_go_pens),
        "grid_position": int(grid_position),
        "driver_status": int(driver_status),
        "result_status": int(result_status),
        "pit_lane_timer_active": bool(pit_lane_timer_active),
        "pit_lane_time_in_lane_ms": int(pit_lane_time_in_lane_in_ms),
        "pit_stop_timer_ms": int(pit_stop_timer_in_ms),
        "pit_stop_should_serve_pen": bool(pit_stop_should_serve_pen),
    }

    payload["type"] = "lap"
    payload["lap"] = lap_info
    payload["channels"].update({
        "lap_distance": lap_info["lap_distance"],
        "total_distance": lap_info["total_distance"],
        "current_lap_num": lap_info["current_lap_num"],
        "pit_status": lap_info["pit_status"],
        "sector": lap_info["sector"],
        "current_lap_invalid": lap_info["current_lap_invalid"],
        "driver_status": lap_info["driver_status"],
        "result_status": lap_info["result_status"],
    })
    return payload


def decode_telemetry_packet(data: bytes) -> Dict[str, Any]:
    """Decodifica base pacchetti F1 UDP con focus su Car Telemetry (packet id 6)."""
    payload = _default_payload(data)
    if not data or len(data) < HEADER_STRUCT.size:
        payload["type"] = "empty"
        return payload

    header = HEADER_STRUCT.unpack_from(data, 0)
    (
        packet_format,
        game_year,
        game_major_version,
        game_minor_version,
        packet_version,
        packet_id,
        session_uid,
        session_time,
        frame_identifier,
        overall_frame_identifier,
        player_car_index,
        secondary_player_car_index,
    ) = header

    payload["packet_id"] = packet_id
    payload["header"] = {
        "packet_format": packet_format,
        "game_year": game_year,
        "game_major_version": game_major_version,
        "game_minor_version": game_minor_version,
        "packet_version": packet_version,
        "session_uid": session_uid,
        "session_time": session_time,
        "frame_identifier": frame_identifier,
        "overall_frame_identifier": overall_frame_identifier,
        "player_car_index": player_car_index,
        "secondary_player_car_index": secondary_player_car_index,
    }

    if packet_id == SESSION_PACKET_ID:
        return _decode_session_packet(data, payload)

    if packet_id == LAP_PACKET_ID:
        return _decode_lap_packet(data, payload)

    if packet_id != CAR_TELEMETRY_PACKET_ID:
        payload["type"] = "header-only"
        return payload

    car_count = 22
    car_size = CAR_TELEMETRY_STRUCT.size
    packet_base = HEADER_STRUCT.size
    if player_car_index >= car_count:
        payload["type"] = "car-telemetry-invalid-index"
        return payload

    required_size = packet_base + (player_car_index + 1) * car_size
    if len(data) < required_size:
        payload["type"] = "car-telemetry-truncated"
        return payload

    offset = packet_base + player_car_index * car_size
    car = CAR_TELEMETRY_STRUCT.unpack_from(data, offset)
    (
        speed,
        throttle,
        steer,
        brake,
        clutch,
        gear,
        engine_rpm,
        drs,
        rev_lights_percent,
        brake_temp_rl,
        brake_temp_rr,
        brake_temp_fl,
        brake_temp_fr,
        tyre_surface_rl,
        tyre_surface_rr,
        tyre_surface_fl,
        tyre_surface_fr,
        tyre_inner_rl,
        tyre_inner_rr,
        tyre_inner_fl,
        tyre_inner_fr,
        engine_temperature,
        tyre_pressure_rl,
        tyre_pressure_rr,
        tyre_pressure_fl,
        tyre_pressure_fr,
        surface_type_rl,
        surface_type_rr,
        surface_type_fl,
        surface_type_fr,
    ) = car

    payload["type"] = "car-telemetry"
    payload["channels"] = {
        "speed": int(speed),
        "throttle": float(throttle),
        "brake": float(brake),
        "steer": float(steer),
        "clutch": int(clutch),
        "gear": int(gear),
        "engine_rpm": int(engine_rpm),
        "drs_active": bool(drs),
        "rev_lights_percent": int(rev_lights_percent),
        "engine_temperature": int(engine_temperature),
        "brake_temperature_fl": int(brake_temp_fl),
        "brake_temperature_fr": int(brake_temp_fr),
        "brake_temperature_rl": int(brake_temp_rl),
        "brake_temperature_rr": int(brake_temp_rr),
        "tyre_temperature_fl": int(tyre_surface_fl),
        "tyre_temperature_fr": int(tyre_surface_fr),
        "tyre_temperature_rl": int(tyre_surface_rl),
        "tyre_temperature_rr": int(tyre_surface_rr),
        "tyre_inner_temperature_fl": int(tyre_inner_fl),
        "tyre_inner_temperature_fr": int(tyre_inner_fr),
        "tyre_inner_temperature_rl": int(tyre_inner_rl),
        "tyre_inner_temperature_rr": int(tyre_inner_rr),
        "tyre_pressure_fl": round(float(tyre_pressure_fl), 3),
        "tyre_pressure_fr": round(float(tyre_pressure_fr), 3),
        "tyre_pressure_rl": round(float(tyre_pressure_rl), 3),
        "tyre_pressure_rr": round(float(tyre_pressure_rr), 3),
        "surface_type_fl": int(surface_type_fl),
        "surface_type_fr": int(surface_type_fr),
        "surface_type_rl": int(surface_type_rl),
        "surface_type_rr": int(surface_type_rr),
    }
    return payload
