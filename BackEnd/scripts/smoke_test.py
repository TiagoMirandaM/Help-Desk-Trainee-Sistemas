"""Smoke test HTTP do backend Helpdesk.

Executa o fluxo completo contra um servidor local já iniciado:

    python manage.py runserver 127.0.0.1:8000
    python scripts/smoke_test.py

Usa apenas a biblioteca padrão (urllib) e as contas criadas por seed_demo.
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import sys
import urllib.error
import urllib.request


class ApiClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def _csrf_token(self) -> str | None:
        for cookie in self.jar:
            if cookie.name == "csrftoken":
                return cookie.value
        return None

    def request(self, method: str, path: str, payload: dict | None = None):
        headers = {"Accept": "application/json"}
        body = None
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if method in {"POST", "PUT", "PATCH", "DELETE"}:
            token = self._csrf_token()
            if token:
                headers["X-CSRFToken"] = token

        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=body,
            headers=headers,
            method=method,
        )
        try:
            with self.opener.open(request, timeout=15) as response:
                content = response.read()
                return response.status, json.loads(content) if content else None
        except urllib.error.HTTPError as error:
            content = error.read()
            try:
                data = json.loads(content) if content else None
            except json.JSONDecodeError:
                data = content.decode("utf-8", errors="replace")
            return error.code, data


def expect(label: str, status: int, expected: int, body=None) -> None:
    if status != expected:
        print(f"FALHOU: {label} retornou {status}, esperado {expected}: {body}")
        sys.exit(1)
    print(f"OK: {label} ({status})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000/api")
    args = parser.parse_args()

    client = ApiClient(args.base_url)

    status, body = client.request("GET", "/auth/csrf/")
    expect("cookie CSRF", status, 200, body)

    status, body = client.request(
        "POST",
        "/auth/login/",
        {"username": "ana.souza", "password": "demo1234"},
    )
    expect("login da solicitante", status, 200, body)

    status, categories = client.request("GET", "/categories/")
    expect("listar categorias", status, 200, categories)
    category_list = categories if isinstance(categories, list) else categories["results"]
    if not category_list:
        print("FALHOU: nenhuma categoria ativa encontrada. Rode seed_demo.")
        sys.exit(1)

    status, ticket = client.request(
        "POST",
        "/tickets/",
        {
            "title": "Smoke test do backend",
            "description": "Chamado criado pelo script de smoke test do backend.",
            "category": category_list[0]["id"],
        },
    )
    expect("abrir chamado", status, 201, ticket)
    ticket_id = ticket["id"]
    assert (
        ticket["status"] == "ABERTO"
        and ticket["assignee"] is None
        and ticket["urgency"] is None
    )

    status, body = client.request("GET", f"/tickets/{ticket_id}/")
    expect("consultar chamado", status, 200, body)

    status, body = client.request("POST", "/auth/logout/")
    expect("logout da solicitante", status, 204, body)

    status, body = client.request(
        "POST",
        "/auth/login/",
        {"username": "carlos.lima", "password": "demo1234"},
    )
    expect("login do técnico", status, 200, body)

    status, body = client.request(
        "POST",
        f"/tickets/{ticket_id}/assign/",
        {"urgency": "ALTA"},
    )
    expect("assumir chamado", status, 200, body)
    assert body["status"] == "EM_ATENDIMENTO" and body["urgency"] == "ALTA"

    status, body = client.request(
        "POST",
        f"/tickets/{ticket_id}/comments/",
        {"content": "Smoke test: comentário interno do técnico."},
    )
    expect("comentar internamente", status, 201, body)

    status, body = client.request(
        "POST",
        f"/tickets/{ticket_id}/transition/",
        {"status": "AGUARDANDO_SOLICITANTE"},
    )
    expect("pausar aguardando solicitante", status, 200, body)

    status, body = client.request(
        "POST",
        f"/tickets/{ticket_id}/transition/",
        {"status": "EM_ATENDIMENTO"},
    )
    expect("retomar atendimento", status, 200, body)

    status, body = client.request(
        "POST",
        f"/tickets/{ticket_id}/resolve/",
        {"resolution": "Smoke test concluído: solução aplicada e validada."},
    )
    expect("solicitar confirmação do solicitante", status, 200, body)
    assert body["status"] == "AGUARDANDO_SOLICITANTE" and body["resolved_at"] is None

    status, comments = client.request("GET", f"/tickets/{ticket_id}/comments/")
    expect("listar comentários internos", status, 200, comments)
    assert comments["count"] == 1

    status, history = client.request("GET", f"/tickets/{ticket_id}/history/")
    expect("listar histórico", status, 200, history)
    event_types = [event["event_type"] for event in history["results"]]
    for expected_event in (
        "CREATED",
        "ASSIGNED",
        "URGENCY_CHANGED",
        "STATUS_CHANGED",
        "CONFIRMATION_REQUESTED",
    ):
        assert expected_event in event_types, event_types

    status, body = client.request("POST", "/auth/logout/")
    expect("logout do técnico", status, 204, body)

    status, body = client.request(
        "POST",
        "/auth/login/",
        {"username": "ana.souza", "password": "demo1234"},
    )
    expect("login da solicitante", status, 200, body)

    status, body = client.request(
        "POST",
        f"/tickets/{ticket_id}/confirm-resolution/",
        {"resolved": True},
    )
    expect("confirmar resolução", status, 200, body)
    assert body["status"] == "RESOLVIDO" and body["resolved_at"]

    status, history = client.request("GET", f"/tickets/{ticket_id}/history/")
    expect("listar histórico final", status, 200, history)
    event_types = [event["event_type"] for event in history["results"]]
    for expected_event in (
        "REQUESTER_CONFIRMED",
        "RESOLVED_BY_REQUESTER",
    ):
        assert expected_event in event_types, event_types

    print(f"Fluxo completo validado no chamado HD-{ticket_id:04d}.")


if __name__ == "__main__":
    main()
