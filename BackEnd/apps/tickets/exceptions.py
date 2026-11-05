from __future__ import annotations

from rest_framework.exceptions import APIException


class Conflict(APIException):
    status_code = 409
    default_detail = "O chamado foi alterado por outro usuário. Recarregue os dados."
    default_code = "conflict"
