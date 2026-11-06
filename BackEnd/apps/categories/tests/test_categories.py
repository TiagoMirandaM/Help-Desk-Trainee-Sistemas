from __future__ import annotations

import pytest

pytestmark = pytest.mark.django_db


def test_categories_require_authentication(api_client):
    response = api_client.get("/api/categories/")

    assert response.status_code == 401


def test_only_active_categories_are_listed(
    requester_client,
    category,
    inactive_category,
):
    response = requester_client.get("/api/categories/")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert [item["id"] for item in body] == [category.id]
    assert body[0]["slug"] == "ti"


def test_categories_are_read_only(requester_client):
    response = requester_client.post(
        "/api/categories/",
        {"name": "Nova categoria"},
        format="json",
    )

    assert response.status_code == 405
