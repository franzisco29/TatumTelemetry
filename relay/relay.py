import asyncio
import logging
import time
from typing import Dict, Set
from relay.config import Config

logger = logging.getLogger(__name__)

class F1RelayServer:
    def __init__(self, config: Config):
        self.config = config
        self.websocket_clients: Dict[int, Set] = {}
        self.last_packet: Dict[int, float] = {}  # porta → timestamp ultimo pacchetto

    async def start(self):
        loop = asyncio.get_event_loop()
        for i in range(self.config.MAX_PILOTS):
            port = self.config.BASE_PORT + i
            self.websocket_clients[port] = set()
            self.last_packet[port] = 0
            await loop.create_datagram_endpoint(
                lambda p=port: F1UDPProtocol(p, self.websocket_clients, self.last_packet),
                local_addr=("0.0.0.0", port)
            )
            logger.info(f"Relay attivo sulla porta {port}")

class F1UDPProtocol(asyncio.DatagramProtocol):
    def __init__(self, port: int, clients: Dict, last_packet: Dict):
        self.port = port
        self.clients = clients
        self.last_packet = last_packet
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data: bytes, addr: tuple):
        # Aggiorna timestamp ultimo pacchetto
        self.last_packet[self.port] = time.time()

        clients = self.clients.get(self.port, set())
        logger.info(f"Pacchetto da {addr} porta {self.port} - {len(data)} bytes - ingegneri: {len(clients)}")
        dead = set()
        for ws in clients:
            try:
                asyncio.ensure_future(ws.send_bytes(data))
            except Exception as e:
                logger.warning(f"Client disconnesso: {e}")
                dead.add(ws)
        clients -= dead