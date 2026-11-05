from __future__ import annotations

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.categories.models import Category


class Ticket(models.Model):
    class Status(models.TextChoices):
        OPEN = "ABERTO", "Aberto"
        IN_PROGRESS = "EM_ATENDIMENTO", "Em atendimento"
        WAITING_REQUESTER = "AGUARDANDO_SOLICITANTE", "Aguardando solicitante"
        RESOLVED = "RESOLVIDO", "Resolvido"

    class Urgency(models.TextChoices):
        LOW = "BAIXA", "Baixa"
        MEDIUM = "MEDIA", "Média"
        HIGH = "ALTA", "Alta"

    title = models.CharField("título", max_length=120)
    description = models.TextField("descrição")
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="tickets",
        verbose_name="categoria",
    )
    urgency = models.CharField(
        "urgência",
        max_length=10,
        choices=Urgency.choices,
        null=True,
        blank=True,
        default=None,
        help_text="Definida pelo técnico no momento da assunção do chamado.",
    )
    status = models.CharField(
        "status",
        max_length=30,
        choices=Status.choices,
        default=Status.OPEN,
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="requested_tickets",
        verbose_name="solicitante",
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_tickets",
        verbose_name="responsável",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField("criado em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizado em", auto_now=True)
    resolved_at = models.DateTimeField("resolvido em", null=True, blank=True)
    resolution = models.TextField("resolução", blank=True, default="")

    class Meta:
        verbose_name = "chamado"
        verbose_name_plural = "chamados"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["urgency"]),
            models.Index(fields=["requester"]),
            models.Index(fields=["assignee"]),
            models.Index(fields=["status", "assignee"]),
            models.Index(fields=["-created_at"]),
            models.Index(fields=["-updated_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~Q(status="ABERTO") | Q(assignee__isnull=True),
                name="ticket_open_without_assignee",
                violation_error_message="Chamado aberto não pode ter responsável.",
            ),
            models.CheckConstraint(
                condition=~Q(status="RESOLVIDO")
                | (Q(resolved_at__isnull=False) & ~Q(resolution="")),
                name="ticket_resolved_requires_resolution",
                violation_error_message="Chamado resolvido exige resolução e data.",
            ),
        ]

    @property
    def code(self) -> str:
        return f"HD-{self.pk:04d}" if self.pk else ""

    def __str__(self) -> str:
        return f"{self.code} - {self.title}"


class TicketComment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="comments",
        verbose_name="chamado",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ticket_comments",
        verbose_name="autor",
    )
    content = models.TextField("conteúdo")
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        verbose_name = "comentário interno"
        verbose_name_plural = "comentários internos"
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["ticket", "created_at"])]

    def __str__(self) -> str:
        return f"Comentário #{self.pk} em {self.ticket.code}"


class TicketHistory(models.Model):
    class EventType(models.TextChoices):
        CREATED = "CREATED", "Chamado criado"
        ASSIGNED = "ASSIGNED", "Técnico atribuído"
        STATUS_CHANGED = "STATUS_CHANGED", "Status alterado"
        URGENCY_CHANGED = "URGENCY_CHANGED", "Urgência definida"
        CONFIRMATION_REQUESTED = "CONFIRMATION_REQUESTED", "Confirmação solicitada"
        REQUESTER_CONFIRMED = "REQUESTER_CONFIRMED", "Solicitante confirmou a resolução"
        REQUESTER_REJECTED = "REQUESTER_REJECTED", "Solicitante informou que o problema continua"
        RETURNED_TO_SERVICE = "RETURNED_TO_SERVICE", "Chamado retornou ao atendimento"
        RESOLVED_BY_REQUESTER = "RESOLVED_BY_REQUESTER", "Chamado resolvido por confirmação"
        RESOLVED = "RESOLVED", "Chamado resolvido"

    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="history",
        verbose_name="chamado",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="ticket_history",
        verbose_name="autor do evento",
        null=True,
        blank=True,
    )
    event_type = models.CharField(
        "tipo de evento",
        max_length=30,
        choices=EventType.choices,
    )
    old_value = models.TextField("valor anterior", blank=True, default="")
    new_value = models.TextField("valor novo", blank=True, default="")
    created_at = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        verbose_name = "evento de auditoria"
        verbose_name_plural = "histórico de auditoria"
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["ticket", "created_at"]),
            models.Index(fields=["event_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_event_type_display()} - {self.ticket.code}"
