from __future__ import annotations

from rest_framework.permissions import BasePermission

from .models import User


class IsTechnician(BasePermission):
    message = "Apenas técnicos podem executar esta operação."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user and user.is_authenticated and getattr(user, "role", None) == User.Role.TECHNICIAN
        )


class IsRequester(BasePermission):
    message = "Apenas solicitantes podem executar esta operação."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user and user.is_authenticated and getattr(user, "role", None) == User.Role.REQUESTER
        )
