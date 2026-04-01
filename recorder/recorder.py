import os
import time
import logging
from relay.config import Config

logger = logging.getLogger(__name__)
config = Config()

class SessionRecorder:
    def __init__(self, pilot_name: str):
        self.pilot_name = pilot_name
        self.file = None
        self._open_file()

    def _open_file(self):
        os.makedirs(config.SESSIONS_DIR, exist_ok=True)
        ts = time.strftime("%Y%m%d_%H%M%S")
        path = os.path.join(config.SESSIONS_DIR, f"{self.pilot_name}_{ts}.bin")
        self.file = open(path, "wb")
        logger.info(f"Sessione aperta: {path}")

    def write(self, data: bytes):
        if self.file:
            self.file.write(data)

    def close(self):
        if self.file:
            self.file.close()
            logger.info(f"Sessione chiusa: {self.pilot_name}")