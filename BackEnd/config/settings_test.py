"""Configuração usada exclusivamente pela suíte de testes.

Usa SQLite em memória para que os testes rodem sem um PostgreSQL local.
Em produção/desenvolvimento normal, config/settings.py usa PostgreSQL.
"""

from __future__ import annotations

from .settings import *  # noqa: F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

LOGGING["root"]["level"] = "CRITICAL"  # noqa: F405
