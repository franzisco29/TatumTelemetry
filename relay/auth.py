import jwt
import datetime
from relay.config import Config

config = Config()

def create_token(username: str, role: str) -> str:
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=config.JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> dict:
    return jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])