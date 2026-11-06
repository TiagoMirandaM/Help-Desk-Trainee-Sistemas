from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from conftest import PASSWORD

pytestmark = pytest.mark.django_db


def test_protected_routes_require_authentication(api_client):
    urls = [
        "/api/auth/me/",
        "/api/categories/",
        "/api/tickets/",
    ]
    for url in urls:
        response = api_client.get(url)
        assert response.status_code == 401, url
        assert "detail" in response.json()


def test_login_with_username_returns_user_and_starts_session(api_client, requester):
    response = api_client.post(
        "/api/auth/login/",
        {"username": "ana.souza", "password": PASSWORD},
        format="json",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["username"] == "ana.souza"
    assert payload["user"]["role"] == User.Role.REQUESTER
    assert payload["user"]["name"] == "Ana Souza"

    me_response = api_client.get("/api/auth/me/")
    assert me_response.status_code == 200
    assert me_response.json()["id"] == requester.id


def test_login_accepts_email(api_client, requester):
    response = api_client.post(
        "/api/auth/login/",
        {"username": "ana.souza@example.com", "password": PASSWORD},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["user"]["id"] == requester.id


def test_login_with_invalid_credentials_returns_401(api_client, requester):
    response = api_client.post(
        "/api/auth/login/",
        {"username": "ana.souza", "password": "senha-errada"},
        format="json",
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Usuário ou senha inválidos."


def test_logout_ends_session(api_client, requester):
    login_response = api_client.post(
        "/api/auth/login/",
        {"username": "ana.souza", "password": PASSWORD},
        format="json",
    )
    assert login_response.status_code == 200

    logout_response = api_client.post("/api/auth/logout/")
    assert logout_response.status_code == 204

    assert api_client.get("/api/auth/me/").status_code == 401


def test_user_cannot_change_own_role_via_api(requester_client, requester):
    response = requester_client.patch(
        "/api/auth/me/",
        {"role": User.Role.TECHNICIAN},
        format="json",
    )

    assert response.status_code == 405
    requester.refresh_from_db()
    assert requester.role == User.Role.REQUESTER


def test_login_requires_csrf_token_when_enforced(requester):
    client = APIClient(enforce_csrf_checks=True)

    csrf_response = client.get("/api/auth/csrf/")
    assert csrf_response.status_code == 200
    token = client.cookies["csrftoken"].value

    without_token = client.post(
        "/api/auth/login/",
        {"username": "ana.souza", "password": PASSWORD},
        format="json",
    )
    assert without_token.status_code == 403

    with_token = client.post(
        "/api/auth/login/",
        {"username": "ana.souza", "password": PASSWORD},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert with_token.status_code == 200


def test_authenticated_writes_require_csrf_token(requester, category):
    client = APIClient(enforce_csrf_checks=True)
    client.force_login(requester)
    payload = {
        "title": "Chamado protegido por CSRF",
        "description": "Descrição suficientemente longa para o teste de CSRF.",
        "category": category.pk,
    }

    without_token = client.post("/api/tickets/", payload, format="json")
    assert without_token.status_code == 403

    csrf_response = client.get("/api/auth/csrf/")
    assert csrf_response.status_code == 200
    token = client.cookies["csrftoken"].value

    with_token = client.post(
        "/api/tickets/",
        payload,
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert with_token.status_code == 201


def test_csrf_origin_must_be_trusted(requester):
    client = APIClient(enforce_csrf_checks=True)
    csrf_response = client.get(
        "/api/auth/csrf/",
        HTTP_ORIGIN="http://localhost:5173",
    )
    assert csrf_response.status_code == 200
    token = client.cookies["csrftoken"].value
    credentials = {"username": "ana.souza", "password": PASSWORD}

    untrusted = client.post(
        "/api/auth/login/",
        credentials,
        format="json",
        HTTP_ORIGIN="http://malicioso.example",
        HTTP_X_CSRFTOKEN=token,
    )
    assert untrusted.status_code == 403

    trusted = client.post(
        "/api/auth/login/",
        credentials,
        format="json",
        HTTP_ORIGIN="http://localhost:5173",
        HTTP_X_CSRFTOKEN=token,
    )
    assert trusted.status_code == 200
