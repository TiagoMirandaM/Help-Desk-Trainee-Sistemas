from __future__ import annotations

import pytest

from apps.tickets import services
from apps.tickets.models import Ticket, TicketHistory

pytestmark = pytest.mark.django_db

RESOLUTION = "Ajuste realizado e funcionamento validado com o usuário."


@pytest.fixture
def ticket_id(create_ticket):
    response = create_ticket()
    assert response.status_code == 201
    return response.json()["id"]


def assign(client, ticket_id, urgency=Ticket.Urgency.HIGH):
    return client.post(
        f"/api/tickets/{ticket_id}/assign/",
        {"urgency": urgency},
        format="json",
    )


def request_confirmation(client, ticket_id, resolution=RESOLUTION):
    return client.post(
        f"/api/tickets/{ticket_id}/resolve/",
        {"resolution": resolution},
        format="json",
    )


def confirm(client, ticket_id, resolved):
    return client.post(
        f"/api/tickets/{ticket_id}/confirm-resolution/",
        {"resolved": resolved},
        format="json",
    )


def event_types(ticket_id):
    return list(
        TicketHistory.objects.filter(ticket_id=ticket_id)
        .order_by("created_at", "id")
        .values_list("event_type", flat=True)
    )


def test_technician_assigns_open_ticket_with_urgency(
    technician_client,
    technician,
    ticket_id,
):
    assert Ticket.objects.get(pk=ticket_id).urgency is None

    response = assign(technician_client, ticket_id, Ticket.Urgency.HIGH)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == Ticket.Status.IN_PROGRESS
    assert data["assignee"]["id"] == technician.id
    assert data["urgency"] == Ticket.Urgency.HIGH

    ticket = Ticket.objects.get(pk=ticket_id)
    assert ticket.urgency == Ticket.Urgency.HIGH

    events = event_types(ticket_id)
    assert TicketHistory.EventType.ASSIGNED in events
    assert TicketHistory.EventType.URGENCY_CHANGED in events
    assert TicketHistory.EventType.STATUS_CHANGED in events

    urgency_event = TicketHistory.objects.get(
        ticket_id=ticket_id,
        event_type=TicketHistory.EventType.URGENCY_CHANGED,
    )
    assert urgency_event.old_value == ""
    assert urgency_event.new_value == "Alta"


def test_assign_requires_valid_urgency(technician_client, ticket_id):
    missing = technician_client.post(f"/api/tickets/{ticket_id}/assign/", {}, format="json")
    invalid = assign(technician_client, ticket_id, "URGENTISSIMA")

    assert missing.status_code == 400
    assert "urgency" in missing.json()
    assert invalid.status_code == 400
    assert "urgency" in invalid.json()

    ticket = Ticket.objects.get(pk=ticket_id)
    assert ticket.status == Ticket.Status.OPEN
    assert ticket.assignee is None


def test_ticket_cannot_be_assigned_twice(
    technician_client,
    other_technician_client,
    ticket_id,
    technician,
):
    first = assign(technician_client, ticket_id, Ticket.Urgency.MEDIUM)
    assert first.status_code == 200

    second = assign(other_technician_client, ticket_id, Ticket.Urgency.HIGH)
    assert second.status_code == 409
    assert "detail" in second.json()

    ticket = Ticket.objects.get(pk=ticket_id)
    assert ticket.assignee_id == technician.id
    assert ticket.urgency == Ticket.Urgency.MEDIUM


def test_cannot_assign_ticket_outside_open_status(technician_client, ticket_id):
    assert assign(technician_client, ticket_id).status_code == 200
    assert (
        technician_client.post(
            f"/api/tickets/{ticket_id}/transition/",
            {"status": Ticket.Status.WAITING_REQUESTER},
            format="json",
        ).status_code
        == 200
    )

    response = assign(technician_client, ticket_id)

    assert response.status_code == 409


def test_requester_cannot_assign_ticket(requester_client, ticket_id):
    response = requester_client.post(
        f"/api/tickets/{ticket_id}/assign/",
        {"urgency": Ticket.Urgency.HIGH},
        format="json",
    )

    assert response.status_code == 403


def test_open_ticket_cannot_transition_directly(technician_client, ticket_id):
    response = technician_client.post(
        f"/api/tickets/{ticket_id}/transition/",
        {"status": Ticket.Status.WAITING_REQUESTER},
        format="json",
    )

    assert response.status_code == 409


def test_only_assignee_can_transition(
    technician_client,
    other_technician_client,
    ticket_id,
):
    assert assign(technician_client, ticket_id).status_code == 200

    response = other_technician_client.post(
        f"/api/tickets/{ticket_id}/transition/",
        {"status": Ticket.Status.WAITING_REQUESTER},
        format="json",
    )

    assert response.status_code == 403


def test_valid_status_cycle(technician_client, ticket_id):
    assert assign(technician_client, ticket_id).status_code == 200

    waiting = technician_client.post(
        f"/api/tickets/{ticket_id}/transition/",
        {"status": Ticket.Status.WAITING_REQUESTER},
        format="json",
    )
    assert waiting.status_code == 200
    assert waiting.json()["status"] == Ticket.Status.WAITING_REQUESTER
    assert waiting.json()["resolution"]

    resumed = technician_client.post(
        f"/api/tickets/{ticket_id}/transition/",
        {"status": Ticket.Status.IN_PROGRESS},
        format="json",
    )
    assert resumed.status_code == 200
    assert resumed.json()["status"] == Ticket.Status.IN_PROGRESS

    status_events = TicketHistory.objects.filter(
        ticket_id=ticket_id,
        event_type=TicketHistory.EventType.STATUS_CHANGED,
    ).count()
    assert status_events == 3


def test_invalid_transition_targets(technician_client, ticket_id):
    assert assign(technician_client, ticket_id).status_code == 200

    resolve_via_transition = technician_client.post(
        f"/api/tickets/{ticket_id}/transition/",
        {"status": Ticket.Status.RESOLVED},
        format="json",
    )
    assert resolve_via_transition.status_code == 400

    back_to_open = technician_client.post(
        f"/api/tickets/{ticket_id}/transition/",
        {"status": Ticket.Status.OPEN},
        format="json",
    )
    assert back_to_open.status_code == 409

    invalid_status = technician_client.post(
        f"/api/tickets/{ticket_id}/transition/",
        {"status": "INVALIDO"},
        format="json",
    )
    assert invalid_status.status_code == 400


def test_resolution_requires_text(technician_client, ticket_id):
    assert assign(technician_client, ticket_id).status_code == 200

    missing = request_confirmation(technician_client, ticket_id, "")
    blank = request_confirmation(technician_client, ticket_id, "   ")
    too_short = request_confirmation(technician_client, ticket_id, "curto")

    assert missing.status_code == 400
    assert blank.status_code == 400
    assert too_short.status_code == 400
    assert Ticket.objects.get(pk=ticket_id).status == Ticket.Status.IN_PROGRESS


def test_resolve_requests_requester_confirmation(technician_client, ticket_id):
    assert assign(technician_client, ticket_id).status_code == 200

    response = request_confirmation(technician_client, ticket_id)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == Ticket.Status.WAITING_REQUESTER
    assert data["resolution"] == RESOLUTION
    assert data["resolved_at"] is None

    ticket = Ticket.objects.get(pk=ticket_id)
    assert ticket.status == Ticket.Status.WAITING_REQUESTER
    assert ticket.resolved_at is None
    assert ticket.history.filter(
        event_type=TicketHistory.EventType.CONFIRMATION_REQUESTED
    ).exists()


def test_other_technician_cannot_resolve(
    technician_client,
    other_technician_client,
    ticket_id,
):
    assert assign(technician_client, ticket_id).status_code == 200

    response = other_technician_client.post(
        f"/api/tickets/{ticket_id}/resolve/",
        {"resolution": "Resolução indevida por outro técnico."},
        format="json",
    )

    assert response.status_code == 403
    assert Ticket.objects.get(pk=ticket_id).status == Ticket.Status.IN_PROGRESS


def test_resolution_can_only_be_requested_in_progress(technician_client, ticket_id):
    assert assign(technician_client, ticket_id).status_code == 200
    assert (
        technician_client.post(
            f"/api/tickets/{ticket_id}/transition/",
            {"status": Ticket.Status.WAITING_REQUESTER},
            format="json",
        ).status_code
        == 200
    )

    response = request_confirmation(
        technician_client,
        ticket_id,
        "Tentativa de resolver enquanto aguarda o solicitante.",
    )

    assert response.status_code == 409


def test_requester_confirms_resolution(
    technician_client,
    requester_client,
    ticket_id,
):
    assert assign(technician_client, ticket_id).status_code == 200
    assert request_confirmation(technician_client, ticket_id).status_code == 200

    response = confirm(requester_client, ticket_id, True)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == Ticket.Status.RESOLVED
    assert data["resolved_at"] is not None
    assert data["resolution"] == RESOLUTION
    assert data["assignee"]["id"] is not None

    ticket = Ticket.objects.get(pk=ticket_id)
    assert ticket.status == Ticket.Status.RESOLVED
    assert ticket.resolved_at is not None
    assert ticket.assignee_id is not None

    events = event_types(ticket_id)
    assert TicketHistory.EventType.REQUESTER_CONFIRMED in events
    assert TicketHistory.EventType.RESOLVED_BY_REQUESTER in events


def test_requester_rejects_resolution_and_ticket_returns_to_service(
    technician_client,
    requester_client,
    technician,
    ticket_id,
):
    assert assign(technician_client, ticket_id).status_code == 200
    assert request_confirmation(technician_client, ticket_id).status_code == 200

    response = confirm(requester_client, ticket_id, False)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == Ticket.Status.IN_PROGRESS
    assert data["assignee"]["id"] == technician.id
    assert data["resolved_at"] is None
    assert data["resolution"] == ""

    ticket = Ticket.objects.get(pk=ticket_id)
    assert ticket.assignee_id == technician.id
    assert ticket.status == Ticket.Status.IN_PROGRESS

    events = event_types(ticket_id)
    assert TicketHistory.EventType.REQUESTER_REJECTED in events
    assert TicketHistory.EventType.RETURNED_TO_SERVICE in events


