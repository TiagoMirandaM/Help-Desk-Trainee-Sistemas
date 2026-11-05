from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from .models import Category
from .serializers import CategorySerializer


class CategoryListView(ListAPIView):
    """Lista somente categorias ativas, para uso no formulário de chamados."""

    permission_classes = [IsAuthenticated]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.filter(is_active=True).order_by("name")

    @extend_schema(
        tags=["categories"],
        summary="Listar categorias ativas",
        responses={200: CategorySerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
