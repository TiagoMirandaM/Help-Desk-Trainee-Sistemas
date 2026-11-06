from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Usuário do sistema com perfil de negócio explícito.

    A autenticação usa os mecanismos nativos do Django (hash de senha,
    sessão e CSRF). O campo role é a única fonte de autorização por perfil.
    """

    class Role(models.TextChoices):
        REQUESTER = "SOLICITANTE", "Solicitante"
        TECHNICIAN = "TECNICO", "Técnico"

    role = models.CharField(
        "perfil",
        max_length=20,
        choices=Role.choices,
        default=Role.REQUESTER,
    )

    class Meta:
        verbose_name = "usuário"
        verbose_name_plural = "usuários"

    @property
    def name(self) -> str:
        return self.get_full_name().strip() or self.username

    @property
    def is_technician(self) -> bool:
        return self.role == self.Role.TECHNICIAN

    @property
    def is_requester(self) -> bool:
        return self.role == self.Role.REQUESTER

    def __str__(self) -> str:
        return f"{self.name} ({self.get_role_display()})"
