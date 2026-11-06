from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "name",
            "role",
            "date_joined",
        ]
        read_only_fields = fields


class UserSummarySerializer(serializers.ModelSerializer):
    """Representação enxuta usada dentro de chamados, comentários e histórico."""

    name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "name", "role"]
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(
        help_text="Username ou e-mail do usuário.",
        trim_whitespace=True,
    )
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )
