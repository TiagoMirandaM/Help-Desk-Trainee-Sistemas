from __future__ import annotations

from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Garante um corpo de erro previsível para o frontend.

    Erros de validação continuam no formato por campo do DRF; erros simples
    (401/403/404/409) são normalizados para {"detail": "..."}.
    """

    response = exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(response.data, str):
        response.data = {"detail": response.data}
    elif isinstance(response.data, list):
        response.data = {"detail": response.data}
    return response
