import asyncio
import logging
from typing import Dict, Set
from relay.config import Config

logger = logging.getLogger(__name__)

class F1RelayServer:
    def __init__(self, config: Config):
        self.config = config
        # { porta_pilota: set di websocket connessi }
        self.websocket_clients: Dict[int, Set] = {}

    async def start(self):
        loop = asyncio.get_event_loop()
        for i in range(self.config.MAX_PILOTS):
            port = self.config.BASE_PORT + i
            self.websocket_clients[port] = set()
            await loop.create_datagram_endpoint(
                lambda p=port: F1UDPProtocol(p, self.websocket_clients),
                local_addr=("0.0.0.0", port)
            )
            logger.info(f"Relay attivo sulla porta {port}")

class F1UDPProtocol(asyncio.DatagramProtocol):
    def __init__(self, port: int, clients: Dict):
        self.port = port
        self.clients = clients
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data: bytes, addr: tuple):
        clients = self.clients.get(self.port, set())
        dead = set()
        for ws in clients:
            try:
                asyncio.ensure_future(ws.send_bytes(data))
            except Exception as e:
                logger.warning(f"Client disconnesso: {e}")
                dead.add(ws)
        clients -= dead