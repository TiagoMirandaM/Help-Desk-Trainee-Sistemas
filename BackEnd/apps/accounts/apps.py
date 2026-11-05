from __future__ import annotations

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    verbose_name = "Contas"

    def ready(self) -> None:
        from . import schema  # noqa: F401  (registra o esquema de autenticação)