def test_only_owner_can_confirm_resolution(
    technician_client,
    other_requester_client,
    ticket_id,
):
    assert assign(technician_client, ticket_id).status_code == 200
    assert request_confirmation(technician_client, ticket_id).status_code == 200

    response = confirm(other_requester_client, ticket_id, True)

    assert response.status_code == 403
    assert Ticket.objects.get(pk=ticket_id).status == Ticket.Status.WAITING_REQUESTER


def test_confirmation_requires_waiting_status(
    technician_client,
    requester_client,
    ticket_id,
):
    in_progress = confirm(requester_client, ticket_id, True)
    assert in_progress.status_code == 409

    assert assign(technician_client, ticket_id).status_code == 200
    after_assign = confirm(requester_client, ticket_id, True)
    assert after_assign.status_code == 409
    assert Ticket.objects.get(pk=ticket_id).status == Ticket.Status.IN_PROGRESS


def test_resolved_ticket_is_terminal(
    technician_client,
    requester_client,
    ticket_id,
):
    assert assign(technician_client, ticket_id).status_code == 200
    assert request_confirmation(technician_client, ticket_id).status_code == 200
    assert confirm(requester_client, ticket_id, True).status_code == 200

    transition = technician_client.post(
        f"/api/tickets/{ticket_id}/transition/",
        {"status": Ticket.Status.IN_PROGRESS},
        format="json",
    )
    assert transition.status_code == 409

    resolve_again = request_confirmation(
        technician_client,
        ticket_id,
        "Nova tentativa de resolução do chamado.",
    )
    assert resolve_again.status_code == 409

    confirm_again = confirm(requester_client, ticket_id, True)
    assert confirm_again.status_code == 409


def test_requester_cannot_transition_or_resolve(requester_client, ticket_id):
    transition = requester_client.post(
        f"/api/tickets/{ticket_id}/transition/",
        {"status": Ticket.Status.WAITING_REQUESTER},
        format="json",
    )
    assert transition.status_code == 403

    resolve = requester_client.post(
        f"/api/tickets/{ticket_id}/resolve/",
        {"resolution": "Tentativa do solicitante de resolver o chamado."},
        format="json",
    )
    assert resolve.status_code == 403


def test_technician_cannot_confirm_resolution(technician_client, ticket_id):
    assert assign(technician_client, ticket_id).status_code == 200
    assert request_confirmation(technician_client, ticket_id).status_code == 200

    response = confirm(technician_client, ticket_id, True)

    assert response.status_code == 403
    assert Ticket.objects.get(pk=ticket_id).status == Ticket.Status.WAITING_REQUESTER


def test_ticket_has_no_generic_update_or_delete(technician_client, ticket_id):
    patch = technician_client.patch(
        f"/api/tickets/{ticket_id}/",
        {"status": Ticket.Status.RESOLVED},
        format="json",
    )
    put = technician_client.put(
        f"/api/tickets/{ticket_id}/",
        {},
        format="json",
    )
    delete = technician_client.delete(f"/api/tickets/{ticket_id}/")

    assert patch.status_code == 405
    assert put.status_code == 405
    assert delete.status_code == 405
    assert Ticket.objects.get(pk=ticket_id).status == Ticket.Status.OPEN


def test_failed_audit_rolls_back_assignment(ticket, technician, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("falha simulada na auditoria")

    monkeypatch.setattr(TicketHistory.objects, "create", boom)

    with pytest.raises(RuntimeError):
        services.assign_ticket(
            ticket_id=ticket.pk,
            technician=technician,
            urgency=Ticket.Urgency.HIGH,
        )

    ticket.refresh_from_db()
    assert ticket.status == Ticket.Status.OPEN
    assert ticket.assignee is None
    assert ticket.urgency is None
    assert not TicketHistory.objects.filter(ticket=ticket).exists()


def test_failed_audit_rolls_back_requester_confirmation(
    technician_client,
    requester,
    ticket_id,
    monkeypatch,
):
    assert assign(technician_client, ticket_id).status_code == 200
    assert request_confirmation(technician_client, ticket_id).status_code == 200

    def boom(*args, **kwargs):
        raise RuntimeError("falha simulada na auditoria")

    monkeypatch.setattr(TicketHistory.objects, "create", boom)

    with pytest.raises(RuntimeError):
        services.confirm_resolution(
            ticket_id=ticket_id,
            requester=requester,
            resolved=True,
        )

    ticket = Ticket.objects.get(pk=ticket_id)
    assert ticket.status == Ticket.Status.WAITING_REQUESTER
    assert ticket.resolved_at is None
