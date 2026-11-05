from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.categories.models import Category
from apps.tickets.models import Ticket

PASSWORD = "test-pass-12345"


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


def _authenticated_client(user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def requester(db) -> User:
    return User.objects.create_user(
        username="ana.souza",
        email="ana.souza@example.com",
        password=PASSWORD,
        first_name="Ana",
        last_name="Souza",
        role=User.Role.REQUESTER,
    )


@pytest.fixture
def other_requester(db) -> User:
    return User.objects.create_user(
        username="joao.pereira",
        email="joao.pereira@example.com",
        password=PASSWORD,
        first_name="João",
        last_name="Pereira",
        role=User.Role.REQUESTER,
    )


@pytest.fixture
def technician(db) -> User:
    return User.objects.create_user(
        username="carlos.lima",
        email="carlos.lima@example.com",
        password=PASSWORD,
        first_name="Carlos",
        last_name="Lima",
        role=User.Role.TECHNICIAN,
    )


@pytest.fixture
def other_technician(db) -> User:
    return User.objects.create_user(
        username="marina.alves",
        email="marina.alves@example.com",
        password=PASSWORD,
        first_name="Marina",
        last_name="Alves",
        role=User.Role.TECHNICIAN,
    )


@pytest.fixture
def requester_client(requester: User) -> APIClient:
    return _authenticated_client(requester)


@pytest.fixture
def other_requester_client(other_requester: User) -> APIClient:
    return _authenticated_client(other_requester)


@pytest.fixture
def technician_client(technician: User) -> APIClient:
    return _authenticated_client(technician)


@pytest.fixture
def other_technician_client(other_technician: User) -> APIClient:
    return _authenticated_client(other_technician)


@pytest.fixture
def category(db) -> Category:
    return Category.objects.create(name="TI")


@pytest.fixture
def inactive_category(db) -> Category:
    return Category.objects.create(name="Categoria antiga", is_active=False)


@pytest.fixture
def ticket(db, requester: User, category: Category) -> Ticket:
    return Ticket.objects.create(
        title="Erro ao acessar o ERP",
        description="O usuário relata erro ao abrir o módulo financeiro do ERP.",
        category=category,
        requester=requester,
    )


@pytest.fixture
def create_ticket(requester_client: APIClient, category: Category):
    def _create(**overrides):
        payload = {
            "title": "Erro ao acessar o ERP",
            "description": "O usuário relata erro ao abrir o módulo financeiro do ERP.",
            "category": category.pk,
        }
        payload.update(overrides)
        return requester_client.post("/api/tickets/", payload, format="json")

    return _create


@pytest.fixture
def assigned_ticket(ticket: Ticket, technician: User) -> Ticket:
    from apps.tickets import services

    return services.assign_ticket(
        ticket_id=ticket.pk,
        technician=technician,
        urgency=Ticket.Urgency.MEDIUM,
    )
