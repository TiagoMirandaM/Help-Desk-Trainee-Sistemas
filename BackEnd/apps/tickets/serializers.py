from __future__ import annotations

from rest_framework import serializers

from apps.accounts.serializers import UserSummarySerializer
from apps.categories.models import Category
from apps.categories.serializers import CategorySummarySerializer

from .models import Ticket, TicketComment, TicketHistory

MIN_TITLE_LENGTH = 5
MAX_TITLE_LENGTH = 120
MIN_DESCRIPTION_LENGTH = 20
MAX_DESCRIPTION_LENGTH = 2000
MIN_RESOLUTION_LENGTH = 10
MAX_RESOLUTION_LENGTH = 2000
MAX_COMMENT_LENGTH = 2000


class TicketCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=MAX_TITLE_LENGTH)
    description = serializers.CharField()
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_active=True),
        error_messages={
            "does_not_exist": "Categoria inexistente ou inativa.",
            "incorrect_type": "Identificador de categoria inválido.",
        },
    )

    def validate_title(self, value: str) -> str:
        value = value.strip()
        if len(value) < MIN_TITLE_LENGTH:
            raise serializers.ValidationError(
                f"O título deve ter pelo menos {MIN_TITLE_LENGTH} caracteres."
            )
        return value

    def validate_description(self, value: str) -> str:
        value = value.strip()
        if len(value) < MIN_DESCRIPTION_LENGTH:
            raise serializers.ValidationError(
                f"A descrição deve ter pelo menos {MIN_DESCRIPTION_LENGTH} caracteres."
            )
        if len(value) > MAX_DESCRIPTION_LENGTH:
            raise serializers.ValidationError(
                f"A descrição deve ter no máximo {MAX_DESCRIPTION_LENGTH} caracteres."
            )
        return value


class TicketSerializer(serializers.ModelSerializer):
    code = serializers.CharField(read_only=True)
    category = CategorySummarySerializer(read_only=True)
    requester = UserSummarySerializer(read_only=True)
    assignee = UserSummarySerializer(read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "code",
            "title",
            "description",
            "category",
            "urgency",
            "status",
            "requester",
            "assignee",
            "created_at",
            "updated_at",
            "resolved_at",
            "resolution",
        ]
        read_only_fields = fields


class TransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Ticket.Status.choices,
        error_messages={"invalid_choice": "Status inválido."},
    )


class AssignTicketSerializer(serializers.Serializer):
    urgency = serializers.ChoiceField(
        choices=Ticket.Urgency.choices,
        error_messages={
            "required": "Informe a urgência antes de assumir o chamado.",
            "invalid_choice": "Urgência inválida.",
        },
    )


class ConfirmResolutionSerializer(serializers.Serializer):
    resolved = serializers.BooleanField(
        error_messages={
            "required": "Informe se o problema foi resolvido.",
            "invalid": "O campo resolved deve ser booleano.",
        },
    )


class ResolveSerializer(serializers.Serializer):
    resolution = serializers.CharField(
        min_length=MIN_RESOLUTION_LENGTH,
        max_length=MAX_RESOLUTION_LENGTH,
        trim_whitespace=True,
        error_messages={
            "blank": "Informe a descrição da solução.",
            "min_length": (f"A resolução deve ter pelo menos {MIN_RESOLUTION_LENGTH} caracteres."),
            "max_length": (f"A resolução deve ter no máximo {MAX_RESOLUTION_LENGTH} caracteres."),
        },
    )


class TicketCommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField(
        max_length=MAX_COMMENT_LENGTH,
        trim_whitespace=True,
        error_messages={
            "blank": "Informe o conteúdo do comentário.",
            "max_length": (f"O comentário deve ter no máximo {MAX_COMMENT_LENGTH} caracteres."),
        },
    )


class TicketCommentSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)

    class Meta:
        model = TicketComment
        fields = ["id", "ticket", "author", "content", "created_at"]
        read_only_fields = fields


class TicketHistorySerializer(serializers.ModelSerializer):
    actor = UserSummarySerializer(read_only=True)
    description = serializers.SerializerMethodField()
    from_status = serializers.SerializerMethodField()
    to_status = serializers.SerializerMethodField()

    class Meta:
        model = TicketHistory
        fields = [
            "id",
            "ticket",
            "actor",
            "event_type",
            "old_value",
            "new_value",
            "from_status",
            "to_status",
            "description",
            "created_at",
        ]
        read_only_fields = fields

    def get_description(self, obj: TicketHistory) -> str:
        if obj.event_type == TicketHistory.EventType.CREATED:
            return "Chamado criado."
        if obj.event_type == TicketHistory.EventType.ASSIGNED:
            return f"Chamado atribuído a {obj.new_value}."
        if obj.event_type == TicketHistory.EventType.URGENCY_CHANGED:
            if obj.old_value and obj.old_value != obj.new_value:
                return f"Urgência alterada de {obj.old_value} para {obj.new_value}."
            return f"Urgência definida como {obj.new_value}."
        if obj.event_type == TicketHistory.EventType.CONFIRMATION_REQUESTED:
            return "Confirmação de resolução solicitada ao solicitante."
        if obj.event_type == TicketHistory.EventType.REQUESTER_CONFIRMED:
            return "Solicitante confirmou que o problema foi resolvido."
        if obj.event_type == TicketHistory.EventType.REQUESTER_REJECTED:
            return "Solicitante informou que o problema continua."
        if obj.event_type == TicketHistory.EventType.RETURNED_TO_SERVICE:
            return "Chamado retornou para atendimento."
        if obj.event_type == TicketHistory.EventType.RESOLVED_BY_REQUESTER:
            return "Chamado resolvido por confirmação do solicitante."
        if obj.event_type == TicketHistory.EventType.RESOLVED:
            return "Chamado resolvido."
        if obj.event_type == TicketHistory.EventType.STATUS_CHANGED:
            return f"Status alterado de {obj.old_value} para {obj.new_value}."
        return obj.get_event_type_display()

    def get_from_status(self, obj: TicketHistory) -> str | None:
        if obj.event_type in {
            TicketHistory.EventType.STATUS_CHANGED,
            TicketHistory.EventType.CONFIRMATION_REQUESTED,
            TicketHistory.EventType.REQUESTER_CONFIRMED,
            TicketHistory.EventType.REQUESTER_REJECTED,
            TicketHistory.EventType.RETURNED_TO_SERVICE,
            TicketHistory.EventType.RESOLVED_BY_REQUESTER,
            TicketHistory.EventType.RESOLVED,
        }:
            return obj.old_value or None
        return None

    def get_to_status(self, obj: TicketHistory) -> str | None:
        if obj.event_type == TicketHistory.EventType.CREATED:
            return obj.new_value or Ticket.Status.OPEN
        if obj.event_type in {
            TicketHistory.EventType.STATUS_CHANGED,
            TicketHistory.EventType.CONFIRMATION_REQUESTED,
            TicketHistory.EventType.REQUESTER_CONFIRMED,
            TicketHistory.EventType.REQUESTER_REJECTED,
            TicketHistory.EventType.RETURNED_TO_SERVICE,
            TicketHistory.EventType.RESOLVED_BY_REQUESTER,
            TicketHistory.EventType.RESOLVED,
        }:
            return obj.new_value or None
        return None
