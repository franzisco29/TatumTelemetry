import asyncio
import socket
import sys
import os
import json
import time
import logging
import threading
import xml.etree.ElementTree as ET
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

import websockets
from pystray import Icon, Menu, MenuItem
from PIL import Image

# ── Single-instance guard (Windows) ────────────────
if sys.platform == "win32":
    import ctypes
    _mutex = ctypes.windll.kernel32.CreateMutexW(None, False, "TatumTelemetryClientMutex")
    if ctypes.windll.kernel32.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
        sys.exit(0)

# ── Config ─────────────────────────────────────────
VERSION       = "0.3.1"
LOCAL_PORT    = 7842
UDP_PORT      = 20777
WS_URL        = "wss://tatumtelemetry.it"
if getattr(sys, 'frozen', False):
    APP_DIR = Path(sys.executable).parent  # cartella installazione
else:
    APP_DIR = Path(__file__).parent

LOG_DIR  = APP_DIR / "log"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "TatumClient.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ── Stato globale ───────────────────────────────────
state = {
    "connected": False,
    "driver": None,
    "port": None,
    "token": None,
}
ws_task    = None
loop       = None
tray_icon  = None

# ── WebSocket ───────────────────────────────────────
async def ws_connect(port: int, token: str):
    uri = f"{WS_URL}/ws/{port}"
    udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    logger.info(f"Connessione WebSocket a {uri}")
    while True:
        try:
            async with websockets.connect(
                uri,
                extra_headers={"Authorization": f"Bearer {token}"}
            ) as ws:
                state["connected"] = True
                update_tray()
                logger.info("Connesso!")
                async for message in ws:
                    if isinstance(message, bytes):
                        udp.sendto(message, ('127.0.0.1', UDP_PORT))
        except Exception as e:
            logger.warning(f"Disconnesso: {e} — riprovo tra 5s")
            state["connected"] = False
            update_tray()
            await asyncio.sleep(5)

def start_ws(port: int, token: str):
    global ws_task
    if ws_task:
        ws_task.cancel()
    ws_task = asyncio.run_coroutine_threadsafe(
        ws_connect(port, token), loop
    )

def stop_ws():
    global ws_task
    if ws_task:
        ws_task.cancel()
        ws_task = None
    state["connected"] = False
    state["driver"]    = None
    state["port"]      = None
    update_tray()

# ── F1 25 config ────────────────────────────────────
def find_f1_config() -> "Path | None":
    candidates = [
        Path.home() / "Documents" / "My Games" / "F1 25" / "hardwaresettings" / "hardware_settings_config.xml",
        Path("F:/") / "Users" / os.getenv("USERNAME", "") / "Documents" / "My Games" / "F1 25" / "hardwaresettings" / "hardware_settings_config.xml",
    ]
    for p in candidates:
        if p.exists():
            return p
    # Cerca su tutti i drive Windows
    if sys.platform == "win32":
        import string
        for drive in string.ascii_uppercase:
            p = Path(f"{drive}:/") / "Users" / os.getenv("USERNAME", "") / "Documents" / "My Games" / "F1 25" / "hardwaresettings" / "hardware_settings_config.xml"
            if p.exists():
                return p
    return None

def setup_f1_telemetry(ip: str, port: int) -> bool:
    config_path = find_f1_config()
    if not config_path:
        logger.warning("File config F1 25 non trovato")
        return False
    try:
        tree = ET.parse(config_path)
        root = tree.getroot()
        udp = root.find(".//udp")
        if udp is not None:
            udp.set("enabled", "true")
            udp.set("ip", ip)
            udp.set("port", str(port))
            udp.set("broadcast", "false")
            tree.write(config_path, encoding="UTF-8", xml_declaration=True)
            logger.info(f"F1 25 configurato: {ip}:{port}")
            return True
    except Exception as e:
        logger.error(f"Errore config F1 25: {e}")
    return False

# ── HTTP Server (comandi dalla dashboard) ───────────
class CommandHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Silenzia i log HTTP

    def do_POST(self):
        length  = int(self.headers.get('Content-Length', 0))
        body    = json.loads(self.rfile.read(length)) if length else {}
        path    = self.path

        if path == "/connect":
            port  = body.get("port")
            token = body.get("token")
            driver = body.get("driver")
            if port and token:
                state["port"]   = port
                state["token"]  = token
                state["driver"] = driver
                start_ws(port, token)
                self._ok({"status": "connecting"})
            else:
                self._err("Missing port or token")

        elif path == "/disconnect":
            stop_ws()
            self._ok({"status": "disconnected"})

        elif path == "/setup-driver":
            ip   = body.get("ip")
            port = body.get("port")
            if ip and port:
                ok = setup_f1_telemetry(ip, int(port))
                self._ok({"status": "ok" if ok else "config_not_found"})
            else:
                self._err("Missing ip or port")

        elif path == "/quit":
            self._ok({"status": "quitting"})
            threading.Thread(target=quit_app).start()

        else:
            self._err("Unknown command")

    def do_GET(self):
        if self.path == "/status":
            self._ok({
                "running": True,
                "connected": state["connected"],
                "driver": state["driver"],
                "port": state["port"],
                "version": VERSION
            })
        else:
            self._err("Not found")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _ok(self, data):
        self._respond(200, data)

    def _err(self, msg):
        self._respond(400, {"error": msg})

    def _respond(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

def start_http_server():
    server = HTTPServer(('127.0.0.1', LOCAL_PORT), CommandHandler)
    logger.info(f"HTTP server su localhost:{LOCAL_PORT}")
    server.serve_forever()

# ── System Tray ─────────────────────────────────────
def get_base_path() -> Path:
    if getattr(sys, 'frozen', False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent

def load_icon():
    try:
        icon_path = get_base_path() / "icons" / "icon.png"
        return Image.open(icon_path)
    except Exception as e:
        logger.warning(f"Icona non trovata: {e}")
        img = Image.new('RGB', (64, 64), color='#f60300')
        return img

def update_tray():
    if tray_icon:
        status = f"Connected: {state['driver']}" if state['connected'] else "Disconnected"
        tray_icon.title = f"Tatum Telemetry — {status}"

def quit_app():
    stop_ws()
    if tray_icon:
        tray_icon.stop()
    os._exit(0)

def build_tray():
    global tray_icon
    image = load_icon()
    menu  = Menu(
        MenuItem("Tatum Telemetry", lambda: None, enabled=False),
        Menu.SEPARATOR,
        MenuItem(lambda _: f"{'🟢 Connected' if state['connected'] else '⚫ Disconnected'}", lambda: None, enabled=False),
        Menu.SEPARATOR,
        MenuItem("Quit", lambda icon, item: quit_app())
    )
    tray_icon = Icon("TatumTelemetry", image, "Tatum Telemetry", menu)
    tray_icon.run()

# ── Main ─────────────────────────────────────────────
def main():
    global loop

    # Asyncio loop in thread separato
    loop = asyncio.new_event_loop()
    threading.Thread(target=loop.run_forever, daemon=True).start()

    # HTTP server in thread separato
    threading.Thread(target=start_http_server, daemon=True).start()

    logger.info(f"Tatum Client v{VERSION} avviato")

    # System tray (blocca il main thread)
    build_tray()

if __name__ == "__main__":
    main()
