from __future__ import annotations

from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Paginação padrão da API.

    O frontend usa page_size=200 em telas de painel/Kanban; o limite máximo
    impede que um cliente solicite a base inteira.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200
