from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.categories.models import Category

User = get_user_model()

DEMO_CATEGORIES = [
    {"name": "TI", "slug": "ti"},
    {"name": "Infraestrutura", "slug": "infraestrutura"},
    {"name": "Financeiro", "slug": "financeiro"},
]

DEMO_USERS = [
    {
        "username": "ana.souza",
        "email": "ana.souza@demo.local",
        "first_name": "Ana",
        "last_name": "Souza",
        "role": User.Role.REQUESTER,
    },
    {
        "username": "joao.pereira",
        "email": "joao.pereira@demo.local",
        "first_name": "João",
        "last_name": "Pereira",
        "role": User.Role.REQUESTER,
    },
    {
        "username": "carlos.lima",
        "email": "carlos.lima@demo.local",
        "first_name": "Carlos",
        "last_name": "Lima",
        "role": User.Role.TECHNICIAN,
    },
    {
        "username": "marina.alves",
        "email": "marina.alves@demo.local",
        "first_name": "Marina",
        "last_name": "Alves",
        "role": User.Role.TECHNICIAN,
    },
]


class Command(BaseCommand):
    help = "Cria categorias e usuários fictícios para demonstração local. Não execute em produção."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default="demo1234",
            help="Senha aplicada aos usuários criados (padrão: demo1234).",
        )

    def handle(self, *args, **options):
        password = options["password"]

        for data in DEMO_CATEGORIES:
            category, created = Category.objects.get_or_create(
                slug=data["slug"],
                defaults={"name": data["name"], "is_active": True},
            )
            status = "criada" if created else "já existia"
            self.stdout.write(f"Categoria {category.name}: {status}.")

        for data in DEMO_USERS:
            user, created = User.objects.get_or_create(
                username=data["username"],
                defaults={
                    "email": data["email"],
                    "first_name": data["first_name"],
                    "last_name": data["last_name"],
                    "role": data["role"],
                },
            )
            if created:
                user.set_password(password)
                user.save(update_fields=["password"])
                status = "criado"
            else:
                status = "já existia"
            self.stdout.write(f"Usuário {user.username} ({user.get_role_display()}): {status}.")

        self.stdout.write(
            self.style.SUCCESS("Seed de demonstração concluído. Usuários usam a senha informada.")
        )
