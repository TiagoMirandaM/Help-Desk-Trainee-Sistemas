from django.db import migrations


def clear_open_ticket_urgency(apps, schema_editor):
    """Remove urgências antigas de chamados que ainda estão abertos.

    Antes da mudança de fluxo, a urgência era informada na abertura do
    chamado. A partir da assunção pelo técnico, chamados ``ABERTO`` devem
    permanecer sem urgência até o ``assign``.
    """

    Ticket = apps.get_model("tickets", "Ticket")
    Ticket.objects.filter(status="ABERTO").exclude(urgency__isnull=True).update(urgency=None)


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0003_alter_ticket_urgency"),
    ]

    operations = [
        migrations.RunPython(clear_open_ticket_urgency, migrations.RunPython.noop),
    ]
