import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings


def _load_key() -> bytes:
    key = base64.b64decode(settings.rrn_encryption_key_b64)
    if len(key) != 32:
        raise ValueError("rrn_encryption_key_b64 must decode to 32 bytes for AES-256.")
    return key


def encrypt_rrn(plain_text: str) -> bytes:
    key = _load_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plain_text.encode("utf-8"), None)
    return nonce + ct


def decrypt_rrn(payload: bytes) -> str:
    key = _load_key()
    aesgcm = AESGCM(key)
    nonce = payload[:12]
    ct = payload[12:]
    plain = aesgcm.decrypt(nonce, ct, None)
    return plain.decode("utf-8")
