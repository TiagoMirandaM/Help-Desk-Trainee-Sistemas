from __future__ import annotations

import pytest
import yaml

pytestmark = pytest.mark.django_db


def test_openapi_schema_is_available(api_client):
    response = api_client.get("/api/schema/")

    assert response.status_code == 200
    schema = yaml.safe_load(response.content)
    assert schema["info"]["title"] == "Helpdesk API"
    assert "/api/tickets/" in schema["paths"]
    assert "/api/tickets/{id}/assign/" in schema["paths"]
    assert "/api/tickets/{id}/confirm-resolution/" in schema["paths"]
    assert "/api/auth/login/" in schema["paths"]


def test_swagger_docs_are_available(api_client):
    response = api_client.get("/api/docs/")

    assert response.status_code == 200
    assert b"swagger" in response.content.lower()
