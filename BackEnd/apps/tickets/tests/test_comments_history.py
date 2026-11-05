from __future__ import annotations

import pytest

from apps.tickets.models import Ticket, TicketHistory

pytestmark = pytest.mark.django_db


def test_technician_creates_and_lists_internal_comments(
    technician_client,
    technician,
    ticket,
):
    create_response = technician_client.post(
        f"/api/tickets/{ticket.pk}/comments/",
        {"content": "Solicitada confirmação do comportamento ao usuário."},
        format="json",
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["content"] == "Solicitada confirmação do comportamento ao usuário."
    assert created["author"]["id"] == technician.id
    assert created["ticket"] == ticket.pk

    list_response = technician_client.get(f"/api/tickets/{ticket.pk}/comments/")

    assert list_response.status_code == 200
    body = list_response.json()
    assert body["count"] == 1
    assert body["results"][0]["id"] == created["id"]


def test_comment_author_is_always_the_authenticated_user(
    technician_client,
    technician,
    other_technician,
    ticket,
):
    response = technician_client.post(
        f"/api/tickets/{ticket.pk}/comments/",
        {
            "content": "Comentário com tentativa de forjar o autor.",
            "author": other_technician.pk,
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["author"]["id"] == technician.id


def test_requester_cannot_access_internal_comments(requester_client, ticket):
    list_response = requester_client.get(f"/api/tickets/{ticket.pk}/comments/")
    create_response = requester_client.post(
        f"/api/tickets/{ticket.pk}/comments/",
        {"content": "Solicitante não pode comentar internamente."},
        format="json",
    )

    assert list_response.status_code == 403
    assert create_response.status_code == 403


def test_comment_requires_content(technician_client, ticket):
    response = technician_client.post(
        f"/api/tickets/{ticket.pk}/comments/",
        {"content": "   "},
        format="json",
    )

    assert response.status_code == 400
    assert "content" in response.json()


def test_comments_are_not_embedded_in_ticket_detail(technician_client, ticket):
    technician_client.post(
        f"/api/tickets/{ticket.pk}/comments/",
        {"content": "Comentário que não deve aparecer no detalhe."},
        format="json",
    )

    response = technician_client.get(f"/api/tickets/{ticket.pk}/")

    assert response.status_code == 200
    assert "comments" not in response.json()


def test_comments_cannot_be_edited_or_deleted(technician_client, ticket):
    update = technician_client.put(
        f"/api/tickets/{ticket.pk}/comments/",
        {"content": "Tentativa de edição."},
        format="json",
    )
    delete = technician_client.delete(f"/api/tickets/{ticket.pk}/comments/")

    assert update.status_code == 405
    assert delete.status_code == 405


def test_ticket_creation_is_audited(create_ticket, requester):
    response = create_ticket()
    ticket_id = response.json()["id"]

    history = TicketHistory.objects.filter(ticket_id=ticket_id)
    assert history.count() == 1
    event = history.get()
    assert event.event_type == TicketHistory.EventType.CREATED
    assert event.actor_id == requester.id


def test_requester_can_read_history_of_own_ticket(
    create_ticket,
    requester_client,
):
    ticket_id = create_ticket().json()["id"]

    response = requester_client.get(f"/api/tickets/{ticket_id}/history/")

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["results"][0]["event_type"] == TicketHistory.EventType.CREATED
    assert body["results"][0]["to_status"] == Ticket.Status.OPEN


def test_requester_cannot_read_history_of_another_ticket(
    other_requester_client,
    ticket,
):
    response = other_requester_client.get(f"/api/tickets/{ticket.pk}/history/")

    assert response.status_code == 404


def test_technician_can_read_history_of_any_ticket(technician_client, ticket):
    response = technician_client.get(f"/api/tickets/{ticket.pk}/history/")

    assert response.status_code == 200


def test_history_does_not_expose_internal_comments(technician_client, ticket):
    comment_text = "Conteúdo interno que não pode vazar no histórico."
    technician_client.post(
        f"/api/tickets/{ticket.pk}/comments/",
        {"content": comment_text},
        format="json",
    )

    response = technician_client.get(f"/api/tickets/{ticket.pk}/history/")

    assert response.status_code == 200
    assert comment_text not in response.content.decode()


def test_history_is_read_only(technician_client, ticket):
    create = technician_client.post(
        f"/api/tickets/{ticket.pk}/history/",
        {"event_type": "CREATED"},
        format="json",
    )
    update = technician_client.put(
        f"/api/tickets/{ticket.pk}/history/",
        {},
        format="json",
    )
    delete = technician_client.delete(f"/api/tickets/{ticket.pk}/history/")

    assert create.status_code == 405
    assert update.status_code == 405
    assert delete.status_code == 405


def test_full_flow_generates_expected_audit_events(
    technician_client,
    requester_client,
    create_ticket,
):
    ticket_id = create_ticket().json()["id"]

    assert (
        technician_client.post(
            f"/api/tickets/{ticket_id}/assign/",
            {"urgency": Ticket.Urgency.HIGH},
            format="json",
        ).status_code
        == 200
    )
    assert (
        technician_client.post(
            f"/api/tickets/{ticket_id}/transition/",
            {"status": Ticket.Status.WAITING_REQUESTER},
            format="json",
        ).status_code
        == 200
    )
    assert (
        technician_client.post(
            f"/api/tickets/{ticket_id}/transition/",
            {"status": Ticket.Status.IN_PROGRESS},
            format="json",
        ).status_code
        == 200
    )
    assert (
        technician_client.post(
            f"/api/tickets/{ticket_id}/resolve/",
            {"resolution": "Solução aplicada e validada no ambiente de teste."},
            format="json",
        ).status_code
        == 200
    )
    assert (
        requester_client.post(
            f"/api/tickets/{ticket_id}/confirm-resolution/",
            {"resolved": True},
            format="json",
        ).status_code
        == 200
    )

    response = technician_client.get(f"/api/tickets/{ticket_id}/history/")

    assert response.status_code == 200
    event_types = [item["event_type"] for item in response.json()["results"]]
    assert event_types[0] == TicketHistory.EventType.CREATED
    assert TicketHistory.EventType.ASSIGNED in event_types
    assert TicketHistory.EventType.URGENCY_CHANGED in event_types
    assert event_types.count(TicketHistory.EventType.STATUS_CHANGED) == 4
    assert TicketHistory.EventType.CONFIRMATION_REQUESTED in event_types
    assert TicketHistory.EventType.REQUESTER_CONFIRMED in event_types
    assert event_types[-1] == TicketHistory.EventType.RESOLVED_BY_REQUESTER
