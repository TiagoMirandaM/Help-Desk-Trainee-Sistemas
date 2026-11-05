from __future__ import annotations

import django_filters
from django.db.models import Case, IntegerField, Q, Value, When
from rest_framework.filters import OrderingFilter

from .models import Ticket


class TicketOrderingFilter(OrderingFilter):
    """Ordenação de chamados, incluindo urgência por peso semântico.

    A urgência é armazenada como texto; ordenar lexicograficamente produziria
    uma ordem incorreta (ALTA, BAIXA, MEDIA). A anotação urgency_rank garante
    BAIXA < MEDIA < ALTA para o frontend.
    """

    def get_ordering(self, request, queryset, view):
        ordering = super().get_ordering(request, queryset, view)
        if not ordering:
            return ordering

        mapped = []
        for field in ordering:
            prefix = "-" if field.startswith("-") else ""
            name = field.lstrip("-")
            if name == "urgency":
                name = "urgency_rank"
            mapped.append(f"{prefix}{name}")
        return mapped

    def filter_queryset(self, request, queryset, view):
        queryset = queryset.annotate(
            urgency_rank=Case(
                When(urgency=Ticket.Urgency.LOW, then=Value(1)),
                When(urgency=Ticket.Urgency.MEDIUM, then=Value(2)),
                When(urgency=Ticket.Urgency.HIGH, then=Value(3)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        return super().filter_queryset(request, queryset, view)


class TicketFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=Ticket.Status.choices)
    urgency = django_filters.ChoiceFilter(choices=Ticket.Urgency.choices)
    category = django_filters.CharFilter(method="filter_category")
    assignee = django_filters.CharFilter(method="filter_assignee")
    requester = django_filters.CharFilter(method="filter_requester")
    mine = django_filters.BooleanFilter(method="filter_mine")
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = Ticket
        fields: list[str] = []

    def filter_category(self, queryset, name, value):
        value = (value or "").strip()
        if not value:
            return queryset
        if value.isdigit():
            return queryset.filter(category_id=int(value))
        return queryset.filter(category__slug__iexact=value)

    def filter_assignee(self, queryset, name, value):
        value = (value or "").strip()
        if not value:
            return queryset
        if value.lower() == "me":
            return queryset.filter(assignee=self.request.user)
        if value.isdigit():
            return queryset.filter(assignee_id=int(value))
        return queryset.none()

    def filter_requester(self, queryset, name, value):
        # Filtro por solicitante é operacional, restrito a técnicos.
        if not self.request.user.is_technician:
            return queryset
        value = (value or "").strip()
        if not value:
            return queryset
        if value.lower() == "me":
            return queryset.filter(requester=self.request.user)
        if value.isdigit():
            return queryset.filter(requester_id=int(value))
        return queryset.none()

    def filter_mine(self, queryset, name, value):
        if not value:
            return queryset
        if self.request.user.is_technician:
            return queryset.filter(assignee=self.request.user)
        return queryset.filter(requester=self.request.user)

    def filter_search(self, queryset, name, value):
        term = (value or "").strip()
        if not term:
            return queryset

        filters = Q(title__icontains=term) | Q(description__icontains=term)
        identifier = term.upper()
        if identifier.startswith("HD-"):
            identifier = identifier[3:]
        if identifier.isdigit():
            filters |= Q(pk=int(identifier))
        return queryset.filter(filters)
