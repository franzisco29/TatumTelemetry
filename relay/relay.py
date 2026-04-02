import asyncio
import logging
from typing import Dict, Set
from relay.config import Config

logger = logging.getLogger(__name__)

class F1RelayServer:
    def __init__(self, config: Config):
        self.config = config
        self.engineers: Dict[int, Set] = {}

    async def start(self):
        loop = asyncio.get_event_loop()
        for i in range(self.config.MAX_PILOTS):
            port = self.config.BASE_PORT + i
            self.engineers[port] = set()
            await loop.create_datagram_endpoint(
                lambda p=port: F1UDPProtocol(p, self.engineers),
                local_addr=("0.0.0.0", port)
            )
            logger.info(f"Relay attivo sulla porta {port}")

class F1UDPProtocol(asyncio.DatagramProtocol):
    def __init__(self, port: int, engineers: Dict):
        self.port = port
        self.engineers = engineers
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data: bytes, addr: tuple):
        logger.info(f"Pacchetto ricevuto da {addr} sulla porta {self.port} - {len(data)} bytes")
        engineers = self.engineers.get(self.port, set())
        logger.info(f"Ingegneri registrati su porta {self.port}: {engineers}")
        for eng_addr in engineers:
            logger.info(f"Invio a {eng_addr}")
            self.transport.sendto(data, eng_addr)
