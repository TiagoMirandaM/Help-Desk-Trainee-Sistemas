from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsRequester, IsTechnician

from . import services
from .filters import TicketFilter, TicketOrderingFilter
from .models import Ticket
from .serializers import (
    AssignTicketSerializer,
    ConfirmResolutionSerializer,
    ResolveSerializer,
    TicketCommentCreateSerializer,
    TicketCommentSerializer,
    TicketCreateSerializer,
    TicketHistorySerializer,
    TicketSerializer,
    TransitionSerializer,
)


class TicketViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, TicketOrderingFilter]
    filterset_class = TicketFilter
    ordering_fields = ["created_at", "updated_at", "id", "urgency"]
    ordering = ["-created_at", "-id"]

    def get_queryset(self):
        queryset = Ticket.objects.select_related(
            "category",
            "requester",
            "assignee",
        )
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()
        if user.is_technician:
            return queryset
        return queryset.filter(requester=user)

    def get_serializer_class(self):
        if self.action == "create":
            return TicketCreateSerializer
        return TicketSerializer

    def get_permissions(self):
        if self.action == "confirm_resolution":
            return [IsAuthenticated(), IsRequester()]
        if self.action in {"assign", "transition", "resolve", "comments"}:
            return [IsAuthenticated(), IsTechnician()]
        return [IsAuthenticated()]

    @extend_schema(
        tags=["tickets"],
        summary="Listar chamados autorizados",
        responses={200: TicketSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        tags=["tickets"],
        summary="Abrir chamado",
        request=TicketCreateSerializer,
        responses={201: TicketSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = TicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = services.create_ticket(
            requester=request.user,
            **serializer.validated_data,
        )
        output = TicketSerializer(ticket, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["tickets"],
        summary="Consultar chamado",
        responses={200: TicketSerializer, 404: OpenApiResponse(description="Não encontrado.")},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        tags=["tickets"],
        summary="Assumir chamado",
        request=AssignTicketSerializer,
        responses={
            200: TicketSerializer,
            400: OpenApiResponse(description="Urgência inválida ou ausente."),
            403: OpenApiResponse(description="Somente técnicos."),
            409: OpenApiResponse(description="Chamado já assumido ou fora de ABERTO."),
        },
    )
    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        serializer = AssignTicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = services.assign_ticket(
            ticket_id=pk,
            technician=request.user,
            urgency=serializer.validated_data["urgency"],
        )
        return Response(TicketSerializer(ticket).data)

    @extend_schema(
        tags=["tickets"],
        summary="Alterar status do chamado",
        request=TransitionSerializer,
        responses={
            200: TicketSerializer,
            400: OpenApiResponse(description="Status inválido."),
            403: OpenApiResponse(description="Não é o técnico responsável."),
            409: OpenApiResponse(description="Transição não permitida no estado atual."),
        },
    )
    @action(detail=True, methods=["post"], url_path="transition")
    def transition(self, request, pk=None):
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = services.transition_ticket(
            ticket_id=pk,
            technician=request.user,
            new_status=serializer.validated_data["status"],
        )
        return Response(TicketSerializer(ticket).data)

    @extend_schema(
        tags=["tickets"],
        summary="Resolver chamado",
        description=(
            "Registra a solução proposta e move o chamado para AGUARDANDO_SOLICITANTE. "
            "A conclusão depende da confirmação do solicitante."
        ),
        request=ResolveSerializer,
        responses={
            200: TicketSerializer,
            400: OpenApiResponse(description="Resolução ausente ou inválida."),
            403: OpenApiResponse(description="Não é o técnico responsável."),
            409: OpenApiResponse(description="Chamado não está em atendimento."),
        },
    )
    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        serializer = ResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = services.resolve_ticket(
            ticket_id=pk,
            technician=request.user,
            resolution=serializer.validated_data["resolution"],
        )
        return Response(TicketSerializer(ticket).data)

    @extend_schema(
        tags=["tickets"],
        summary="Confirmar resolução do chamado",
        description=(
            "Somente o solicitante proprietário, com o chamado em "
            "AGUARDANDO_SOLICITANTE, pode confirmar (RESOLVIDO) ou rejeitar "
            "(retorno para EM_ATENDIMENTO) a solução proposta."
        ),
        request=ConfirmResolutionSerializer,
        responses={
            200: TicketSerializer,
            400: OpenApiResponse(description="Payload inválido."),
            403: OpenApiResponse(description="Somente o solicitante proprietário."),
            409: OpenApiResponse(description="Status inválido ou confirmação duplicada."),
        },
    )
    @action(detail=True, methods=["post"], url_path="confirm-resolution")
    def confirm_resolution(self, request, pk=None):
        serializer = ConfirmResolutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = services.confirm_resolution(
            ticket_id=pk,
            requester=request.user,
            resolved=serializer.validated_data["resolved"],
        )
        return Response(TicketSerializer(ticket).data)

    @extend_schema(
        tags=["comments"],
        methods=["GET"],
        summary="Listar comentários internos",
        responses={200: TicketCommentSerializer(many=True)},
    )
    @extend_schema(
        tags=["comments"],
        methods=["POST"],
        summary="Criar comentário interno",
        request=TicketCommentCreateSerializer,
        responses={201: TicketCommentSerializer},
    )
    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        ticket = services.get_visible_ticket(user=request.user, ticket_id=pk)

        if request.method == "POST":
            serializer = TicketCommentCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            comment = services.add_comment(
                ticket=ticket,
                author=request.user,
                content=serializer.validated_data["content"],
            )
            return Response(
                TicketCommentSerializer(comment).data,
                status=status.HTTP_201_CREATED,
            )

        queryset = ticket.comments.select_related("author").order_by("created_at", "id")
        page = self.paginate_queryset(queryset)
        serializer = TicketCommentSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @extend_schema(
        tags=["history"],
        summary="Consultar histórico de auditoria",
        responses={200: TicketHistorySerializer(many=True)},
    )
    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        ticket = services.get_visible_ticket(user=request.user, ticket_id=pk)
        queryset = ticket.history.select_related("actor").order_by("created_at", "id")
        page = self.paginate_queryset(queryset)
        serializer = TicketHistorySerializer(page, many=True)
        return self.get_paginated_response(serializer.data)
