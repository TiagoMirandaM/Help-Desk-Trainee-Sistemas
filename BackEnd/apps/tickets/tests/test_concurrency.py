from __future__ import annotations

import threading

import pytest
from django.db import connection, connections

from apps.tickets import services
from apps.tickets.exceptions import Conflict
from apps.tickets.models import Ticket, TicketHistory

pytestmark = pytest.mark.django_db(transaction=True)


def test_only_one_technician_assigns_under_concurrency(
    ticket: Ticket,
    technician,
    other_technician,
):
    """Teste real de bloqueio de linha, executado apenas no PostgreSQL.

    A suíte padrão usa SQLite em memória, que não implementa SELECT FOR UPDATE
    com o mesmo comportamento. Para rodar este teste:

        pytest --ds=config.settings apps/tickets/tests/test_concurrency.py
    """

    if connection.vendor != "postgresql":
        pytest.skip("Concorrência real requer PostgreSQL.")

    barrier = threading.Barrier(2)
    results: list[str] = []

    def worker(user):
        try:
            barrier.wait(timeout=5)
            services.assign_ticket(
                ticket_id=ticket.pk,
                technician=user,
                urgency=Ticket.Urgency.HIGH,
            )
            results.append("ok")
        except Conflict:
            results.append("conflict")
        finally:
            connections.close_all()

    threads = [
        threading.Thread(target=worker, args=(technician,)),
        threading.Thread(target=worker, args=(other_technician,)),
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=15)

    assert sorted(results) == ["conflict", "ok"]

    ticket.refresh_from_db()
    assert ticket.status == Ticket.Status.IN_PROGRESS
    assert ticket.assignee_id in {technician.id, other_technician.id}
    assert (
        TicketHistory.objects.filter(
            ticket=ticket,
            event_type=TicketHistory.EventType.ASSIGNED,
        ).count()
        == 1
    )
