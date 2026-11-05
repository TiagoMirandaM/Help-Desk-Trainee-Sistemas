from __future__ import annotations

from rest_framework.routers import SimpleRouter

from .views import TicketViewSet

app_name = "tickets"

router = SimpleRouter()
router.register("", TicketViewSet, basename="ticket")

urlpatterns = router.urls
