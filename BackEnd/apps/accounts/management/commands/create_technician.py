from __future__ import annotations

from getpass import getpass

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = "Cria um usuário com perfil TECNICO para o primeiro atendimento."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--email", default="")
        parser.add_argument("--password", default=None)
        parser.add_argument("--first-name", default="")
        parser.add_argument("--last-name", default="")

    def handle(self, *args, **options):
        username = options["username"].strip()
        if User.objects.filter(username__iexact=username).exists():
            raise CommandError(f"Já existe um usuário com o username '{username}'.")

        password = options["password"]
        if not password:
            password = getpass("Senha do técnico: ")
            confirmation = getpass("Confirme a senha: ")
            if password != confirmation:
                raise CommandError("As senhas não coincidem.")

        user = User.objects.create_user(
            username=username,
            email=options["email"],
            password=password,
            first_name=options["first_name"],
            last_name=options["last_name"],
            role=User.Role.TECHNICIAN,
        )
        self.stdout.write(self.style.SUCCESS(f"Técnico '{user.username}' criado com sucesso."))
