import asyncio
import uvloop
import logging
from relay.relay import F1RelayServer
from relay.config import Config
import uvicorn
from api.api import create_app

logging.basicConfig(level=logging.INFO)

async def main():
    config = Config()

    # Avvia relay UDP
    relay = F1RelayServer(config)
    await relay.start()

    # Avvia API HTTP
    app = create_app()
    server = uvicorn.Server(uvicorn.Config(
        app,
        host=config.API_HOST,
        port=config.API_PORT
    ))
    await server.serve()

if __name__ == "__main__":
    uvloop.install()
    asyncio.run(main())