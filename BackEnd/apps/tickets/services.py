"""Regras de negócio do ciclo de vida do chamado.

Toda operação que altera o chamado e grava auditoria roda em uma única
transação. A atribuição e as transições usam select_for_update() para
serializar concorrência no PostgreSQL.
"""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.accounts.models import User

from .exceptions import Conflict
from .models import Ticket, TicketComment, TicketHistory

# Transições operacionais permitidas depois que o chamado já tem responsável.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    Ticket.Status.IN_PROGRESS: {Ticket.Status.WAITING_REQUESTER},
    Ticket.Status.WAITING_REQUESTER: {Ticket.Status.IN_PROGRESS},
}

MIN_RESOLUTION_LENGTH = 10
DEFAULT_WAITING_RESOLUTION = "Atendimento aguardando confirmação do solicitante."
DEFAULT_CONFIRMED_RESOLUTION = "Resolução confirmada pelo solicitante."


def _urgency_label(value: str | None) -> str:
    if not value:
        return ""
    try:
        return Ticket.Urgency(value).label
    except ValueError:
        return value


def get_visible_ticket(*, user: User, ticket_id: int) -> Ticket:
    """Busca um chamado respeitando o escopo de acesso do usuário.

    Solicitantes só enxergam os próprios chamados; técnicos enxergam a fila.
    Para reduzir a exposição da existência de registros, chamados fora do
    escopo retornam 404.
    """

    queryset = Ticket.objects.select_related(
        "category",
        "requester",
        "assignee",
    )
    if not user.is_technician:
        queryset = queryset.filter(requester=user)

    try:
        return queryset.get(pk=ticket_id)
    except Ticket.DoesNotExist as exc:
        raise NotFound("Chamado não encontrado.") from exc


def _locked_ticket(ticket_id: int) -> Ticket:
    try:
        return Ticket.objects.select_for_update().get(pk=ticket_id)
    except Ticket.DoesNotExist as exc:
        raise NotFound("Chamado não encontrado.") from exc


def _register(
    *,
    ticket: Ticket,
    actor: User | None,
    event_type: str,
    old_value: str = "",
    new_value: str = "",
) -> None:
    TicketHistory.objects.create(
        ticket=ticket,
        actor=actor,
        event_type=event_type,
        old_value=old_value,
        new_value=new_value,
    )


def create_ticket(
    *,
    requester: User,
    title: str,
    description: str,
    category,
) -> Ticket:
    """Abre o chamado sem urgência; ela será definida na assunção."""

    with transaction.atomic():
        ticket = Ticket.objects.create(
            title=title,
            description=description,
            urgency=None,
            category=category,
            requester=requester,
            status=Ticket.Status.OPEN,
            assignee=None,
        )
        _register(
            ticket=ticket,
            actor=requester,
            event_type=TicketHistory.EventType.CREATED,
            new_value=Ticket.Status.OPEN,
        )
    return ticket


def assign_ticket(*, ticket_id: int, technician: User, urgency: str) -> Ticket:
    """Assume um chamado ABERTO e define a urgência, de forma atômica."""

    if urgency not in Ticket.Urgency.values:
        raise ValidationError({"urgency": "Urgência inválida."})

    with transaction.atomic():
        ticket = _locked_ticket(ticket_id)

        if ticket.status != Ticket.Status.OPEN or ticket.assignee_id is not None:
            raise Conflict(
                "Este chamado já foi assumido ou não está mais aberto. Recarregue a lista."
            )

        old_urgency = ticket.urgency
        ticket.assignee = technician
        ticket.urgency = urgency
        ticket.status = Ticket.Status.IN_PROGRESS
        ticket.save(update_fields=["assignee", "urgency", "status", "updated_at"])

        _register(
            ticket=ticket,
            actor=technician,
            event_type=TicketHistory.EventType.ASSIGNED,
            new_value=technician.name,
        )
        _register(
            ticket=ticket,
            actor=technician,
            event_type=TicketHistory.EventType.URGENCY_CHANGED,
            old_value=_urgency_label(old_urgency),
            new_value=_urgency_label(urgency),
        )
        _register(
            ticket=ticket,
            actor=technician,
            event_type=TicketHistory.EventType.STATUS_CHANGED,
            old_value=Ticket.Status.OPEN,
            new_value=Ticket.Status.IN_PROGRESS,
        )
    return ticket


