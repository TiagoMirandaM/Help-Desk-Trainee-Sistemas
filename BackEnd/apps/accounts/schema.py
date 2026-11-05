from __future__ import annotations

from drf_spectacular.extensions import OpenApiAuthenticationExtension


class SessionAuthenticationScheme(OpenApiAuthenticationExtension):
    """Documenta a autenticação por cookie de sessão do Django."""

    target_class = "apps.accounts.authentication.SessionAuthentication"
    name = "sessionAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": "sessionid",
            "description": (
                "Sessão do Django. Para requisições unsafe (POST/PUT/PATCH/DELETE), "
                "envie também o header X-CSRFToken com o valor do cookie csrftoken."
            ),
        }
