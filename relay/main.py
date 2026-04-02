import asyncio
import uvloop
import logging
import sys

sys.path.insert(0, '/app')

from relay.relay import F1RelayServer
from relay.config import Config
from api.api import create_app
import uvicorn

logging.basicConfig(level=logging.INFO)

async def main():
    config = Config()

    relay = F1RelayServer(config)
    await relay.start()

    app = create_app(relay.websocket_clients)
    server = uvicorn.Server(uvicorn.Config(
        app,
        host=config.API_HOST,
        port=config.API_PORT
    ))
    await server.serve()

if __name__ == "__main__":
    uvloop.install()
    asyncio.run(main())