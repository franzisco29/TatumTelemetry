import asyncio
import uvloop
import logging
import sys

sys.path.insert(0, '/app')

from relay.relay import F1RelayServer
from relay.config import Config
from api.api import create_app
from database.database import init_db, SessionLocal
import uvicorn

logging.basicConfig(level=logging.INFO)

async def main():
    config = Config()
    driver_names = {}

    # Inizializza database
    init_db()
    logging.info("Database inizializzato")

    relay = F1RelayServer(
        config,
        db_session_factory=SessionLocal,
        driver_name_resolver=lambda port: driver_names.get(port, f"port_{port}")
    )
    await relay.start()

    app = create_app(
        relay.websocket_clients,
        relay.decoded_websocket_clients,
        relay.last_packet,
        relay,
        driver_names,
    )
    server = uvicorn.Server(uvicorn.Config(
        app,
        host=config.API_HOST,
        port=config.API_PORT
    ))
    await server.serve()

if __name__ == "__main__":
    uvloop.install()
    asyncio.run(main())