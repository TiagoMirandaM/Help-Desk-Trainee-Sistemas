from __future__ import annotations

from rest_framework.authentication import SessionAuthentication as DRFSessionAuthentication


class SessionAuthentication(DRFSessionAuthentication):
    """Sessão do Django com resposta 401 (e não 403) para não autenticados."""

    def authenticate_header(self, request) -> str:
        return "Session"
