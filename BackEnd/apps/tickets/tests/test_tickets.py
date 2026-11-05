from __future__ import annotations

import pytest

from apps.tickets.models import Ticket

pytestmark = pytest.mark.django_db


def test_requester_can_create_ticket(create_ticket, requester):
    response = create_ticket()

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == Ticket.Status.OPEN
    assert data["assignee"] is None
    assert data["urgency"] is None
    assert data["requester"]["id"] == requester.id
    assert data["code"] == f"HD-{data['id']:04d}"
    assert data["resolution"] == ""

    ticket = Ticket.objects.get(pk=data["id"])
    assert ticket.history.filter(event_type="CREATED").exists()


def test_technician_can_create_ticket(technician_client, technician, category):
    response = technician_client.post(
        "/api/tickets/",
        {
            "title": "Notebook sem acesso à rede",
            "description": "Chamado aberto pelo técnico para registrar uma solicitação interna.",
            "category": category.pk,
        },
        format="json",
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == Ticket.Status.OPEN
    assert data["assignee"] is None
    assert data["urgency"] is None
    assert data["requester"]["id"] == technician.id
    assert Ticket.objects.get(pk=data["id"]).assignee_id is None


def test_missing_required_fields_are_rejected(requester_client):
    response = requester_client.post("/api/tickets/", {}, format="json")

    assert response.status_code == 400
    body = response.json()
    for field in ("title", "description", "category"):
        assert field in body


def test_short_title_and_description_are_rejected(requester_client, category):
    response = requester_client.post(
        "/api/tickets/",
        {
            "title": "Erro",
            "description": "Curta",
            "category": category.pk,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "title" in response.json()
    assert "description" in response.json()


def test_inactive_category_is_rejected(requester_client, inactive_category):
    response = requester_client.post(
        "/api/tickets/",
        {
            "title": "Chamado com categoria inativa",
            "description": "Descrição suficientemente longa para o teste.",
            "category": inactive_category.pk,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "category" in response.json()


def test_server_controlled_fields_are_ignored(create_ticket, requester, technician):
    response = create_ticket(
        status=Ticket.Status.RESOLVED,
        assignee=technician.id,
        requester=technician.id,
        urgency=Ticket.Urgency.HIGH,
        resolution="Tentativa de resolução pelo cliente.",
        resolved_at="2020-01-01T00:00:00Z",
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == Ticket.Status.OPEN
    assert data["assignee"] is None
    assert data["urgency"] is None
    assert data["requester"]["id"] == requester.id
    assert data["resolution"] == ""
    assert data["resolved_at"] is None


def test_requester_list_is_scoped_to_own_tickets(
    requester_client,
    other_requester_client,
    technician_client,
    requester,
    other_requester,
    category,
):
    own = Ticket.objects.create(
        title="Chamado da Ana",
        description="Descrição do chamado da Ana para o teste.",
        urgency=Ticket.Urgency.LOW,
        category=category,
        requester=requester,
    )
    other = Ticket.objects.create(
        title="Chamado do João",
        description="Descrição do chamado do João para o teste.",
        urgency=Ticket.Urgency.LOW,
        category=category,
        requester=other_requester,
    )

    own_response = requester_client.get("/api/tickets/")
    assert own_response.status_code == 200
    assert own_response.json()["count"] == 1
    assert own_response.json()["results"][0]["id"] == own.id

    other_response = other_requester_client.get("/api/tickets/")
    assert other_response.json()["results"][0]["id"] == other.id

    technician_response = technician_client.get("/api/tickets/")
    assert technician_response.json()["count"] == 2


def test_requester_cannot_retrieve_another_requester_ticket(
    requester_client,
    other_requester,
    category,
):
    other_ticket = Ticket.objects.create(
        title="Chamado privado do João",
        description="Descrição que não deve ser exposta para a Ana.",
        urgency=Ticket.Urgency.HIGH,
        category=category,
        requester=other_requester,
    )

    response = requester_client.get(f"/api/tickets/{other_ticket.pk}/")

    assert response.status_code == 404


def test_technician_can_retrieve_any_ticket(technician_client, ticket):
    response = technician_client.get(f"/api/tickets/{ticket.pk}/")

    assert response.status_code == 200
    assert response.json()["id"] == ticket.pk
    assert "comments" not in response.json()


def test_ticket_filters(requester_client, requester, technician, category):
    low = Ticket.objects.create(
        title="Impressora sem papel",
        description="A impressora do financeiro está sem papel.",
        urgency=Ticket.Urgency.LOW,
        category=category,
        requester=requester,
    )
    in_progress = Ticket.objects.create(
        title="Erro no ERP",
        description="O ERP apresenta erro ao abrir o módulo fiscal.",
        urgency=Ticket.Urgency.HIGH,
        category=category,
        requester=requester,
        assignee=technician,
        status=Ticket.Status.IN_PROGRESS,
    )

    by_status = requester_client.get("/api/tickets/?status=EM_ATENDIMENTO")
    assert [item["id"] for item in by_status.json()["results"]] == [in_progress.id]

    by_urgency = requester_client.get("/api/tickets/?urgency=BAIXA")
    assert [item["id"] for item in by_urgency.json()["results"]] == [low.id]

    by_category = requester_client.get(f"/api/tickets/?category={category.slug}")
    assert by_category.json()["count"] == 2

    by_search = requester_client.get("/api/tickets/?search=ERP")
    assert [item["id"] for item in by_search.json()["results"]] == [in_progress.id]

    by_identifier = requester_client.get(f"/api/tickets/?search=HD-{low.pk:04d}")
    assert [item["id"] for item in by_identifier.json()["results"]] == [low.id]


def test_ticket_ordering_by_semantic_urgency(requester_client, requester, category):
    low = Ticket.objects.create(
        title="Chamado de urgência baixa",
        description="Descrição do chamado de urgência baixa para ordenação.",
        urgency=Ticket.Urgency.LOW,
        category=category,
        requester=requester,
    )
    high = Ticket.objects.create(
        title="Chamado de urgência alta",
        description="Descrição do chamado de urgência alta para ordenação.",
        urgency=Ticket.Urgency.HIGH,
        category=category,
        requester=requester,
    )
    medium = Ticket.objects.create(
        title="Chamado de urgência média",
        description="Descrição do chamado de urgência média para ordenação.",
        urgency=Ticket.Urgency.MEDIUM,
        category=category,
        requester=requester,
    )

    descending = requester_client.get("/api/tickets/?ordering=-urgency")
    assert [item["id"] for item in descending.json()["results"]] == [
        high.id,
        medium.id,
        low.id,
    ]

    ascending = requester_client.get("/api/tickets/?ordering=urgency")
    assert [item["id"] for item in ascending.json()["results"]] == [
        low.id,
        medium.id,
        high.id,
    ]


def test_technician_mine_and_assignee_filters(
    technician_client,
    requester,
    technician,
    category,
):
    assigned = Ticket.objects.create(
        title="Chamado atribuído",
        description="Chamado que está com o técnico Carlos.",
        urgency=Ticket.Urgency.MEDIUM,
        category=category,
        requester=requester,
        assignee=technician,
        status=Ticket.Status.IN_PROGRESS,
    )
    Ticket.objects.create(
        title="Chamado na fila",
        description="Chamado que ainda não possui responsável.",
        urgency=Ticket.Urgency.MEDIUM,
        category=category,
        requester=requester,
    )

    mine = technician_client.get("/api/tickets/?mine=true")
    assert [item["id"] for item in mine.json()["results"]] == [assigned.id]

    by_assignee = technician_client.get("/api/tickets/?assignee=me")
    assert [item["id"] for item in by_assignee.json()["results"]] == [assigned.id]


def test_requester_filter_cannot_expand_scope(
    requester_client,
    requester,
    other_requester,
    category,
):
    Ticket.objects.create(
        title="Chamado da Ana",
        description="Chamado que pertence à solicitante Ana.",
        urgency=Ticket.Urgency.LOW,
        category=category,
        requester=requester,
    )
    Ticket.objects.create(
        title="Chamado do João",
        description="Chamado que pertence ao solicitante João.",
        urgency=Ticket.Urgency.LOW,
        category=category,
        requester=other_requester,
    )

    response = requester_client.get(f"/api/tickets/?requester={other_requester.pk}")

    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert response.json()["results"][0]["requester"]["id"] == requester.id


def test_ticket_list_is_paginated(requester_client, requester, category):
    Ticket.objects.bulk_create(
        [
            Ticket(
                title=f"Chamado de teste {index}",
                description="Descrição padronizada para o teste de paginação.",
                urgency=Ticket.Urgency.MEDIUM,
                category=category,
                requester=requester,
            )
            for index in range(25)
        ]
    )

    response = requester_client.get("/api/tickets/?page_size=10")

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 25
    assert len(body["results"]) == 10
    assert body["next"] is not None
    assert body["previous"] is None


def test_page_size_is_capped(requester_client, requester, category):
    Ticket.objects.bulk_create(
        [
            Ticket(
                title=f"Chamado {index}",
                description="Descrição padronizada para o teste de limite.",
                urgency=Ticket.Urgency.LOW,
                category=category,
                requester=requester,
            )
            for index in range(205)
        ]
    )

    response = requester_client.get("/api/tickets/?page_size=1000")

    assert response.status_code == 200
    assert len(response.json()["results"]) == 200
