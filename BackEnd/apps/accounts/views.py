from __future__ import annotations

from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import LoginSerializer, UserSerializer


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    """Garante que o cookie csrftoken exista antes do login."""

    permission_classes = [AllowAny]
    authentication_classes = []
    http_method_names = ["get", "head", "options"]

    @extend_schema(
        tags=["auth"],
        summary="Obter cookie CSRF",
        responses={200: OpenApiResponse(description="Cookie csrftoken definido.")},
    )
    def get(self, request):
        return Response({"detail": "Cookie CSRF definido."})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    """Autentica via sessão do Django.

    Aceita username ou e-mail no campo username. A resposta inclui o usuário
    serializado para o frontend montar a sessão local.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    http_method_names = ["post", "options"]

    @extend_schema(
        tags=["auth"],
        summary="Autenticar usuário",
        request=LoginSerializer,
        responses={200: UserSerializer, 401: OpenApiResponse(description="Credenciais inválidas.")},
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data["username"].strip()
        username = identifier
        if "@" in identifier:
            user_by_email = User.objects.filter(email__iexact=identifier).first()
            if user_by_email is not None:
                username = user_by_email.username

        user = authenticate(
            request,
            username=username,
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Usuário ou senha inválidos."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        login(request, user)
        return Response({"user": UserSerializer(user).data})


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    @extend_schema(
        tags=["auth"],
        summary="Usuário autenticado",
        responses={200: UserSerializer},
    )
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    http_method_names = ["post", "options"]

    @extend_schema(
        tags=["auth"],
        summary="Encerrar sessão",
        request=None,
        responses={204: OpenApiResponse(description="Sessão encerrada.")},
    )
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