def transition_ticket(*, ticket_id: int, technician: User, new_status: str) -> Ticket:
    """Executa uma transição operacional permitida para o técnico responsável."""

    valid_statuses = set(Ticket.Status.values)
    if new_status not in valid_statuses:
        raise ValidationError({"status": "Status inválido."})
    if new_status == Ticket.Status.RESOLVED:
        raise ValidationError({"status": "Use a operação de resolução para concluir o chamado."})

    with transaction.atomic():
        ticket = _locked_ticket(ticket_id)

        if ticket.status == Ticket.Status.RESOLVED:
            raise Conflict("Chamado resolvido não pode ser alterado.")
        if ticket.status == Ticket.Status.OPEN:
            raise Conflict("Assuma o chamado antes de alterar o status.")
        if ticket.assignee_id != technician.id:
            raise PermissionDenied(
                "Apenas o técnico responsável pode alterar o status deste chamado."
            )

        allowed = ALLOWED_TRANSITIONS.get(ticket.status, set())
        if new_status not in allowed:
            raise Conflict(f"Transição de {ticket.status} para {new_status} não permitida.")

        old_status = ticket.status
        update_fields = ["status", "updated_at"]

        # A transição direta para AGUARDANDO_SOLICITANTE pode ocorrer pelo
        # Kanban. Garantimos uma solução mínima para que uma confirmação
        # positiva posterior possa encerrar o chamado sem violar a constraint.
        if new_status == Ticket.Status.WAITING_REQUESTER and not ticket.resolution:
            ticket.resolution = DEFAULT_WAITING_RESOLUTION
            update_fields.append("resolution")

        # Ao retomar o atendimento, a solução proposta anterior deixa de ser
        # a solução vigente. O histórico preserva o registro da tentativa.
        if (
            old_status == Ticket.Status.WAITING_REQUESTER
            and new_status == Ticket.Status.IN_PROGRESS
        ):
            ticket.resolution = ""
            ticket.resolved_at = None
            update_fields.extend(["resolution", "resolved_at"])

        ticket.status = new_status
        ticket.save(update_fields=update_fields)

        _register(
            ticket=ticket,
            actor=technician,
            event_type=TicketHistory.EventType.STATUS_CHANGED,
            old_value=old_status,
            new_value=new_status,
        )
    return ticket


def resolve_ticket(*, ticket_id: int, technician: User, resolution: str) -> Ticket:
    """Solicita ao solicitante a confirmação de uma solução proposta."""

    resolution = (resolution or "").strip()
    if not resolution:
        raise ValidationError({"resolution": "Informe a descrição da solução."})
    if len(resolution) < MIN_RESOLUTION_LENGTH:
        raise ValidationError(
            {"resolution": (f"A resolução deve ter pelo menos {MIN_RESOLUTION_LENGTH} caracteres.")}
        )

    with transaction.atomic():
        ticket = _locked_ticket(ticket_id)

        if ticket.status == Ticket.Status.RESOLVED:
            raise Conflict("Chamado já está resolvido.")
        if ticket.assignee_id != technician.id:
            raise PermissionDenied("Apenas o técnico responsável pode resolver este chamado.")
        if ticket.status != Ticket.Status.IN_PROGRESS:
            raise Conflict(
                "Somente chamados em atendimento podem ser enviados para confirmação."
            )

        old_status = ticket.status
        ticket.status = Ticket.Status.WAITING_REQUESTER
        ticket.resolution = resolution
        ticket.resolved_at = None
        ticket.save(
            update_fields=[
                "status",
                "resolution",
                "resolved_at",
                "updated_at",
            ]
        )

        _register(
            ticket=ticket,
            actor=technician,
            event_type=TicketHistory.EventType.STATUS_CHANGED,
            old_value=old_status,
            new_value=Ticket.Status.WAITING_REQUESTER,
        )
        _register(
            ticket=ticket,
            actor=technician,
            event_type=TicketHistory.EventType.CONFIRMATION_REQUESTED,
            old_value=old_status,
            new_value=Ticket.Status.WAITING_REQUESTER,
        )
    return ticket


def confirm_resolution(*, ticket_id: int, requester: User, resolved: bool) -> Ticket:
    """Registra a resposta do solicitante e executa a transição correspondente."""

    with transaction.atomic():
        ticket = _locked_ticket(ticket_id)

        if ticket.requester_id != requester.id:
            raise PermissionDenied(
                "Apenas o solicitante do chamado pode confirmar a resolução."
            )
        if ticket.status == Ticket.Status.RESOLVED:
            raise Conflict("Este chamado já foi resolvido.")
        if ticket.status != Ticket.Status.WAITING_REQUESTER:
            raise Conflict(
                "A confirmação só está disponível quando o chamado aguarda o solicitante."
            )

        old_status = ticket.status

        if resolved:
            ticket.status = Ticket.Status.RESOLVED
            ticket.resolved_at = timezone.now()
            if not ticket.resolution:
                ticket.resolution = DEFAULT_CONFIRMED_RESOLUTION
            ticket.save(
                update_fields=[
                    "status",
                    "resolution",
                    "resolved_at",
                    "updated_at",
                ]
            )

            _register(
                ticket=ticket,
                actor=requester,
                event_type=TicketHistory.EventType.REQUESTER_CONFIRMED,
                old_value=old_status,
                new_value=Ticket.Status.RESOLVED,
            )
            _register(
                ticket=ticket,
                actor=requester,
                event_type=TicketHistory.EventType.RESOLVED_BY_REQUESTER,
                old_value=old_status,
                new_value=Ticket.Status.RESOLVED,
            )
        else:
            ticket.status = Ticket.Status.IN_PROGRESS
            ticket.resolution = ""
            ticket.resolved_at = None
            ticket.save(
                update_fields=[
                    "status",
                    "resolution",
                    "resolved_at",
                    "updated_at",
                ]
            )

            _register(
                ticket=ticket,
                actor=requester,
                event_type=TicketHistory.EventType.REQUESTER_REJECTED,
                old_value=old_status,
                new_value=Ticket.Status.IN_PROGRESS,
            )
            _register(
                ticket=ticket,
                actor=requester,
                event_type=TicketHistory.EventType.RETURNED_TO_SERVICE,
                old_value=old_status,
                new_value=Ticket.Status.IN_PROGRESS,
            )
    return ticket


def add_comment(*, ticket: Ticket, author: User, content: str) -> TicketComment:
    return TicketComment.objects.create(
        ticket=ticket,
        author=author,
        content=content,
    )
