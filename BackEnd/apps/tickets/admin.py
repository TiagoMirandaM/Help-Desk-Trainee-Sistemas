from __future__ import annotations

from django.contrib import admin

from .models import Ticket, TicketComment, TicketHistory


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "title",
        "status",
        "urgency",
        "category",
        "requester",
        "assignee",
        "created_at",
    )
    list_filter = ("status", "urgency", "category")
    search_fields = (
        "title",
        "description",
        "requester__username",
        "requester__email",
        "assignee__username",
    )
    readonly_fields = (
        "status",
        "urgency",
        "requester",
        "assignee",
        "created_at",
        "updated_at",
        "resolved_at",
        "resolution",
    )
    date_hierarchy = "created_at"

    def has_delete_permission(self, request, obj=None):
        # Evita apagar chamados e, por consequência, o histórico de auditoria.
        return False


@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "author", "created_at")
    search_fields = ("ticket__title", "author__username", "content")
    readonly_fields = ("ticket", "author", "content", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(TicketHistory)
class TicketHistoryAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "event_type", "actor", "created_at")
    list_filter = ("event_type",)
    search_fields = ("ticket__title", "actor__username", "new_value")
    readonly_fields = (
        "ticket",
        "actor",
        "event_type",
        "old_value",
        "new_value",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_view_permission(self, request, obj=None):
        return True
